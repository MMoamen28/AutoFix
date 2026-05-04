import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 40 }) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: 'auto',
      width: 'auto'
    }}>
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        border: '4px solid var(--border)',
        borderTop: '4px solid var(--primary)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
