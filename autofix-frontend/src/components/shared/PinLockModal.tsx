import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import axiosClient from '../../services/axiosClient';

interface PinLockModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  title?: string;
  description?: string;
  allowCancel?: boolean;
  onCancel?: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onSuccess,
  title = 'التحقق من الرقم السري للورشة',
  description = 'يرجى إدخال الرقم السري لتأكيد الصلاحية والمتابعة.',
  allowCancel = false,
  onCancel
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      setError('الرقم السري يتكون من 4 إلى 8 أرقام');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const res = await axiosClient.post('/settings/verify-pin', { pin });
      if (res.data.success) {
        // Remember pin session in localStorage
        const rememberDays = res.data.rememberDays || 30;
        const expiry = Date.now() + rememberDays * 24 * 60 * 60 * 1000;
        localStorage.setItem('autofix_pin_session', expiry.toString());
        onSuccess();
      } else {
        if (res.data.lockedUntil) {
          setLockedUntil(res.data.lockedUntil);
          setError(`تم حظر المحاولات مؤقتاً بسبب 5 محاولات خاطئة حتى ${new Date(res.data.lockedUntil).toLocaleTimeString('ar-EG')}`);
        } else {
          setError(res.data.message || 'الرقم السري غير صحيح');
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'فشل التحقق من الرقم السري';
      setError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={overlayStyle} dir="rtl">
      <div style={modalBoxStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={iconBadgeStyle}>
            <Lock size={26} color="#e52535" />
          </div>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 800, textAlign: 'center', margin: '0 0 6px', color: '#ffffff' }}>
          {title}
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5 }}>
          {description}
        </p>

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              autoFocus
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="••••"
              style={pinInputStyle}
            />
            {error && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
                {error}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {allowCancel && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={cancelBtnStyle}
              >
                إلغاء
              </button>
            )}
            <button
              type="submit"
              disabled={isVerifying || !!lockedUntil}
              style={{ ...submitBtnStyle, flex: 1 }}
            >
              <KeyRound size={16} />
              <span>{isVerifying ? 'جاري التحقق...' : 'تأكيد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.88)',
  backdropFilter: 'blur(8px)',
  zIndex: 100000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  fontFamily: 'Cairo, sans-serif'
};

const modalBoxStyle: React.CSSProperties = {
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '16px',
  padding: '24px',
  width: '100%',
  maxWidth: '380px',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)'
};

const iconBadgeStyle: React.CSSProperties = {
  width: '52px',
  height: '52px',
  borderRadius: '14px',
  backgroundColor: 'rgba(229, 37, 53, 0.12)',
  border: '1px solid rgba(229, 37, 53, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const pinInputStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'center',
  letterSpacing: '8px',
  fontSize: '24px',
  padding: '12px',
  backgroundColor: '#0d1117',
  border: '1px solid #2a3749',
  borderRadius: '10px',
  color: '#ffffff',
  outline: 'none',
  fontFamily: 'monospace'
};

const submitBtnStyle: React.CSSProperties = {
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

const cancelBtnStyle: React.CSSProperties = {
  backgroundColor: '#1c2430',
  color: '#94a3b8',
  border: '1px solid #2a3749',
  borderRadius: '10px',
  padding: '12px 20px',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

export default PinLockModal;
