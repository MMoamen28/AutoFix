import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../services/axiosClient';
import { useToast } from '../hooks/useToast';
import { UserPlus, User, Mail, Phone, Lock, Shield, ArrowLeft } from 'lucide-react';
import Button from '../components/shared/Button';
import Input from '../components/shared/Input';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (formData.password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await axiosClient.post('/auth/register', formData);
      showToast('Account created successfully! Please sign in.', 'success');
      navigate('/login');
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.response?.data?.error || 'Registration failed';
      showToast(typeof detail === 'string' ? detail : JSON.stringify(detail), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh', minWidth: '1280px' }}>
      {/* Left Panel - Form */}
      <div style={{ 
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-xl)',
          padding: '48px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <button 
            onClick={() => navigate('/')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: 'var(--text-secondary)', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              marginBottom: '32px',
              fontSize: '14px'
            }}
          >
            <ArrowLeft size={16} /> Back to Home
          </button>

          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Join AutoFix</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Create your customer account</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <Input
                label="First Name"
                name="firstName"
                icon={<User size={18} />}
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Mohamed"
                required
              />
              <Input
                label="Last Name"
                name="lastName"
                icon={<User size={18} />}
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Salah"
                required
              />
            </div>

            <Input
              label="Username"
              name="username"
              icon={<Shield size={18} />}
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe123"
              required
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              icon={<Mail size={18} />}
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              required
            />

            <Input
              label="Phone Number"
              name="phone"
              icon={<Phone size={18} />}
              value={formData.phone}
              onChange={handleChange}
              placeholder="+201234567890"
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <Input
                label="Password"
                name="password"
                type="password"
                icon={<Lock size={18} />}
                value={formData.password}
                onChange={handleChange}
                placeholder="Min 8 characters"
                required
              />
              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                icon={<Lock size={18} />}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
              />
            </div>

            <Button 
              type="submit" 
              isLoading={submitting} 
              style={{ 
                width: '100%', 
                marginTop: '12px',
                background: 'var(--gradient-accent)',
                boxShadow: 'var(--shadow-accent)'
              }}
            >
              Complete Registration
            </Button>
          </form>

          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div style={{
        backgroundImage: `linear-gradient(135deg, rgba(13,15,20,0.85) 0%, rgba(59,130,246,0.6) 100%),
                          url('/images/mechanic-engine.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <UserPlus size={80} style={{ marginBottom: '24px', opacity: 0.9 }} />
          <h2 style={{ fontSize: '48px', fontWeight: 800, marginBottom: '16px' }}>Ready for a fix?</h2>
          <p style={{ fontSize: '20px', opacity: 0.8, maxWidth: '400px' }}>Our expert mechanics are just a few clicks away from bringing your car back to life.</p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
