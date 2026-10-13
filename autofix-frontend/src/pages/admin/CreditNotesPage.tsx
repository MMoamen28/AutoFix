import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileText, Search, Printer, Download, RotateCcw, 
  CheckCircle2, AlertCircle, X, ShieldCheck, UserCheck, MessageCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import invoiceService, { CreditNote } from '../../services/invoiceService';
import Money from '../../components/shared/Money';
import { printInvoiceInPlace } from '../../utils/printHelper';

const CreditNotesPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedNote, setSelectedNote] = useState<CreditNote | null>(null);

  useEffect(() => {
    loadCreditNotes();
  }, []);

  const loadCreditNotes = async () => {
    setLoading(true);
    try {
      const data = await invoiceService.getAllCreditNotes();
      setNotes(data || []);
    } catch (err) {
      console.error('Failed to load credit notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(cn => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCn = cn.creditNoteNumber.toLowerCase().includes(q);
        const matchInv = cn.invoiceNumber.toLowerCase().includes(q);
        const matchCust = (cn.customerName || '').toLowerCase().includes(q);
        const matchPhone = (cn.customerPhone || '').toLowerCase().includes(q);
        const matchPlate = (cn.carPlate || '').toLowerCase().includes(q);
        const matchCar = (cn.carMakeModel || '').toLowerCase().includes(q);
        const matchReason = (cn.reason || '').toLowerCase().includes(q);
        if (!matchCn && !matchInv && !matchCust && !matchPhone && !matchPlate && !matchCar && !matchReason) {
          return false;
        }
      }

      if (dateFrom) {
        const d = new Date(cn.issuedAt).toISOString().split('T')[0];
        if (d < dateFrom) return false;
      }
      if (dateTo) {
        const d = new Date(cn.issuedAt).toISOString().split('T')[0];
        if (d > dateTo) return false;
      }

      return true;
    });
  }, [notes, searchQuery, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const totalCount = filteredNotes.length;
    const totalRefunded = filteredNotes.reduce((acc, cn) => acc + cn.amountRefunded, 0);
    const totalRestoredCount = filteredNotes.filter(cn => cn.stockRestored).length;
    return { totalCount, totalRefunded, totalRestoredCount };
  }, [filteredNotes]);

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
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#9333ea' }}>
            <RotateCcw size={28} />
            {t('creditNotes.title', 'Credit Notes / إشعارات دائنة')}
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px', margin: '4px 0 0' }}>
            {t('creditNotes.subtitle', 'Official credit notes for voided invoices. Automatically reverses revenue, logs refunds, and restores inventory.')}
          </p>
        </div>
      </div>

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '13px', fontWeight: 600 }}>{t('creditNotes.stats.totalNotes', 'Total Credit Notes / إجمالي الإشعارات')}</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: '#9333ea' }}>
            {totals.totalCount}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '13px', fontWeight: 600 }}>{t('creditNotes.stats.totalRefunded', 'Total Amount Refunded / المبالغ المستردة')}</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: '#dc2626' }}>
            <Money amount={totals.totalRefunded} />
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '13px', fontWeight: 600 }}>{t('creditNotes.stats.stockRestored', 'Stock Restored Batches / دفعات الإرجاع')}</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={24} /> {totals.totalRestoredCount}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: i18n.dir() === 'rtl' ? 'auto' : '10px', right: i18n.dir() === 'rtl' ? '10px' : 'auto', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={t('creditNotes.searchPlaceholder', 'Search by CN #, invoice #, customer, car, reason...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, width: '100%', paddingLeft: i18n.dir() === 'rtl' ? '12px' : '36px', paddingRight: i18n.dir() === 'rtl' ? '36px' : '12px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>{t('common.from', 'From:')}</span>
          <input 
            type="date" 
            value={dateFrom} 
            onChange={e => setDateFrom(e.target.value)} 
            style={{ ...inputStyle, width: '140px' }} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>{t('common.to', 'To:')}</span>
          <input 
            type="date" 
            value={dateTo} 
            onChange={e => setDateTo(e.target.value)} 
            style={{ ...inputStyle, width: '140px' }} 
          />
        </div>

        {(searchQuery || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#64748b' }}
          >
            {t('common.reset', 'Clear Filters')}
          </button>
        )}
      </div>

      {/* Credit Notes Table */}
      <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            {t('common.loading', 'Loading credit notes...')}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            {t('creditNotes.empty', 'No credit notes recorded yet.')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: i18n.dir() === 'rtl' ? 'right' : 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #475569)', fontWeight: 600 }}>
                  <th style={{ padding: '12px 14px' }}>{t('creditNotes.table.cnNumber', 'Credit Note #')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('creditNotes.table.invoice', 'Original Invoice')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('creditNotes.table.date', 'Date')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('creditNotes.table.customer', 'Customer')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('creditNotes.table.vehicle', 'Car / Plate')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>{t('creditNotes.table.refunded', 'Refunded Amount')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>{t('creditNotes.table.stock', 'Stock Restored')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('creditNotes.table.reason', 'Reason')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>{t('creditNotes.table.issuedBy', 'By')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map((cn, idx) => (
                  <tr 
                    key={cn.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color, #f1f5f9)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(248, 250, 252, 0.4)'
                    }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#9333ea' }}>
                      <span 
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setSelectedNote(cn)}
                      >
                        {cn.creditNoteNumber}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#2563eb' }}>
                      {cn.invoiceNumber}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(cn.issuedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div dir="auto" style={{ fontWeight: 600 }}>{cn.customerName}</div>
                      {cn.customerPhone && (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          <span dir="ltr">{cn.customerPhone}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div dir="auto" style={{ fontWeight: 600 }}>{cn.carPlate || '—'}</div>
                      <div dir="auto" style={{ fontSize: '12px', color: '#64748b' }}>{cn.carMakeModel || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                      <Money amount={cn.amountRefunded} />
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {cn.stockRestored ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#dcfce7', color: '#166534' }}>
                          <CheckCircle2 size={13} /> {t('creditNotes.stockRestored', 'Restored')}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span dir="auto" title={cn.reason}>{cn.reason}</span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      {cn.issuedBy}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={() => setSelectedNote(cn)}
                          title={t('common.details', 'View Details')}
                          style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#475569' }}
                        >
                          {t('common.details', 'Details')}
                        </button>
                        <button
                          onClick={() => printInvoiceInPlace(cn.invoiceId)}
                          title={t('creditNotes.printInvoice', 'Print Invoice')}
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', color: '#2563eb' }}
                        >
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '10px', maxWidth: '580px', width: '100%', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#9333ea' }}>
                  {selectedNote.creditNoteNumber}
                </h2>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  {new Date(selectedNote.issuedAt).toLocaleString()}
                </div>
              </div>
              <button onClick={() => setSelectedNote(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
              <div><strong>{t('creditNotes.table.invoice', 'Original Invoice')}:</strong> <span style={{ color: '#2563eb', fontWeight: 700 }}>{selectedNote.invoiceNumber}</span></div>
              {selectedNote.workOrderNumber && <div><strong>{t('invoices.table.workOrder', 'Work Order')}:</strong> {selectedNote.workOrderNumber}</div>}
              <div><strong>{t('creditNotes.table.customer', 'Customer')}:</strong> <span dir="auto">{selectedNote.customerName}</span> ({selectedNote.customerPhone})</div>
              <div><strong>{t('creditNotes.table.vehicle', 'Vehicle')}:</strong> <span dir="auto">{selectedNote.carPlate}</span> — {selectedNote.carMakeModel}</div>
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '12px 0' }} />
              <div><strong>{t('creditNotes.originalTotal', 'Original Invoice Total')}:</strong> <Money amount={selectedNote.invoiceTotal} /></div>
              <div style={{ color: '#dc2626' }}><strong>{t('creditNotes.table.refunded', 'Amount Refunded')}:</strong> <Money amount={selectedNote.amountRefunded} /></div>
              <div><strong>{t('creditNotes.table.stock', 'Stock Restored')}:</strong> {selectedNote.stockRestored ? t('common.yes', 'Yes (تم إرجاع قطع الغيار)') : t('common.no', 'No')}</div>
              <div><strong>{t('creditNotes.table.issuedBy', 'Issued By')}:</strong> {selectedNote.issuedBy}</div>
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '12px 0' }} />
              <div><strong>{t('creditNotes.table.reason', 'Mandatory Reason')}:</strong></div>
              <div dir="auto" style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px', marginTop: '4px', fontStyle: 'italic' }}>
                {selectedNote.reason}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => printInvoiceInPlace(selectedNote.invoiceId)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', fontWeight: 600, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              >
                <Printer size={15} /> {t('creditNotes.printInvoice', 'Print Invoice')}
              </button>
              <button
                onClick={() => setSelectedNote(null)}
                style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditNotesPage;
