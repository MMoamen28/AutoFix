import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, Bell, MessageSquare, User, 
  Menu, Settings, LogOut, Car, FileText, CheckCircle2, Wrench, X, Laptop, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SettingsModal from '../shared/SettingsModal';
import axiosClient from '../../services/axiosClient';
import { toWesternDigits } from '../../i18n/formatters';

interface TopbarProps {
  showSecurityShield?: boolean;
  onOpenSecurityBanner?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ showSecurityShield, onOpenSecurityBanner }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [currentDeviceName, setCurrentDeviceName] = useState(localStorage.getItem('autofix_device_name') || 'جهاز الورشة');

  useEffect(() => {
    const handleNameChange = (e: any) => {
      if (e.detail?.deviceName) setCurrentDeviceName(e.detail.deviceName);
    };
    window.addEventListener('device-name-changed', handleNameChange);
    return () => window.removeEventListener('device-name-changed', handleNameChange);
  }, []);

  useEffect(() => {
    const handleOpenSettings = () => setSettingsOpen(true);
    window.addEventListener('open-settings', handleOpenSettings);
    return () => window.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    customers: any[];
    cars: any[];
    workOrders: any[];
    invoices: any[];
  }>({ customers: [], cars: [], workOrders: [], invoices: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults({ customers: [], cars: [], workOrders: [], invoices: [] });
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const normalizedDigits = toWesternDigits(trimmed);
      const phoneDigits = normalizedDigits.replace(/[^0-9]/g, '');
      const phoneParam = phoneDigits.startsWith('20') ? phoneDigits.substring(2) : phoneDigits;

      try {
        const [custRes, woRes, invRes] = await Promise.allSettled([
          axiosClient.get(`/customers?search=${encodeURIComponent(normalizedDigits)}`),
          axiosClient.get(`/work-orders?search=${encodeURIComponent(normalizedDigits)}`),
          axiosClient.get(`/invoices?search=${encodeURIComponent(normalizedDigits)}`)
        ]);

        const customers = custRes.status === 'fulfilled' && Array.isArray(custRes.value.data) ? custRes.value.data.slice(0, 5) : [];
        const workOrders = woRes.status === 'fulfilled' && Array.isArray(woRes.value.data) ? woRes.value.data.slice(0, 5) : [];
        const invoices = invRes.status === 'fulfilled' && Array.isArray(invRes.value.data) ? invRes.value.data.slice(0, 5) : [];

        setSearchResults({
          customers,
          cars: [],
          workOrders,
          invoices
        });
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleNewWorkOrderClick = () => {
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-new-work-order'));
      }, 150);
    } else {
      window.dispatchEvent(new CustomEvent('open-new-work-order'));
    }
  };

  const handleSelectSearchItem = (type: string, item: any) => {
    setShowSearchResults(false);
    if (window.location.pathname !== '/') {
      navigate('/');
    }
    window.dispatchEvent(new CustomEvent('open-search-detail', { detail: { type, item } }));
  };

  const handleToggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('toggle-sidebar'));
  };

  return (
    <header style={headerStyle} dir="rtl">
      {/* Right side: Logo & Workshop Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={handleToggleSidebar}
          style={menuToggleBtnStyle}
          title="القائمة الجانبية"
          id="toggle-sidebar-btn"
        >
          <Menu size={20} color="#ffffff" />
        </button>

        <div 
          onClick={() => navigate('/')} 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={carLogoIconStyle}>
            <Car size={22} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.3px', fontFamily: 'Cairo, sans-serif' }}>
              AP AUTO
            </span>
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#e52535', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              SERVICE CENTER
            </span>
          </div>
        </div>
      </div>

      {/* Center: Wide Search Bar */}
      <div ref={searchRef} style={{ flex: 1, maxWidth: '520px', margin: '0 20px', position: 'relative' }}>
        <div style={searchContainerStyle}>
          <Search size={18} color="#94a3b8" style={{ marginLeft: '10px', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchQuery.trim().length >= 2) setShowSearchResults(true); }}
            placeholder="ابحث عن عميل، رقم لوحة، هاتف، أو رقم فاتورة..."
            style={searchInputStyle}
            id="global-topbar-search"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Instant Search Results Dropdown */}
        {showSearchResults && (
          <div style={searchResultsDropdownStyle}>
            {isSearching ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                جاري البحث...
              </div>
            ) : (searchResults.customers.length === 0 && searchResults.workOrders.length === 0 && searchResults.invoices.length === 0) ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                لا توجد نتائج مطابقة لـ "{searchQuery}"
              </div>
            ) : (
              <div>
                {/* Customers */}
                {searchResults.customers.length > 0 && (
                  <div style={{ padding: '8px 0' }}>
                    <div style={resultSectionHeaderStyle}>العملاء</div>
                    {searchResults.customers.map((c: any) => (
                      <div
                        key={`c-${c.id}`}
                        onClick={() => handleSelectSearchItem('customer', c)}
                        style={resultItemStyle}
                      >
                        <User size={16} color="#3b82f6" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}><bdi dir="auto">{c.fullName}</bdi></div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}><bdi dir="auto">{c.phone}</bdi></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Work Orders */}
                {searchResults.workOrders.length > 0 && (
                  <div style={{ padding: '8px 0', borderTop: '1px solid #232d3d' }}>
                    <div style={resultSectionHeaderStyle}>أوامر الشغل</div>
                    {searchResults.workOrders.map((w: any) => (
                      <div
                        key={`w-${w.id}`}
                        onClick={() => handleSelectSearchItem('workOrder', w)}
                        style={resultItemStyle}
                      >
                        <Wrench size={16} color="#e52535" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>{w.orderNumber} - <bdi dir="auto">{w.carPlate || w.customerName}</bdi></div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{w.workType || 'صيانة'} | {w.totalAmount} ج.م</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Invoices */}
                {searchResults.invoices.length > 0 && (
                  <div style={{ padding: '8px 0', borderTop: '1px solid #232d3d' }}>
                    <div style={resultSectionHeaderStyle}>الفواتير</div>
                    {searchResults.invoices.map((inv: any) => (
                      <div
                        key={`inv-${inv.id}`}
                        onClick={() => handleSelectSearchItem('invoice', inv)}
                        style={resultItemStyle}
                      >
                        <FileText size={16} color="#10b981" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>{inv.invoiceNumber} - <bdi dir="auto">{inv.customerName}</bdi></div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{inv.totalAmount} ج.م | {inv.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Left side: Red CTA Button & Gear Settings */}
      <div style={leftActionsWrapperStyle}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-device-prompt'))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#1c2430',
            border: '1px solid #2a3749',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif'
          }}
          title="تغيير اسم هذا الجهاز"
        >
          <Laptop size={14} color="#94a3b8" />
          <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>{currentDeviceName}</span>
        </button>

        <button
          onClick={handleNewWorkOrderClick}
          style={redCtaButtonStyle}
          id="topbar-new-work-order-btn"
        >
          <Plus size={18} strokeWidth={3} />
          <span>كارت عمل جديد</span>
        </button>

        {showSecurityShield && (
          <button
            onClick={onOpenSecurityBanner}
            style={securityShieldBtnStyle}
            title="تنبيه أمني: مشاركة الشبكة مفعّلة بدون رقم سري"
            id="topbar-security-shield-btn"
          >
            <ShieldAlert size={18} color="#ef4444" />
          </button>
        )}

        <button
          onClick={() => setSettingsOpen(true)}
          style={circleIconBtnStyle}
          title="إعدادات الورشة"
          id="topbar-settings-btn"
        >
          <Settings size={20} color="#cbd5e1" />
        </button>
      </div>

      {/* Workshop Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
};

const securityShieldBtnStyle: React.CSSProperties = {
  backgroundColor: '#fee2e2',
  border: '1px solid #ef4444',
  borderRadius: '8px',
  padding: '6px 8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const headerStyle: React.CSSProperties = {
  height: '64px',
  width: '100%',
  backgroundColor: '#161c24',
  borderBottom: '1px solid #212c3d',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
};

const menuToggleBtnStyle: React.CSSProperties = {
  background: '#1c2430',
  border: '1px solid #2a3749',
  borderRadius: '8px',
  color: '#ffffff',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
};

const carLogoIconStyle: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '10px',
  backgroundColor: '#e52535',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(229, 37, 53, 0.4)'
};

const searchContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#1c2430',
  border: '1px solid #2a3749',
  borderRadius: '30px',
  padding: '6px 14px',
  transition: 'border-color 0.2s ease'
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'none',
  border: 'none',
  color: '#ffffff',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'Cairo, sans-serif'
};

const searchResultsDropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  left: 0,
  marginTop: '8px',
  backgroundColor: '#161c24',
  border: '1px solid #2a3749',
  borderRadius: '12px',
  boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
  maxHeight: '380px',
  overflowY: 'auto',
  zIndex: 1100
};

const resultSectionHeaderStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 800,
  color: '#94a3b8',
  padding: '4px 14px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const resultItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 14px',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease'
};

const redCtaButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: '#e52535',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '14px',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(229, 37, 53, 0.4)',
  fontFamily: 'Cairo, sans-serif',
  transition: 'transform 0.1s ease, background-color 0.15s ease',
  userSelect: 'none'
};

const circleIconBtnStyle: React.CSSProperties = {
  position: 'relative',
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  backgroundColor: '#1c2430',
  border: '1px solid #2a3749',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
};

const redNotificationDotStyle: React.CSSProperties = {
  position: 'absolute',
  top: '7px',
  left: '7px',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#e52535',
  boxShadow: '0 0 6px #e52535'
};

const userCircleBtnStyle: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  backgroundColor: '#2a3749',
  border: '1px solid #3b82f6',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
};

const userDropdownMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '8px',
  backgroundColor: '#161c24',
  border: '1px solid #2a3749',
  borderRadius: '12px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
  minWidth: '180px',
  zIndex: 1100,
  overflow: 'hidden'
};

const dropdownItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 16px',
  background: 'none',
  border: 'none',
  color: '#cbd5e1',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  textAlign: 'right',
  fontFamily: 'Cairo, sans-serif'
};

const leftActionsWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

export default Topbar;
