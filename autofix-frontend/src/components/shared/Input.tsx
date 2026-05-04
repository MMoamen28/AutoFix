import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, icon, error, style, ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {label && (
        <label style={{ 
          fontSize: '12px', 
          fontWeight: 700, 
          color: 'var(--text-secondary)', 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px',
          marginLeft: '4px'
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </div>
        )}
        <input
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-secondary)',
            border: error ? '1px solid var(--danger)' : '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: `12px 16px 12px ${icon ? '48px' : '16px'}`,
            color: 'white',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s ease',
            ...style
          }}
          className="custom-input"
          {...props}
        />
      </div>
      {error && (
        <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 600, marginLeft: '4px' }}>
          {error}
        </span>
      )}

      <style>{`
        .custom-input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 1px var(--accent-glow); }
        .custom-input::placeholder { color: var(--text-muted); }
      `}</style>
    </div>
  );
};

export default Input;
