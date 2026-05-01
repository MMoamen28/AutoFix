import React, { useState, useEffect } from 'react';
import { mechanicService } from '../../services/mechanicService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const MechanicsPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchMechanics();
  }, []);

  const fetchMechanics = () => {
    setLoading(true);
    setError(null);
    mechanicService.getAll()
      .then(setData)
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load mechanics'))
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      await mechanicService.create({ fullName, specialization });
      setFullName(''); 
      setSpecialization('');
      setSubmitSuccess(true);
      fetchMechanics();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message ?? 'Error creating mechanic');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <h1>Mechanics</h1>
      
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Add New Mechanic</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Full Name</label>
            <input 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              placeholder="e.g. John Doe"
              required 
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }} 
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Specialization</label>
            <input 
              value={specialization} 
              onChange={e => setSpecialization(e.target.value)} 
              placeholder="e.g. Engine, Brakes"
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
            {submitting ? 'Adding...' : 'Add Mechanic'}
          </button>
        </form>
        {submitError && <div style={{ color: 'var(--danger)', marginTop: '1rem' }}>{submitError}</div>}
        {submitSuccess && <div style={{ color: 'var(--success)', marginTop: '1rem' }}>Mechanic added successfully!</div>}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {data.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No records found.</div>
          ) : (
            data.map(m => (
              <div key={m.id} style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>{m.fullName}</h3>
                <p style={{ color: 'var(--text-muted)' }}>{m.specialization}</p>
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {m.id}</div>
              </div>
            ))
          )}
        </div>
      )}
      {error && <div style={{ color: 'var(--danger)', marginTop: '2rem', textAlign: 'center' }}>{error}</div>}
    </div>
  );
};

export default MechanicsPage;
