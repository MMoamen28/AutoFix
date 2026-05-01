import React, { useState, useEffect } from 'react';
import { carService } from '../../services/carService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const MyCarsPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = () => {
    setLoading(true);
    setError(null);
    carService.getAll()
      .then(setData)
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load cars'))
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      await carService.create({ make, model, year: parseInt(year), licensePlate });
      setMake(''); 
      setModel(''); 
      setYear(''); 
      setLicensePlate('');
      setSubmitSuccess(true);
      fetchCars();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message ?? 'Error adding car');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <h1>My Cars</h1>
      
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem', maxWidth: '600px' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Add New Car</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Make</label>
            <input 
              value={make} 
              onChange={e => setMake(e.target.value)} 
              placeholder="e.g. Toyota" 
              required 
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Model</label>
            <input 
              value={model} 
              onChange={e => setModel(e.target.value)} 
              placeholder="e.g. Camry" 
              required 
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Year</label>
            <input 
              value={year} 
              onChange={e => setYear(e.target.value)} 
              placeholder="e.g. 2022" 
              type="number" 
              required 
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>License Plate</label>
            <input 
              value={licensePlate} 
              onChange={e => setLicensePlate(e.target.value)} 
              placeholder="e.g. ABC-1234" 
              required 
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }} 
            />
          </div>
          
          <div style={{ gridColumn: 'span 2' }}>
            <button 
              type="submit" 
              disabled={submitting} 
              style={{ 
                width: '100%', 
                padding: '1rem', 
                backgroundColor: 'var(--primary)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Adding...' : 'Add Car'}
            </button>
            {submitError && <div style={{ color: 'var(--danger)', marginTop: '1rem' }}>{submitError}</div>}
            {submitSuccess && <div style={{ color: 'var(--success)', marginTop: '1rem' }}>Car added successfully!</div>}
          </div>
        </form>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {data.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No records found.</div>
          ) : (
            data.map(car => (
              <div key={car.id} style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <h3 style={{ marginBottom: '1rem' }}>{car.make} {car.model}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}><strong>Year:</strong> {car.year}</p>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}><strong>Plate:</strong> {car.licensePlate}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {error && <div style={{ color: 'var(--danger)', marginTop: '2rem', textAlign: 'center' }}>{error}</div>}
    </div>
  );
};

export default MyCarsPage;
