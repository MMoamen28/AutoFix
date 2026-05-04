import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { carService } from '../../services/carService';
import { repairOrderService } from '../../services/repairOrderService';
import { useToast } from '../../hooks/useToast';
import { Car, Plus, Shield, Hash, Calendar, Trash2, Info, Wrench, ChevronRight, ClipboardList } from 'lucide-react';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import Badge from '../../components/shared/Badge';
import Skeleton from '../../components/shared/Skeleton';
import Modal from '../../components/shared/Modal';

const MyCarsPage: React.FC = () => {
  const { showToast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration Modal state
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vin, setVin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Booking Modal state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchCars();
    fetchServices();
  }, []);

  const fetchCars = async () => {
    setLoading(true);
    try {
      const cars = await carService.getAll();
      setData(cars);
    } catch (err: any) {
      showToast('Could not retrieve vehicle list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await axios.get('/api/Services');
      setServices(res.data);
    } catch (err) {}
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vin.length !== 17) return showToast('VIN must be 17 chars', 'error');
    setSubmitting(true);
    try {
      await carService.create({ make, model, year: parseInt(year), licensePlate, vin });
      showToast('Vehicle registered!', 'success');
      setIsRegModalOpen(false);
      resetRegForm();
      fetchCars();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookService = async () => {
    if (selectedServices.length === 0) return showToast('Select at least one service', 'error');
    setBooking(true);
    try {
      await repairOrderService.create({
        carId: selectedCar.id,
        notes,
        serviceIds: selectedServices
      });
      showToast('Service requested successfully!', 'success');
      setIsBookModalOpen(false);
      resetBookForm();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Booking failed', 'error');
    } finally {
      setBooking(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remove this vehicle?')) return;
    try {
      await carService.delete(id);
      showToast('Vehicle removed', 'success');
      fetchCars();
    } catch (err) {
      showToast('Action failed', 'error');
    }
  };

  const resetRegForm = () => {
    setMake(''); setModel(''); setYear(''); setLicensePlate(''); setVin('');
  };

  const resetBookForm = () => {
    setSelectedServices([]); setNotes(''); setSelectedCar(null);
  };

  const toggleService = (id: number) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white' }}>My Garage</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your vehicles and request maintenance</p>
        </div>
        <Button onClick={() => setIsRegModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} /> Register Vehicle
        </Button>
      </header>

      {/* Registration Modal */}
      <Modal isOpen={isRegModalOpen} onClose={() => setIsRegModalOpen(false)} title="Register New Vehicle">
        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Input label="Make" value={make} onChange={e => setMake(e.target.value)} icon={<Shield size={18}/>} required />
            <Input label="Model" value={model} onChange={e => setModel(e.target.value)} icon={<Car size={18}/>} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Input label="Year" type="number" value={year} onChange={e => setYear(e.target.value)} icon={<Calendar size={18}/>} required />
            <Input label="Plate" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} icon={<Hash size={18}/>} required />
          </div>
          <Input label="VIN (17 characters)" value={vin} onChange={e => setVin(e.target.value.toUpperCase())} maxLength={17} icon={<Info size={18}/>} required />
          <Button onClick={handleRegister} isLoading={submitting} style={{ marginTop: '10px' }}>Register</Button>
        </form>
      </Modal>

      {/* Booking Modal */}
      <Modal 
        isOpen={isBookModalOpen} 
        onClose={() => setIsBookModalOpen(false)} 
        title={`Request Service for ${selectedCar?.make} ${selectedCar?.model}`}
        footer={<><Button variant="ghost" onClick={() => setIsBookModalOpen(false)}>Cancel</Button><Button onClick={handleBookService} isLoading={booking}>Request Booking</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>SELECT SERVICES</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {services.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => toggleService(s.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: selectedServices.includes(s.id) ? 'var(--accent)' : 'var(--border)',
                    backgroundColor: selectedServices.includes(s.id) ? 'var(--accent-dim)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <p style={{ fontWeight: 700, fontSize: '14px', color: selectedServices.includes(s.id) ? 'white' : 'var(--text-primary)' }}>{s.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>${s.basePrice}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>WHAT DO YOU WANT TO DO? (NOTES)</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Unusual noise from front suspension..."
              style={{
                width: '100%',
                minHeight: '100px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                color: 'white',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Grid of Cars */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {[1,2,3].map(i => <Skeleton key={i} height="280px" borderRadius="var(--radius-xl)" />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {data.length === 0 ? (
            <div style={emptyStyle}><Car size={64} color="var(--text-muted)" style={{marginBottom: '20px'}}/><h3>Your garage is empty</h3></div>
          ) : (
            data.map(car => (
              <div key={car.id} style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <div style={iconBoxStyle}><Car size={28}/></div>
                  <button onClick={() => handleDelete(car.id)} style={deleteBtnStyle}><Trash2 size={16}/></button>
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>{car.make} {car.model}</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                  <Badge variant="info">{car.year}</Badge>
                  <Badge variant="purple">{car.licensePlate}</Badge>
                </div>
                <div style={cardFooterStyle}>
                  <div style={{ flex: 1 }}>
                    <p style={labelStyle}>VIN REFERENCE</p>
                    <p style={vinStyle}>{car.vin}</p>
                  </div>
                  <Button onClick={() => { setSelectedCar(car); setIsBookModalOpen(true); }} style={{ padding: '8px 16px', fontSize: '12px' }}>
                    <Wrench size={14} style={{marginRight: '6px'}}/> BOOK SERVICE
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const cardStyle: React.CSSProperties = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '28px', display: 'flex', flexDirection: 'column' };
const cardHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' };
const iconBoxStyle: React.CSSProperties = { width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' };
const deleteBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' };
const cardFooterStyle: React.CSSProperties = { marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const labelStyle: React.CSSProperties = { fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' };
const vinStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' };
const emptyStyle: React.CSSProperties = { gridColumn: '1 / -1', padding: '80px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '2px dashed var(--border)' };

export default MyCarsPage;
