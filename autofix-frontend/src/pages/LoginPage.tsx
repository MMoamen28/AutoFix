import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../services/axiosClient';
import { useToast } from '../hooks/useToast';
import { Wrench, User, Lock, Eye, EyeOff, Mail, Phone } from 'lucide-react';
import Button from '../components/shared/Button';
import Input from '../components/shared/Input';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  
  const [isRegister, setIsRegister] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register States
  const [regData, setRegData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await axiosClient.post('/auth/login', { username, password });
      login(response.data.accessToken);
      showToast('Logged in successfully', 'success');
      navigate('/');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Invalid credentials', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regData.password !== regData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await axiosClient.post('/auth/register', regData);
      showToast('Account created successfully! Please sign in.', 'success');
      setIsRegister(false);
      setUsername(regData.username);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.response?.data?.error || 'Registration failed';
      showToast(typeof detail === 'string' ? detail : 'Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh', minWidth: '1280px' }}>
      {/* Left Panel - Image */}
      <div style={{
        backgroundImage: `linear-gradient(135deg, rgba(249,115,22,0.75) 0%, rgba(13,15,20,0.92) 100%),
                          url('/images/mechanic-laptop.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <Wrench size={64} color="white" />
          <h1 style={{ fontSize: '72px', fontWeight: 800, color: 'white', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>AutoFix</h1>
        </div>
        <p style={{ fontSize: '24px', color: 'rgba(255,255,255,0.8)', maxWidth: '400px' }}>Your trusted car repair partner</p>
      </div>

      {/* Right Panel - Form */}
      <div style={{ 
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: isRegister ? '560px' : '440px',
          backgroundColor: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px',
          boxShadow: 'var(--shadow-card)',
          transition: 'max-width 0.3s ease'
        }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {isRegister ? 'Join AutoFix' : 'Welcome Back'}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {isRegister ? 'Create your customer account' : 'Sign in to your AutoFix account'}
            </p>
          </div>

          {!isRegister ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <Input
                label="Username"
                icon={<User size={18} />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
              
              <div style={{ position: 'relative' }}>
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  icon={<Lock size={18} />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '38px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <Button type="submit" isLoading={submitting} style={{ width: '100%', marginTop: '12px', background: 'var(--gradient-accent)' }}>
                Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <Input
                  label="First Name"
                  icon={<User size={18} />}
                  value={regData.firstName}
                  onChange={(e) => setRegData({...regData, firstName: e.target.value})}
                  placeholder="Mohamed"
                  required
                />
                <Input
                  label="Last Name"
                  icon={<User size={18} />}
                  value={regData.lastName}
                  onChange={(e) => setRegData({...regData, lastName: e.target.value})}
                  placeholder="Salah"
                  required
                />
              </div>
              <Input
                label="Username"
                icon={<User size={18} />}
                value={regData.username}
                onChange={(e) => setRegData({...regData, username: e.target.value})}
                placeholder="johndoe123"
                required
              />
              <Input
                label="Email"
                type="email"
                icon={<Mail size={18} />}
                value={regData.email}
                onChange={(e) => setRegData({...regData, email: e.target.value})}
                placeholder="john@example.com"
                required
              />
              <Input
                label="Phone"
                icon={<Phone size={18} />}
                value={regData.phone}
                onChange={(e) => setRegData({...regData, phone: e.target.value})}
                placeholder="+201234567890"
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <Input
                  label="Password"
                  type="password"
                  icon={<Lock size={18} />}
                  value={regData.password}
                  onChange={(e) => setRegData({...regData, password: e.target.value})}
                  placeholder="Min 8 chars"
                  required
                />
                <Input
                  label="Confirm"
                  type="password"
                  icon={<Lock size={18} />}
                  value={regData.confirmPassword}
                  onChange={(e) => setRegData({...regData, confirmPassword: e.target.value})}
                  placeholder="Re-enter"
                  required
                />
              </div>
              <Button type="submit" isLoading={submitting} style={{ width: '100%', marginTop: '12px', background: 'var(--gradient-accent)' }}>
                Complete Registration
              </Button>
            </form>
          )}

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                onClick={() => setIsRegister(!isRegister)}
                style={{ 
                  color: 'var(--accent)', 
                  fontWeight: 600, 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {isRegister ? 'Sign In' : 'Register new account'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


export default LoginPage;
