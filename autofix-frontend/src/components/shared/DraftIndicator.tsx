import React from 'react';
import { DownloadCloud, UploadCloud, RotateCcw, Trash2, Clock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DraftIndicatorProps {
  lastSavedTime: string | null;
  isSaving: boolean;
  hasDraftAvailable?: boolean;
  draftUpdatedAt?: string | null;
  onRestore?: () => void;
  onDiscard?: () => void;
  className?: string;
}

export const DraftIndicator: React.FC<DraftIndicatorProps> = ({
  lastSavedTime,
  isSaving,
  hasDraftAvailable = false,
  draftUpdatedAt,
  onRestore,
  onDiscard,
  className = ''
}) => {
  const { t } = useTranslation();

  const formatTime = (isoOrTime?: string | null) => {
    if (!isoOrTime) return '';
    if (isoOrTime.includes('T')) {
      try {
        const d = new Date(isoOrTime);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return isoOrTime;
      }
    }
    return isoOrTime;
  };

  return (
    <div className={className} style={{ width: '100%', marginBottom: hasDraftAvailable ? '16px' : '8px' }}>
      {/* 1. Restore/Discard Banner if draft available */}
      {hasDraftAvailable && (
        <div style={bannerStyle} role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={badgeIconStyle}>
              <Clock size={18} color="#3b82f6" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                {t('draft.foundDraft')} {draftUpdatedAt ? `(${formatTime(draftUpdatedAt)})` : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onRestore && (
              <button
                type="button"
                onClick={onRestore}
                style={restoreBtnStyle}
                id="restore-draft-btn"
              >
                <RotateCcw size={14} />
                <span>{t('draft.restore')}</span>
              </button>
            )}
            {onDiscard && (
              <button
                type="button"
                onClick={onDiscard}
                style={discardBtnStyle}
                id="discard-draft-btn"
              >
                <Trash2 size={14} />
                <span>{t('draft.discard')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Small Saved Indicator */}
      {(lastSavedTime || isSaving) && !hasDraftAvailable && (
        <div style={indicatorBadgeStyle}>
          {isSaving ? (
            <>
              <UploadCloud size={14} className="animate-pulse" color="#60a5fa" />
              <span>{t('draft.autosaving')}</span>
            </>
          ) : (
            <>
              <DownloadCloud size={14} color="#34d399" />
              <span>{t('draft.savedAt')} {lastSavedTime}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const bannerStyle: React.CSSProperties = {
  backgroundColor: 'rgba(59, 130, 246, 0.1)',
  border: '1px solid rgba(59, 130, 246, 0.3)',
  borderRadius: '8px',
  padding: '12px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  flexWrap: 'wrap'
};

const badgeIconStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  backgroundColor: 'rgba(59, 130, 246, 0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
};

const restoreBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  borderRadius: '6px',
  border: 'none',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease'
};

const discardBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  color: '#f87171',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease'
};

const indicatorBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '12px',
  color: '#94a3b8',
  backgroundColor: 'rgba(15, 23, 42, 0.6)',
  border: '1px solid #334155',
  padding: '4px 10px',
  borderRadius: '6px',
  fontWeight: 500
};

export default DraftIndicator;
