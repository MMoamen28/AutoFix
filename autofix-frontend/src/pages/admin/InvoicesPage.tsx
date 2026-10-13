import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileText, Search, Printer, Download, CreditCard, RotateCcw, 
  Eye, CheckCircle2, AlertCircle, Clock, Ban, X, Plus, Filter, MessageCircle, Edit3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import invoiceService, { Invoice, InvoiceLineSnapshot } from '../../services/invoiceService';
import Money from '../../components/shared/Money';
import { printInvoiceInPlace, downloadInvoiceDoc } from '../../utils/printHelper';
import InvoicePreviewModal from '../../components/shared/InvoicePreviewModal';
import EditInvoiceIdModal from '../../components/shared/EditInvoiceIdModal';
import api from '../../services/axiosClient';

const InvoicesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { role } = useAuth();
  const isCustomer = role === 'Customer';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [creditInvoice, setCreditInvoice] = useState<Invoice | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<number | null>(null);
  const [editIdInvoice, setEditIdInvoice] = useState<Invoice | null>(null);

  // Payment Form
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('Cash');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');

  // Credit Form
  const [creditReason, setCreditReason] = useState<string>('');
  const [showVat, setShowVat] = useState<boolean>(false);

  useEffect(() => {
    loadInvoices();
    api.get('/settings').then(res => setShowVat(res.data?.showVat ?? false)).catch(() => {});
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await invoiceService.getAll();
      setInvoices(data || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Unpaid' && inv.status !== 'Issued') return false;
        if (statusFilter !== 'Unpaid' && inv.status !== statusFilter) return false;
      }

      // Search query (invoice number, customer name, phone, car plate, work order)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchCust = (inv.customerName || '').toLowerCase().includes(q);
        const matchPhone = (inv.customerPhone || '').toLowerCase().includes(q);
        const matchPlate = (inv.carPlate || '').toLowerCase().includes(q);
        const matchCar = (inv.carMakeModel || '').toLowerCase().includes(q);
        const matchWo = (inv.workOrderNumber || '').toLowerCase().includes(q);
        if (!matchNum && !matchCust && !matchPhone && !matchPlate && !matchCar && !matchWo) {
          return false;
        }
      }

      // Date range filter
      if (dateFrom) {
        const d = new Date(inv.issuedAt).toISOString().split('T')[0];
        if (d < dateFrom) return false;
      }
      if (dateTo) {
        const d = new Date(inv.issuedAt).toISOString().split('T')[0];
        if (d > dateTo) return false;
      }

      return true;
    });
  }, [invoices, statusFilter, searchQuery, dateFrom, dateTo]);

  // Aggregate stats
  const totals = useMemo(() => {
    const totalInvoiced = filteredInvoices.reduce((acc, i) => acc + (i.status !== 'Credited' ? i.totalAmount : 0), 0);
    const totalCollected = filteredInvoices.reduce((acc, i) => acc + i.paidAmount, 0);
    const totalRemaining = filteredInvoices.reduce((acc, i) => acc + (i.status !== 'Credited' ? i.remainingAmount : 0), 0);
    const creditedCount = filteredInvoices.filter(i => i.status === 'Credited').length;
    return { totalInvoiced, totalCollected, totalRemaining, creditedCount };
  }, [filteredInvoices]);

  const handleOpenPayment = (inv: Invoice) => {
    setPaymentInvoice(inv);
    setPayAmount(inv.remainingAmount.toFixed(2));
    setPayMethod('Cash');
    setPayRef('');
    setPayNotes('');
    setActionError('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;

    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError(t('invoices.errors.invalidAmount', 'Please enter a valid positive payment amount.'));
      return;
    }

    if (amountNum > paymentInvoice.remainingAmount + 0.001) {
      setActionError(t('invoices.errors.overpayment', 'Payment amount cannot exceed remaining balance.'));
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      await invoiceService.recordPayment(paymentInvoice.id, {
        amount: amountNum,
        paymentMethod: payMethod,
        referenceNumber: payRef || undefined,
        notes: payNotes || undefined
      });
      setPaymentInvoice(null);
      await loadInvoices();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCredit = (inv: Invoice) => {
    setCreditInvoice(inv);
    setCreditReason('');
    setActionError('');
  };

  const handleIssueCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditInvoice) return;

    if (!creditReason.trim()) {
      setActionError(t('invoices.errors.reasonRequired', 'A mandatory reason is required to issue a credit note.'));
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      await invoiceService.creditInvoice(creditInvoice.id, creditReason.trim());
      setCreditInvoice(null);
      await loadInvoices();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to issue credit note.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = (inv: Invoice) => {
    setPreviewInvoiceId(inv.id);
  };

  const handleDownload = async (inv: Invoice) => {
    try {
      await downloadInvoiceDoc(inv.id, inv.invoiceNumber);
    } catch (err) {
      alert('Failed to download invoice document.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#dcfce7', color: '#166534' }}>
            <CheckCircle2 size={13} /> {t('invoices.status.paid', 'Paid / مدفوعة')}
          </span>
        );
      case 'PartiallyPaid':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>
            <Clock size={13} /> {t('invoices.status.partial', 'Partially Paid / سداد جزئي')}
          </span>
        );
      case 'Credited':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#fee2e2', color: '#991b1b' }}>
            <Ban size={13} /> {t('invoices.status.credited', 'Credited / ملغاة بدائن')}
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#e0f2fe', color: '#0369a1' }}>
            <AlertCircle size={13} /> {t('invoices.status.unpaid', 'Unpaid / غير مسددة')}
          </span>
        );
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color, #cbd5e1)',
    background: 'var(--bg-card, #ffffff)',
    color: 'inherit',
    fontSize: '14px',
    outline: 'none'
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 8px 40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={28} color="#2563eb" />
            {t('invoices.title', 'Invoices / الفواتير الضريبية')}
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px', margin: '4px 0 0' }}>
            {isCustomer 
              ? t('invoices.customerSubtitle', 'View, print, and track all your workshop invoices and payment receipts.')
              : t('invoices.subtitle', 'Official tax invoices, line items, customer settlements, payments, and credit notes.')}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {!isCustomer && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '13px', fontWeight: 600 }}>{t('invoices.stats.totalInvoiced', 'Total Invoiced / إجمالي الفواتير')}</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: '#1e3a8a' }}>
              <Money amount={totals.totalInvoiced} />
            </div>
          </div>
          <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '13px', fontWeight: 600 }}>{t('invoices.stats.totalCollected', 'Total Collected / المحصل')}</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: '#16a34a' }}>
              <Money amount={totals.totalCollected} />
            </div>
          </div>
          <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '13px', fontWeight: 600 }}>{t('invoices.stats.outstanding', 'Outstanding / المتبقي')}</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: totals.totalRemaining > 0 ? '#dc2626' : '#16a34a' }}>
              <Money amount={totals.totalRemaining} />
            </div>
          </div>
          <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '13px', fontWeight: 600 }}>{t('invoices.stats.creditedCount', 'Credit Notes / إشعارات دائنة')}</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: '#9333ea' }}>
              {totals.creditedCount}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: i18n.dir() === 'rtl' ? 'auto' : '10px', right: i18n.dir() === 'rtl' ? '10px' : 'auto', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={t('invoices.searchPlaceholder', 'Search by invoice #, customer, car plate, work order...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, width: '100%', paddingLeft: i18n.dir() === 'rtl' ? '12px' : '36px', paddingRight: i18n.dir() === 'rtl' ? '36px' : '12px' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ ...inputStyle, width: '160px' }}
        >
          <option value="All">{t('invoices.filters.allStatus', 'All Statuses (الكل)')}</option>
          <option value="Paid">{t('invoices.filters.paid', 'Paid (مدفوعة)')}</option>
          <option value="PartiallyPaid">{t('invoices.filters.partial', 'Partially Paid (جزئي)')}</option>
          <option value="Unpaid">{t('invoices.filters.unpaid', 'Unpaid (غير مسددة)')}</option>
          <option value="Credited">{t('invoices.filters.credited', 'Credited (إشعار دائن)')}</option>
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>{t('invoices.filters.from', 'From:')}</span>
          <input 
            type="date" 
            value={dateFrom} 
            onChange={e => setDateFrom(e.target.value)} 
            style={{ ...inputStyle, width: '140px' }} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>{t('invoices.filters.to', 'To:')}</span>
          <input 
            type="date" 
            value={dateTo} 
            onChange={e => setDateTo(e.target.value)} 
            style={{ ...inputStyle, width: '140px' }} 
          />
        </div>

        {(searchQuery || statusFilter !== 'All' || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('All'); setDateFrom(''); setDateTo(''); }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#64748b' }}
          >
            {t('common.reset', 'Clear Filters (إلغاء التصفية)')}
          </button>
        )}
      </div>

      {/* Invoices Table */}
      <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            {t('common.loading', 'Loading invoices...')}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            {t('invoices.empty', 'No invoices match the specified criteria.')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: i18n.dir() === 'rtl' ? 'right' : 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #475569)', fontWeight: 600 }}>
                  <th style={{ padding: '12px 14px' }}>{t('invoices.table.invoiceNumber', 'Invoice #')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('invoices.table.date', 'Date')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('invoices.table.customer', 'Customer')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('invoices.table.vehicle', 'Car / Plate')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('invoices.table.workOrder', 'Work Order')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>{t('invoices.table.total', 'Total')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>{t('invoices.table.paid', 'Paid')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>{t('invoices.table.remaining', 'Remaining')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>{t('invoices.table.status', 'Status')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv, idx) => (
                  <tr 
                    key={inv.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color, #f1f5f9)',
                      background: inv.status === 'Credited' ? 'rgba(254, 242, 242, 0.4)' : idx % 2 === 0 ? 'transparent' : 'rgba(248, 250, 252, 0.4)'
                    }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2563eb' }}>
                      <span 
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(inv.issuedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div dir="auto" style={{ fontWeight: 600 }}>{inv.customerName}</div>
                      {inv.customerPhone && (
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span dir="ltr">{inv.customerPhone}</span>
                          <a
                            href={`https://wa.me/20${inv.customerPhone.replace(/^0+/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#25D366', display: 'inline-flex', alignItems: 'center' }}
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div dir="auto" style={{ fontWeight: 600 }}>{inv.carPlate || '—'}</div>
                      <div dir="auto" style={{ fontSize: '12px', color: '#64748b' }}>{inv.carMakeModel || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {inv.workOrderNumber || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                      <Money amount={inv.totalAmount} />
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                      <Money amount={inv.paidAmount} />
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: inv.remainingAmount > 0 ? '#dc2626' : '#16a34a' }}>
                      <Money amount={inv.remainingAmount} />
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {getStatusBadge(inv.status)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        {/* View Details */}
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          title={t('invoices.actions.view', 'View Details')}
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', color: '#475569' }}
                        >
                          <Eye size={15} />
                        </button>

                        {/* In-place Preview / Print */}
                        <button
                          onClick={() => handlePrint(inv)}
                          title={t('invoices.actions.print', 'Preview & Print Invoice (A4)')}
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', color: '#2563eb' }}
                        >
                          <Printer size={15} />
                        </button>

                        {/* Edit Unique ID (Admin/Staff only) */}
                        {!isCustomer && (
                          <button
                            onClick={() => setEditIdInvoice(inv)}
                            title={t('invoices.actions.editId', 'Edit Invoice ID / تعديل رقم الفاتورة')}
                            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', color: '#6366f1' }}
                          >
                            <Edit3 size={15} />
                          </button>
                        )}

                        {/* Download Document */}
                        <button
                          onClick={() => handleDownload(inv)}
                          title={t('invoices.actions.download', 'Download PDF / HTML')}
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', color: '#0284c7' }}
                        >
                          <Download size={15} />
                        </button>

                        {/* Add Payment (Admin/Reception/Accountant only) */}
                        {!isCustomer && inv.status !== 'Credited' && inv.remainingAmount > 0 && (
                          <button
                            onClick={() => handleOpenPayment(inv)}
                            title={t('invoices.actions.pay', 'Record Payment')}
                            style={{ padding: '6px 10px', borderRadius: '4px', border: 'none', background: '#16a34a', color: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <CreditCard size={14} /> {t('invoices.actions.payShort', 'Pay')}
                          </button>
                        )}

                        {/* Issue Credit Note (Admin/Reception/Accountant only) */}
                        {!isCustomer && inv.status !== 'Credited' && (
                          <button
                            onClick={() => handleOpenCredit(inv)}
                            title={t('invoices.actions.credit', 'Issue Credit Note')}
                            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. PAYMENT MODAL                                                          */}
      {/* ========================================================================= */}
      {paymentInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '10px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard color="#16a34a" size={20} />
                {t('invoices.paymentModal.title', 'Record Invoice Payment')}
              </h2>
              <button onClick={() => setPaymentInvoice(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
              <div><strong>{t('invoices.table.invoiceNumber', 'Invoice #')}:</strong> {paymentInvoice.invoiceNumber}</div>
              <div><strong>{t('invoices.table.customer', 'Customer')}:</strong> <span dir="auto">{paymentInvoice.customerName}</span></div>
              <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('invoices.table.remaining', 'Remaining Balance')}:</span>
                <span style={{ fontWeight: 800, color: '#dc2626' }}><Money amount={paymentInvoice.remainingAmount} /></span>
              </div>
            </div>

            {actionError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handleRecordPayment}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('invoices.paymentModal.amount', 'Payment Amount (L.E / ج.م)')} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={paymentInvoice.remainingAmount}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  style={{ ...inputStyle, width: '100%', fontSize: '16px', fontWeight: 700 }}
                  required
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  {t('invoices.paymentModal.amountHint', 'Partial payment allowed. Overpayment is strictly rejected.')}
                </span>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('invoices.paymentModal.method', 'Payment Method')} *
                </label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                >
                  <option value="Cash">{t('invoices.paymentMethods.cash', 'Cash (نقدي)')}</option>
                  <option value="Card">{t('invoices.paymentMethods.card', 'Bank Card / Visa (بطاقة بنكية)')}</option>
                  <option value="BankTransfer">{t('invoices.paymentMethods.transfer', 'Bank Transfer (تحويل بنكي)')}</option>
                  <option value="Cheque">{t('invoices.paymentMethods.cheque', 'Cheque (شيك بنكي)')}</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('invoices.paymentModal.reference', 'Reference / Transaction # (Optional)')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. POS-4912, Check #1294"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('invoices.paymentModal.notes', 'Notes / ملاحظات')}
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentInvoice(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', fontSize: '13px' }}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer' }}
                >
                  {actionLoading ? t('common.saving', 'Recording...') : t('invoices.paymentModal.submit', 'Confirm Payment (تأكيد السداد)')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CREDIT NOTE MODAL                                                      */}
      {/* ========================================================================= */}
      {creditInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '10px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={20} />
                {t('invoices.creditModal.title', 'Issue Credit Note (إصدار إشعار دائن)')}
              </h2>
              <button onClick={() => setCreditInvoice(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
              <strong>⚠️ {t('invoices.creditModal.warning', 'Warning / تنبيه هام')}:</strong>
              <div style={{ marginTop: '4px', lineHeight: 1.5 }}>
                {t('invoices.creditModal.desc', 'Crediting this invoice will mark it as Credited (CN), remove it from outstanding receivables, automatically refund collected cash ({amount}) via Treasury, and restore stock for issued parts once.', { amount: creditInvoice.paidAmount.toFixed(2) })}
              </div>
            </div>

            {actionError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handleIssueCredit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  {t('invoices.creditModal.reasonLabel', 'Mandatory Reason for Cancellation / سبب الإلغاء الإلزامي')} *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={t('invoices.creditModal.reasonPlaceholder', 'e.g. Customer returned parts / Warranty claim / Work cancelled by management...')}
                  value={creditReason}
                  onChange={e => setCreditReason(e.target.value)}
                  style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCreditInvoice(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', fontSize: '13px' }}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer' }}
                >
                  {actionLoading ? t('common.saving', 'Processing...') : t('invoices.creditModal.confirm', 'Issue Credit Note (تأكيد إصدار الإشعار)')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DETAILS MODAL                                                          */}
      {/* ========================================================================= */}
      {selectedInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '10px', maxWidth: '780px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#1e3a8a' }}>
                  {selectedInvoice.invoiceNumber}
                </h2>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  {new Date(selectedInvoice.issuedAt).toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handlePrint(selectedInvoice)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', fontWeight: 600, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                >
                  <Printer size={15} /> {t('common.print', 'Print')}
                </button>
                <button
                  onClick={() => handleDownload(selectedInvoice)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'transparent', color: '#475569', fontWeight: 600, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                >
                  <Download size={15} /> {t('common.download', 'Download')}
                </button>
                <button onClick={() => setSelectedInvoice(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Customer & Car Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '8px', fontSize: '13px' }}>
              <div>
                <div style={{ color: '#64748b', fontWeight: 600 }}>{t('invoices.table.customer', 'Customer Details')}</div>
                <div dir="auto" style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>{selectedInvoice.customerName}</div>
                {selectedInvoice.customerPhone && <div dir="ltr" style={{ color: '#64748b' }}>{selectedInvoice.customerPhone}</div>}
                {selectedInvoice.workOrderNumber && (
                  <div style={{ marginTop: '4px' }}>
                    <strong>{t('invoices.table.workOrder', 'Work Order')}:</strong> {selectedInvoice.workOrderNumber}
                  </div>
                )}
              </div>
              <div>
                <div style={{ color: '#64748b', fontWeight: 600 }}>{t('invoices.table.vehicle', 'Vehicle Details')}</div>
                <div dir="auto" style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>{selectedInvoice.carPlate}</div>
                <div dir="auto" style={{ color: '#64748b' }}>{selectedInvoice.carMakeModel}</div>
                <div style={{ marginTop: '4px' }}>
                  <strong>{t('invoices.table.status', 'Status')}:</strong> {getStatusBadge(selectedInvoice.status)}
                </div>
              </div>
            </div>

            {/* Credited Banner */}
            {selectedInvoice.status === 'Credited' && (
              <div style={{ background: '#fee2e2', border: '1px dashed #dc2626', borderRadius: '6px', padding: '10px 14px', color: '#991b1b', fontWeight: 700, fontSize: '13px', marginBottom: '20px', textAlign: 'center' }}>
                ⚠️ {t('invoices.creditedNotice', 'This invoice has been voided via Credit Note (CN-{number}). Stock restored and payments refunded.', { number: selectedInvoice.invoiceNumber })}
              </div>
            )}

            {/* Financial Breakdown */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px 0' }}>{t('invoices.breakdown.title', 'Invoice Financial Summary')}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '13px' }}>
                <div>
                  <div style={{ color: '#64748b' }}>{t('invoices.breakdown.subtotal', 'Subtotal')}</div>
                  <div style={{ fontWeight: 700 }}><Money amount={selectedInvoice.subtotal} /></div>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div>
                    <div style={{ color: '#ef4444' }}>{t('invoices.breakdown.discount', 'Discount')}</div>
                    <div style={{ fontWeight: 700, color: '#ef4444' }}>-<Money amount={selectedInvoice.discountAmount} /></div>
                  </div>
                )}
                {showVat && (
                  <div>
                    <div style={{ color: '#64748b' }}>{t('invoices.breakdown.vat', 'VAT ({vat}%)', { vat: selectedInvoice.vatPercentage })}</div>
                    <div style={{ fontWeight: 700 }}><Money amount={selectedInvoice.vatAmount} /></div>
                  </div>
                )}
                <div>
                  <div style={{ color: '#2563eb', fontWeight: 700 }}>{t('invoices.breakdown.total', 'Total Amount')}</div>
                  <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '15px' }}><Money amount={selectedInvoice.totalAmount} /></div>
                </div>
                <div>
                  <div style={{ color: '#16a34a', fontWeight: 700 }}>{t('invoices.breakdown.paid', 'Paid Amount')}</div>
                  <div style={{ fontWeight: 700, color: '#16a34a' }}><Money amount={selectedInvoice.paidAmount} /></div>
                </div>
                <div>
                  <div style={{ color: selectedInvoice.remainingAmount > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{t('invoices.breakdown.remaining', 'Remaining')}</div>
                  <div style={{ fontWeight: 800, color: selectedInvoice.remainingAmount > 0 ? '#dc2626' : '#16a34a' }}><Money amount={selectedInvoice.remainingAmount} /></div>
                </div>
              </div>
            </div>

            {/* Payments History */}
            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', fontWeight: 700, fontSize: '14px', borderBottom: '1px solid #e2e8f0' }}>
                  {t('invoices.paymentsHistory', 'Payment Transactions (سجل السداد)')}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 12px', textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}>{t('invoices.paymentModal.amount', 'Amount')}</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>{t('invoices.paymentModal.method', 'Method')}</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>{t('invoices.paymentModal.reference', 'Reference')}</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>{t('invoices.table.date', 'Date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.payments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: p.amount < 0 ? '#dc2626' : '#16a34a' }}>
                          <Money amount={p.amount} />
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{p.paymentMethod}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{p.referenceNumber || '—'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{new Date(p.paidAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal (A4 Word Template Layout) */}
      <InvoicePreviewModal
        isOpen={previewInvoiceId !== null}
        onClose={() => setPreviewInvoiceId(null)}
        invoiceId={previewInvoiceId || undefined}
        title={t('invoices.previewTitle', 'Tax Invoice Preview (A4) / معاينة الفاتورة')}
        onEdit={!isCustomer ? () => {
          const inv = invoices.find(i => i.id === previewInvoiceId);
          if (inv) {
            setEditIdInvoice(inv);
          }
        } : undefined}
      />

      {/* Edit Unique Invoice ID Modal */}
      <EditInvoiceIdModal
        isOpen={editIdInvoice !== null}
        onClose={() => setEditIdInvoice(null)}
        invoice={editIdInvoice}
        onSuccess={() => {
          loadInvoices();
        }}
      />
    </div>
  );
};

export default InvoicesPage;
