import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Users, ShieldCheck } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page" style={{ 
      backgroundColor: 'var(--bg-main)', 
      color: 'var(--text-main)', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '4rem 2rem'
    }}>
      <div className="hero" style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--primary)' }}>AutoFix</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          AutoFix is a car repair shop management system. 
          Customers can submit repair orders, mechanics manage their jobs, 
          and admins control the entire system.
        </p>
      </div>

      <div className="features" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '2rem', 
        width: '100%', 
        maxWidth: '1200px',
        marginBottom: '4rem'
      }}>
        <div className="feature-card" style={{ 
          backgroundColor: 'var(--bg-card)', 
          padding: '2rem', 
          borderRadius: '1rem', 
          border: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <Users size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3>For Customers</h3>
          <p style={{ color: 'var(--text-muted)' }}>Manage your cars and track your repair orders in real-time.</p>
        </div>

        <div className="feature-card" style={{ 
          backgroundColor: 'var(--bg-card)', 
          padding: '2rem', 
          borderRadius: '1rem', 
          border: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <Wrench size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3>For Mechanics</h3>
          <p style={{ color: 'var(--text-muted)' }}>Stay on top of your assigned jobs and spare parts inventory.</p>
        </div>

        <div className="feature-card" style={{ 
          backgroundColor: 'var(--bg-card)', 
          padding: '2rem', 
          borderRadius: '1rem', 
          border: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <ShieldCheck size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3>For Admins</h3>
          <p style={{ color: 'var(--text-muted)' }}>Full system control over customers, mechanics, and business operations.</p>
        </div>
      </div>

      <button 
        onClick={() => navigate('/login')}
        style={{ 
          padding: '1rem 3rem', 
          fontSize: '1.2rem', 
          fontWeight: '600', 
          backgroundColor: 'var(--primary)', 
          color: 'white', 
          border: 'none', 
          borderRadius: '0.5rem', 
          cursor: 'pointer',
          transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        Login to Get Started
      </button>
    </div>
  );
};

export default HomePage;
