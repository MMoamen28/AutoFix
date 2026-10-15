import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Database, Settings, Car, Users
} from 'lucide-react';
import SettingsModal from '../shared/SettingsModal';

export const Sidebar: React.FC<{ isCollapsed?: boolean; onToggle?: () => void }> = ({ isCollapsed, onToggle }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const menuItems = [
    { to: '/', label: 'الرئيسية', icon: LayoutDashboard },
    { to: '/mechanics', label: 'طاقم العمل والفنيين', icon: Users },
    { to: '/spare-parts', label: 'المخزن', icon: Package },
  ];

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
              مركز صيانة السيارات
            </div>
          </div>
        )}
      </div>

      {/* Navigation List: Exactly 3 items */}
      <nav style={navScrollStyle}>
        <div style={{ marginBottom: '16px' }}>
          {!isCollapsed && (
            <div style={sectionTitleStyle}>القائمة الرئيسية</div>
          )}
          {menuItems.map((item) => (
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
                padding: isCollapsed ? '12px 0' : '12px 16px',
              })}
              className="nav-link"
            >
              <item.icon size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && (
                <span style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Settings button in bottom of sidebar */}
      <div style={sidebarFooterStyle}>
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            ...navLinkItemStyle,
            background: 'none',
            border: 'none',
            borderRight: '3px solid transparent',
            color: '#94a3b8',
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
  padding: '8px 16px 6px',
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
  padding: '12px 8px',
  borderTop: '1px solid #212c3d',
  backgroundColor: '#11161d'
};

export default Sidebar;
