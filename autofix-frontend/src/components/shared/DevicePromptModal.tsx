import React, { useState, useEffect } from 'react';
import { Smartphone, Laptop, Check, AlertCircle, X } from 'lucide-react';
import axiosClient from '../../services/axiosClient';

export const DevicePromptModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem('autofix_device_name');
    if (!existing) {
      setIsOpen(true);
      setHasExisting(false);
    } else {
      setHasExisting(true);
    }

    const handleOpen = () => {
      const current = localStorage.getItem('autofix_device_name') || '';
      setDeviceName(current);
      setHasExisting(!!current);
      setError('');
      setIsOpen(true);
    };

    window.addEventListener('open-device-prompt', handleOpen);
    return () => window.removeEventListener('open-device-prompt', handleOpen);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = deviceName.trim();
    if (!trimmed) {
      setError('يرجى إدخال اسم الجهاز');
      return;
    }

    try {
      localStorage.setItem('autofix_device_name', trimmed);
      window.dispatchEvent(new CustomEvent('device-name-changed', { detail: { deviceName: trimmed } }));
      try {
        await axiosClient.post('/settings/register-device', { deviceName: trimmed });
      } catch {}
      setIsOpen(false);
      setHasExisting(true);
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    }
  };

  const quickPresets = ['لابتوب الإدارة', 'موبايل المحاسب', 'تابلت الورشة', 'كمبيوتر الاستقبال'];

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} dir="rtl">
      <div style={modalBoxStyle}>
        {hasExisting && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={closeBtnStyle}
            title="إغلاق"
          >
            <X size={18} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={iconBadgeStyle}>
            <Laptop size={28} color="#e52535" />
          </div>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, textAlign: 'center', margin: '0 0 8px', color: '#ffffff' }}>
          تحديد اسم هذا الجهاز
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.6 }}>
          لتوثيق العمليات وتتبع التعديلات بدقة عبر الشبكة، يرجى كتابة اسم يميز هذا الجهاز (مثل: لابتوب، موبايل المحاسب، تابلت الفحص).
        </p>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
              اسم الجهاز
            </label>
            <input
              type="text"
              autoFocus
              value={deviceName}
              onChange={(e) => { setDeviceName(e.target.value); setError(''); }}
              placeholder="مثال: لابتوب الورشة، موبايل أحمد..."
              style={inputStyle}
            />
            {error && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px' }}>خيارات سريعة:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {quickPresets.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setDeviceName(preset)}
                  style={presetBtnStyle}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" style={submitBtnStyle}>
            <Check size={18} strokeWidth={2.5} />
            <span>حفظ ومتابعة</span>
          </button>
        </form>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  backdropFilter: 'blur(6px)',
  zIndex: 99999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  fontFamily: 'Cairo, sans-serif'
};

const modalBoxStyle: React.CSSProperties = {
  position: 'relative',
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '16px',
  padding: '28px 24px',
  width: '100%',
  maxWidth: '440px',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
};

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  left: '16px',
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: '4px'
};

const iconBadgeStyle: React.CSSProperties = {
  width: '56px',
  height: '56px',
  borderRadius: '16px',
  backgroundColor: 'rgba(229, 37, 53, 0.12)',
  border: '1px solid rgba(229, 37, 53, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  backgroundColor: '#0d1117',
  border: '1px solid #2a3749',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'Cairo, sans-serif'
};

const presetBtnStyle: React.CSSProperties = {
  backgroundColor: '#1c2430',
  border: '1px solid #2a3749',
  color: '#cbd5e1',
  borderRadius: '6px',
  padding: '4px 10px',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

const submitBtnStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#e52535',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  padding: '12px',
  fontSize: '14px',
  fontWeight: 800,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontFamily: 'Cairo, sans-serif'
};

export default DevicePromptModal;
