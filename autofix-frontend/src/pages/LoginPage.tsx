import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../services/axiosClient';
import { useToast } from '../hooks/useToast';
import { Wrench, User, Lock, Eye, EyeOff, Mail, Phone } from 'lucide-react';
import Button from '../components/shared/Button';
import Input from '../components/shared/Input';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/shared/LanguageToggle';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  
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
      console.error('Login error:', err.response?.data);
      
      const detail = err.response?.data?.detail 
        || err.response?.data?.error_description
        || err.response?.data?.error
        || err.response?.data?.message
        || 'Invalid username or password';

      showToast(
        typeof detail === 'string' ? detail : 'Login failed', 
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regData.password !== regData.confirmPassword) {
      showToast('كلمتا المرور غير متطابقتين', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await axiosClient.post('/auth/register', regData);
      showToast('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.', 'success');
      setIsRegister(false);
      setUsername(regData.username);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.response?.data?.error || 'فشل إنشاء الحساب';
      showToast(typeof detail === 'string' ? detail : 'فشل إنشاء الحساب', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', minHeight: '100vh', width: '100%', minWidth: 0, backgroundColor: '#0d1117' }}>
      {/* Left Panel - Image / Branding */}
      <div style={{
        backgroundImage: `linear-gradient(135deg, rgba(229, 37, 53, 0.85) 0%, rgba(13, 17, 23, 0.95) 100%)`,
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
          <Wrench size={56} color="white" />
          <h1 style={{ fontSize: '64px', fontWeight: 800, color: 'white', textShadow: '0 4px 12px rgba(0,0,0,0.5)', fontFamily: 'Cairo, sans-serif' }}>AP AUTO</h1>
        </div>
        <p style={{ fontSize: '22px', color: 'rgba(255,255,255,0.9)', maxWidth: '420px', fontWeight: 600 }}>مركز خدمة وصيانة السيارات المعتمد</p>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>نظام الورشة السحابي الاحترافي</p>
      </div>

      {/* Right Panel - Form */}
      <div style={{ 
        backgroundColor: '#0d1117',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: isRegister ? '560px' : '440px',
          backgroundColor: '#161c24',
          border: '1px solid #232d3d',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          transition: 'max-width 0.3s ease'
        }}>
          <div style={{ marginBottom: '28px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              {isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              {isRegister ? 'أدخل البيانات المطلوبة لإنشاء حساب في النظام' : 'أدخل بيانات حسابك للمتابعة إلى لوحة التحكم'}
            </p>
          </div>

          {!isRegister ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input
                label="اسم المستخدم"
                icon={<User size={18} />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
              />
              
              <div style={{ position: 'relative' }}>
                <Input
                  label="كلمة المرور"
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
                    left: '16px',
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

              <Button type="submit" isLoading={submitting} style={{ width: '100%', marginTop: '8px', background: '#e52535', color: '#fff', fontWeight: 700, borderRadius: '8px', padding: '12px' }}>
                دخول إلى النظام
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input
                  label="الاسم الأول"
                  icon={<User size={18} />}
                  value={regData.firstName}
                  onChange={(e) => setRegData({...regData, firstName: e.target.value})}
                  placeholder="محمد"
                  required
                />
                <Input
                  label="اسم العائلة"
                  icon={<User size={18} />}
                  value={regData.lastName}
                  onChange={(e) => setRegData({...regData, lastName: e.target.value})}
                  placeholder="أحمد"
                  required
                />
              </div>
              <Input
                label="اسم المستخدم"
                icon={<User size={18} />}
                value={regData.username}
                onChange={(e) => setRegData({...regData, username: e.target.value})}
                placeholder="mohamed123"
                required
              />
              <Input
                label="البريد الإلكتروني"
                type="email"
                icon={<Mail size={18} />}
                value={regData.email}
                onChange={(e) => setRegData({...regData, email: e.target.value})}
                placeholder="user@example.com"
                required
              />
              <Input
                label="رقم الهاتف"
                icon={<Phone size={18} />}
                value={regData.phone}
                onChange={(e) => setRegData({...regData, phone: e.target.value})}
                placeholder="01012345678"
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input
                  label="كلمة المرور"
                  type="password"
                  icon={<Lock size={18} />}
                  value={regData.password}
                  onChange={(e) => setRegData({...regData, password: e.target.value})}
                  placeholder="8 أحرف على الأقل"
                  required
                />
                <Input
                  label="تأكيد كلمة المرور"
                  type="password"
                  icon={<Lock size={18} />}
                  value={regData.confirmPassword}
                  onChange={(e) => setRegData({...regData, confirmPassword: e.target.value})}
                  placeholder="أعد إدخال كلمة المرور"
                  required
                />
              </div>
              <Button type="submit" isLoading={submitting} style={{ width: '100%', marginTop: '12px', background: '#e52535', color: '#fff', fontWeight: 700, borderRadius: '8px', padding: '12px' }}>
                إتمام إنشاء الحساب
              </Button>
            </form>
          )}

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              {isRegister ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'}{' '}
              <button 
                onClick={() => setIsRegister(!isRegister)}
                style={{ 
                  color: '#e52535', 
                  fontWeight: 700, 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: 0,
                  marginRight: '6px'
                }}
              >
                {isRegister ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


export default LoginPage;
