import React, { useState, useEffect } from 'react';
import { serviceService } from '../../services/serviceService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const ServicesPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = () => {
    setLoading(true);
    setError(null);
    serviceService.getAll()
      .then(setData)
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load services'))
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      await serviceService.create({ name, basePrice: parseFloat(basePrice) });
      setName('');
      setBasePrice('');
      setSubmitSuccess(true);
      fetchServices();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message ?? 'Error creating service');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <h1>Services Management</h1>
      
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem', maxWidth: '600px' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Add New Service</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Service Name</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Oil Change" 
              required 
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }} 
            />
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Base Price ($)</label>
            <input 
              value={basePrice} 
              onChange={e => setBasePrice(e.target.value)} 
              placeholder="0.00" 
              type="number" 
              step="0.01"
              required 
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }} 
            />
          </div>
          <button 
            type="submit" 
            disabled={submitting} 
            style={{ 
              padding: '0.75rem 2rem', 
              backgroundColor: 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Adding...' : 'Add Service'}
          </button>
        </form>
        {submitError && <div style={{ color: 'var(--danger)', marginTop: '1rem' }}>{submitError}</div>}
        {submitSuccess && <div style={{ color: 'var(--success)', marginTop: '1rem' }}>Service created successfully!</div>}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {data.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No services found.</div>
          ) : (
            data.map(s => (
              <div key={s.id} style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>{s.name}</h3>
                <p style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1.2rem', margin: 0 }}>${s.basePrice}</p>
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {s.id}</div>
              </div>
            ))
          )}
        </div>
      )}
      {error && <div style={{ color: 'var(--danger)', marginTop: '2rem', textAlign: 'center' }}>{error}</div>}
    </div>
  );
};

export default ServicesPage;
