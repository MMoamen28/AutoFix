import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const CustomersPage: React.FC<{ openModal?: boolean }> = ({ openModal = false }) => {
  const navigate = useNavigate();

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitSuccess(false);
    try {
      await customerService.createCustomer({ fullName, email, phone });
      setSubmitSuccess(true);
      setTimeout(() => setShowForm(false), 1500); // Close after showing success
      setFullName(''); setEmail(''); setPhone('');
      fetchCustomers(); // Refresh list
    } catch (err: any) {
      setSubmitError(err.response?.data?.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await customerService.deleteCustomer(id);
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to delete');
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Customers</h1>
        <button 
          onClick={() => setShowForm(true)}
          style={{ backgroundColor: 'var(--success)', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '6px', fontWeight: '600' }}
        >
          Add New Customer
        </button>
      </div>

      {showForm && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 
        }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', border: '1px solid var(--border)' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>New Customer</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                placeholder="Full Name" 
                required
                style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'white' }}
              />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="Email Address" 
                required
                style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'white' }}
              />
              <input 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                placeholder="Phone Number" 
                style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'white' }}
              />
              {submitError && <div style={{ color: 'var(--danger)' }}>{submitError}</div>}
              {submitSuccess && <div style={{ color: 'var(--success)' }}>Customer created successfully!</div>}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" disabled={submitting} style={{ flex: 1, backgroundColor: 'var(--primary)', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '6px' }}>
                  {submitting ? 'Creating...' : 'Create Customer'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, backgroundColor: 'transparent', color: 'white', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-card)', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Email</th>
                <th style={{ padding: '1rem' }}>Phone</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</td></tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>{c.id}</td>
                    <td style={{ padding: '1rem' }}>{c.fullName}</td>
                    <td style={{ padding: '1rem' }}>{c.email}</td>
                    <td style={{ padding: '1rem' }}>{c.phone || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      <button onClick={() => navigate(`/customers/${c.id}`)} style={{ marginRight: '0.5rem', color: 'var(--primary)', background: 'none', border: 'none' }}>View</button>
                      <button onClick={() => handleDelete(c.id)} style={{ color: 'var(--danger)', background: 'none', border: 'none' }}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {error && <div style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</div>}
    </div>
  );
};

export default CustomersPage;
