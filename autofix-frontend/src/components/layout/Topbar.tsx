import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, ShoppingCart, Search, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cartService } from '../../services/cartService';

const Topbar: React.FC = () => {
  const { user, role } = useAuth();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);

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
    if (path === '/') return 'Dashboard';
    if (path.includes('customers')) return 'Customer Management';
    if (path.includes('mechanics')) return 'Team Management';
    if (path.includes('spare-parts')) return 'Inventory Management';
    if (path.includes('cart')) return 'My Shopping Cart';
    if (path.includes('orders')) return 'Order History';
    if (path.includes('requests')) return 'Action Requests';
    return 'AutoFix Pro';
  };

  const initials = user?.username?.substring(0, 2).toUpperCase() || 'U';

  return (
    <div style={topbarStyle}>
      {/* Left: Breadcrumbs & Title */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={breadcrumbStyle}>
          AutoFix <span style={{ margin: '0 8px' }}>/</span> {getPageTitle()}
        </div>
        <h2 style={pageTitleStyle}>{getPageTitle()}</h2>
      </div>

      {/* Right: Actions & User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* Customer Cart */}
        {role === 'Customer' && (
          <Link to="/customer/cart" style={iconButtonStyle}>
            <ShoppingCart size={20} />
            {cartCount > 0 && <span style={cartBadgeStyle}>{cartCount}</span>}
          </Link>
        )}

        {/* Notifications */}
        <button style={iconButtonStyle}>
          <Bell size={20} />
          <span style={dotStyle}></span>
        </button>

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

const dotStyle: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  width: '8px',
  height: '8px',
  backgroundColor: 'var(--accent)',
  borderRadius: '50%',
  border: '2px solid var(--bg-secondary)'
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
