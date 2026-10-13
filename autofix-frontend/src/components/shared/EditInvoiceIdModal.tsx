import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit3, AlertCircle, Save, X, History } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import invoiceService, { Invoice } from '../../services/invoiceService';

interface EditInvoiceIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}

export const EditInvoiceIdModal: React.FC<EditInvoiceIdModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess
}) => {
  const { t } = useTranslation();
  const [newInvoiceNumber, setNewInvoiceNumber] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLocked = invoice ? (invoice.status !== 'Draft' || invoice.paidAmount > 0) : false;

  useEffect(() => {
    if (invoice && isOpen) {
      setNewInvoiceNumber(invoice.invoiceNumber);
      setReason('');
      setError('');
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoiceNumber.trim()) {
      setError(t('invoices.errors.emptyNumber', 'Invoice ID cannot be empty.'));
      return;
    }

    if (isLocked && !reason.trim()) {
      setError(t('invoices.errors.reasonRequired', 'A mandatory reason is required to change an issued invoice ID.'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await invoiceService.updateInvoiceNumber(invoice.id, newInvoiceNumber.trim(), reason.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || t('invoices.errors.updateFailed', 'Failed to update invoice ID.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('invoices.editIdTitle', 'Edit Unique Invoice ID / تعديل رقم الفاتورة')}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            padding: '10px 14px',
            color: '#f87171',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#cbd5e1' }}>
            {t('invoices.currentId', 'Current Invoice ID')}
          </label>
          <input
            type="text"
            value={invoice.invoiceNumber}
            disabled
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border, #334155)',
              color: '#94a3b8',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#cbd5e1' }}>
            {t('invoices.newId', 'New Unique Invoice ID (e.g. INV-202610-0005)')} *
          </label>
          <input
            type="text"
            value={newInvoiceNumber}
            onChange={e => setNewInvoiceNumber(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'var(--bg-secondary, #1e293b)',
              border: '1px solid var(--border, #334155)',
              color: '#f8fafc',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}
          />
        </div>

        {isLocked && (
          <div>
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px',
              padding: '8px 12px',
              color: '#fbbf24',
              fontSize: '12px',
              marginBottom: '10px'
            }}>
              ⚠️ {t('invoices.lockedNotice', 'This invoice is Issued or has recorded payments. Changing its ID requires Administrator authority and a mandatory audit reason.')}
            </div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#cbd5e1' }}>
              {t('invoices.changeReason', 'Reason for Changing ID (سبب التعديل)')} *
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              required={isLocked}
              rows={3}
              placeholder={t('invoices.reasonPlaceholder', 'Explain why the ID is being changed...')}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'var(--bg-secondary, #1e293b)',
                border: '1px solid var(--border, #334155)',
                color: '#f8fafc',
                fontSize: '13px',
                resize: 'vertical'
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <Save size={16} style={{ marginInlineEnd: '6px' }} />
            {loading ? t('common.saving', 'Saving...') : t('common.saveChanges', 'Save Changes')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditInvoiceIdModal;
