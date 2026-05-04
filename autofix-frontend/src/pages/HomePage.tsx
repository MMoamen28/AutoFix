import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, Shield, ShoppingCart, 
  ArrowRight, ChevronRight, MousePointer2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/shared/Button';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      
      {/* Section 1 — Hero */}
      <section style={{
        height: '100vh',
        minWidth: '1280px',
        position: 'relative',
        backgroundImage: `linear-gradient(135deg, rgba(13,15,20,0.7) 0%, rgba(249,115,22,0.4) 100%),
                          url('/images/mechanic-tablet.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 32px'
      }}>
        <div style={{ maxWidth: '900px', animation: 'fadeIn 1s ease-out' }}>
          <h1 style={{ 
            fontSize: '72px', 
            fontWeight: 900, 
            color: 'white', 
            marginBottom: '24px',
            textShadow: '0 4px 12px var(--accent-glow)'
          }}>
            AutoFix
          </h1>
          <p style={{ fontSize: '24px', color: 'var(--text-secondary)', marginBottom: '48px', fontWeight: 500 }}>
            Professional Car Repair Management System
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', justifyContent: 'center' }}>
            <Button 
              onClick={() => navigate('/marketplace')}
              style={{ padding: '16px 32px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              Browse Marketplace <ArrowRight size={20} />
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleStart}
              style={{ padding: '16px 32px', fontSize: '18px', borderColor: 'white', color: 'white' }}
            >
              Login to Get Started
            </Button>
            {!isAuthenticated && (
              <Button 
                variant="ghost" 
                onClick={() => navigate('/register')}
                style={{ padding: '16px 32px', fontSize: '18px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
              >
                Register Free
              </Button>
            )}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '40px', animation: 'bounce 2s infinite' }}>
          <ChevronRight size={32} style={{ transform: 'rotate(90deg)', color: 'var(--text-muted)' }} />
        </div>
      </section>

      {/* Section 2 — Features */}
      <section style={{ padding: '100px 32px', backgroundColor: 'var(--bg-secondary)', position: 'relative' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '16px' }}>Engineered for Excellence</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>Everything you need to run a high-performance workshop</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <FeatureCard 
              icon={<Wrench size={32} />} 
              title="Expert Mechanics" 
              desc="Certified professionals assigned to your vehicle with real-time status updates and direct communication."
            />
            <FeatureCard 
              icon={<ShoppingCart size={32} />} 
              title="Easy Marketplace" 
              desc="Browse genuine spare parts and transparently priced services. Everything you need in one place."
            />
            <FeatureCard 
              icon={<Shield size={32} />} 
              title="Trusted Service" 
              desc="Comprehensive repair history, digital receipts, and guaranteed work quality from the industry's best."
            />
          </div>
        </div>
      </section>

      {/* Section 3 — Image Strip */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', minWidth: '1280px' }}>
        <ImageStripItem src="/images/mechanic-laptop.jpg" title="Diagnostics" />
        <ImageStripItem src="/images/mechanic-engine.jpg" title="Precision" />
        <ImageStripItem src="/images/mechanic-tablet.jpg" title="Management" />
      </section>

      {/* Section 4 — CTA Strip */}
      <section style={{ 
        background: 'var(--gradient-hero)', 
        padding: '80px 32px', 
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '48px', fontWeight: 900, marginBottom: '24px' }}>Ready to get started?</h2>
          <p style={{ fontSize: '20px', marginBottom: '40px', opacity: 0.9 }}>Join thousands of car owners and workshop managers who trust AutoFix.</p>
          <Button 
            onClick={() => navigate('/register')}
            style={{ 
              backgroundColor: 'white', 
              color: 'var(--accent)', 
              padding: '16px 48px', 
              fontSize: '20px',
              fontWeight: 700
            }}
          >
            Create Your Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '60px 32px', backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
          <Wrench color="var(--accent)" size={24} />
          <span style={{ fontSize: '20px', fontWeight: 800 }}>AutoFix Pro</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>© 2026 AutoFix Premium Services. All rights reserved.</p>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0) rotate(90deg); }
          40% { transform: translateY(-10px) rotate(90deg); }
          60% { transform: translateY(-5px) rotate(90deg); }
        }
      `}</style>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div style={{
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderTop: '4px solid var(--accent)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px',
    transition: 'all 0.3s ease',
    cursor: 'default'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-8px)';
    e.currentTarget.style.boxShadow = 'var(--shadow-accent)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  }}
  >
    <div style={{ color: 'var(--accent)', marginBottom: '24px' }}>{icon}</div>
    <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: 'white' }}>{title}</h3>
    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>{desc}</p>
  </div>
);

const ImageStripItem: React.FC<{ src: string; title: string }> = ({ src, title }) => (
  <div style={{ position: 'relative', height: '300px', overflow: 'hidden', cursor: 'pointer' }} className="image-strip-item">
    <img src={src} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} />
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(to bottom, transparent, rgba(249,115,22,0.8))',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingBottom: '32px',
      opacity: 0,
      transition: 'opacity 0.3s ease'
    }} className="overlay">
      <div style={{ textAlign: 'center' }}>
        <h4 style={{ color: 'white', fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>{title}</h4>
        <div style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
          Learn More <ChevronRight size={16} />
        </div>
      </div>
    </div>
    <style>{`
      .image-strip-item:hover img { transform: scale(1.1); }
      .image-strip-item:hover .overlay { opacity: 1; }
    `}</style>
  </div>
);

export default HomePage;
