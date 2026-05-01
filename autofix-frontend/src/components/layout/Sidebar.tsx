import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Users, Wrench, FileText, Package, Settings, LogOut } from 'lucide-react';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={{ 
      width: '260px', 
      backgroundColor: 'var(--bg-sidebar)', 
      height: '100vh', 
      position: 'fixed', 
      left: 0, 
      top: 0, 
      borderRight: '1px solid var(--border)',
      padding: '2rem 1rem',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h2 style={{ color: 'var(--primary)', marginBottom: '2rem', paddingLeft: '1rem' }}>AutoFix</h2>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <Link to="/" style={linkStyle}><Home size={20} /> Home</Link>
        <Link to="/customers" style={linkStyle}><Users size={20} /> Customers</Link>
        <Link to="/mechanics" style={linkStyle}><Wrench size={20} /> Mechanics</Link>
        <Link to="/repair-orders" style={linkStyle}><FileText size={20} /> Repair Orders</Link>
        <Link to="/services" style={linkStyle}><Settings size={20} /> Services</Link>
        <Link to="/spare-parts" style={linkStyle}><Package size={20} /> Spare Parts</Link>
      </nav>

      <button onClick={handleLogout} style={{ 
        marginTop: 'auto', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        padding: '0.75rem 1rem', 
        backgroundColor: 'transparent', 
        color: 'var(--danger)', 
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer'
      }}>
        <LogOut size={20} /> Logout
      </button>
    </div>
  );
};

const linkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  color: 'var(--text-main)',
  transition: 'background-color 0.2s',
  textDecoration: 'none'
};

export default Sidebar;
