import React from 'react';
import { AlertTriangle, Save, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
  isSaving = false
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={iconBadgeStyle}>
            <AlertTriangle size={24} color="#f59e0b" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
              {t('unsavedChanges.title')}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              {t('common.appName')} Workshop Management
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#e2e8f0' }}>
            {t('unsavedChanges.message')}
          </p>
        </div>

        {/* Actions: Save / Discard / Cancel */}
        <div style={footerStyle}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            style={cancelBtnStyle}
            id="unsaved-cancel-btn"
          >
            <X size={16} />
            <span>{t('unsavedChanges.cancel')}</span>
          </button>

          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            style={discardBtnStyle}
            id="unsaved-discard-btn"
          >
            <Trash2 size={16} />
            <span>{t('unsavedChanges.discard')}</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            style={saveBtnStyle}
            id="unsaved-save-btn"
          >
            <Save size={16} />
            <span>{isSaving ? t('common.saving') : t('unsavedChanges.save')}</span>
          </button>
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
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 99999,
  padding: '16px'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '12px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(245, 158, 11, 0.2)',
  maxWidth: '480px',
  width: '100%',
  overflow: 'hidden',
  animation: 'modalFadeIn 0.2s ease-out'
};

const headerStyle: React.CSSProperties = {
  padding: '20px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  borderBottom: '1px solid #334155',
  backgroundColor: '#0f172a'
};

const iconBadgeStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '10px',
  backgroundColor: 'rgba(245, 158, 11, 0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
};

const bodyStyle: React.CSSProperties = {
  padding: '24px',
  backgroundColor: '#1e293b'
};

const footerStyle: React.CSSProperties = {
  padding: '16px 24px',
  backgroundColor: '#0f172a',
  borderTop: '1px solid #334155',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
  flexWrap: 'wrap'
};

const cancelBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid #475569',
  backgroundColor: '#334155',
  color: '#e2e8f0',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease'
};

const discardBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid rgba(239, 68, 68, 0.4)',
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  color: '#f87171',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease'
};

const saveBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 18px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
};

export default UnsavedChangesDialog;
