import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, trend }) => {
  return (
    <div style={cardStyle} className="stat-card">
      {/* Icon Circle */}
      <div style={{
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        backgroundColor: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        marginBottom: '20px'
      }}>
        {icon}
      </div>

      {/* Content */}
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>{label}</p>
        <h3 style={{ fontSize: '32px', fontWeight: 800, color: 'white' }}>{value}</h3>
      </div>

      {/* Trend */}
      {trend && (
        <div style={{ 
          marginTop: '12px', 
          fontSize: '12px', 
          fontWeight: 700, 
          color: trend.isPositive ? 'var(--success)' : 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {trend.value} this week
        </div>
      )}

      {/* Background Decoration */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: color,
        opacity: 0.05,
        zIndex: 0,
        pointerEvents: 'none'
      }}></div>

      <style>{`
        .stat-card { transition: all 0.3s ease; }
        .stat-card:hover { border-color: ${color} !important; transform: translateY(-4px); }
      `}</style>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '24px',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minWidth: '220px',
  cursor: 'default'
};

export default StatCard;
