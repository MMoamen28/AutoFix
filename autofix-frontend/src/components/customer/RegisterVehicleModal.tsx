import React, { useState } from 'react';
import { carService } from '../../services/carService';
import { Shield, Car, Calendar, Hash, Info, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface RegisterVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RegisterVehicleModal: React.FC<RegisterVehicleModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    licensePlate: '',
    vin: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await carService.addCar({
        ...formData,
        year: parseInt(formData.year)
      });
      toast.success('Vehicle registered successfully!');
      onSuccess();
      onClose();
      setFormData({ make: '', model: '', year: '', licensePlate: '', vin: '' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to register vehicle';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'vin') {
      setFormData({ ...formData, vin: value.slice(0, 17).toUpperCase() });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeButtonStyle}>
          <X size={20} />
        </button>

        <header style={headerStyle}>
          <h2 style={titleStyle}>Register New Vehicle</h2>
          <p style={subtitleStyle}>Add your car to the AutoFix garage</p>
        </header>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={gridStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Make</label>
              <div style={inputWrapperStyle}>
                <Shield size={18} style={iconStyle} />
                <input
                  name="make"
                  value={formData.make}
                  onChange={handleChange}
                  placeholder="e.g. Toyota"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Model</label>
              <div style={inputWrapperStyle}>
                <Car size={18} style={iconStyle} />
                <input
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="e.g. Camry"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Year</label>
              <div style={inputWrapperStyle}>
                <Calendar size={18} style={iconStyle} />
                <input
                  name="year"
                  type="number"
                  value={formData.year}
                  onChange={handleChange}
                  placeholder="e.g. 2024"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>License Plate</label>
              <div style={inputWrapperStyle}>
                <Hash size={18} style={iconStyle} />
                <input
                  name="licensePlate"
                  value={formData.licensePlate}
                  onChange={handleChange}
                  placeholder="ABC-1234"
                  required
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>VIN (Vehicle Identification Number)</label>
            <div style={inputWrapperStyle}>
              <Info size={18} style={iconStyle} />
              <input
                name="vin"
                value={formData.vin}
                onChange={handleChange}
                placeholder="17-character VIN"
                maxLength={17}
                required
                style={inputStyle}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Register Vehicle'}
          </button>
        </form>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#334155',
  width: '90%',
  maxWidth: '600px',
  borderRadius: '24px',
  padding: '40px',
  position: 'relative',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  border: '1px solid rgba(255, 255, 255, 0.1)'
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  right: '20px',
  background: 'rgba(0, 0, 0, 0.2)',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease'
};

const headerStyle: React.CSSProperties = {
  marginBottom: '32px'
};

const titleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 800,
  color: 'white',
  marginBottom: '8px'
};

const subtitleStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '14px',
  fontWeight: 500
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px'
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '24px'
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginLeft: '4px'
};

const inputWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center'
};

const iconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '16px',
  color: '#94a3b8'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'rgba(15, 23, 42, 0.5)',
  border: '2px solid #94a3b8',
  borderRadius: '16px',
  padding: '14px 14px 14px 48px',
  color: 'white',
  fontSize: '15px',
  fontWeight: 500,
  outline: 'none',
  transition: 'all 0.2s ease'
};

const buttonStyle: React.CSSProperties = {
  marginTop: '12px',
  backgroundColor: '#DC2626',
  color: 'white',
  border: 'none',
  borderRadius: '16px',
  padding: '16px',
  fontSize: '16px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)',
  transition: 'all 0.2s ease'
};

export default RegisterVehicleModal;
