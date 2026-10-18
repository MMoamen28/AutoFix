import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Car, User, Phone, CheckCircle, Clock, 
  Wrench, AlertTriangle, AlertCircle, X, Save, Edit2, Lock, ArrowRight, UserCheck
} from 'lucide-react';
import Modal from '../shared/Modal';
import axiosClient from '../../services/axiosClient';

interface NewWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newOrder: any) => void;
}

export const NewWorkOrderModal: React.FC<NewWorkOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isCustomerLocked, setIsCustomerLocked] = useState(true);
  const [originalCustomer, setOriginalCustomer] = useState<{ name: string; phone: string } | null>(null);

  const [isNewCar, setIsNewCar] = useState(true);
  const [customerCars, setCustomerCars] = useState<any[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<number>(0);
  const [carPlate, setCarPlate] = useState('');
  const [carMake, setCarMake] = useState('Toyota');
  const [carModel, setCarModel] = useState('Corolla');
  const [carYear, setCarYear] = useState(new Date().getFullYear());
  const [carVin, setCarVin] = useState('');
  const [odometerKm, setOdometerKm] = useState<number>(0);
  const [originalCar, setOriginalCar] = useState<{ plate: string; make: string; model: string; year: number; odometer: number } | null>(null);

  const [workType, setWorkType] = useState<'Maintenance' | 'Inspection'>('Maintenance');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<number>(0);
  const [mechanicsList, setMechanicsList] = useState<any[]>([]);
  const [customerComplaint, setCustomerComplaint] = useState('');
  const [notes, setNotes] = useState('');

  const [allowDuplicatePhone, setAllowDuplicatePhone] = useState(false);
  const [allowDuplicateCar, setAllowDuplicateCar] = useState(false);
  const [allowLowerOdometer, setAllowLowerOdometer] = useState(false);

  const [duplicatePhoneWarning, setDuplicatePhoneWarning] = useState<{ message: string; id?: number; name?: string } | null>(null);
  const [duplicateCarWarning, setDuplicateCarWarning] = useState<{ message: string; id?: number; name?: string } | null>(null);
  const [lowerOdometerWarning, setLowerOdometerWarning] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const [changeDialogVisible, setChangeDialogVisible] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{ field: string; oldVal: string; newVal: string }[]>([]);

  const isServerOffline = typeof window !== 'undefined' && (window as any).__autofix_is_offline;

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

  const handleSelectCustomer = (c: any) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.fullName);
    setCustomerPhone(c.phone || '');
    setOriginalCustomer({ name: c.fullName, phone: c.phone || '' });
    setIsCustomerLocked(true);
    setIsNewCustomer(false);
    setCustomerSearchResults([]);
    setCustomerSearch('');
    setDuplicatePhoneWarning(null);

    const cars = Array.isArray(c.cars) ? c.cars : [];
    setCustomerCars(cars);

    if (cars.length === 1) {
      const first = cars[0];
      setSelectedCarId(first.id);
      setCarPlate(first.licensePlate);
      setCarMake(first.make);
      setCarModel(first.model);
      setCarYear(first.year);
      setCarVin(first.vin || '');
      setOdometerKm(first.currentOdometerKm || first.odometerKm || 0);
      setOriginalCar({
        plate: first.licensePlate,
        make: first.make,
        model: first.model,
        year: first.year,
        odometer: first.currentOdometerKm || first.odometerKm || 0
      });
      setIsNewCar(false);
    } else if (cars.length > 1) {
      const first = cars[0];
      setSelectedCarId(first.id);
      setCarPlate(first.licensePlate);
      setCarMake(first.make);
      setCarModel(first.model);
      setCarYear(first.year);
      setCarVin(first.vin || '');
      setOdometerKm(first.currentOdometerKm || first.odometerKm || 0);
      setOriginalCar({
        plate: first.licensePlate,
        make: first.make,
        model: first.model,
        year: first.year,
        odometer: first.currentOdometerKm || first.odometerKm || 0
      });
      setIsNewCar(false);
    } else {
      setSelectedCarId(0);
      setCarPlate('');
      setCarMake('Toyota');
      setCarModel('Corolla');
      setCarYear(new Date().getFullYear());
      setCarVin('');
      setOdometerKm(0);
      setOriginalCar(null);
      setIsNewCar(true);
    }
  };

  const handleSelectCarDropdown = (carId: number) => {
    if (carId === 0) {
      setSelectedCarId(0);
      setCarPlate('');
      setCarMake('Toyota');
      setCarModel('Corolla');
      setCarYear(new Date().getFullYear());
      setCarVin('');
      setOdometerKm(0);
      setOriginalCar(null);
      setIsNewCar(true);
      return;
    }

    const found = customerCars.find(c => c.id === carId);
    if (found) {
      setSelectedCarId(found.id);
      setCarPlate(found.licensePlate);
      setCarMake(found.make);
      setCarModel(found.model);
      setCarYear(found.year);
      setCarVin(found.vin || '');
      setOdometerKm(found.currentOdometerKm || found.odometerKm || 0);
      setOriginalCar({
        plate: found.licensePlate,
        make: found.make,
        model: found.model,
        year: found.year,
        odometer: found.currentOdometerKm || found.odometerKm || 0
      });
      setIsNewCar(false);
    }
  };

  const checkChangedFields = () => {
    const changes: { field: string; oldVal: string; newVal: string }[] = [];
    if (!isNewCustomer && originalCustomer) {
      if (customerName.trim() !== originalCustomer.name.trim()) {
        changes.push({ field: 'اسم العميل', oldVal: originalCustomer.name, newVal: customerName.trim() });
      }
      if (customerPhone.trim() !== originalCustomer.phone.trim()) {
        changes.push({ field: 'رقم الهاتف', oldVal: originalCustomer.phone, newVal: customerPhone.trim() });
      }
    }
    if (!isNewCar && originalCar) {
      if (carPlate.trim() !== originalCar.plate.trim()) {
        changes.push({ field: 'رقم اللوحة', oldVal: originalCar.plate, newVal: carPlate.trim() });
      }
      if (carMake.trim() !== originalCar.make.trim()) {
        changes.push({ field: 'الماركة', oldVal: originalCar.make, newVal: carMake.trim() });
      }
      if (carModel.trim() !== originalCar.model.trim()) {
        changes.push({ field: 'الموديل', oldVal: originalCar.model, newVal: carModel.trim() });
      }
      if (carYear !== originalCar.year) {
        changes.push({ field: 'سنة الصنع', oldVal: String(originalCar.year), newVal: String(carYear) });
      }
    }
    return changes;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const changes = checkChangedFields();
    if (changes.length > 0) {
      setPendingChanges(changes);
      setChangeDialogVisible(true);
      return;
    }

    executeSave(false, false);
  };

  const executeSave = async (updateCust: boolean, updateCar: boolean) => {
    setIsSaving(true);
    setErrorMessage('');

    const payload = {
      customerId: isNewCustomer ? null : selectedCustomerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      carId: isNewCar ? null : selectedCarId,
      make: carMake.trim(),
      model: carModel.trim(),
      year: carYear,
      licensePlate: carPlate.trim(),
      vin: carVin.trim(),
      odometerInKm: Number(odometerKm) || 0,
      workType,
      assignedTechnicianId: Number(assignedTechnicianId) || null,
      customerComplaint: customerComplaint.trim(),
      notes: notes.trim(),
      lines: [],
      allowDuplicatePhone,
      allowDuplicateCar,
      allowLowerOdometer,
      updateCustomerProfile: updateCust,
      updateCarProfile: updateCar
    };

    try {
      const res = await axiosClient.post('/work-orders/bundle', payload);
      if (res.data) {
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 409 && data?.requiresConfirmation) {
        if (data.code === 'DuplicatePhone') {
          setDuplicatePhoneWarning({
            message: data.message,
            id: data.existingRecordId,
            name: data.existingRecordName
          });
        } else if (data.code === 'DuplicateCar') {
          setDuplicateCarWarning({
            message: data.message,
            id: data.existingRecordId,
            name: data.existingRecordName
          });
        } else if (data.code === 'LowerOdometer') {
          setLowerOdometerWarning(data.message);
        } else {
          setErrorMessage(data.message || 'تحذير تكرار البيانات');
        }
      } else {
        setErrorMessage(data?.message || 'فشل حفظ أمر الشغل');
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
      <form onSubmit={handleFormSubmit} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Cairo, sans-serif' }}>
        
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
                  onChange={() => {
                    setIsNewCustomer(true);
                    setSelectedCustomerId(0);
                    setIsCustomerLocked(false);
                    setOriginalCustomer(null);
                    setCustomerCars([]);
                    setSelectedCarId(0);
                    setIsNewCar(true);
                  }}
                />
                <span>عميل جديد</span>
              </label>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  name="custType"
                  checked={!isNewCustomer}
                  onChange={() => {
                    setIsNewCustomer(false);
                    setIsCustomerLocked(true);
                  }}
                />
                <span>عميل مسجل</span>
              </label>
            </div>
          </div>

          {!isNewCustomer && (
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  style={inputStyle}
                  autoFocus={!isNewCustomer && selectedCustomerId === 0}
                />
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              </div>
              {customerSearchResults.length > 0 && (
                <div style={dropdownResultsStyle}>
                  {customerSearchResults.map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      style={dropdownItemStyle}
                    >
                      <div style={{ fontWeight: 700, color: '#ffffff', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{c.fullName}</span>
                        <span style={{ fontSize: '11px', color: '#10b981' }}>{Array.isArray(c.cars) ? `${c.cars.length} سيارة` : ''}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{c.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={labelStyle}>اسم العميل *</label>
                {!isNewCustomer && selectedCustomerId > 0 && isCustomerLocked && (
                  <button
                    type="button"
                    onClick={() => setIsCustomerLocked(false)}
                    style={editLinkStyle}
                  >
                    <Edit2 size={12} />
                    <span>تعديل</span>
                  </button>
                )}
                {!isNewCustomer && selectedCustomerId > 0 && !isCustomerLocked && (
                  <span style={{ fontSize: '11px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Lock size={11} /> جاري التعديل
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                readOnly={!isNewCustomer && isCustomerLocked}
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="الاسم ثلاثي"
                style={{
                  ...inputStyle,
                  backgroundColor: (!isNewCustomer && isCustomerLocked) ? '#111720' : '#0d1117',
                  color: (!isNewCustomer && isCustomerLocked) ? '#94a3b8' : '#ffffff',
                  cursor: (!isNewCustomer && isCustomerLocked) ? 'not-allowed' : 'text'
                }}
              />
            </div>
            <div>
              <label style={labelStyle}>رقم الهاتف *</label>
              <input
                type="tel"
                required
                readOnly={!isNewCustomer && isCustomerLocked}
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                style={{
                  ...inputStyle,
                  backgroundColor: (!isNewCustomer && isCustomerLocked) ? '#111720' : '#0d1117',
                  color: (!isNewCustomer && isCustomerLocked) ? '#94a3b8' : '#ffffff',
                  cursor: (!isNewCustomer && isCustomerLocked) ? 'not-allowed' : 'text'
                }}
              />
            </div>
          </div>
        </div>

        <div style={sectionBoxStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Car size={16} /> بيانات السيارة
            </span>
            {!isNewCustomer && selectedCustomerId > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>اختر سيارة:</span>
                <select
                  value={selectedCarId}
                  onChange={e => handleSelectCarDropdown(Number(e.target.value))}
                  style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                >
                  {customerCars.map(car => (
                    <option key={car.id} value={car.id}>{car.make} {car.model} ({car.licensePlate})</option>
                  ))}
                  <option value="0">+ سيارة جديدة للعميل</option>
                </select>
              </div>
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

          <div>
            <label style={labelStyle}>شكوى العميل / الأعمال المطلوبة</label>
            <input
              type="text"
              placeholder="مثال: صوت طقطقة بالعفشة، صيانة الـ 40 ألف..."
              value={customerComplaint}
              onChange={e => setCustomerComplaint(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {duplicatePhoneWarning && (
          <div style={warningBoxStyle}>
            <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#fcd34d', flex: 1 }}>
              <div>{duplicatePhoneWarning.message}</div>
              {isNewCustomer && duplicatePhoneWarning.id && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewCustomer(false);
                      setSelectedCustomerId(duplicatePhoneWarning.id!);
                      if (duplicatePhoneWarning.name) setCustomerName(duplicatePhoneWarning.name);
                      setDuplicatePhoneWarning(null);
                      axiosClient.get(`/customers/${duplicatePhoneWarning.id}`)
                        .then(res => {
                          if (res.data) handleSelectCustomer(res.data);
                        })
                        .catch(() => {});
                    }}
                    style={actionBtnStyle}
                  >
                    <UserCheck size={14} />
                    <span>استخدام هذا العميل ({duplicatePhoneWarning.name})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAllowDuplicatePhone(true);
                      setDuplicatePhoneWarning(null);
                    }}
                    style={secondaryWarningBtnStyle}
                  >
                    <span>متابعة برقم هاتف مكرر</span>
                  </button>
                </div>
              )}
              {!isNewCustomer && (
                <button
                  type="button"
                  onClick={() => {
                    setAllowDuplicatePhone(true);
                    setDuplicatePhoneWarning(null);
                  }}
                  style={{ ...secondaryWarningBtnStyle, marginTop: '6px' }}
                >
                  <span>تأكيد المتابعة بالرقم المكرر</span>
                </button>
              )}
            </div>
          </div>
        )}

        {duplicateCarWarning && (
          <div style={warningBoxStyle}>
            <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#fcd34d', flex: 1 }}>
              <div>{duplicateCarWarning.message}</div>
              <button
                type="button"
                onClick={() => {
                  setAllowDuplicateCar(true);
                  setDuplicateCarWarning(null);
                }}
                style={{ ...secondaryWarningBtnStyle, marginTop: '6px' }}
              >
                <span>تأكيد تسجيل السيارة المكررة</span>
              </button>
            </div>
          </div>
        )}

        {lowerOdometerWarning && (
          <div style={warningBoxStyle}>
            <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#fcd34d', flex: 1 }}>
              <div>{lowerOdometerWarning}</div>
              <button
                type="button"
                onClick={() => {
                  setAllowLowerOdometer(true);
                  setLowerOdometerWarning(null);
                }}
                style={{ ...secondaryWarningBtnStyle, marginTop: '6px' }}
              >
                <span>تأكيد قراءة العداد الأقل</span>
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div style={errorBoxStyle}>
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#fca5a5' }}>
              {errorMessage}
            </div>
          </div>
        )}

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
            disabled={isSaving || isServerOffline}
            style={{
              ...saveBtnStyle,
              opacity: (isSaving || isServerOffline) ? 0.6 : 1,
              cursor: (isSaving || isServerOffline) ? 'not-allowed' : 'pointer'
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{isSaving ? 'جاري الحفظ...' : isServerOffline ? 'السيرفر غير متصل' : 'حفظ وفتح الكارت'}</span>
          </button>
        </div>
      </form>

      {changeDialogVisible && (
        <div style={confirmModalOverlayStyle} dir="rtl">
          <div style={confirmModalBoxStyle}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: '0 0 10px' }}>
              هل تريد تحديث بيانات العميل/السيارة للمستقبل؟
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 14px' }}>
              تم رصد تغييرات على البيانات المسجلة مسبقاً:
            </p>
            <div style={{ backgroundColor: '#0d1117', border: '1px solid #212c3d', borderRadius: '8px', padding: '10px', marginBottom: '16px' }}>
              {pendingChanges.map((ch, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: idx < pendingChanges.length - 1 ? '1px solid #1c2430' : 'none' }}>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>{ch.field}:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#ef4444', textDecoration: 'line-through' }}>{ch.oldVal}</span>
                    <ArrowRight size={12} color="#64748b" />
                    <span style={{ color: '#10b981', fontWeight: 700 }}>{ch.newVal}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setChangeDialogVisible(false);
                  executeSave(true, true);
                }}
                style={dialogUpdateBtnStyle}
              >
                تحديث البيانات المسجلة للمستقبل
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangeDialogVisible(false);
                  executeSave(false, false);
                }}
                style={dialogSingleBtnStyle}
              >
                استخدام التغيير لهذا الكارت فقط
              </button>
              <button
                type="button"
                onClick={() => setChangeDialogVisible(false)}
                style={dialogCancelBtnStyle}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
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
  display: 'block'
};

const editLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#3b82f6',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '3px',
  padding: 0
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
  alignItems: 'flex-start',
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

const actionBtnStyle: React.CSSProperties = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontFamily: 'Cairo, sans-serif'
};

const secondaryWarningBtnStyle: React.CSSProperties = {
  backgroundColor: '#334155',
  color: '#cbd5e1',
  border: 'none',
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

const confirmModalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.8)',
  backdropFilter: 'blur(4px)',
  zIndex: 10000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px'
};

const confirmModalBoxStyle: React.CSSProperties = {
  backgroundColor: '#161c24',
  border: '1px solid #3b82f6',
  borderRadius: '14px',
  padding: '20px',
  maxWidth: '420px',
  width: '100%',
  boxShadow: '0 20px 30px rgba(0,0,0,0.7)',
  fontFamily: 'Cairo, sans-serif'
};

const dialogUpdateBtnStyle: React.CSSProperties = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '10px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

const dialogSingleBtnStyle: React.CSSProperties = {
  backgroundColor: '#1c2430',
  color: '#cbd5e1',
  border: '1px solid #2a3749',
  borderRadius: '8px',
  padding: '10px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

const dialogCancelBtnStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: '#94a3b8',
  border: 'none',
  padding: '8px',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

export default NewWorkOrderModal;
