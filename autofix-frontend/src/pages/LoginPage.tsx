import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Controlled form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Status state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // In a real app, we would call authService.login(username, password)
      // For this assignment, we simulate a successful login and redirect based on role
      console.log('Logging in with:', { username, password });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      localStorage.setItem('token', 'fake-jwt-token');
      
      // Basic role routing simulation
      if (username.includes('admin')) navigate('/customers');
      else if (username.includes('mechanic')) navigate('/mechanic');
      else navigate('/customer');
      
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      backgroundColor: 'var(--bg-main)' 
    }}>
      <div style={{ 
        backgroundColor: 'var(--bg-card)', 
        padding: '2.5rem', 
        borderRadius: '12px', 
        border: '1px solid var(--border)',
        width: '100%',
        maxWidth: '400px',
        boxShadow: 'var(--shadow)'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--primary)' }}>AutoFix Login</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Enter your username"
              required 
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                backgroundColor: 'var(--bg-main)', 
                border: '1px solid var(--border)', 
                color: 'var(--text-main)', 
                borderRadius: '6px' 
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter your password"
              required 
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                backgroundColor: 'var(--bg-main)', 
                border: '1px solid var(--border)', 
                color: 'var(--text-main)', 
                borderRadius: '6px' 
              }}
            />
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>}

          <button 
            type="submit" 
            disabled={submitting}
            style={{ 
              backgroundColor: 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              padding: '0.75rem', 
              borderRadius: '6px', 
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
        
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
