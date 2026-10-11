import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../services/axiosClient';
import { useToast } from '../../hooks/useToast';
import { ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';
import Button from '../shared/Button';
import Input from '../shared/Input';

const ForceChangePasswordModal: React.FC = () => {
  const { login, refreshUserData, logout } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await axiosClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (response.data && response.data.accessToken) {
        login(response.data.accessToken, response.data.dataDirectory, response.data.isFallbackDirectory);
      }
      showToast('Password changed successfully! Welcome to AutoFix.', 'success');
      await refreshUserData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update password. Check current password.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(10, 15, 29, 0.95)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card, #1e293b)',
        border: '1px solid var(--border, #334155)',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '480px',
        width: '90%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            marginBottom: '16px'
          }}>
            <ShieldAlert size={36} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
            Action Required: Change Password
          </h2>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '14px', lineHeight: 1.5 }}>
            You are currently using an initial default password. To protect workshop data, you must choose a new secure password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Current / Initial Password
            </label>
            <Input
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              New Password (min 8 characters)
            </label>
            <Input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Confirm New Password
            </label>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%', padding: '12px' }}>
              {loading ? 'Updating Password...' : 'Save Password & Enter System'}
            </Button>
            <button
              type="button"
              onClick={logout}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '8px'
              }}
            >
              Sign out instead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForceChangePasswordModal;
