import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data state
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await customerService.getCustomerById(id!);
      setCustomer(data);
      setFullName(data.fullName);
      setEmail(data.email);
      setPhone(data.phone || '');
    } catch (err: any) {
      setError(err.response?.status === 404 ? 'Customer not found' : (err.response?.data?.message ?? 'Failed to load customer'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      const updated = await customerService.updateCustomer(id!, { fullName, email, phone });
      setCustomer(updated);
      setSubmitSuccess(true);
      setIsEditing(false);
    } catch (err: any) {
      setSubmitError(err.response?.data?.message ?? 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'var(--danger)', padding: '2rem' }}>{error} <button onClick={() => navigate('/customers')}>Back to List</button></div>;

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Customer Details</h2>
        <button onClick={() => navigate('/customers')} style={{ backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '4px' }}>Back to List</button>
      </div>

      <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
        {!isEditing ? (
          <div>
            <p><strong>Full Name:</strong> {customer.fullName}</p>
            <p><strong>Email:</strong> {customer.email}</p>
            <p><strong>Phone:</strong> {customer.phone || 'N/A'}</p>
            <p><strong>Keycloak User ID:</strong> {customer.keycloakUserId}</p>
            <p><strong>Created At:</strong> {new Date(customer.createdAt).toLocaleString()}</p>
            <button 
              onClick={() => setIsEditing(true)}
              style={{ marginTop: '1rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              Edit Customer
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name</label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Phone</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px' }}
              />
            </div>
            
            {submitError && <div style={{ color: 'var(--danger)' }}>{submitError}</div>}
            {submitSuccess && <div style={{ color: 'var(--success)' }}>Customer updated successfully!</div>}
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                type="submit" 
                disabled={submitting}
                style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '4px', cursor: 'pointer' }}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                style={{ backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.5rem 1.5rem', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailPage;
