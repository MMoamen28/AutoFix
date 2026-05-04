import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import { useToast } from '../../hooks/useToast';
import Table from '../../components/shared/Table';
import Modal from '../../components/shared/Modal';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import Skeleton from '../../components/shared/Skeleton';
import { User, Mail, Phone, Plus, Eye, Trash2 } from 'lucide-react';

const CustomersPage: React.FC<{ openModal?: boolean }> = ({ openModal = false }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

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

  const handleDelete = async (id: number) => {
    if (!window.confirm('This will permanently remove the customer record. Proceed?')) return;
    try {
      await customerService.deleteCustomer(id);
      showToast('Customer record archived', 'success');
      fetchCustomers();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Action restricted', 'error');
    }
  };

  const columns = [
    { header: 'Reference', key: 'id', width: '100px', render: (c: any) => <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>#{c.id}</span> },
    { header: 'Full Name', key: 'fullName', render: (c: any) => <span style={{ fontWeight: 700 }}>{c.fullName}</span> },
    { header: 'Email Address', key: 'email', render: (c: any) => <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{c.email}</span> },
    { header: 'Phone Number', key: 'phone', render: (c: any) => c.phone || <Badge variant="info">NO DATA</Badge> },
    { 
      header: 'Actions', 
      key: 'actions', 
      width: '120px',
      render: (c: any) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => navigate(`/customers/${c.id}`)} 
            style={actionBtnStyle}
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button 
            onClick={() => handleDelete(c.id)} 
            style={{ ...actionBtnStyle, color: 'var(--danger)' }}
            title="Remove Record"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) 
    }
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

const actionBtnStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
  padding: '8px',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease'
};

export default CustomersPage;
