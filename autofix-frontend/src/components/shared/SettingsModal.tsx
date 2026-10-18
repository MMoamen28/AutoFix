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
import { DEFAULT_WHATSAPP_TEMPLATE, buildWhatsAppMessage, WhatsAppTemplateData } from '../../utils/whatsappTemplateHelper';

const WhatsAppIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#25D366' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2M12.04 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.56 20.16 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.04 3.67M9.53 7.64C9.36 7.64 9.08 7.7 8.84 7.96C8.6 8.22 7.93 8.84 7.93 10.11C7.93 11.38 8.86 12.61 8.99 12.78C9.12 12.95 10.82 15.58 13.42 16.7C15.58 17.63 16.02 17.44 16.49 17.4C16.96 17.36 18.01 16.78 18.23 16.16C18.45 15.54 18.45 15.01 18.38 14.9C18.31 14.79 18.14 14.73 17.88 14.6C17.62 14.47 16.34 13.84 16.1 13.75C15.86 13.66 15.69 13.62 15.52 13.88C15.35 14.14 14.86 14.73 14.71 14.9C14.56 15.07 14.41 15.09 14.15 14.96C13.89 14.83 12.79 14.47 11.48 13.3C10.46 12.39 9.77 11.27 9.64 11.05C9.51 10.83 9.63 10.71 9.76 10.58C9.88 10.46 10.03 10.27 10.16 10.12C10.29 9.97 10.33 9.86 10.42 9.69C10.51 9.52 10.47 9.37 10.4 9.24C10.33 9.11 9.73 7.64 9.53 7.64Z" />
  </svg>
);

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
  const [workshopName, setWorkshopName] = useState('AP AUTO SERVICE CENTER');
  const [workshopPhone, setWorkshopPhone] = useState('01277252262');
  const [whatsAppMessageTemplate, setWhatsAppMessageTemplate] = useState(DEFAULT_WHATSAPP_TEMPLATE);
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
  const [fixedIpAddress, setFixedIpAddress] = useState('');
  const [fixedIpError, setFixedIpError] = useState('');
  const [networkInfoData, setNetworkInfoData] = useState<any>(null);
  const [showAddressChangedNotice, setShowAddressChangedNotice] = useState(false);

  const fetchSettings = async () => {
    try {
      const [settingsRes, netRes, netInfoRes] = await Promise.allSettled([
        axiosClient.get('/settings'),
        axiosClient.get('/settings/network'),
        axiosClient.get('/network/info')
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
        const d = settingsRes.value.data;
        setShowVat(!!d.showVat);
        setPrintNotesOnInvoice(!!d.printNotesOnInvoice);
        setRequirePin(!!d.requirePin);
        setHasPinSet(!!d.hasPinSet);
        setAllowNetworkAccess(!!d.allowNetworkAccess);
        setFixedIpAddress(d.fixedIpAddress || '');
        if (d.workshopName) setWorkshopName(d.workshopName);
        if (d.workshopPhone) setWorkshopPhone(d.workshopPhone);
        if (d.whatsAppMessageTemplate) setWhatsAppMessageTemplate(d.whatsAppMessageTemplate);
      }

      if (netRes.status === 'fulfilled' && netRes.value.data) {
        setNetworkInfo(netRes.value.data);
      }

      if (netInfoRes.status === 'fulfilled' && netInfoRes.value.data) {
        const nData = netInfoRes.value.data;
        setNetworkInfoData(nData);
        if (nData.addressChanged) {
          setShowAddressChangedNotice(true);
        }
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
    if (fixedIpAddress.trim()) {
      if (!isPrivateIPv4(fixedIpAddress.trim())) {
        setFixedIpError('يرجى إدخال عنوان IPv4 خاص صحيح (مثل 192.168.1.50 أو 10.0.0.50)');
        return;
      }
    }
    setFixedIpError('');
    setCurrencyLabel('en', labelEn);
    setCurrencyLabel('ar', labelAr);
    setDigitMode(digitMode);

    try {
      await axiosClient.put('/settings', { 
        showVat, 
        printNotesOnInvoice,
        requirePin,
        allowNetworkAccess,
        fixedIpAddress: fixedIpAddress.trim() || null,
        workshopName: workshopName.trim() || 'AP AUTO SERVICE CENTER',
        workshopPhone: workshopPhone.trim() || '01277252262',
        whatsAppMessageTemplate: whatsAppMessageTemplate || DEFAULT_WHATSAPP_TEMPLATE
      });
      window.dispatchEvent(new CustomEvent('settings-updated'));
    } catch (err: any) {
      if (err.response?.data?.message) {
        setFixedIpError(err.response.data.message);
        return;
      }
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
      window.dispatchEvent(new CustomEvent('settings-updated'));
      setTimeout(() => {
        setPinChangeSuccess(false);
        setShowSetPinDialog(false);
      }, 1000);
    } catch (err: any) {
      setPinChangeError(err.response?.data?.message || 'فشل حفظ الرقم السري');
    }
  };

  const chosenIp = networkInfoData?.chosenAddress;
  const lanUrl = chosenIp ? `http://${chosenIp}:5000` : null;

  const handleCopyLink = () => {
    if (!lanUrl) return;
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
        
        {showAddressChangedNotice && (
          <div style={{
            backgroundColor: '#1e3a8a',
            border: '1px solid #3b82f6',
            color: '#bfdbfe',
            padding: '10px 14px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 700
          }}>
            <div>
              تغيّر عنوان اللابتوب — الرابط الجديد هو: <span style={{ direction: 'ltr', display: 'inline-block', color: '#ffffff' }}>{lanUrl || chosenIp}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddressChangedNotice(false)}
              style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: '2px 6px', fontSize: '14px' }}
            >
              ✕
            </button>
          </div>
        )}

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
              {lanUrl ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>رابط الدخول من الموبايل:</div>
                      <a
                        href={lanUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', direction: 'ltr', textAlign: 'right', display: 'inline-block', textDecoration: 'underline' }}
                        id="mobile-lan-link"
                      >
                        {lanUrl}
                      </a>
                      <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>
                        اكتب العنوان بـ http وليس https
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      style={actionBtnStyle}
                      id="copy-lan-link-btn"
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
                </>
              ) : (
                <div style={{ padding: '12px', background: '#1c1917', border: '1px solid #78350f', borderRadius: '8px', color: '#fde047', fontSize: '12px', lineHeight: 1.6 }}>
                  تعذر تحديد عنوان الشبكة المحلية — تأكد من اتصال اللابتوب بالراوتر أو اضبط عنواناً ثابتاً أدناه
                </div>
              )}

              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #212c3d' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                  عنوان ثابت (اختياري):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={fixedIpAddress}
                  onChange={(e) => {
                    setFixedIpAddress(e.target.value);
                    if (fixedIpError) setFixedIpError('');
                  }}
                  placeholder="مثال: 192.168.1.50"
                  style={inputStyle}
                  id="fixed-ip-address-input"
                />
                {fixedIpError && (
                  <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                    {fixedIpError}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.5 }}>
                  لثبات الرابط، احجز العنوان لهذا اللابتوب من الراوتر أو ثبّته من إعدادات الشبكة
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

        {/* Section 6: WhatsApp Template Settings */}
        <div style={sectionBoxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <WhatsAppIcon size={18} color="#25D366" />
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                قالب رسالة الواتساب للفواتير
              </span>
            </div>
            <button
              type="button"
              onClick={() => setWhatsAppMessageTemplate(DEFAULT_WHATSAPP_TEMPLATE)}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={12} />
              استعادة القالب الافتراضي
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>اسم المركز في الرسالة</label>
              <input
                type="text"
                value={workshopName}
                onChange={e => setWorkshopName(e.target.value)}
                style={inputStyle}
                placeholder="AP AUTO SERVICE CENTER"
              />
            </div>
            <div>
              <label style={labelStyle}>رقم هاتف المركز للاستفسار</label>
              <input
                type="text"
                value={workshopPhone}
                onChange={e => setWorkshopPhone(e.target.value)}
                style={inputStyle}
                placeholder="01277252262"
              />
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
              العناصر المتاحة في القالب (اضغط للإضافة):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { tag: '{customerName}', desc: 'اسم العميل' },
                { tag: '{workshopName}', desc: 'اسم المركز' },
                { tag: '{invoiceNumber}', desc: 'رقم الفاتورة' },
                { tag: '{invoiceDate}', desc: 'التاريخ' },
                { tag: '{carMake}', desc: 'الماركة' },
                { tag: '{carModel}', desc: 'الموديل' },
                { tag: '{plate}', desc: 'اللوحة' },
                { tag: '{total}', desc: 'الإجمالي' },
                { tag: '{paid}', desc: 'المدفوع' },
                { tag: '{remainingLine}', desc: 'سطر المتبقي' },
                { tag: '{notesLine}', desc: 'سطر الملاحظات' },
                { tag: '{workshopPhone}', desc: 'هاتف المركز' }
              ].map(p => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => setWhatsAppMessageTemplate(prev => prev + ' ' + p.tag)}
                  style={{
                    background: '#0d1117',
                    border: '1px solid #30363d',
                    color: '#58a6ff',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  title={p.desc}
                >
                  <code>{p.tag}</code> ({p.desc})
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>نص القالب (يمكنك التعديل بحرية)</label>
              <textarea
                value={whatsAppMessageTemplate}
                onChange={e => setWhatsAppMessageTemplate(e.target.value)}
                rows={11}
                style={{
                  ...inputStyle,
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={labelStyle}>معاينة حية للرسالة (Live Preview - فاتورة تجريبية)</label>
              <div style={{
                background: '#0b141a',
                border: '1px solid #1f2c34',
                borderRadius: '8px',
                padding: '12px',
                minHeight: '220px',
                maxHeight: '260px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                fontSize: '12px',
                color: '#e9edef',
                lineHeight: '1.6',
                fontFamily: 'Cairo, sans-serif'
              }}>
                <div style={{
                  background: '#005c4b',
                  borderRadius: '8px 8px 0 8px',
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  border: '1px solid #025144'
                }}>
                  {buildWhatsAppMessage(whatsAppMessageTemplate, {
                    customerName: 'طارق سليم',
                    workshopName: workshopName || 'AP AUTO SERVICE CENTER',
                    invoiceNumber: 'INV-202610-0007',
                    invoiceDate: '2026-10-18',
                    carMake: 'Kia',
                    carModel: 'Sportage',
                    plate: 'ط ر ق 1000',
                    total: 650.00,
                    paid: 300.00,
                    remaining: 350.00,
                    notes: 'صيانة دورية وتغيير زيت وفلتر',
                    workshopPhone: workshopPhone || '01277252262'
                  })}
                </div>
              </div>
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

const isPrivateIPv4 = (ip: string): boolean => {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  const nums = parts.map(p => Number(p));
  for (let i = 0; i < 4; i++) {
    if (isNaN(nums[i]) || nums[i] < 0 || nums[i] > 255 || parts[i] === '' || (parts[i].length > 1 && parts[i].startsWith('0'))) {
      return false;
    }
  }
  if (nums[0] === 10) return true;
  if (nums[0] === 172 && nums[1] >= 16 && nums[1] <= 31) return true;
  if (nums[0] === 192 && nums[1] === 168) return true;
  return false;
};

export default SettingsModal;
