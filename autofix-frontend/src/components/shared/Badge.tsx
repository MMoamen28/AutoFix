import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary' }) => {
  const getStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '99px',
      fontSize: '11px',
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    };

    switch (variant) {
      case 'primary': return { ...base, backgroundColor: 'var(--accent-dim)', color: 'var(--accent)' };
      case 'success': return { ...base, backgroundColor: 'var(--success-dim)', color: 'var(--success)' };
      case 'warning': return { ...base, backgroundColor: 'var(--warning-dim)', color: 'var(--warning)' };
      case 'danger': return { ...base, backgroundColor: 'var(--danger-dim)', color: 'var(--danger)' };
      case 'info': return { ...base, backgroundColor: 'var(--blue-dim)', color: 'var(--blue)' };
      case 'purple': return { ...base, backgroundColor: 'var(--purple-dim)', color: 'var(--purple)' };
      default: return base;
    }
  };

  return <span style={getStyles()}>{children}</span>;
};

export default Badge;
