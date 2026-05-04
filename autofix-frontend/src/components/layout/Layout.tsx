import React from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Public pages don't get the sidebar/topbar
  const isPublicPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/';

  if (isPublicPage) {
    return <main style={{ minHeight: '100vh', minWidth: '1280px' }}><Outlet /></main>;
  }

  return (
    <div style={wrapperStyle}>
      {/* Sidebar Area */}
      <div style={sidebarAreaStyle}>
        <Sidebar />
      </div>

      {/* Main Area */}
      <div style={mainAreaStyle}>
        <div style={topbarAreaStyle}>
          <Topbar />
        </div>
        <div style={contentAreaStyle}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  minWidth: '1280px',
  backgroundColor: 'var(--bg-primary)'
};

const sidebarAreaStyle: React.CSSProperties = {
  width: '260px',
  minWidth: '260px',
  flexShrink: 0,
  position: 'fixed',
  left: 0,
  top: 0,
  height: '100vh',
  overflowY: 'auto',
  zIndex: 100,
  backgroundColor: 'var(--bg-secondary)',
  borderRight: '1px solid var(--border)'
};

const mainAreaStyle: React.CSSProperties = {
  marginLeft: '260px',
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column'
};

const topbarAreaStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  height: '64px',
  zIndex: 99
};

const contentAreaStyle: React.CSSProperties = {
  padding: '32px',
  flex: 1
};

export default Layout;
