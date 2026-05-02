import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Wrench, Package, 
  ClipboardList, Car, LogOut, Shield,
  Bell, FileText, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useActionRequests } from '../../hooks/useActionRequests';

const Sidebar: React.FC = () => {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingCount } = useActionRequests();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    // Owner specific items
    { to: '/', label: 'Admin Hub', icon: LayoutDashboard, roles: ['Owner'] },
    { 
      to: '/owner/requests', 
      label: 'Approvals', 
      icon: Bell, 
      roles: ['Owner'],
      badge: pendingCount > 0 ? pendingCount : null
    },
    { to: '/owner/receipts', label: 'Receipts', icon: FileText, roles: ['Owner'] },
    { to: '/owner/all-data', label: 'System Data', icon: Shield, roles: ['Owner'] },

    // Admin specific items
    { to: '/customers', label: 'Customers', icon: Users, roles: ['Admin', 'Owner'] },
    { to: '/mechanics', label: 'Team', icon: Wrench, roles: ['Admin', 'Owner'] },
    { to: '/spare-parts', label: 'Inventory', icon: Package, roles: ['Admin', 'Owner'] },
    
    // Mechanic specific items
    { to: '/', label: 'My Jobs', icon: ClipboardList, roles: ['Mechanic'] },
    { to: '/mechanic/requests', label: 'My Requests', icon: Bell, roles: ['Mechanic'] },
    
    // Customer specific items
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['Customer'] },
    { to: '/customer/cars', label: 'My Cars', icon: Car, roles: ['Customer'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(role || ''));

  return (
    <aside className="w-72 bg-[#0B0F1A]/80 backdrop-blur-xl border-r border-gray-800 h-screen sticky top-0 flex flex-col p-6 shadow-2xl z-50">
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Wrench className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">AutoFix</h1>
          <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">Pro Systems</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 group
              ${isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}
            `}
          >
            <div className="flex items-center gap-3">
              <item.icon size={20} className={location.pathname === item.to ? 'text-white' : 'group-hover:text-blue-400 transition-colors'} />
              <span className="font-medium text-sm">{item.label}</span>
            </div>
            
            {item.badge ? (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                {item.badge}
              </span>
            ) : (
              <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 ${location.pathname === item.to ? 'hidden' : ''}`} />
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-800">
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
            <Users className="text-gray-400" size={18} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user?.username || 'User'}</p>
            <p className="text-xs text-gray-500 capitalize">{role || 'Role'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all duration-300"
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
