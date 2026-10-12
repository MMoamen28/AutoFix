import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Wrench, Package, 
  ClipboardList, Car, LogOut, Shield,
  FileText, ShoppingBag, ShoppingCart,
  Settings, Layers, Box, Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cartService } from '../../services/cartService';
import { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MenuItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
  badge?: any;
}

interface MenuSection {
  title: string;
  roles?: string[];
  items: MenuItem[];
}

const Sidebar: React.FC = () => {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const { t } = useTranslation();

  const menuSections: MenuSection[] = [
    {
      title: t('sidebar.marketplace'),
      items: [
        { 
          to: '/marketplace', 
          label: t('sidebar.sparePartsMarket'), 
          icon: ShoppingBag, 
          roles: ['Owner', 'Admin', 'Customer'] 
        },
      ]
    },
    {
      title: t('sidebar.management'),
      roles: ['Owner', 'Admin', 'Receptionist', 'Reception'],
      items: [
        { to: '/', label: t('sidebar.workshopHub'), icon: LayoutDashboard, roles: ['Owner', 'Admin'] },
        { to: '/work-orders', label: t('sidebar.workOrders'), icon: ClipboardList, roles: ['Admin', 'Owner', 'Receptionist', 'Reception'] },
        { to: '/services', label: t('sidebar.workmanshipPrices'), icon: Layers, roles: ['Admin', 'Owner', 'Receptionist', 'Reception'] },
        { to: '/inspections', label: t('sidebar.carInspections'), icon: FileText, roles: ['Admin', 'Owner', 'Receptionist', 'Reception'] },
        { to: '/customers', label: t('sidebar.customers'), icon: Users, roles: ['Admin', 'Owner', 'Receptionist', 'Reception'] },
        { to: '/mechanics', label: t('sidebar.mechanicsStaff'), icon: Wrench, roles: ['Admin', 'Owner'] },
        { to: '/backup-restore', label: t('sidebar.backupSafety'), icon: Database, roles: ['Admin', 'Owner'] },
      ]
    },
    {
      title: t('sidebar.inventory'),
      roles: ['Owner', 'Admin'],
      items: [
        { to: '/spare-parts', label: t('sidebar.stockItems'), icon: Package, roles: ['Admin', 'Owner'] },
      ]
    },
    {
      title: t('sidebar.operations'),
      roles: ['Customer'],
      items: [
        { to: '/', label: t('sidebar.myDashboard'), icon: LayoutDashboard, roles: ['Customer'] },
        { to: '/customer/cars', label: t('sidebar.myVehicles'), icon: Car, roles: ['Customer'] },
        { to: '/cart', label: t('sidebar.shoppingCart'), icon: ShoppingCart, roles: ['Customer'], badge: cartCount > 0 ? cartCount : null },
      ]
    }
  ];

  const getRoleColor = (r: string) => {
    switch (r) {
      case 'Owner': return 'var(--accent)';
      case 'Admin': return 'var(--blue)';
      case 'Mechanic': return 'var(--purple)';
      case 'Customer': return 'var(--success)';
      default: return 'var(--text-muted)';
    }
  };

  const initials = user?.username?.substring(0, 2).toUpperCase() || 'U';

  return (
    <div style={sidebarStyle}>
      {/* Logo Section */}
      <div style={logoSectionStyle}>
        <div style={logoIconStyle}>
          <Wrench size={20} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>AutoFix</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Pro OS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav style={navStyle}>
        {menuSections.map((section, idx) => {
          const visibleItems = section.items.filter(item => item.roles.includes(role || ''));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} style={{ marginBottom: '24px' }}>
              <div style={sectionLabelStyle}>{section.title}</div>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    ...navLinkStyle,
                    backgroundColor: isActive ? 'var(--accent-dim)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)'
                  })}
                  className="nav-link"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <item.icon size={20} />
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span style={badgeStyle}>{item.badge}</span>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div style={userSectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            ...avatarStyle,
            borderColor: getRoleColor(role || ''),
            backgroundColor: `${getRoleColor(role || '')}20`,
            color: getRoleColor(role || '')
          }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '2px' }}>{user?.username}</p>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 800, 
              color: getRoleColor(role || ''),
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {role}
            </span>
          </div>
        </div>

        <button onClick={handleLogout} style={logoutButtonStyle} className="logout-btn">
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>

      <style>{`
        .nav-link:hover {
          background-color: var(--bg-glass-light) !important;
          color: var(--text-primary) !important;
        }
        .logout-btn:hover {
          background-color: var(--danger-dim) !important;
          color: var(--danger) !important;
        }
      `}</style>
    </div>
  );
};

const sidebarStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%'
};

const logoSectionStyle: React.CSSProperties = {
  height: '70px',
  background: 'linear-gradient(135deg, var(--accent), #dc2626)',
  display: 'flex',
  alignItems: 'center',
  padding: '0 20px',
  gap: '12px'
};

const logoIconStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  backgroundColor: 'rgba(255,255,255,0.2)',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const navStyle: React.CSSProperties = {
  flex: 1,
  padding: '24px 0',
  overflowY: 'auto'
};

const sectionLabelStyle: React.CSSProperties = {
  padding: '16px 20px 8px',
  fontSize: '11px',
  fontWeight: 800,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

const navLinkStyle: React.CSSProperties = {
  padding: '12px 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  textDecoration: 'none',
  transition: 'all 0.2s ease'
};

const badgeStyle: React.CSSProperties = {
  backgroundColor: 'var(--accent)',
  color: 'white',
  fontSize: '10px',
  fontWeight: 800,
  padding: '2px 6px',
  borderRadius: '99px'
};

const userSectionStyle: React.CSSProperties = {
  padding: '20px',
  borderTop: '1px solid var(--border)',
  backgroundColor: 'rgba(0,0,0,0.2)'
};

const avatarStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: '2px solid transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '14px'
};

const logoutButtonStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontWeight: 600,
  transition: 'all 0.2s ease'
};

export default Sidebar;
