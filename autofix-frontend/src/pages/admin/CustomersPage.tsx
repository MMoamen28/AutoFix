import React, { useState, useEffect } from 'react';
import { customerService } from '../../services/customerService';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';
import Table from '../../components/shared/Table';
import Modal from '../../components/shared/Modal';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import Skeleton from '../../components/shared/Skeleton';
import { User, Mail, Phone, Plus, Trash2 } from 'lucide-react';

const CustomersPage: React.FC<{ openModal?: boolean }> = ({ openModal = false }) => {
  const { showToast } = useToast();
  const { role } = useAuth();

  // List State
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [showForm, setShowForm] = useState(openModal);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await customerService.getAllCustomers();
      setCustomers(data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to load customers');
      showToast('Could not fetch customer records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await customerService.createCustomer({ fullName, email, phone });
      showToast('Customer onboarded successfully', 'success');
      setShowForm(false);
      setFullName(''); setEmail(''); setPhone('');
      fetchCustomers();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Validation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(
      `Are you sure you want to permanently delete customer "${name}"?\nThis will remove all their data and cannot be undone.`
    )) return;
    try {
      await customerService.deleteCustomer(id);
      showToast(`Customer "${name}" has been deleted`, 'success');
      fetchCustomers();
    } catch (err: any) {
      showToast(
        err.response?.data?.message ?? 
        'Cannot delete customer — they may have active orders', 
        'error'
      );
    }
  };

  const columns = [
    { 
      header: 'Reference', 
      key: 'id', 
      width: '100px', 
      render: (c: any) => (
        <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>
          #{c.id}
        </span>
      ) 
    },
    { 
      header: 'Full Name', 
      key: 'fullName', 
      render: (c: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
            fontSize: '13px',
            fontWeight: 800,
            flexShrink: 0
          }}>
            {c.fullName?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <span style={{ fontWeight: 700 }}>{c.fullName}</span>
        </div>
      )
    },
    { 
      header: 'Email Address', 
      key: 'email', 
      render: (c: any) => (
        <span style={{ color: 'var(--blue)', fontWeight: 600 }}>
          {c.email}
        </span>
      ) 
    },
    { 
      header: 'Phone Number', 
      key: 'phone', 
      render: (c: any) => c.phone || (
        <Badge variant="info">NO DATA</Badge>
      )
    },
    { 
      header: 'Joined', 
      key: 'createdAt', 
      render: (c: any) => (
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          {new Date(c.createdAt).toLocaleDateString()}
        </span>
      )
    },
    // Only show delete column for Owner role
    ...(role === 'Owner' ? [{
      header: 'Action',
      key: 'action',
      width: '100px',
      render: (c: any) => (
        <button
          onClick={() => handleDelete(c.id, c.fullName)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--danger-dim)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'var(--danger)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'var(--danger-dim)';
            e.currentTarget.style.color = 'var(--danger)';
          }}
          title={`Delete ${c.fullName}`}
        >
          <Trash2 size={14} />
          Delete
        </button>
      )
    }] : [])
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white' }}>Customer Directory</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your client relationships and history</p>
        </div>
        <Button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} /> Add New Customer
        </Button>
      </header>

      {/* New Customer Modal */}
      <Modal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        title="Onboard New Customer"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} isLoading={submitting}>Register Customer</Button>
          </>
        }
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Input 
            label="Full Name" 
            placeholder="Mohamed Salah" 
            icon={<User size={18} />}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
          <Input 
            label="Email Address" 
            type="email"
            placeholder="salah@liverpool.com" 
            icon={<Mail size={18} />}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input 
            label="Phone Number" 
            placeholder="+20 123 456 789" 
            icon={<Phone size={18} />}
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </form>
      </Modal>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2,3,4,5].map(i => <Skeleton key={i} height="60px" borderRadius="var(--radius-md)" />)}
        </div>
      ) : (
        <Table columns={columns} data={customers} />
      )}

      {error && <Badge variant="danger">{error}</Badge>}
    </div>
  );
};

export default CustomersPage;
