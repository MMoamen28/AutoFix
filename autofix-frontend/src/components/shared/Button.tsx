import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  style, 
  disabled, 
  ...props 
}) => {
  const getStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: 'var(--radius-md)',
      fontWeight: 600,
      fontSize: '14px',
      cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      border: 'none',
      opacity: (disabled || isLoading) ? 0.5 : 1,
      minWidth: '100px',
      position: 'relative',
      outline: 'none'
    };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          background: 'var(--gradient-accent)',
          color: 'white',
          boxShadow: '0 2px 12px var(--accent-glow)'
        };
      case 'secondary':
        return {
          ...base,
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)'
        };
      case 'danger':
        return {
          ...base,
          background: 'var(--danger-dim)',
          color: 'var(--danger)',
          border: '1px solid var(--danger)'
        };
      case 'ghost':
        return {
          ...base,
          background: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)'
        };
      default:
        return base;
    }
  };

  return (
    <button 
      style={{ ...getStyles(), ...style }} 
      disabled={disabled || isLoading}
      className={`btn-variant-${variant}`}
      {...props}
    >
      {isLoading ? <LoadingSpinner size={18} /> : children}
      <style>{`
        .btn-variant-primary:hover:not(:disabled) { transform: scale(1.02); boxShadow: 0 4px 20px var(--accent-glow); }
        .btn-variant-secondary:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
        .btn-variant-danger:hover:not(:disabled) { background: var(--danger); color: white; }
        .btn-variant-ghost:hover:not(:disabled) { background: var(--bg-glass-light); color: var(--text-primary); }
      `}</style>
    </button>
  );
};

export default Button;
