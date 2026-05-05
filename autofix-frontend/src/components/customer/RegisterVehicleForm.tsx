import React, { useState } from 'react';
import { carService } from '../../services/carService';
import { Shield, Car, Calendar, Hash, Info, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const RegisterVehicleForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  // PHASE 3: State Management for Controlled Inputs
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    licensePlate: '',
    vin: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Constraint: VIN restricted to 17 characters
    if (name === 'vin') {
      setFormData(prev => ({ ...prev, [name]: value.slice(0, 17).toUpperCase() }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      // PHASE 3: Service Integration
      await carService.addCar({
        ...formData,
        year: parseInt(formData.year)
      });
      
      setStatus({ type: 'success', message: 'Vehicle successfully added to your garage!' });
      setFormData({ make: '', model: '', year: '', licensePlate: '', vin: '' });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Connection to backend failed. Please check your network.';
      setStatus({ type: 'error', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={iconBadgeStyle}><Car size={24} /></div>
        <h2 style={titleStyle}>Register Vehicle</h2>
        <p style={subtitleStyle}>Provide your vehicle details for maintenance tracking</p>
      </header>

      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={gridStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Make</label>
            <div style={inputWrapperStyle}>
              <Shield size={18} style={iconStyle} />
              <input name="make" value={formData.make} onChange={handleChange} placeholder="e.g. BMW" required style={inputStyle} />
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Model</label>
            <div style={inputWrapperStyle}>
              <Car size={18} style={iconStyle} />
              <input name="model" value={formData.model} onChange={handleChange} placeholder="e.g. M4 Competition" required style={inputStyle} />
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Manufacturing Year</label>
            <div style={inputWrapperStyle}>
              <Calendar size={18} style={iconStyle} />
              <input name="year" type="number" value={formData.year} onChange={handleChange} placeholder="2024" required style={inputStyle} />
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>License Plate</label>
            <div style={inputWrapperStyle}>
              <Hash size={18} style={iconStyle} />
              <input name="licensePlate" value={formData.licensePlate} onChange={handleChange} placeholder="ABC-1234" required style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>VIN (17 Characters)</label>
          <div style={inputWrapperStyle}>
            <Info size={18} style={iconStyle} />
            <input name="vin" value={formData.vin} onChange={handleChange} placeholder="Enter 17-digit VIN" maxLength={17} required style={inputStyle} />
          </div>
        </div>

        {status && (
          <div style={{ ...statusBoxStyle, backgroundColor: status.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderColor: status.type === 'success' ? '#22c55e' : '#ef4444' }}>
            {status.type === 'success' ? <CheckCircle2 size={18} color="#22c55e" /> : <AlertCircle size={18} color="#ef4444" />}
            <span style={{ color: status.type === 'success' ? '#4ade80' : '#f87171', fontSize: '14px', fontWeight: 500 }}>{status.message}</span>
          </div>
        )}

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={20} /> : 'Add to Garage'}
        </button>
      </form>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// PRO OS Aesthetic Styles
const containerStyle: React.CSSProperties = {
  backgroundColor: 'rgba(30, 41, 59, 0.7)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '24px',
  padding: '40px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  width: '100%',
  maxWidth: '650px'
};

const headerStyle: React.CSSProperties = { marginBottom: '32px', textAlign: 'center' };
const iconBadgeStyle: React.CSSProperties = { width: '48px', height: '48px', backgroundColor: 'var(--accent)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', margin: '0 auto 16px' };
const titleStyle: React.CSSProperties = { fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' };
const subtitleStyle: React.CSSProperties = { color: '#94a3b8', fontSize: '14px' };
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '24px' };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' };
const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputWrapperStyle: React.CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center' };
const iconStyle: React.CSSProperties = { position: 'absolute', left: '16px', color: '#64748b' };
const inputStyle: React.CSSProperties = { width: '100%', backgroundColor: 'rgba(15, 23, 42, 0.5)', border: '2px solid #334155', borderRadius: '16px', padding: '14px 14px 14px 48px', color: 'white', outline: 'none', transition: 'all 0.2s ease' };
const buttonStyle: React.CSSProperties = { marginTop: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '16px', padding: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s ease' };
const statusBoxStyle: React.CSSProperties = { padding: '16px', borderRadius: '12px', border: '1px solid', display: 'flex', alignItems: 'center', gap: '12px' };

export default RegisterVehicleForm;
