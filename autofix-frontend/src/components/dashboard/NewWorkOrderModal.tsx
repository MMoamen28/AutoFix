import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Car, User, Phone, CheckCircle, Clock, 
  Wrench, AlertTriangle, AlertCircle, X, Save 
} from 'lucide-react';
import Modal from '../shared/Modal';
import axiosClient from '../../services/axiosClient';
import PriceInput from '../shared/PriceInput';

interface NewWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newOrder: any) => void;
}

export const NewWorkOrderModal: React.FC<NewWorkOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  // Customer
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Car
  const [isNewCar, setIsNewCar] = useState(true);
  const [customerCars, setCustomerCars] = useState<any[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<number>(0);
  const [carPlate, setCarPlate] = useState('');
  const [carMake, setCarMake] = useState('Toyota');
  const [carModel, setCarModel] = useState('Corolla');
  const [carYear, setCarYear] = useState(new Date().getFullYear());
  const [carVin, setCarVin] = useState('');
  const [odometerKm, setOdometerKm] = useState<number>(0);

  // Job Details
  const [workType, setWorkType] = useState<'Maintenance' | 'Inspection'>('Maintenance');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<number>(0);
  const [mechanicsList, setMechanicsList] = useState<any[]>([]);
  const [customerComplaint, setCustomerComplaint] = useState('');
  const [notes, setNotes] = useState('');

  // Workmanship / Lines
  const [initialLaborPrice, setInitialLaborPrice] = useState<number>(300);
  const [initialLaborDesc, setInitialLaborDesc] = useState<string>('فحص وصيانة ميكانيكية');

  // Warnings & State
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [warningConfirmed, setWarningConfirmed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Load mechanics
  useEffect(() => {
    if (isOpen) {
      axiosClient.get('/mechanics')
        .then(res => {
          if (Array.isArray(res.data)) {
            setMechanicsList(res.data.filter((m: any) => m.isActive));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Customer search debounced
  useEffect(() => {
    if (customerSearch.trim().length >= 2) {
      const timer = setTimeout(() => {
        axiosClient.get(`/customers?search=${encodeURIComponent(customerSearch.trim())}`)
          .then(res => setCustomerSearchResults(Array.isArray(res.data) ? res.data : []))
          .catch(() => setCustomerSearchResults([]));
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setCustomerSearchResults([]);
    }
  }, [customerSearch]);

  const handleSelectCustomer = async (c: any) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.fullName);
    setCustomerPhone(c.phone || '');
    setIsNewCustomer(false);
    setCustomerSearchResults([]);
    setCustomerSearch('');

    // Fetch cars
    try {
      const res = await axiosClient.get(`/cars?customerId=${c.id}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setCustomerCars(res.data);
        const first = res.data[0];
        setSelectedCarId(first.id);
        setCarPlate(first.licensePlate);
        setCarMake(first.make);
        setCarModel(first.model);
        setCarYear(first.year);
        setCarVin(first.vin || '');
        setOdometerKm(first.odometerKm || 0);
        setIsNewCar(false);
      } else {
        setCustomerCars([]);
        setIsNewCar(true);
      }
    } catch {}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSaving(true);

    const payload = {
      isNewCustomer,
      selectedCustomerId: isNewCustomer ? 0 : selectedCustomerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      isNewCar,
      selectedCarId: isNewCar ? 0 : selectedCarId,
      make: carMake.trim(),
      model: carModel.trim(),
      year: carYear,
      licensePlate: carPlate.trim(),
      vin: carVin.trim(),
      odometerKm: Number(odometerKm) || 0,
      workType,
      assignedTechnicianId: Number(assignedTechnicianId) || null,
      customerComplaint: customerComplaint.trim(),
      notes: notes.trim(),
      lines: [
        {
          lineType: 'LaborMechanical',
          description: initialLaborDesc.trim() || 'فحص وصيانة',
          quantity: 1,
          unitPrice: Number(initialLaborPrice) || 0,
          unitCost: 0
        }
      ],
      confirmDuplicatePhone: warningConfirmed,
      confirmDuplicatePlate: warningConfirmed,
      confirmLowerOdometer: warningConfirmed
    };

    try {
      const res = await axiosClient.post('/work-orders/bundle', payload);
      if (res.data) {
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      const data = err.response?.data;
      if (data && data.requiresConfirmation) {
        setWarningMessage(data.message || 'يوجد تحذير يتطلب التأكيد (تكرار رقم الهاتف / اللوحة أو عداد أقل)');
        setWarningConfirmed(true);
      } else {
        setErrorMessage(data?.message || 'فشل إنشاء أمر الشغل');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="كارت عمل جديد (استقبال سيارة)"
    >
      <form onSubmit={handleSave} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontFamily: 'Cairo, sans-serif' }}>
        
        {/* Customer Section */}
        <div style={sectionBoxStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} /> بيانات العميل
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  name="custType"
                  checked={isNewCustomer}
                  onChange={() => { setIsNewCustomer(true); setSelectedCustomerId(0); }}
                />
                <span>عميل جديد</span>
              </label>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  name="custType"
                  checked={!isNewCustomer}
                  onChange={() => setIsNewCustomer(false)}
                />
                <span>عميل مسجل</span>
              </label>
            </div>
          </div>

          {!isNewCustomer && (
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="ابحث بالاسم أو رقم الهاتف..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                style={inputStyle}
              />
              {customerSearchResults.length > 0 && (
                <div style={dropdownResultsStyle}>
                  {customerSearchResults.map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      style={dropdownItemStyle}
                    >
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{c.fullName}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{c.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>اسم العميل *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="الاسم ثلاثي"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>رقم الهاتف *</label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Car Section */}
        <div style={sectionBoxStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Car size={16} /> بيانات السيارة
            </span>
            {!isNewCustomer && customerCars.length > 0 && (
              <select
                value={selectedCarId}
                onChange={e => {
                  const cId = Number(e.target.value);
                  setSelectedCarId(cId);
                  const found = customerCars.find(c => c.id === cId);
                  if (found) {
                    setCarPlate(found.licensePlate);
                    setCarMake(found.make);
                    setCarModel(found.model);
                    setCarYear(found.year);
                    setCarVin(found.vin || '');
                    setOdometerKm(found.odometerKm || 0);
                  }
                }}
                style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: '12px' }}
              >
                {customerCars.map(car => (
                  <option key={car.id} value={car.id}>{car.make} {car.model} ({car.licensePlate})</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            <div>
              <label style={labelStyle}>رقم اللوحة *</label>
              <input
                type="text"
                required
                value={carPlate}
                onChange={e => setCarPlate(e.target.value)}
                placeholder="أ ب ج ١٢٣"
                style={{ ...inputStyle, fontWeight: 800, letterSpacing: '1px' }}
              />
            </div>
            <div>
              <label style={labelStyle}>الماركة</label>
              <input
                type="text"
                required
                value={carMake}
                onChange={e => setCarMake(e.target.value)}
                placeholder="Toyota"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>الموديل</label>
              <input
                type="text"
                required
                value={carModel}
                onChange={e => setCarModel(e.target.value)}
                placeholder="Corolla"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>سنة الصنع</label>
              <input
                type="number"
                value={carYear}
                onChange={e => setCarYear(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>قراءة العداد (كم)</label>
              <input
                type="number"
                value={odometerKm}
                onChange={e => setOdometerKm(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Work Order Details */}
        <div style={sectionBoxStyle}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#f59e0b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Wrench size={16} /> نوع الخدمة والفني المسؤول
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>نوع أمر الشغل</label>
              <select
                value={workType}
                onChange={e => setWorkType(e.target.value as any)}
                style={inputStyle}
              >
                <option value="Maintenance">صيانة دورية / إصلاح</option>
                <option value="Inspection">فحص وتقييم شامل (تقرير الفحص)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>تعيين الفني المسؤول</label>
              <select
                value={assignedTechnicianId}
                onChange={e => setAssignedTechnicianId(Number(e.target.value))}
                style={inputStyle}
              >
                <option value="0">بدون تعيين (لاحقاً)</option>
                {mechanicsList.map(m => (
                  <option key={m.id} value={m.id}>{m.fullName} ({m.specialty || 'فني'})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>شكوى العميل / الأعمال المطلوبة</label>
            <input
              type="text"
              placeholder="مثال: صوت طقطقة بالعفشة، صيانة الـ 40 ألف..."
              value={customerComplaint}
              onChange={e => setCustomerComplaint(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>بند المصنعية الأولي</label>
              <input
                type="text"
                value={initialLaborDesc}
                onChange={e => setInitialLaborDesc(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>سعر المصنعية (ج.م)</label>
              <input
                type="number"
                value={initialLaborPrice}
                onChange={e => setInitialLaborPrice(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Warning Alert */}
        {warningMessage && (
          <div style={warningBoxStyle}>
            <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#fcd34d', flex: 1 }}>
              {warningMessage}
              <div style={{ marginTop: '4px', fontWeight: 700 }}>اضغط "تأكيد وحفظ" مرة أخرى للمتابعة رغم التحذير.</div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div style={errorBoxStyle}>
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#fca5a5' }}>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={cancelBtnStyle}
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSaving}
            style={saveBtnStyle}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{isSaving ? 'جاري الحفظ...' : warningConfirmed ? 'تأكيد وحفظ الكارت' : 'حفظ وفتح الكارت'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

const sectionBoxStyle: React.CSSProperties = {
  background: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '12px',
  padding: '14px'
};

const radioLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '12px',
  color: '#cbd5e1',
  cursor: 'pointer'
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  display: 'block',
  marginBottom: '4px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  backgroundColor: '#0d1117',
  border: '1px solid #2a3749',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'Cairo, sans-serif'
};

const dropdownResultsStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  backgroundColor: '#161c24',
  border: '1px solid #3b82f6',
  borderRadius: '8px',
  maxHeight: '160px',
  overflowY: 'auto',
  zIndex: 100,
  boxShadow: '0 8px 16px rgba(0,0,0,0.5)'
};

const dropdownItemStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #212c3d',
  cursor: 'pointer'
};

const warningBoxStyle: React.CSSProperties = {
  backgroundColor: 'rgba(245, 158, 11, 0.12)',
  border: '1px solid rgba(245, 158, 11, 0.3)',
  borderRadius: '8px',
  padding: '10px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};

const errorBoxStyle: React.CSSProperties = {
  backgroundColor: 'rgba(239, 68, 68, 0.12)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: '8px',
  padding: '10px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};

const saveBtnStyle: React.CSSProperties = {
  backgroundColor: '#e52535',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '13px',
  fontWeight: 800,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontFamily: 'Cairo, sans-serif'
};

const cancelBtnStyle: React.CSSProperties = {
  backgroundColor: '#1c2430',
  color: '#94a3b8',
  border: '1px solid #2a3749',
  borderRadius: '8px',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

export default NewWorkOrderModal;
