import React, { useState, useEffect } from 'react';
import { sparePartService } from '../../services/sparePartService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const SparePartsViewPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSpareParts();
  }, []);

  const fetchSpareParts = () => {
    setLoading(true);
    setError(null);
    sparePartService.getAll()
      .then(setData)
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load spare parts'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="page-container">
      <h1>Spare Parts Inventory</h1>
      
      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {data.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No spare parts found.</div>
          ) : (
            data.map(part => (
              <div key={part.id} style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>{part.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Part Number: {part.partNumber}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '20px', 
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    backgroundColor: part.stockQuantity > 5 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: part.stockQuantity > 5 ? '#10b981' : '#ef4444'
                  }}>
                    {part.stockQuantity} in stock
                  </span>
                  <span style={{ fontWeight: '700' }}>${part.price}</span>
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

export default SparePartsViewPage;
