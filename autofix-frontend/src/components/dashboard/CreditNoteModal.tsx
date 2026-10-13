import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, AlertCircle } from 'lucide-react';
import Modal from '../shared/Modal';
import axiosClient from '../../services/axiosClient';

interface CreditNoteModalProps {
  isOpen: boolean;
  invoiceId: number | null;
  invoiceNumber?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreditNoteModal: React.FC<CreditNoteModalProps> = ({
  isOpen,
  invoiceId,
  invoiceNumber,
  onClose,
  onSuccess
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !invoiceId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('يرجى توضيح سبب إصدار الإشعار الدائن (إجباري)');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await axiosClient.post('/credit-notes', {
        invoiceId,
        reason: trimmed
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل إصدار الإشعار الدائن');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`إصدار إشعار دائن للفاتورة ${invoiceNumber ? `#${invoiceNumber}` : ''}`}
    >
      <form onSubmit={handleSubmit} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: '#fca5a5' }}>
            سيتم إلغاء الفاتورة بالكامل وإرجاع قطع الغيار إلى المخزن مع توثيق العملية في حساب العميل وسجل التدقيق.
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
            سبب إصدار الإشعار الدائن (إجباري) *
          </label>
          <textarea
            required
            rows={3}
            autoFocus
            value={reason}
            onChange={e => { setReason(e.target.value); setError(''); }}
            placeholder="مثال: خطأ في البنود، إرجاع القطع، إلغاء الخدمة بناءً على طلب العميل..."
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0d1117',
              border: '1px solid #2a3749',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'Cairo, sans-serif'
            }}
          />
          {error && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ backgroundColor: '#1c2430', color: '#94a3b8', border: '1px solid #2a3749', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
          >
            تراجع
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'Cairo, sans-serif' }}
          >
            <RotateCcw size={16} />
            <span>{isSubmitting ? 'جاري الإصدار...' : 'تأكيد إصدار الإشعار الدائن'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreditNoteModal;
