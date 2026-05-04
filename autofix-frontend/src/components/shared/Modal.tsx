import React from 'react';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'small' | 'medium' | 'large';
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  width = 'medium' 
}) => {
  if (!isOpen) return null;

  const getWidth = () => {
    switch (width) {
      case 'small': return '480px';
      case 'medium': return '600px';
      case 'large': return '800px';
      default: return '600px';
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div 
        style={{ ...modalBoxStyle, width: getWidth() }} 
        onClick={e => e.stopPropagation()}
        className="modal-animate"
      >
        {/* Header */}
        <div style={headerStyle}>
          <div style={accentBarStyle}></div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'white' }}>{title}</h3>
          <button onClick={onClose} style={closeButtonStyle}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={footerStyle}>
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-animate {
          animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const modalBoxStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-xl)',
  boxShadow: 'var(--shadow-card)',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '90vh'
};

const headerStyle: React.CSSProperties = {
  padding: '20px 24px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'relative'
};

const accentBarStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: '20px',
  bottom: '20px',
  width: '4px',
  backgroundColor: 'var(--accent)',
  borderRadius: '0 2px 2px 0'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '50%',
  transition: 'all 0.2s ease'
};

const bodyStyle: React.CSSProperties = {
  padding: '24px',
  overflowY: 'auto',
  color: 'var(--text-primary)'
};

const footerStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px'
};

export default Modal;
