import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cartService } from '../../services/cartService';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../shared/LanguageToggle';
import SettingsModal from '../shared/SettingsModal';
import { Settings } from 'lucide-react';

const Topbar: React.FC = () => {
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [cartCount, setCartCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    fetchCartCount();
    window.addEventListener('cart-updated', fetchCartCount);
    return () => window.removeEventListener('cart-updated', fetchCartCount);
  }, [role]);

  const fetchCartCount = async () => {
    if (role === 'Customer') {
      try {
        const cart = await cartService.getCart();
        setCartCount(cart.length);
      } catch (err) {
        setCartCount(0);
      }
    }
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/admin-dashboard') return t('topbar.dashboard');
    if (path.includes('marketplace')) return t('topbar.marketplace');
    if (path.includes('customers')) return t('topbar.customers');
    if (path.includes('mechanics')) return t('topbar.mechanics');
    if (path.includes('spare-parts')) return t('topbar.spareParts');
    if (path.includes('cart')) return t('topbar.cart');
    if (path.includes('work-orders')) return t('sidebar.workOrders');
    if (path.includes('inspections')) return t('topbar.inspections');
    if (path.includes('backup')) return t('topbar.backupRestore');
    return t('common.appName');
  };

  const initials = user?.username?.substring(0, 2).toUpperCase() || 'U';

  return (
    <div style={topbarStyle}>
      {/* Left: Breadcrumbs & Title */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={breadcrumbStyle}>
          {t('common.appName')} <span style={{ margin: '0 8px' }}>/</span> {getPageTitle()}
        </div>
        <h2 style={pageTitleStyle}>{getPageTitle()}</h2>
      </div>

      {/* Right: Actions, Language Toggle, Settings & User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Settings Button */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          style={iconButtonStyle}
          title="Workshop Settings / إعدادات الورشة"
          id="topbar-settings-btn"
        >
          <Settings size={18} />
        </button>

        {/* Language Toggle EN | عربي */}
        <LanguageToggle />

        {/* Customer Cart */}
        {role === 'Customer' && (
          <button onClick={() => navigate('/cart')} style={iconButtonStyle}>
            <ShoppingCart size={20} />
            {cartCount > 0 && <span style={cartBadgeStyle}>{cartCount}</span>}
          </button>
        )}

        <div style={dividerStyle}></div>

        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={userAvatarStyle}>
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{user?.username}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{role}</span>
          </div>
        </div>
      </div>

      {/* Workshop Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

const topbarStyle: React.CSSProperties = {
  height: '64px',
  width: '100%',
  backgroundColor: 'var(--bg-secondary)',
  backdropFilter: 'blur(10px)',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 32px',
  boxShadow: '0 1px 20px rgba(0,0,0,0.3)'
};

const breadcrumbStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '4px'
};

const pageTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 800,
  color: 'white',
  letterSpacing: '-0.3px'
};

const iconButtonStyle: React.CSSProperties = {
  position: 'relative',
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px',
  borderRadius: 'var(--radius-sm)',
  transition: 'all 0.2s ease',
  textDecoration: 'none'
};

const cartBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '0',
  right: '0',
  backgroundColor: 'var(--accent)',
  color: 'white',
  fontSize: '10px',
  fontWeight: 800,
  padding: '2px 6px',
  borderRadius: '99px',
  transform: 'translate(40%, -40%)'
};



const dividerStyle: React.CSSProperties = {
  width: '1px',
  height: '32px',
  backgroundColor: 'var(--border)'
};

const userAvatarStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  backgroundColor: 'var(--accent)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '13px',
  fontWeight: 700
};

export default Topbar;
