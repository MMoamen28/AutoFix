import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, History, Calendar, Gauge, Wrench, AlertCircle, X } from 'lucide-react';
import api from '../../services/axiosClient';
import Button from './Button';

interface CarHistoryItem {
  workOrderId: number;
  orderNumber: string;
  date: string;
  odometerKm?: number | null;
  operationName: string;
  lineType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitCost?: number | null;
  mechanicName?: string | null;
  workType: string;
  status: string;
}

interface CarServiceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  carId?: number | null;
  carInfo?: string; // e.g. "Toyota Corolla 2020 - ABC 1234"
}

export const CarServiceHistoryModal: React.FC<CarServiceHistoryModalProps> = ({
  isOpen,
  onClose,
  carId,
  carInfo
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [history, setHistory] = useState<CarHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !carId) {
      setHistory([]);
      setSearchTerm('');
      setError(null);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<CarHistoryItem[]>(`/cars/${carId}/service-history`);
        setHistory(res.data || []);
      } catch (err: any) {
        console.error('Failed to load car service history:', err);
        setError(isArabic ? 'فشل تحميل سجل خدمات السيارة' : 'Failed to load car service history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, carId, isArabic]);

  if (!isOpen) return null;

  const filteredHistory = history.filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.orderNumber && item.orderNumber.toLowerCase().includes(term)) ||
      (item.operationName && item.operationName.toLowerCase().includes(term)) ||
      (item.mechanicName && item.mechanicName.toLowerCase().includes(term)) ||
      (item.lineType && item.lineType.toLowerCase().includes(term)) ||
      (item.workType && item.workType.toLowerCase().includes(term))
    );
  });

  const formatCurrency = (val: number) => {
    return `${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${isArabic ? 'ج.م' : 'L.E'}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div 
        style={modalBoxStyle} 
        onClick={e => e.stopPropagation()}
        className="modal-animate"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={iconBadgeStyle}>
              <History size={20} color="#D97706" />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {isArabic ? 'سجل العمليات والخدمات السابقة للسيارة' : 'Services Done on this Car'}
              </h3>
              {carInfo && (
                <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                  {carInfo}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>
            <X size={20} />
          </button>
        </div>

        {/* Filter bar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search 
              size={16} 
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                [isArabic ? 'right' : 'left']: '12px',
                color: '#94A3B8'
              }} 
            />
            <input
              type="text"
              placeholder={isArabic ? 'بحث في الخدمات، القطع، الفني، رقم الأمر...' : 'Search services, parts, mechanic, order #...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: isArabic ? '8px 36px 8px 12px' : '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                background: '#F8FAFC'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#64748B', whiteSpace: 'nowrap' }}>
            {filteredHistory.length} {isArabic ? 'عملية' : 'items'}
          </div>
        </div>

        {/* Content body */}
        <div style={{ padding: '20px', maxHeight: '550px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              {isArabic ? 'جاري تحميل السجل...' : 'Loading history...'}
            </div>
          ) : error ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#DC2626', background: '#FEF2F2', borderRadius: '8px' }}>
              <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
              <p>{error}</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              <Wrench size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontWeight: 600 }}>{isArabic ? 'لا توجد خدمات مسجلة لهذه السيارة' : 'No service history found for this car'}</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                {isArabic ? 'ستظهر هنا كافة العمليات وقطع الغيار المنجزة في أوامر الشغل السابقة.' : 'Completed services and parts will appear here automatically.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1', color: '#334155' }}>
                  <th style={thStyle}>{isArabic ? 'التاريخ' : 'Date'}</th>
                  <th style={thStyle}>{isArabic ? 'أمر الشغل' : 'WO #'}</th>
                  <th style={thStyle}>{isArabic ? 'الخدمة / القطعة' : 'Operation / Part'}</th>
                  <th style={thStyle}>{isArabic ? 'النوع' : 'Type'}</th>
                  <th style={thStyle}>{isArabic ? 'العداد (كم)' : 'Odometer (km)'}</th>
                  <th style={thStyle}>{isArabic ? 'الفني' : 'Mechanic'}</th>
                  <th style={thStyle}>{isArabic ? 'الكمية' : 'Qty'}</th>
                  <th style={thStyle}>{isArabic ? 'السعر' : 'Price'}</th>
                  <th style={thStyle}>{isArabic ? 'الإجمالي' : 'Total'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item, idx) => (
                  <tr key={`${item.workOrderId}-${idx}`} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                        <Calendar size={13} color="#64748B" />
                        {formatDate(item.date)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>
                        {item.orderNumber || `#${item.workOrderId}`}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#0F172A' }}>
                      {item.operationName}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: item.lineType === 'SparePart' || item.lineType === 'Part' ? '#EFF6FF' : '#F0FDF4',
                        color: item.lineType === 'SparePart' || item.lineType === 'Part' ? '#1D4ED8' : '#15803D'
                      }}>
                        {item.lineType === 'SparePart' || item.lineType === 'Part' ? (isArabic ? 'قطعة غيار' : 'Part') : (isArabic ? 'مصنعية / خدمة' : 'Service')}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {item.odometerKm ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                          <Gauge size={13} color="#94A3B8" />
                          {item.odometerKm.toLocaleString('en-US')}
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>-</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {item.mechanicName ? (
                        <span style={{ color: '#334155' }}>{item.mechanicName}</span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>-</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {item.quantity}
                    </td>
                    <td style={tdStyle}>
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#0F172A' }}>
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <Button variant="secondary" onClick={onClose}>
            {isArabic ? 'إغلاق' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
};

const modalBoxStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '960px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  maxHeight: '90vh'
};

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid #E2E8F0',
  backgroundColor: '#F8FAFC'
};

const iconBadgeStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  backgroundColor: '#FEF3C7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#64748B',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'start',
  fontWeight: 700,
  fontSize: '12px'
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle'
};

const footerStyle: React.CSSProperties = {
  padding: '14px 20px',
  display: 'flex',
  justifyContent: 'flex-end',
  borderTop: '1px solid #E2E8F0',
  backgroundColor: '#F8FAFC'
};
