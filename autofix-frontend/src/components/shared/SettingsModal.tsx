import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, RotateCcw, X, Check, Lock, Shield, 
  Wifi, QrCode, Copy, AlertTriangle, Smartphone, Laptop, AlertOctagon 
} from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import PinLockModal from './PinLockModal';
import axiosClient from '../../services/axiosClient';
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
  const [labelEn, setLabelEn] = useState(getCurrencyLabel('en'));
  const [labelAr, setLabelAr] = useState(getCurrencyLabel('ar'));
  const [digitMode, setDigitModeState] = useState<'western' | 'arabic-indic'>(getDigitMode());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [logoKey, setLogoKey] = useState<number>(Date.now());
  const [watermarkKey, setWatermarkKey] = useState<number>(Date.now());

  const [showVat, setShowVat] = useState(false);
  const [printNotesOnInvoice, setPrintNotesOnInvoice] = useState(false);

  // Security & Network
  const [requirePin, setRequirePin] = useState(false);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [allowNetworkAccess, setAllowNetworkAccess] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{
    allowNetworkAccess: boolean;
    serverPort: number;
    localIpAddresses: string[];
    connectedDevices: any[];
  } | null>(null);

  // PIN modal triggers
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinActionPending, setPinActionPending] = useState<(() => void) | null>(null);
  const [newPinInput, setNewPinInput] = useState('');
  const [showSetPinDialog, setShowSetPinDialog] = useState(false);
  const [pinChangeError, setPinChangeError] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchSettings = async () => {
    try {
      const [settingsRes, netRes] = await Promise.allSettled([
        axiosClient.get('/settings'),
        axiosClient.get('/settings/network')
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
        const d = settingsRes.value.data;
        setShowVat(!!d.showVat);
        setPrintNotesOnInvoice(!!d.printNotesOnInvoice);
        setRequirePin(!!d.requirePin);
        setHasPinSet(!!d.hasPinSet);
        setAllowNetworkAccess(!!d.allowNetworkAccess);
      }

      if (netRes.status === 'fulfilled' && netRes.value.data) {
        setNetworkInfo(netRes.value.data);
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLabelEn(getCurrencyLabel('en'));
      setLabelAr(getCurrencyLabel('ar'));
      setDigitModeState(getDigitMode());
      setSavedSuccess(false);
      fetchSettings();
    }
  }, [isOpen]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axiosClient.post('/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
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
      await axiosClient.post('/settings/watermark', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setWatermarkKey(Date.now());
    } catch (err) {
      console.error('Failed to upload watermark', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrencyLabel('en', labelEn);
    setCurrencyLabel('ar', labelAr);
    setDigitMode(digitMode);

    try {
      await axiosClient.put('/settings', { 
        showVat, 
        printNotesOnInvoice,
        requirePin,
        allowNetworkAccess
      });
    } catch (err) {
      console.error('Failed to update workshop settings', err);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleToggleNetwork = () => {
    const doToggle = () => {
      setAllowNetworkAccess(!allowNetworkAccess);
    };

    if (hasPinSet) {
      setPinActionPending(() => doToggle);
      setPinModalOpen(true);
    } else {
      doToggle();
    }
  };

  const handleTogglePinSwitch = () => {
    if (!requirePin && !hasPinSet) {
      // Prompt user to define a PIN first
      setShowSetPinDialog(true);
      return;
    }

    const doToggle = () => {
      setRequirePin(!requirePin);
    };

    if (hasPinSet) {
      setPinActionPending(() => doToggle);
      setPinModalOpen(true);
    } else {
      doToggle();
    }
  };

  const handleSaveNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinInput || newPinInput.length < 4 || newPinInput.length > 8) {
      setPinChangeError('الرقم السري يجب أن يتكون من 4 إلى 8 أرقام');
      return;
    }

    try {
      await axiosClient.post('/settings/set-pin', { pin: newPinInput });
      setHasPinSet(true);
      setRequirePin(true);
      setPinChangeSuccess(true);
      setNewPinInput('');
      setPinChangeError('');
      setTimeout(() => {
        setPinChangeSuccess(false);
        setShowSetPinDialog(false);
      }, 1000);
    } catch (err: any) {
      setPinChangeError(err.response?.data?.message || 'فشل حفظ الرقم السري');
    }
  };

  const primaryIp = networkInfo?.localIpAddresses?.[0] || '192.168.1.xxx';
  const lanUrl = `http://${primaryIp}:5000`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(lanUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إعدادات الورشة والنظام"
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '22px', fontFamily: 'Cairo, sans-serif' }}>
        
        {/* Security Alert: Network on and PIN off */}
        {allowNetworkAccess && !requirePin && (
          <div style={redWarningBannerStyle}>
            <AlertOctagon size={20} color="#ef4444" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '13px', lineHeight: 1.5, color: '#fca5a5' }}>
              <strong>تحذير أمني:</strong> أي جهاز متصل على شبكة الورشة يمكنه فتح وتعديل البيانات بدون كلمة سر! ينصح بتفعيل القفل بالرقم السري.
            </div>
          </div>
        )}

        {/* Section 1: Network Access for Phones */}
        <div style={sectionBoxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wifi size={18} color="#3b82f6" />
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                السماح للأجهزة الأخرى على شبكة الورشة (موبايل / تابلت)
              </span>
            </div>
            <input
              type="checkbox"
              checked={allowNetworkAccess}
              onChange={handleToggleNetwork}
              style={checkboxStyle}
            />
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0' }}>
            الافتراضي غير مفعل. عند التفعيل، يتيح فتح البرنامج من موبايلك المتصل بنفس راوتر الورشة عبر الرابط أدناه.
          </p>

          {allowNetworkAccess && (
            <div style={networkDetailsBoxStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>رابط الدخول من الموبايل:</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', direction: 'ltr', textAlign: 'right' }}>
                    {lanUrl}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={actionBtnStyle}
                >
                  <Copy size={14} />
                  <span>{copiedLink ? 'تم النسخ ✓' : 'نسخ الرابط'}</span>
                </button>
              </div>

              {/* QR Code */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#0d1117', padding: '12px', borderRadius: '10px', border: '1px solid #212c3d' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(lanUrl)}`}
                  alt="QR Code"
                  style={{ width: '90px', height: '90px', borderRadius: '6px', background: '#ffffff', padding: '4px' }}
                />
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
                  امسح رمز الاستجابة السريعة (QR) بكاميرا الموبايل لفتح لوحة التحكم فوراً من هاتفك دون الحاجة لكتابة الرابط.
                </div>
              </div>

              {/* Connected Devices */}
              {networkInfo?.connectedDevices && networkInfo.connectedDevices.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>الأجهزة المتصلة مؤخراً:</div>
                  <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid #212c3d', borderRadius: '8px' }}>
                    {networkInfo.connectedDevices.map((dev: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', fontSize: '11px', borderBottom: '1px solid #1c2430' }}>
                        <span style={{ color: '#ffffff', fontWeight: 700 }}>{dev.deviceName}</span>
                        <span style={{ color: '#94a3b8', direction: 'ltr' }}>{dev.ipAddress}</span>
                        <span style={{ color: '#64748b' }}>{new Date(dev.lastSeen).toLocaleTimeString('ar-EG')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Workshop PIN Lock */}
        <div style={sectionBoxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="#e52535" />
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                قفل بالرقم السري (حماية بدون مستخدمين)
              </span>
            </div>
            <input
              type="checkbox"
              checked={requirePin}
              onChange={handleTogglePinSwitch}
              style={checkboxStyle}
            />
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 10px 0' }}>
            الافتراضي غير مفعل. عند التفعيل، يطلب رقم سري واحد مشترك (4-8 أرقام) مرة واحدة لكل جهاز، ويتم تذكره لمدة 30 يوماً.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                if (hasPinSet) {
                  setPinActionPending(() => () => setShowSetPinDialog(true));
                  setPinModalOpen(true);
                } else {
                  setShowSetPinDialog(true);
                }
              }}
              style={actionBtnStyle}
            >
              <Lock size={14} />
              <span>{hasPinSet ? 'تغيير الرقم السري' : 'تعيين رقم سري جديد'}</span>
            </button>
            {hasPinSet && <span style={{ fontSize: '12px', color: '#10b981' }}>✓ الرقم السري مفعّل</span>}
          </div>
        </div>

        {/* Set PIN Dialog Inline */}
        {showSetPinDialog && (
          <div style={pinSetBoxStyle}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              تعيين رقم سري جديد للورشة (4 إلى 8 أرقام):
            </div>
            <form onSubmit={handleSaveNewPin} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={newPinInput}
                onChange={e => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="أدخل 4-8 أرقام"
                style={inlineInputStyle}
                autoFocus
              />
              <button type="submit" style={savePinBtnStyle}>
                حفظ
              </button>
              <button type="button" onClick={() => setShowSetPinDialog(false)} style={cancelPinBtnStyle}>
                إلغاء
              </button>
            </form>
            {pinChangeError && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>{pinChangeError}</div>}
            {pinChangeSuccess && <div style={{ color: '#10b981', fontSize: '12px', marginTop: '6px' }}>تم حفظ الرقم السري بنجاح ✓</div>}
          </div>
        )}

        {/* Section 3: Invoicing & VAT Switches */}
        <div style={sectionBoxStyle}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
            خيارات الفاتورة والضريبة
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                  إظهار ضريبة القيمة المضافة على الفاتورة (VAT)
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  الافتراضي غير مفعل. عند الإيقاف، لا يظهر أي ذكر للضريبة وتصدر الفواتير بدونها.
                </div>
              </div>
              <input
                type="checkbox"
                checked={showVat}
                onChange={e => setShowVat(e.target.checked)}
                style={checkboxStyle}
              />
            </label>

            <div style={{ height: '1px', background: '#212c3d' }} />

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                  طباعة ملاحظات أمر الشغل على الفاتورة
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  الافتراضي غير مفعل. عند الإيقاف، تُخفى الملاحظات الداخلية مع الإبقاء على بنود المصنعية.
                </div>
              </div>
              <input
                type="checkbox"
                checked={printNotesOnInvoice}
                onChange={e => setPrintNotesOnInvoice(e.target.checked)}
                style={checkboxStyle}
              />
            </label>
          </div>
        </div>

        {/* Section 4: Digits & Currency */}
        <div style={sectionBoxStyle}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
            نمط الأرقام وتسمية العملة
          </div>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="radio"
                name="digitsMode"
                value="western"
                checked={digitMode === 'western'}
                onChange={() => setDigitModeState('western')}
                style={{ accentColor: '#e52535' }}
              />
              <span>أرقام إنجليزية (0123)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="radio"
                name="digitsMode"
                value="arabic-indic"
                checked={digitMode === 'arabic-indic'}
                onChange={() => setDigitModeState('arabic-indic')}
                style={{ accentColor: '#e52535' }}
              />
              <span>أرقام عربية (٠١٢٣)</span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>تسمية العملة بالعربية</label>
              <input
                type="text"
                value={labelAr}
                onChange={e => setLabelAr(e.target.value)}
                style={inputStyle}
                placeholder="ج.م"
              />
            </div>
            <div>
              <label style={labelStyle}>تسمية العملة بالإنجليزية</label>
              <input
                type="text"
                value={labelEn}
                onChange={e => setLabelEn(e.target.value)}
                style={inputStyle}
                placeholder="L.E"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Logo & Watermark */}
        <div style={sectionBoxStyle}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
            شعار المركز والعلامة المائية للفاتورة
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ background: '#0d1117', padding: '12px', borderRadius: '10px', border: '1px solid #212c3d' }}>
              <label style={labelStyle}>شعار المركز</label>
              <div style={{ height: '65px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '6px', marginBottom: '8px' }}>
                <img src={`/api/settings/logo?t=${logoKey}`} alt="Logo" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain' }} />
              </div>
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ fontSize: '11px', width: '100%', color: '#94a3b8' }} />
            </div>

            <div style={{ background: '#0d1117', padding: '12px', borderRadius: '10px', border: '1px solid #212c3d' }}>
              <label style={labelStyle}>العلامة المائية</label>
              <div style={{ height: '65px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '6px', marginBottom: '8px' }}>
                <img src={`/api/settings/watermark?t=${watermarkKey}`} alt="Watermark" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain', opacity: 0.6 }} />
              </div>
              <input type="file" accept="image/*" onChange={handleWatermarkUpload} style={{ fontSize: '11px', width: '100%', color: '#94a3b8' }} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #212c3d', paddingTop: '16px' }}>
          <Button type="button" variant="secondary" onClick={() => {
            resetCurrencyLabels();
            setLabelEn(DEFAULT_CURRENCY_LABEL_EN);
            setLabelAr(DEFAULT_CURRENCY_LABEL_AR);
            setDigitMode('western');
            setDigitModeState('western');
          }} style={{ fontSize: '12px' }}>
            <RotateCcw size={14} style={{ marginInlineEnd: '6px' }} />
            استعادة الافتراضيات
          </Button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="button" variant="primary" onClick={handleSave}>
              {savedSuccess ? (
                <>
                  <Check size={16} style={{ marginInlineEnd: '6px' }} /> تم الحفظ!
                </>
              ) : (
                <>
                  <Save size={16} style={{ marginInlineEnd: '6px' }} /> حفظ الإعدادات
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Sensitive Action PIN Confirmation Modal */}
      <PinLockModal
        isOpen={pinModalOpen}
        allowCancel={true}
        onCancel={() => { setPinModalOpen(false); setPinActionPending(null); }}
        onSuccess={() => {
          setPinModalOpen(false);
          if (pinActionPending) {
            pinActionPending();
            setPinActionPending(null);
          }
        }}
      />
    </Modal>
  );
};

const sectionBoxStyle: React.CSSProperties = {
  background: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '12px',
  padding: '16px'
};

const redWarningBannerStyle: React.CSSProperties = {
  backgroundColor: 'rgba(239, 68, 68, 0.12)',
  border: '1px solid rgba(239, 68, 68, 0.35)',
  borderRadius: '10px',
  padding: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const networkDetailsBoxStyle: React.CSSProperties = {
  background: '#11161d',
  border: '1px solid #212c3d',
  borderRadius: '10px',
  padding: '14px',
  marginTop: '10px'
};

const actionBtnStyle: React.CSSProperties = {
  backgroundColor: '#1c2430',
  border: '1px solid #2a3749',
  color: '#cbd5e1',
  borderRadius: '8px',
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontFamily: 'Cairo, sans-serif'
};

const pinSetBoxStyle: React.CSSProperties = {
  background: '#161c24',
  border: '1px solid #3b82f6',
  borderRadius: '12px',
  padding: '16px'
};

const inlineInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  backgroundColor: '#0d1117',
  border: '1px solid #2a3749',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'monospace',
  letterSpacing: '4px'
};

const savePinBtnStyle: React.CSSProperties = {
  backgroundColor: '#e52535',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  fontWeight: 700,
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

const cancelPinBtnStyle: React.CSSProperties = {
  backgroundColor: '#1c2430',
  color: '#94a3b8',
  border: '1px solid #2a3749',
  borderRadius: '8px',
  padding: '8px 14px',
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

const checkboxStyle: React.CSSProperties = {
  width: '18px',
  height: '18px',
  accentColor: '#e52535',
  cursor: 'pointer'
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  display: 'block',
  marginBottom: '6px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#0d1117',
  border: '1px solid #212c3d',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '13px',
  fontWeight: 600,
  outline: 'none',
  fontFamily: 'Cairo, sans-serif'
};

export default SettingsModal;
