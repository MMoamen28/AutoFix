import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Wrench, Package, 
  ClipboardList, Car, LogOut, Shield,
  FileText, ShoppingBag, ShoppingCart,
  Settings, Layers, Database, RotateCcw,
  Receipt, DollarSign, ChevronRight, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SettingsModal from '../shared/SettingsModal';

interface MenuItem {
  to: string;
  label: string;
  icon: any;
  roles: string[];
  badge?: any;
}

interface MenuSection {
  title: string;
  roles?: string[];
  items: MenuItem[];
}

export const Sidebar: React.FC<{ isCollapsed?: boolean; onToggle?: () => void }> = ({ isCollapsed, onToggle }) => {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuSections: MenuSection[] = [
    {
      title: 'إدارة الورشة',
      roles: ['Owner', 'Admin', 'Receptionist', 'Reception', 'Accountant'],
      items: [
        { to: '/', label: 'لوحة الورشة الرئيسية', icon: LayoutDashboard, roles: ['Owner', 'Admin', 'Receptionist', 'Reception', 'Accountant'] },
        { to: '/workshop-orders', label: 'العملاء وأوامر الشغل', icon: ClipboardList, roles: ['Admin', 'Owner', 'Receptionist', 'Reception'] },
        { to: '/invoices', label: 'الفواتير', icon: FileText, roles: ['Admin', 'Owner', 'Receptionist', 'Reception', 'Accountant'] },
        { to: '/credit-notes', label: 'الإشعارات الدائنة', icon: RotateCcw, roles: ['Admin', 'Owner', 'Receptionist', 'Reception', 'Accountant'] },
        { to: '/expenses', label: 'المصروفات', icon: Receipt, roles: ['Admin', 'Owner', 'Accountant'] },
        { to: '/spare-parts', label: 'قطع الغيار والمخزن', icon: Package, roles: ['Admin', 'Owner'] },
        { to: '/services', label: 'أسعار المصنعية والخدمات', icon: Layers, roles: ['Admin', 'Owner', 'Receptionist', 'Reception'] },
        { to: '/inspections', label: 'فحص وتقييم السيارات', icon: Car, roles: ['Admin', 'Owner', 'Receptionist', 'Reception'] },
        { to: '/mechanics', label: 'فريق الفنيين', icon: Wrench, roles: ['Admin', 'Owner'] },
        { to: '/backup-restore', label: 'النسخ الاحتياطي والأمان', icon: Database, roles: ['Admin', 'Owner'] },
      ]
    },
    {
      title: 'بوابة العميل',
      roles: ['Customer'],
      items: [
        { to: '/', label: 'لوحة حسابي', icon: LayoutDashboard, roles: ['Customer'] },
        { to: '/invoices', label: 'فواتيري', icon: FileText, roles: ['Customer'] },
        { to: '/customer/cars', label: 'سياراتي', icon: Car, roles: ['Customer'] },
        { to: '/marketplace', label: 'متجر قطع الغيار', icon: ShoppingBag, roles: ['Customer'] },
        { to: '/cart', label: 'سلة المشتريات', icon: ShoppingCart, roles: ['Customer'] },
      ]
    }
  ];

  const getRoleArabic = (r?: string | null) => {
    switch (r) {
      case 'Owner': return 'المالك';
      case 'Admin': return 'مدير النظام';
      case 'Receptionist':
      case 'Reception': return 'الاستقبال';
      case 'Mechanic': return 'فني الورشة';
      case 'Accountant': return 'المحاسب';
      case 'Customer': return 'العميل';
      default: return r || 'مستخدم';
    }
  };

  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : 'AP';

  return (
    <div style={sidebarContainerStyle} dir="rtl">
      {/* Brand Header */}
      <div style={brandHeaderStyle}>
        <div style={logoIconStyle}>
          <Car size={20} color="#ffffff" />
        </div>
        {!isCollapsed && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', fontFamily: 'Cairo, sans-serif' }}>
              AP AUTO
            </div>
            <div style={{ fontSize: '10px', color: '#e52535', fontWeight: 800, letterSpacing: '0.5px' }}>
              لوحة التحكم الاحترافية
            </div>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav style={navScrollStyle}>
        {menuSections.map((section, idx) => {
          const visibleItems = section.items.filter(item => item.roles.includes(role || ''));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} style={{ marginBottom: '16px' }}>
              {!isCollapsed && (
                <div style={sectionTitleStyle}>{section.title}</div>
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  style={({ isActive }) => ({
                    ...navLinkItemStyle,
                    backgroundColor: isActive ? 'rgba(229, 37, 53, 0.12)' : 'transparent',
                    borderRight: isActive ? '3px solid #e52535' : '3px solid transparent',
                    color: isActive ? '#e52535' : '#cbd5e1',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    padding: isCollapsed ? '12px 0' : '10px 16px',
                  })}
                  className="nav-link"
                >
                  <item.icon size={19} style={{ flexShrink: 0 }} />
                  {!isCollapsed && (
                    <span style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}

        {/* Settings button in menu */}
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            ...navLinkItemStyle,
            background: 'none',
            border: 'none',
            borderRight: '3px solid transparent',
            color: '#cbd5e1',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            padding: isCollapsed ? '12px 0' : '10px 16px',
            width: '100%',
            cursor: 'pointer'
          }}
          title="إعدادات الورشة"
        >
          <Settings size={19} style={{ flexShrink: 0 }} />
          {!isCollapsed && (
            <span style={{ fontSize: '13px', fontWeight: 700 }}>
              إعدادات الورشة
            </span>
          )}
        </button>
      </nav>

      {/* Footer / User Profile & Logout */}
      <div style={sidebarFooterStyle}>
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={userAvatarStyle}>{initials}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.username}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {getRoleArabic(role)}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          style={{
            ...logoutBtnStyle,
            justifyContent: isCollapsed ? 'center' : 'flex-start'
          }}
          title="تسجيل الخروج"
        >
          <LogOut size={16} />
          {!isCollapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>

      {/* Workshop Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

const sidebarContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#161c24',
  borderLeft: '1px solid #212c3d',
  fontFamily: 'Cairo, sans-serif'
};

const brandHeaderStyle: React.CSSProperties = {
  height: '64px',
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  gap: '12px',
  borderBottom: '1px solid #212c3d'
};

const logoIconStyle: React.CSSProperties = {
  width: '34px',
  height: '34px',
  backgroundColor: '#e52535',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
};

const navScrollStyle: React.CSSProperties = {
  flex: 1,
  padding: '16px 0',
  overflowY: 'auto'
};

const sectionTitleStyle: React.CSSProperties = {
  padding: '8px 16px 4px',
  fontSize: '11px',
  fontWeight: 800,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const navLinkItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  textDecoration: 'none',
  transition: 'all 0.15s ease'
};

const sidebarFooterStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderTop: '1px solid #212c3d',
  backgroundColor: '#11161d'
};

const userAvatarStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: '#2a3749',
  border: '1px solid #3b82f6',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
};

const logoutBtnStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  borderRadius: '8px',
  color: '#ef4444',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

export default Sidebar;
