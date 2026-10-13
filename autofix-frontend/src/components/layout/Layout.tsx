import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ForceChangePasswordModal from '../auth/ForceChangePasswordModal';
import { Database, AlertTriangle, ShieldCheck } from 'lucide-react';
import { UnsavedChangesProvider } from '../../context/UnsavedChangesContext';

export const Layout: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, mustChangePassword, dataDirectory, isFallbackDirectory } = useAuth();
  
  // Public pages don't get the sidebar/topbar
  const isPublicPage = location.pathname === '/login' || location.pathname === '/register';

  // Sidebar collapsible state: collapsed on home dashboard by default to give full width like photo!
  const isDashboard = location.pathname === '/' || location.pathname === '/admin-dashboard';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isDashboard);

  useEffect(() => {
    const handleToggle = () => setSidebarCollapsed(prev => !prev);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  if (isPublicPage) {
    return (
      <UnsavedChangesProvider>
        <main dir="rtl" style={{ minHeight: '100vh', width: '100%', minWidth: 0, backgroundColor: '#0d1117' }}>
          <Outlet />
        </main>
      </UnsavedChangesProvider>
    );
  }

  const sidebarWidth = sidebarCollapsed ? 68 : 250;

  return (
    <UnsavedChangesProvider>
      <div dir="rtl" style={wrapperStyle}>
        {/* Force admin password change if needed */}
        {isAuthenticated && mustChangePassword && <ForceChangePasswordModal />}

        {/* Sidebar Area */}
        <aside style={{
          ...sidebarAreaStyle,
          width: `${sidebarWidth}px`,
          minWidth: `${sidebarWidth}px`,
          transition: 'width 0.2s ease, min-width 0.2s ease'
        }}>
          <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        </aside>

        {/* Main Application Area */}
        <div style={{
          ...mainAreaStyle,
          marginRight: `${sidebarWidth}px`,
          transition: 'margin-right 0.2s ease'
        }}>
          {/* Topbar */}
          <Topbar />

          {/* Page Content */}
          <main style={contentAreaStyle}>
            <Outlet />
          </main>

          {/* Footer - Pure Arabic Workshop System Status */}
          <footer style={footerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={14} color={isFallbackDirectory ? '#f59e0b' : '#10b981'} />
              <span>
                موقع تخزين البيانات: <strong style={{ color: isFallbackDirectory ? '#f59e0b' : '#e2e8f0', direction: 'ltr', display: 'inline-block' }}>{dataDirectory}</strong>
              </span>
              {isFallbackDirectory && (
                <span style={fallbackBadgeStyle}>
                  <AlertTriangle size={12} /> وضع الطوارئ نشط
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                <ShieldCheck size={14} /> قاعدة البيانات سليمة
              </span>
              <span>مركز AP AUTO لصيانة السيارات &copy; 2026</span>
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
  backgroundColor: '#0d1117',
  color: '#ffffff',
  fontFamily: 'Cairo, sans-serif'
};

const sidebarAreaStyle: React.CSSProperties = {
  flexShrink: 0,
  position: 'fixed',
  right: 0,
  top: 0,
  height: '100vh',
  overflowY: 'auto',
  zIndex: 100,
  backgroundColor: '#161c24',
  borderLeft: '1px solid #212c3d'
};

const mainAreaStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#0d1117'
};

const contentAreaStyle: React.CSSProperties = {
  padding: '24px',
  flex: 1,
  minWidth: 0
};

const footerStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderTop: '1px solid #212c3d',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '12px',
  color: '#94a3b8',
  backgroundColor: '#11161d'
};

const fallbackBadgeStyle: React.CSSProperties = {
  backgroundColor: 'rgba(245, 158, 11, 0.2)',
  color: '#f59e0b',
  padding: '2px 8px',
  borderRadius: '4px',
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px'
};

export default Layout;
