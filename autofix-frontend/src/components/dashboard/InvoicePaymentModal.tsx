import React, { useState } from 'react';
import { DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import Modal from '../shared/Modal';
import axiosClient from '../../services/axiosClient';

interface InvoicePaymentModalProps {
  isOpen: boolean;
  invoiceId: number | null;
  invoiceNumber?: string;
  totalAmount?: number;
  remainingAmount?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  isOpen,
  invoiceId,
  invoiceNumber,
  remainingAmount = 0,
  onClose,
  onSuccess
}) => {
  const [amount, setAmount] = useState<string>(remainingAmount ? remainingAmount.toString() : '');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setAmount(remainingAmount ? remainingAmount.toString() : '');
      setError('');
    }
  }, [isOpen, remainingAmount]);

  if (!isOpen || !invoiceId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('يرجى إدخال مبلغ دفع صحيح');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await axiosClient.post('/invoices/payments', {
        invoiceId,
        amount: val,
        paymentMethod,
        referenceNumber,
        notes
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تسجيل الدفعة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تحصيل دفعة للفاتورة ${invoiceNumber ? `#${invoiceNumber}` : ''}`}
    >
      <form onSubmit={handleSubmit} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'Cairo, sans-serif' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
            مبلغ الدفعة (ج.م) *
          </label>
          <input
            type="number"
            step="0.01"
            required
            autoFocus
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
            طريقة الدفع
          </label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            style={inputStyle}
          >
            <option value="Cash">نقدي (كاش)</option>
            <option value="Card">فيزا / بطاقة</option>
            <option value="BankTransfer">تحويل بنكي</option>
            <option value="VodafoneCash">محفظة إلكترونية</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
            رقم المرجع / الإيصال
          </label>
          <input
            type="text"
            value={referenceNumber}
            onChange={e => setReferenceNumber(e.target.value)}
            placeholder="اختياري"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
            ملاحظات
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="اختياري"
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ backgroundColor: '#1c2430', color: '#94a3b8', border: '1px solid #2a3749', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'Cairo, sans-serif' }}
          >
            <CheckCircle2 size={16} />
            <span>{isSubmitting ? 'جاري التحصيل...' : 'تأكيد التحصيل'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  backgroundColor: '#0d1117',
  border: '1px solid #2a3749',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'Cairo, sans-serif'
};

export default InvoicePaymentModal;
