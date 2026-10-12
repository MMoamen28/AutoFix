import React, { useState, useEffect } from 'react';
import { carService } from '../../services/carService';
import { useToast } from '../../hooks/useToast';
import { Car, Plus, Hash, Calendar, Trash2, History, Gauge, AlertTriangle, RotateCcw } from 'lucide-react';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import Badge from '../../components/shared/Badge';
import Modal from '../../components/shared/Modal';

const MyCarsPage: React.FC = () => {
  const { showToast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Car Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCar, setNewCar] = useState({
    make: '', model: '', year: new Date().getFullYear(),
    licensePlate: '', vin: '', color: '', currentOdometerKm: 0, notes: ''
  });

  // Odometer History Modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedCarForHistory, setSelectedCarForHistory] = useState<any>(null);
  const [odometerLogs, setOdometerLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Odometer Update Modal state
  const [updateOdoModalOpen, setUpdateOdoModalOpen] = useState(false);
  const [selectedCarForUpdate, setSelectedCarForUpdate] = useState<any>(null);
  const [newMileage, setNewMileage] = useState<number>(0);
  const [odoNotes, setOdoNotes] = useState('');
  const [lowerOdometerWarning, setLowerOdometerWarning] = useState<string | null>(null);

  useEffect(() => {
    fetchCars();
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

  const handleAddCar = async (e?: React.FormEvent, allowDuplicateOverride = false) => {
    if (e) e.preventDefault();
    try {
      await carService.addCar({ ...newCar, allowDuplicate: allowDuplicateOverride });
      showToast('Vehicle registered successfully!', 'success');
      setIsAddModalOpen(false);
      resetNewCarForm();
      fetchCars();
    } catch (err: any) {
      if (err.response?.status === 409) {
        showToast(err.response.data.message || 'Duplicate vehicle detected', 'error');
      } else {
        showToast('Failed to add vehicle', 'error');
      }
    }
  };

  const resetNewCarForm = () => {
    setNewCar({
      make: '', model: '', year: new Date().getFullYear(),
      licensePlate: '', vin: '', color: '', currentOdometerKm: 0, notes: ''
    });
  };

  const handleOpenOdometerHistory = async (car: any) => {
    setSelectedCarForHistory(car);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const logs = await carService.getOdometerHistory(car.id);
      setOdometerLogs(logs);
    } catch (err) {
      showToast('Failed to load odometer history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenUpdateOdometer = (car: any) => {
    setSelectedCarForUpdate(car);
    setNewMileage(car.currentOdometerKm || 0);
    setOdoNotes('');
    setLowerOdometerWarning(null);
    setUpdateOdoModalOpen(true);
  };

  const handleSaveOdometer = async (allowLowerOverride = false) => {
    if (!selectedCarForUpdate) return;

    if (!allowLowerOverride && newMileage < (selectedCarForUpdate.currentOdometerKm || 0)) {
      setLowerOdometerWarning(
        `New reading (${newMileage.toLocaleString()} km) is lower than current recorded mileage (${selectedCarForUpdate.currentOdometerKm.toLocaleString()} km). Confirm if an instrument cluster replacement or correction was performed.`
      );
      return;
    }

    try {
      await carService.updateOdometer(selectedCarForUpdate.id, {
        newOdometerKm: Number(newMileage),
        notes: odoNotes || 'Manual mileage update',
        allowLowerOdometer: allowLowerOverride
      });
      showToast('Mileage updated successfully!', 'success');
      setUpdateOdoModalOpen(false);
      setLowerOdometerWarning(null);
      fetchCars();
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.isLowerOdometerWarning) {
        setLowerOdometerWarning(err.response.data.message);
      } else {
        showToast('Failed to update odometer', 'error');
      }
    }
  };

  const handleArchiveCar = async (id: number) => {
    if (!window.confirm('Archive this vehicle? Work orders and inspection history will be preserved.')) return;
    try {
      await carService.archiveCar(id);
      showToast('Vehicle archived', 'success');
      fetchCars();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Cannot archive vehicle with active orders', 'error');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Vehicles & Odometer History</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Track car mileage history, service readiness, and technical specs.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Register Vehicle
        </Button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading vehicles...</div>
      ) : data.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <Car size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <h3>No Vehicles Registered</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Add a car to start managing service orders.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {data.map(car => (
            <div key={car.id} style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{car.make} {car.model}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Year: {car.year} | {car.color || 'Standard'}</span>
                </div>
                <Badge variant="primary">{car.licensePlate}</Badge>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>VIN / Chassis:</strong> <code>{car.vin}</code></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Gauge size={14} color="var(--primary)" />
                  <strong>Mileage:</strong> {car.currentOdometerKm?.toLocaleString() ?? 0} km
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <Button variant="secondary" onClick={() => handleOpenUpdateOdometer(car)}>
                  <Gauge size={14} style={{ marginRight: '4px' }} /> Update Mileage
                </Button>
                <Button variant="secondary" onClick={() => handleOpenOdometerHistory(car)}>
                  <History size={14} style={{ marginRight: '4px' }} /> History
                </Button>
                <Button variant="danger" onClick={() => handleArchiveCar(car.id)} title="Archive">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Odometer History Modal */}
      {historyModalOpen && selectedCarForHistory && (
        <Modal 
          isOpen={historyModalOpen} 
          onClose={() => setHistoryModalOpen(false)} 
          title={`Odometer History: ${selectedCarForHistory.make} ${selectedCarForHistory.model} (${selectedCarForHistory.licensePlate})`}
        >
          {loadingHistory ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading history...</div>
          ) : odometerLogs.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No mileage logs recorded yet.
            </div>
          ) : (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--card-bg)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Date</th>
                    <th style={{ padding: '8px' }}>Mileage (km)</th>
                    <th style={{ padding: '8px' }}>Source</th>
                    <th style={{ padding: '8px' }}>Notes / Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {odometerLogs.map((log: any) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px' }}>{new Date(log.recordedAt).toLocaleString()}</td>
                      <td style={{ padding: '8px', fontWeight: 700 }}>
                        {log.odometerKm.toLocaleString()} km
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                          {log.source}
                        </span>
                      </td>
                      <td style={{ padding: '8px' }}>
                        {log.isLowerReadingWarning && (
                          <span style={{ marginRight: '6px' }}><Badge variant="warning">⚠️ Decreased Mileage</Badge></span>
                        )}
                        <span style={{ color: 'var(--text-muted)' }}>{log.notes || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {/* Update Mileage Modal with Lower Mileage Warning */}
      {updateOdoModalOpen && selectedCarForUpdate && (
        <Modal 
          isOpen={updateOdoModalOpen} 
          onClose={() => setUpdateOdoModalOpen(false)} 
          title={`Update Odometer: ${selectedCarForUpdate.make} ${selectedCarForUpdate.model}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Current Recorded Mileage: <strong>{selectedCarForUpdate.currentOdometerKm?.toLocaleString() ?? 0} km</strong>
              </label>
              <Input 
                label="New Mileage (km) *" 
                type="number" 
                value={newMileage} 
                onChange={e => setNewMileage(Number(e.target.value))} 
                required 
              />
            </div>
            <Input 
              label="Update Reason / Notes" 
              value={odoNotes} 
              onChange={e => setOdoNotes(e.target.value)} 
              placeholder="e.g. Workshop entry inspection, periodic check..." 
            />

            {lowerOdometerWarning && (
              <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#eab308', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                  <AlertTriangle size={16} /> Mileage Decrease Confirmation Required
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {lowerOdometerWarning}
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <Button variant="primary" onClick={() => handleSaveOdometer(true)}>
                    Confirm Lower Reading (تأكيد الحفظ)
                  </Button>
                </div>
              </div>
            )}

            {!lowerOdometerWarning && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <Button variant="secondary" onClick={() => setUpdateOdoModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => handleSaveOdometer(false)}>Save Mileage</Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Register Vehicle Modal */}
      {isAddModalOpen && (
        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register Vehicle">
          <form onSubmit={e => handleAddCar(e, false)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input label="Make *" value={newCar.make} onChange={e => setNewCar({ ...newCar, make: e.target.value })} required placeholder="e.g. Hyundai" />
              <Input label="Model *" value={newCar.model} onChange={e => setNewCar({ ...newCar, model: e.target.value })} required placeholder="e.g. Elantra" />
              <Input label="Year *" type="number" value={newCar.year} onChange={e => setNewCar({ ...newCar, year: Number(e.target.value) })} required />
              <Input label="Color" value={newCar.color} onChange={e => setNewCar({ ...newCar, color: e.target.value })} placeholder="e.g. Black" />
              <Input label="License Plate *" value={newCar.licensePlate} onChange={e => setNewCar({ ...newCar, licensePlate: e.target.value })} required placeholder="e.g. ق ب ر 1 2 3" />
              <Input label="Chassis / VIN *" value={newCar.vin} onChange={e => setNewCar({ ...newCar, vin: e.target.value })} required placeholder="e.g. KMHD84LF0NU112233" />
              <div style={{ gridColumn: 'span 2' }}>
                <Input label="Current Odometer (km)" type="number" value={newCar.currentOdometerKm} onChange={e => setNewCar({ ...newCar, currentOdometerKm: Number(e.target.value) })} placeholder="e.g. 35000" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Register</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default MyCarsPage;
