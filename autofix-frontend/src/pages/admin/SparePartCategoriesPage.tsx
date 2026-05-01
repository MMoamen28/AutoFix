import React, { useState, useEffect } from 'react';
import { sparePartCategoryService } from '../../services/sparePartCategoryService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const SparePartCategoriesPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = () => {
    setLoading(true);
    setError(null);
    sparePartCategoryService.getAll()
      .then(setData)
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load categories'))
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      await sparePartCategoryService.create({ name });
      setName('');
      setSubmitSuccess(true);
      fetchCategories();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message ?? 'Error creating category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <h1>Spare Part Categories</h1>
      
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem', maxWidth: '500px' }}>
        <h2 style={{ marginBottom: '1rem' }}>Add New Category</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Category Name</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Engine Parts" 
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
            {submitting ? 'Adding...' : 'Add'}
          </button>
        </form>
        {submitError && <div style={{ color: 'var(--danger)', marginTop: '1rem' }}>{submitError}</div>}
        {submitSuccess && <div style={{ color: 'var(--success)', marginTop: '1rem' }}>Category added!</div>}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {data.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No categories found.</div>
          ) : (
            data.map(cat => (
              <div key={cat.id} style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                <h3 style={{ margin: 0 }}>{cat.name}</h3>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {cat.id}</div>
              </div>
            ))
          )}
        </div>
      )}
      {error && <div style={{ color: 'var(--danger)', marginTop: '2rem', textAlign: 'center' }}>{error}</div>}
    </div>
  );
};

export default SparePartCategoriesPage;
