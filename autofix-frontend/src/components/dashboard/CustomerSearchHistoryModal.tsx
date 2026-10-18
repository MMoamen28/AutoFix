import React, { useState, useEffect } from 'react';
import { 
  User, Car, FileText, Wrench, DollarSign, Calendar, 
  Clock, ShieldAlert, CheckCircle, RefreshCw, FileSpreadsheet, Download 
} from 'lucide-react';
import Modal from '../shared/Modal';
import axiosClient from '../../services/axiosClient';
import Money from '../shared/Money';
import toast from 'react-hot-toast';

interface CustomerSearchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: number;
  carId?: number;
  workOrderId?: number;
  invoiceId?: number;
}

export const CustomerSearchHistoryModal: React.FC<CustomerSearchHistoryModalProps> = ({
  isOpen,
  onClose,
  customerId,
  carId,
  workOrderId,
  invoiceId
}) => {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [cars, setCars] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isExportingRecord, setIsExportingRecord] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        let targetCustomerId = customerId;

        // If we only have workOrderId or invoiceId, find the customer
        if (!targetCustomerId && workOrderId) {
          const woRes = await axiosClient.get(`/work-orders/${workOrderId}`);
          if (woRes.data?.customerId) targetCustomerId = woRes.data.customerId;
        } else if (!targetCustomerId && invoiceId) {
          const invRes = await axiosClient.get(`/invoices/${invoiceId}`);
          if (invRes.data?.customerId) targetCustomerId = invRes.data.customerId;
        }

        if (targetCustomerId) {
          const [cRes, carsRes, woRes, invRes] = await Promise.allSettled([
            axiosClient.get(`/customers/${targetCustomerId}`),
            axiosClient.get(`/cars?customerId=${targetCustomerId}`),
            axiosClient.get(`/work-orders?customerId=${targetCustomerId}`),
            axiosClient.get(`/invoices?customerId=${targetCustomerId}`)
          ]);

          if (cRes.status === 'fulfilled') setCustomer(cRes.value.data);
          if (carsRes.status === 'fulfilled') setCars(Array.isArray(carsRes.value.data) ? carsRes.value.data : []);
          if (woRes.status === 'fulfilled') setWorkOrders(Array.isArray(woRes.value.data) ? woRes.value.data : []);
          if (invRes.status === 'fulfilled') setInvoices(Array.isArray(invRes.value.data) ? invRes.value.data : []);
        }
      } catch (err) {
        console.error('Failed to load customer history', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, customerId, carId, workOrderId, invoiceId]);

  if (!isOpen) return null;

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const totalDebt = totalInvoiced - totalPaid;

  const handleExportCustomerRecord = async () => {
    if (!customer?.id) return;
    setIsExportingRecord(true);
    try {
      const res = await axiosClient.get(`/reports/customer/${customer.id}`, {
        responseType: 'blob'
      });
      let fileName = `AP_Customer_${customer.phone || customer.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const disposition = res.headers['content-disposition'];
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          fileName = match[1].replace(/['"]/g, '').trim();
        }
      }
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      toast.success('تم تصدير سجل العميل بالكامل بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء تصدير سجل العميل');
    } finally {
      setIsExportingRecord(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="سجل العميل والسيارات والخدمات السابقة"
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Cairo, sans-serif' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <RefreshCw className="animate-spin text-accent" size={32} />
          </div>
        ) : !customer ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
            لا تتوفر تفاصيل لهذا السجل
          </div>
        ) : (
          <>
            {/* Customer & Debt Overview Card */}
            <div style={infoCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                    {customer.fullName}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                    الهاتف: <bdi dir="auto">{customer.phone || 'غير مسجل'}</bdi>
                  </div>
                  <button
                    onClick={handleExportCustomerRecord}
                    disabled={isExportingRecord}
                    style={{
                      marginTop: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: '6px',
                      color: '#10b981',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: isExportingRecord ? 'not-allowed' : 'pointer',
                      opacity: isExportingRecord ? 0.7 : 1
                    }}
                    title="تصدير سجل العميل والسيارات والزيارات والقطع المستخدمة إلى ملف Excel"
                  >
                    <FileSpreadsheet size={14} color="#10b981" />
                    <span>{isExportingRecord ? 'جاري التصدير...' : 'تصدير سجل العميل (Excel)'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ background: '#0d1117', padding: '8px 14px', borderRadius: '8px', border: '1px solid #212c3d', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>إجمالي الفواتير</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                      <Money value={totalInvoiced} />
                    </div>
                  </div>
                  <div style={{ background: '#0d1117', padding: '8px 14px', borderRadius: '8px', border: '1px solid #212c3d', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>المسدد</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981' }}>
                      <Money value={totalPaid} />
                    </div>
                  </div>
                  <div style={{ background: '#0d1117', padding: '8px 14px', borderRadius: '8px', border: '1px solid #212c3d', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>المديونية المتبقية</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: totalDebt > 0 ? '#ef4444' : '#10b981' }}>
                      <Money value={totalDebt} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Registered Cars */}
            <div style={sectionBoxStyle}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Car size={16} /> السيارات المسجلة ({cars.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {cars.map(c => (
                  <div key={c.id} style={{ background: '#0d1117', border: '1px solid #212c3d', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 800, color: '#ffffff' }}>{c.licensePlate}</div>
                    <div style={{ color: '#94a3b8' }}>{c.make} {c.model} ({c.year}) - {c.odometerKm} كم</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Past Work Orders */}
            <div style={sectionBoxStyle}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#3b82f6', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wrench size={16} /> سجل أوامر الشغل السابقة ({workOrders.length})
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #212c3d', borderRadius: '8px' }}>
                {workOrders.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>لا توجد أوامر شغل سابقة</div>
                ) : (
                  workOrders.map(wo => (
                    <div key={wo.id} style={{ padding: '8px 12px', borderBottom: '1px solid #1c2430', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>#{wo.orderNumber} - {wo.carPlate}</div>
                        <div style={{ color: '#94a3b8', fontSize: '11px' }}>{wo.customerComplaint || wo.workType}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, color: '#e2e8f0' }}><Money value={wo.totalAmount} /></div>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>{new Date(wo.createdAt).toLocaleDateString('ar-EG')}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Invoices */}
            <div style={sectionBoxStyle}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#f59e0b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} /> الفواتير والمدفوعات ({invoices.length})
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #212c3d', borderRadius: '8px' }}>
                {invoices.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>لا توجد فواتير سابقة</div>
                ) : (
                  invoices.map(inv => (
                    <div key={inv.id} style={{ padding: '8px 12px', borderBottom: '1px solid #1c2430', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{inv.invoiceNumber}</div>
                        <div style={{ color: '#94a3b8', fontSize: '11px' }}>الحالة: {inv.status === 'Paid' ? 'مدفوعة' : inv.status === 'Issued' ? 'صادرة' : inv.status}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 800, color: '#ffffff' }}><Money value={inv.totalAmount} /></div>
                        <div style={{ color: '#10b981', fontSize: '11px' }}>مسدد: <Money value={inv.paidAmount} /></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

const infoCardStyle: React.CSSProperties = {
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '12px',
  padding: '16px'
};

const sectionBoxStyle: React.CSSProperties = {
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '12px',
  padding: '14px'
};

export default CustomerSearchHistoryModal;
