import React, { useState, useEffect } from 'react';
import { repairOrderService } from '../../services/repairOrderService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const RepairOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await repairOrderService.getAll();
      setOrders(data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to load repair orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await repairOrderService.updateStatus(id, status);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Error updating status');
    }
  };

  return (
    <div className="page-container">
      <h1>Repair Orders</h1>

      {loading ? <LoadingSpinner /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-card)', borderRadius: '8px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Car</th>
                <th style={{ padding: '1rem' }}>Description</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</td></tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>{order.id}</td>
                    <td style={{ padding: '1rem' }}>{order.car?.make} {order.car?.model}</td>
                    <td style={{ padding: '1rem' }}>{order.description}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.8rem',
                        backgroundColor: order.status === 'Completed' ? 'var(--success)' : 'var(--warning)',
                        color: 'white'
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <select 
                        value={order.status} 
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                        style={{ backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', padding: '0.25rem' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="InProgress">InProgress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
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

export default RepairOrdersPage;
