import React, { useState, useEffect } from 'react';
import { useLocation, Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Database, AlertTriangle, ShieldCheck, LayoutDashboard, Package, Wifi, WifiOff, AlertOctagon, X } from 'lucide-react';
import { UnsavedChangesProvider } from '../../context/UnsavedChangesContext';
import DevicePromptModal from '../shared/DevicePromptModal';
import axiosClient from '../../services/axiosClient';

export const Layout: React.FC = () => {
  const location = useLocation();
  const { dataDirectory, isFallbackDirectory } = useAuth();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isServerOffline, setIsServerOffline] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [networkWarning, setNetworkWarning] = useState(false);
  const [bannerExpanded, setBannerExpanded] = useState(true);
  const [concurrencyConflictMsg, setConcurrencyConflictMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleConflict = (e: any) => {
      setConcurrencyConflictMsg(e.detail?.message || 'تم تعديل هذا السجل من جهاز آخر، أعد التحميل');
    };
    window.addEventListener('autofix-concurrency-conflict', handleConflict);
    return () => window.removeEventListener('autofix-concurrency-conflict', handleConflict);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleToggle = () => setSidebarCollapsed(prev => !prev);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  useEffect(() => {
    const handleConn = (e: any) => {
      const isConn = e.detail?.connected ?? true;
      setIsServerOffline(!isConn);
      (window as any).__autofix_is_offline = !isConn;
    };
    window.addEventListener('server-connection-changed', handleConn);

    import('../../services/pollingService').then(m => m.pollingService.start());

    const checkHealth = async () => {
      try {
        await axiosClient.get('/health', { timeout: 3000 });
        setIsServerOffline(false);
        (window as any).__autofix_is_offline = false;
      } catch {
        setIsServerOffline(true);
        (window as any).__autofix_is_offline = true;
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => {
      window.removeEventListener('server-connection-changed', handleConn);
      clearInterval(interval);
      import('../../services/pollingService').then(m => m.pollingService.stop());
    };
  }, []);

  useEffect(() => {
    let timer: any;
    if (networkWarning) {
      setBannerExpanded(true);
      timer = setTimeout(() => {
        setBannerExpanded(false);
      }, 5000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [networkWarning]);

  useEffect(() => {
    const checkSecurity = async () => {
      try {
        const res = await axiosClient.get('/settings');
        if (res.data) {
          const pinOff = !res.data.requirePin;
          const networkOn = !!res.data.allowNetworkAccess;
          setNetworkWarning(pinOff && networkOn);
        }
      } catch {}
    };
    checkSecurity();
    const handleSettingsUpdated = () => checkSecurity();
    window.addEventListener('settings-updated', handleSettingsUpdated);
    return () => window.removeEventListener('settings-updated', handleSettingsUpdated);
  }, [location.pathname]);

  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? 68 : 250);

  return (
    <UnsavedChangesProvider>
      <div dir="rtl" style={wrapperStyle}>
        {/* Device Name Setup Modal on first open */}
        <DevicePromptModal />



        {concurrencyConflictMsg && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderBottom: '2px solid #ef4444',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            zIndex: 10001
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertOctagon size={20} />
              <span>{concurrencyConflictMsg}</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              إعادة التحميل
            </button>
          </div>
        )}

        {/* Server Offline / Reconnecting Banner */}
        {isServerOffline && (
          <div style={serverOfflineBannerStyle}>
            <WifiOff size={18} />
            <span>تعذر الاتصال بسيرفر الورشة — تأكد من تشغيل البرنامج على اللابتوب وأن الجهاز متصل بنفس شبكة الـ Wi-Fi</span>
          </div>
        )}

        {isReconnecting && (
          <div style={reconnectingBannerStyle}>
            <Wifi size={18} />
            <span>جاري إعادة الاتصال المباشر...</span>
          </div>
        )}

        {/* Sidebar Area (Desktop only) */}
        {!isMobile && (
          <aside style={{
            ...sidebarAreaStyle,
            width: `${sidebarWidth}px`,
            minWidth: `${sidebarWidth}px`,
            transition: 'width 0.2s ease, min-width 0.2s ease'
          }}>
            <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          </aside>
        )}

        {/* Main Application Area */}
        <div style={{
          ...mainAreaStyle,
          marginRight: isMobile ? 0 : `${sidebarWidth}px`,
          paddingBottom: isMobile ? '70px' : '0px',
          transition: 'margin-right 0.2s ease'
        }}>
          {networkWarning && bannerExpanded && (
            <div style={securityBannerStyle} id="security-warning-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                <AlertOctagon size={18} style={{ flexShrink: 0 }} />
                <span>تنبيه أمني: مشاركة الشبكة مفعّلة بدون رقم سري — أي جهاز على شبكة الورشة يمكنه فتح وتعديل البيانات</span>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
                  style={bannerPinBtnStyle}
                  id="banner-enable-pin-btn"
                >
                  تفعيل الرقم السري
                </button>
              </div>
              <button
                type="button"
                onClick={() => setBannerExpanded(false)}
                style={bannerCloseBtnStyle}
                title="إغلاق التنبيه"
                id="banner-close-btn"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Topbar */}
          <Topbar
            showSecurityShield={networkWarning && !bannerExpanded}
            onOpenSecurityBanner={() => setBannerExpanded(true)}
          />

          {/* Page Content */}
          <main style={{ ...contentAreaStyle, padding: isMobile ? '16px 12px' : '24px' }}>
            <Outlet />
          </main>

          {/* Footer - Pure Arabic Workshop System Status (Desktop) */}
          {!isMobile && (
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
          )}
        </div>

        {/* Mobile Sticky Bottom Bar (3 Pages Only) */}
        {isMobile && (
          <nav style={mobileBottomBarStyle} aria-label="شريط التنقل السفلي">
            <NavLink
              to="/"
              style={({ isActive }) => ({
                ...mobileBottomTabStyle,
                color: isActive ? '#e52535' : '#94a3b8'
              })}
            >
              <LayoutDashboard size={20} />
              <span>الرئيسية</span>
            </NavLink>

            <NavLink
              to="/spare-parts"
              style={({ isActive }) => ({
                ...mobileBottomTabStyle,
                color: isActive ? '#e52535' : '#94a3b8'
              })}
            >
              <Package size={20} />
              <span>المخزن</span>
            </NavLink>

            <NavLink
              to="/backup-restore"
              style={({ isActive }) => ({
                ...mobileBottomTabStyle,
                color: isActive ? '#e52535' : '#94a3b8'
              })}
            >
              <Database size={20} />
              <span>النسخ الاحتياطي</span>
            </NavLink>
          </nav>
        )}
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

const mobileBottomBarStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: '60px',
  backgroundColor: '#161c24',
  borderTop: '1px solid #212c3d',
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  zIndex: 2000,
  boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.4)'
};

const mobileBottomTabStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '3px',
  textDecoration: 'none',
  fontSize: '11px',
  fontWeight: 700,
  flex: 1,
  padding: '8px 0',
  minHeight: '44px',
  justifyContent: 'center'
};

const securityBannerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  backgroundColor: '#b91c1c',
  color: '#ffffff',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  zIndex: 1001,
  direction: 'rtl'
};

const bannerPinBtnStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#b91c1c',
  border: 'none',
  borderRadius: '6px',
  padding: '4px 12px',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif',
  marginRight: '8px'
};

const bannerCloseBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#ffffff',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
};

const serverOfflineBannerStyle: React.CSSProperties = {
  position: 'fixed',
  top: '36px',
  left: 0,
  right: 0,
  backgroundColor: '#d97706',
  color: '#ffffff',
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  zIndex: 9998
};

const reconnectingBannerStyle: React.CSSProperties = {
  position: 'fixed',
  top: '36px',
  left: 0,
  right: 0,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '6px 16px',
  fontSize: '12px',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  zIndex: 9997
};

export default Layout;
