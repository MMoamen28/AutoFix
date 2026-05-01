import React, { useState, useEffect } from 'react';
import { sparePartService } from '../../services/sparePartService';
import { sparePartCategoryService } from '../../services/sparePartCategoryService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const SparePartsPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form related data
  const [categories, setCategories] = useState<any[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [categoryId, setCategoryId] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchParts();
    fetchCategories();
  }, []);

  const fetchParts = () => {
    setLoading(true);
    setError(null);
    sparePartService.getAll()
      .then(setData)
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load spare parts'))
      .finally(() => setLoading(false));
  };

  const fetchCategories = async () => {
    try {
      const data = await sparePartCategoryService.getAll();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      await sparePartService.create({ 
        name, 
        partNumber, 
        price: parseFloat(price), 
        stockQuantity: parseInt(stockQuantity),
        categoryId: parseInt(categoryId)
      });
      setName(''); setPartNumber(''); setPrice(''); setStockQuantity(''); setCategoryId('');
      setSubmitSuccess(true);
      fetchParts();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message ?? 'Error creating spare part');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockAdjust = async (id: number, delta: number) => {
    try {
      await sparePartService.adjustStock(id, delta);
      fetchParts();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to adjust stock');
    }
  };

  return (
    <div className="page-container">
      <h1>Spare Parts Management</h1>
      
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Add New Spare Part</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Part Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Brake Pad" required style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Part Number</label>
            <input value={partNumber} onChange={e => setPartNumber(e.target.value)} placeholder="e.g. BP-101" required style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Category</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }}>
              <option value="">-- Select Category --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Price ($)</label>
            <input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.01" required style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Initial Stock</label>
            <input value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} type="number" required style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }} />
          </div>
          
          <div style={{ alignSelf: 'flex-end' }}>
            <button 
              type="submit" 
              disabled={submitting} 
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600' }}
            >
              {submitting ? 'Adding...' : 'Add Part'}
            </button>
          </div>
        </form>
        {submitError && <div style={{ color: 'var(--danger)', marginTop: '1rem' }}>{submitError}</div>}
        {submitSuccess && <div style={{ color: 'var(--success)', marginTop: '1rem' }}>Spare part added!</div>}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <thead>
              <tr style={{ textAlign: 'left', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <th style={{ padding: '1rem' }}>Part Name</th>
                <th style={{ padding: '1rem' }}>Part #</th>
                <th style={{ padding: '1rem' }}>Category</th>
                <th style={{ padding: '1rem' }}>Stock</th>
                <th style={{ padding: '1rem' }}>Price</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</td></tr>
              ) : (
                data.map(p => (
                  <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>{p.name}</td>
                    <td style={{ padding: '1rem' }}>{p.partNumber}</td>
                    <td style={{ padding: '1rem' }}>{p.category?.name}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ color: p.stockQuantity < 10 ? 'var(--danger)' : 'inherit' }}>{p.stockQuantity}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>${p.price}</td>
                    <td style={{ padding: '1rem' }}>
                      <button onClick={() => handleStockAdjust(p.id, 1)} style={{ marginRight: '0.5rem', color: 'var(--success)', background: 'none', border: '1px solid var(--success)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>+1</button>
                      <button onClick={() => handleStockAdjust(p.id, -1)} style={{ color: 'var(--danger)', background: 'none', border: '1px solid var(--danger)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>-1</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {error && <div style={{ color: 'var(--danger)', marginTop: '2rem', textAlign: 'center' }}>{error}</div>}
    </div>
  );
};

export default SparePartsPage;
