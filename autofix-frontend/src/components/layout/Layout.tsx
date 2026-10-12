import React from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ForceChangePasswordModal from '../auth/ForceChangePasswordModal';
import { Database, AlertTriangle, ShieldCheck } from 'lucide-react';
import { UnsavedChangesProvider } from '../../context/UnsavedChangesContext';
import { useTranslation } from 'react-i18next';

const Layout: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, mustChangePassword, dataDirectory, isFallbackDirectory } = useAuth();
  const { t } = useTranslation();
  
  // Public pages don't get the sidebar/topbar
  const isPublicPage = location.pathname === '/login' || location.pathname === '/register';

  if (isPublicPage) {
    return (
      <UnsavedChangesProvider>
        <main style={{ minHeight: '100vh', width: '100%', minWidth: 0 }}><Outlet /></main>
      </UnsavedChangesProvider>
    );
  }

  return (
    <UnsavedChangesProvider>
      <div className="app-wrapper">
      {/* Condition 2: Block entire application if default admin password change is required */}
      {isAuthenticated && mustChangePassword && <ForceChangePasswordModal />}

      {/* Sidebar Area */}
      <div className="app-sidebar-area">
        <Sidebar />
      </div>

      {/* Main Area */}
      <div className="app-main-area">
        <div style={topbarAreaStyle}>
          <Topbar />
        </div>
        <div style={contentAreaStyle}>
          <Outlet />
        </div>

        {/* Condition 3: Footer showing storage path and fallback status */}
        <footer style={{
          padding: '12px 32px',
          borderTop: '1px solid var(--border, #334155)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: 'var(--text-muted, #94a3b8)',
          backgroundColor: 'var(--bg-secondary, #0f172a)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={14} color={isFallbackDirectory ? '#f59e0b' : '#10b981'} />
            <span>
              {t('topbar.storage')}: <strong style={{ color: isFallbackDirectory ? '#f59e0b' : '#e2e8f0' }}>{dataDirectory}</strong>
            </span>
            {isFallbackDirectory && (
              <span style={{
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                color: '#f59e0b',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <AlertTriangle size={12} /> {t('topbar.fallbackActive')}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
              <ShieldCheck size={14} /> {t('topbar.systemHealthy')}
            </span>
            <span>{t('common.appName')} Workshop &copy; 2026</span>
          </div>
        </footer>
      </div>
    </div>
    </UnsavedChangesProvider>
  );
};

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
  minWidth: 0,
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
