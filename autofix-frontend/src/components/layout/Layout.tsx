import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { token } = useAuth();
  const isPublicPage = (!token && location.pathname === '/') || location.pathname === '/login' || location.pathname === '/register';

  if (isPublicPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex bg-[#0B0F1A] min-h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
};

export default Layout;
