import React, { useState, useEffect } from 'react';
import { repairOrderService } from '../../services/repairOrderService';
import { carService } from '../../services/carService';
import { serviceService } from '../../services/serviceService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const MyRepairOrdersPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form related data
  const [myCars, setMyCars] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);

  // Form state
  const [carId, setCarId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchFormData();
  }, []);

  const fetchOrders = () => {
    setLoading(true);
    setError(null);
    repairOrderService.getAll() // The service should handle filtering by current user if necessary
      .then(setData)
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load repair orders'))
      .finally(() => setLoading(false));
  };

  const fetchFormData = async () => {
    try {
      const [cars, services] = await Promise.all([
        carService.getAll(),
        serviceService.getAll()
      ]);
      setMyCars(cars);
      setAvailableServices(services);
    } catch (err) {
      console.error('Failed to load form metadata', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carId || !serviceId) {
      setSubmitError('Please select a car and a service');
      return;
    }
    
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      await repairOrderService.create({ 
        carId: parseInt(carId), 
        serviceId: parseInt(serviceId), 
        description 
      });
      setCarId(''); 
      setServiceId(''); 
      setDescription('');
      setSubmitSuccess(true);
      fetchOrders();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message ?? 'Error submitting repair order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <h1>My Repair Orders</h1>
      
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem', maxWidth: '600px' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Submit New Repair Order</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Select Car</label>
            <select 
              value={carId} 
              onChange={e => setCarId(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }}
            >
              <option value="">-- Choose a car --</option>
              {myCars.map(car => (
                <option key={car.id} value={car.id}>{car.make} {car.model} ({car.licensePlate})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Select Service</label>
            <select 
              value={serviceId} 
              onChange={e => setServiceId(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }}
            >
              <option value="">-- Choose a service --</option>
              {availableServices.map(s => (
                <option key={s.id} value={s.id}>{s.name} - ${s.price}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Description of Issue</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Tell us what's wrong with your car..." 
              required 
              rows={3}
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-main)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px', resize: 'vertical' }} 
            />
          </div>
          
          <div>
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
              {submitting ? 'Submitting...' : 'Submit Order'}
            </button>
            {submitError && <div style={{ color: 'var(--danger)', marginTop: '1rem' }}>{submitError}</div>}
            {submitSuccess && <div style={{ color: 'var(--success)', marginTop: '1rem' }}>Order submitted successfully!</div>}
          </div>
        </form>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <thead>
              <tr style={{ textAlign: 'left', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Car</th>
                <th style={{ padding: '1rem' }}>Service</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No repair orders found.</td></tr>
              ) : (
                data.map(order => (
                  <tr key={order.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>{order.id}</td>
                    <td style={{ padding: '1rem' }}>{order.car?.make} {order.car?.model}</td>
                    <td style={{ padding: '1rem' }}>{order.service?.name}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.3rem 0.7rem', 
                        borderRadius: '20px', 
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        backgroundColor: order.status === 'Completed' ? 'rgba(16, 185, 129, 0.2)' : order.status === 'InProgress' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: order.status === 'Completed' ? '#10b981' : order.status === 'InProgress' ? '#3b82f6' : '#f59e0b',
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
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

export default MyRepairOrdersPage;
