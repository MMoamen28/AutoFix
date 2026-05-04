import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div style={containerStyle}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{ ...toastStyle, ...getTypeStyle(toast.type) }} className="toast-animate">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {getIcon(toast.type)}
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{toast.message}</span>
            </div>
            <button onClick={() => removeToast(toast.id)} style={closeBtnStyle}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toastIn {
          from { transform: translateX(100%) scale(0.9); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
        .toast-animate {
          animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

// Helpers & Styles
const getIcon = (type: ToastType) => {
  switch (type) {
    case 'success': return <CheckCircle2 size={18} />;
    case 'error': return <AlertCircle size={18} />;
    default: return <Info size={18} />;
  }
};

const getTypeStyle = (type: ToastType): React.CSSProperties => {
  switch (type) {
    case 'success': return { borderLeft: '4px solid var(--success)', backgroundColor: 'var(--success-dim)', color: 'var(--success)' };
    case 'error': return { borderLeft: '4px solid var(--danger)', backgroundColor: 'var(--danger-dim)', color: 'var(--danger)' };
    case 'warning': return { borderLeft: '4px solid var(--warning)', backgroundColor: 'var(--warning-dim)', color: 'var(--warning)' };
    default: return { borderLeft: '4px solid var(--blue)', backgroundColor: 'var(--blue-dim)', color: 'var(--blue)' };
  }
};

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: '24px',
  right: '24px',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  pointerEvents: 'none'
};

const toastStyle: React.CSSProperties = {
  minWidth: '320px',
  maxWidth: '450px',
  padding: '16px 20px',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backdropFilter: 'blur(10px)',
  pointerEvents: 'auto'
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  opacity: 0.6,
  padding: '4px'
};
