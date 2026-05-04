import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '4px',
  style 
}) => {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      backgroundColor: 'var(--bg-card)',
      position: 'relative',
      overflow: 'hidden',
      ...style
    }}>
      <div className="skeleton-shimmer"></div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .skeleton-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.05) 50%,
            transparent 100%
          );
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default Skeleton;
