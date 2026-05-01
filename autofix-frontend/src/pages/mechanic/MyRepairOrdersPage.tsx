import React, { useState, useEffect } from 'react';
import { repairOrderService } from '../../services/repairOrderService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const MyRepairOrdersPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyOrders();
  }, []);

  const fetchMyOrders = () => {
    setLoading(true);
    setError(null);
    repairOrderService.getAll() // In a real app, this would be filtered by mechanic in backend or via query param
      .then(setData)
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load assigned orders'))
      .finally(() => setLoading(false));
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await repairOrderService.updateStatus(id, status);
      fetchMyOrders(); // Refresh list
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to update status');
    }
  };

  return (
    <div className="page-container">
      <h1>My Assigned Repair Orders</h1>
      
      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {data.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No assigned orders found.</div>
          ) : (
            data.map(order => (
              <div key={order.id} style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: '700', color: 'var(--primary)' }}>ORDER #{order.id}</span>
                  <span style={{ 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'var(--text-main)'
                  }}>{order.status}</span>
                </div>
                
                <h3 style={{ marginBottom: '0.5rem' }}>{order.car?.make} {order.car?.model}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>{order.description}</p>
                
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Update Status</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'InProgress')}
                      disabled={order.status === 'InProgress'}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      In Progress
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'Completed')}
                      disabled={order.status === 'Completed'}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: 'none', backgroundColor: '#10b981', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Complete
                    </button>
                  </div>
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

export default MyRepairOrdersPage;
