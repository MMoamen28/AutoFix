import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Save, RotateCcw, X, Check } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { 
  getCurrencyLabel, 
  setCurrencyLabel, 
  resetCurrencyLabels,
  getDigitMode, 
  setDigitMode,
  formatCurrency,
  DEFAULT_CURRENCY_LABEL_EN,
  DEFAULT_CURRENCY_LABEL_AR 
} from '../../i18n/formatters';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const [labelEn, setLabelEn] = useState(getCurrencyLabel('en'));
  const [labelAr, setLabelAr] = useState(getCurrencyLabel('ar'));
  const [digitMode, setDigitModeState] = useState<'western' | 'arabic-indic'>(getDigitMode());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [logoKey, setLogoKey] = useState<number>(Date.now());
  const [watermarkKey, setWatermarkKey] = useState<number>(Date.now());

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/settings/logo', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      setLogoKey(Date.now());
    } catch (err) {
      console.error('Failed to upload logo', err);
    }
  };

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/settings/watermark', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      setWatermarkKey(Date.now());
    } catch (err) {
      console.error('Failed to upload watermark', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLabelEn(getCurrencyLabel('en'));
      setLabelAr(getCurrencyLabel('ar'));
      setDigitModeState(getDigitMode());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrencyLabel('en', labelEn);
    setCurrencyLabel('ar', labelAr);
    setDigitMode(digitMode);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    resetCurrencyLabels();
    setLabelEn(DEFAULT_CURRENCY_LABEL_EN);
    setLabelAr(DEFAULT_CURRENCY_LABEL_AR);
    setDigitMode('western');
    setDigitModeState('western');
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.title', 'Workshop Settings / إعدادات النظام')}
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Currency Label Section */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary, #3b82f6)', margin: '0 0 10px 0' }}>
            {t('settings.currencySection', 'Currency Label Settings (تسمية العملة)')}
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', margin: '0 0 14px 0' }}>
            {t('settings.currencyDesc', 'Single workshop currency (Egyptian Pound). Configure the display label for English and Arabic screens.')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>
                English Currency Label (Default: L.E)
              </label>
              <input
                type="text"
                value={labelEn}
                onChange={e => setLabelEn(e.target.value)}
                style={inputStyle}
                placeholder="L.E"
                required
              />
            </div>

            <div>
              <label style={labelStyle}>
                Arabic Currency Label (Default: ج.م)
              </label>
              <input
                type="text"
                value={labelAr}
                onChange={e => setLabelAr(e.target.value)}
                style={inputStyle}
                placeholder="ج.م"
                required
              />
            </div>
          </div>
        </div>

        {/* Digits Display Mode */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary, #3b82f6)', margin: '0 0 10px 0' }}>
            {t('settings.digitsSection', 'Digits Style (نمط كتابة الأرقام)')}
          </h4>
          <div style={{ display: 'flex', gap: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="radio"
                name="digitsMode"
                value="western"
                checked={digitMode === 'western'}
                onChange={() => setDigitModeState('western')}
                style={{ accentColor: 'var(--primary, #3b82f6)' }}
              />
              <span>Western Digits (0123)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="radio"
                name="digitsMode"
                value="arabic-indic"
                checked={digitMode === 'arabic-indic'}
                onChange={() => setDigitModeState('arabic-indic')}
                style={{ accentColor: 'var(--primary, #3b82f6)' }}
              />
              <span>Arabic-Indic Digits (٠١٢٣)</span>
            </label>
          </div>
        </div>

        {/* Logo and Watermark Section */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary, #3b82f6)', margin: '0 0 10px 0' }}>
            {t('settings.brandingSection', 'Invoice Logo & Watermark (الشعار والعلامة المائية)')}
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', margin: '0 0 14px 0' }}>
            {t('settings.brandingDesc', 'Upload custom workshop logo and watermark for invoices and reports without code modifications.')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ background: 'var(--bg-secondary, #1e293b)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border, #334155)' }}>
              <label style={labelStyle}>Workshop Logo (شعار المركز)</label>
              <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '6px', marginBottom: '8px', overflow: 'hidden' }}>
                <img src={`/api/settings/logo?t=${logoKey}`} alt="Logo" style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain' }} />
              </div>
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ fontSize: '11px', width: '100%', color: '#94a3b8' }} />
            </div>

            <div style={{ background: 'var(--bg-secondary, #1e293b)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border, #334155)' }}>
              <label style={labelStyle}>Invoice Watermark (العلامة المائية)</label>
              <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '6px', marginBottom: '8px', overflow: 'hidden' }}>
                <img src={`/api/settings/watermark?t=${watermarkKey}`} alt="Watermark" style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain', opacity: 0.6 }} />
              </div>
              <input type="file" accept="image/*" onChange={handleWatermarkUpload} style={{ fontSize: '11px', width: '100%', color: '#94a3b8' }} />
            </div>
          </div>
        </div>

        {/* Live Preview Box */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '8px',
          padding: '14px',
          fontSize: '13px'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '6px', color: '#e2e8f0' }}>
            Live Formatter Preview (معاينة التنسيق):
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8' }}>
            <span>English: <strong>{formatCurrency(5472.00, 'en')}</strong></span>
            <span>Arabic: <strong>{formatCurrency(5472.00, 'ar')}</strong></span>
            <span>Refund: <strong>{formatCurrency(-200.00, 'en')}</strong></span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <Button type="button" variant="secondary" onClick={handleReset} style={{ fontSize: '12px' }}>
            <RotateCcw size={14} style={{ marginInlineEnd: '6px' }} />
            Reset Defaults
          </Button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {savedSuccess ? (
                <>
                  <Check size={16} style={{ marginInlineEnd: '6px' }} /> Saved!
                </>
              ) : (
                <>
                  <Save size={16} style={{ marginInlineEnd: '6px' }} /> Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-muted, #94a3b8)',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: '6px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--bg-secondary, #1e293b)',
  border: '1px solid var(--border, #334155)',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '13px',
  fontWeight: 600,
  outline: 'none'
};

export default SettingsModal;
