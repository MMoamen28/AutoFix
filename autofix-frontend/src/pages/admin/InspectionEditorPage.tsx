import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ClipboardCheck, ArrowLeft, Save, CheckCircle, RotateCcw, 
  MapPin, Trash2, Car, User, FileText, AlertCircle, Eye, Printer
} from 'lucide-react';
import { inspectionService, Inspection } from '../../services/inspectionService';
import { customerService } from '../../services/customerService';
import { carService } from '../../services/carService';
import { workOrderService } from '../../services/workOrderService';
import useDraftAutoSave from '../../hooks/useDraftAutoSave';
import DraftIndicator from '../../components/shared/DraftIndicator';

interface DamageMarker {
  id: string;
  number: number;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  label: string;
  severity: 'scratch' | 'dent' | 'broken' | 'paint';
}

const CHECKLIST_SECTIONS = [
  {
    title: 'Engine Electrical System - كهرباء المحرك',
    items: [
      { key: 'elec_battery', en: 'Car Battery', ar: 'بطارية السيارة' },
      { key: 'elec_alternator', en: 'Alternator Charging', ar: 'شحن الدينامو' },
      { key: 'elec_starter', en: 'Starter Motor Sound', ar: 'صوت المارش' },
    ]
  },
  {
    title: 'Car Air Conditioner - مكيف السيارة',
    items: [
      { key: 'ac_cooling', en: 'Cooling Level', ar: 'كفاءة التبريد' },
      { key: 'ac_dist', en: 'Air Distribution', ar: 'توزيع الهواء' },
      { key: 'ac_heat', en: 'Heating System', ar: 'نظام السخن' },
    ]
  },
  {
    title: 'Interior of the Car - السيارة من الداخل',
    items: [
      { key: 'int_dashboard', en: 'Dashboard', ar: 'التابلوه' },
      { key: 'int_seats', en: 'Seat Upholstery', ar: 'فرش الكراسي' },
      { key: 'int_roof', en: 'Roof lining and pillars', ar: 'فرش السقف والقوائم' },
      { key: 'int_handles', en: 'Handles', ar: 'المقابض' },
      { key: 'int_buttons', en: 'Interior Buttons', ar: 'أزرار التحكم الداخلية' },
      { key: 'int_ent', en: 'Entertainment', ar: 'أنظمة الترفيه' },
      { key: 'int_steering', en: 'Steering and Gear', ar: 'طارة الدركسيون والفتيس' },
    ]
  },
  {
    title: 'Driving Test - اختبار القيادة',
    items: [
      { key: 'drive_engine', en: 'Engine Condition', ar: 'حالة المحرك' },
      { key: 'drive_gear', en: 'Gear Condition', ar: 'حالة الفتيس' },
      { key: 'drive_bearing', en: 'Wheel Bearing', ar: 'رولمان بلي العجل' },
      { key: 'drive_front_susp', en: 'Front Suspension', ar: 'العفشة الأمامية' },
      { key: 'drive_rear_susp', en: 'Rear Suspension', ar: 'العفشة الخلفية' },
      { key: 'drive_steering_box', en: 'Steering Gearbox', ar: 'علبة الدركسيون' },
      { key: 'drive_steering_wheel', en: 'Steering Wheel', ar: 'طارة الدركسيون' },
      { key: 'drive_steering_noise', en: 'Noise While Steering', ar: 'أصوات عند التوجيه' },
      { key: 'drive_shaft', en: 'Drive Shaft', ar: 'عمود الكردان / الكبالن' },
      { key: 'drive_brakes', en: 'Brake Condition', ar: 'حالة الفرامل' },
      { key: 'drive_vibrations', en: 'Abnormal Vibrations', ar: 'اهتزازات غير طبيعية' },
    ]
  },
  {
    title: 'Service Items - بنود الصيانة',
    items: [
      { key: 'serv_engine_oil', en: 'Engine Oil', ar: 'زيت المحرك' },
      { key: 'serv_gear_oil', en: 'Gear Oil', ar: 'زيت الفتيس' },
      { key: 'serv_brake_fluid', en: 'Brake Fluid', ar: 'زيت الفرامل' },
      { key: 'serv_air_filter', en: 'Air Filter', ar: 'فلتر الهواء' },
      { key: 'serv_ac_filter', en: 'AC Filter', ar: 'فلتر التكييف' },
      { key: 'serv_spark_plugs', en: 'Spark Plugs', ar: 'البوجيهات' },
      { key: 'serv_engine_belt', en: 'Engine Belt', ar: 'سير المجموعة' },
      { key: 'serv_belt_pulley', en: 'Belt Pulley', ar: 'بكرات السيور' },
      { key: 'serv_front_pads', en: 'Front Brake Pads', ar: 'تيل فرامل أمامي' },
      { key: 'serv_rear_pads', en: 'Rear Brake Pads', ar: 'تيل فرامل خلفي' },
      { key: 'serv_front_rotors', en: 'Front Rotors', ar: 'طنابير أمامية' },
      { key: 'serv_rear_rotors', en: 'Rear Rotors', ar: 'طنابير خلفية' },
    ]
  },
  {
    title: 'Rim Condition - حالة الجنط',
    items: [
      { key: 'rim_rf', en: 'Right Front Rim', ar: 'جنط أمامي يمين' },
      { key: 'rim_lf', en: 'Left Front Rim', ar: 'جنط أمامي شمال' },
      { key: 'rim_rr', en: 'Right Rear Rim', ar: 'جنط خلفي يمين' },
      { key: 'rim_lr', en: 'Left Rear Rim', ar: 'جنط خلفي شمال' },
    ]
  },
  {
    title: 'Tire Condition - حالة الكاوتش',
    items: [
      { key: 'tire_rf', en: 'Right Front Tire', ar: 'كاوتش أمامي يمين' },
      { key: 'tire_lf', en: 'Left Front Tire', ar: 'كاوتش أمامي شمال' },
      { key: 'tire_rr', en: 'Right Rear Tire', ar: 'كاوتش خلفي يمين' },
      { key: 'tire_lr', en: 'Left Rear Tire', ar: 'كاوتش خلفي شمال' },
    ]
  },
  {
    title: 'Underneath & Leaks - أسفل السيارة والتسريبات',
    items: [
      { key: 'leak_coolant', en: 'Coolant Leak', ar: 'تسريب مياه التبريد' },
      { key: 'status_coolant', en: 'Coolant Status', ar: 'حالة سائل التبريد' },
      { key: 'leak_engine_oil', en: 'Engine Oil Leak', ar: 'تسريب زيت المحرك' },
      { key: 'leak_gear_oil', en: 'Gear Oil Leak', ar: 'تسريب زيت الفتيس' },
      { key: 'leak_power_steering', en: 'Power Steering Leak', ar: 'تسريب زيت الباور' },
      { key: 'exhaust_mounts', en: 'Exhaust Mounts', ar: 'حوامل الشكمان' },
      { key: 'exhaust_insulators', en: 'Exhaust Insulators', ar: 'عوازل الشكمان' },
      { key: 'axle_boots', en: 'Boots', ar: 'الكبالن وكاوتش ترابها' },
      { key: 'car_shields', en: 'Car Shields', ar: 'صاج الحماية والبطانات' },
    ]
  },
  {
    title: 'Suspension System - العفشة',
    items: [
      { key: 'susp_front_tie_rods', en: 'Front Steering Tie Rods', ar: 'بيض وأطراف دركسيون أمامية' },
      { key: 'susp_rear_tie_rods', en: 'Rear Steering Tie Rods', ar: 'أذرع تعليق خلفية' },
      { key: 'susp_front_shocks', en: 'Front Shock Absorbers', ar: 'مساعدين أماميين' },
      { key: 'susp_rear_shocks', en: 'Rear Shock Absorbers', ar: 'مساعدين خلفيين' },
      { key: 'susp_engine_mounts', en: 'Engine Mounts', ar: 'قواعد المحرك' },
      { key: 'susp_gear_mounts', en: 'Gearbox Mounts', ar: 'قواعد الفتيس' },
      { key: 'susp_front_arms', en: 'Front Control Arms', ar: 'مقصات أمامية' },
      { key: 'susp_rear_arms', en: 'Rear Control Arms', ar: 'مقصات خلفية' },
      { key: 'susp_steering_box', en: 'Steering Gearbox', ar: 'علبة الدركسيون' },
      { key: 'susp_steering_rods', en: 'Steering Rods', ar: 'بارات التوجيه' },
    ]
  },
  {
    title: 'Car Body and Paint - جسم السيارة والدهان',
    items: [
      { key: 'body_front_bumper', en: 'Front Bumper', ar: 'إكصدام أمامي' },
      { key: 'body_rear_bumper', en: 'Rear Bumper', ar: 'إكصدام خلفي' },
      { key: 'body_roof', en: 'Roof', ar: 'السقف' },
      { key: 'body_hood', en: 'Hood', ar: 'الكبوت' },
      { key: 'body_trunk', en: 'Trunk', ar: 'الشنطة' },
      { key: 'body_rf_fender', en: 'Right Front Fender', ar: 'رفرف أمامي يمين' },
      { key: 'body_lf_fender', en: 'Left Front Fender', ar: 'رفرف أمامي شمال' },
      { key: 'body_rf_door', en: 'Right Front Door', ar: 'باب أمامي يمين' },
      { key: 'body_lf_door', en: 'Left Front Door', ar: 'باب أمامي شمال' },
      { key: 'body_rr_door', en: 'Right Rear Door', ar: 'باب خلفي يمين' },
      { key: 'body_lr_door', en: 'Left Rear Door', ar: 'باب خلفي شمال' },
      { key: 'body_rr_fender', en: 'Right Rear Fender', ar: 'رفرف خلفي يمين' },
      { key: 'body_lr_fender', en: 'Left Rear Fender', ar: 'رفرف خلفي شمال' },
      { key: 'body_chassis', en: 'Chassis', ar: 'الشاسية' },
      { key: 'body_headlights', en: 'Headlights Condition', ar: 'حالة الفوانيس' },
    ]
  }
];

const RATING_OPTIONS = [
  { value: '', label: '-- Not Checked / لم يتم الفحص --' },
  { value: 'Good', label: 'Good - جيد' },
  { value: 'Acceptable', label: 'Acceptable - مقبول' },
  { value: 'Needs attention', label: 'Needs attention - يحتاج صيانة' },
  { value: 'Replace', label: 'Replace - يحتاج تغيير' },
  { value: 'Not applicable', label: 'Not applicable - لا ينطبق' },
];

const InspectionEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isReviseMode = searchParams.get('mode') === 'revise';
  const isNew = !id;

  const navigate = useNavigate();

  // Basic Details
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    carId: '',
    carPlate: '',
    carChassis: '',
    carMake: '',
    carModel: '',
    carYear: '',
    odometerKm: '',
    workOrderId: '',
    invoiceId: '',
    invoiceNumber: '',
    invoiceAmount: '',
    diagnosticScanResult: '',
    notes: '',
  });

  // Checklist key => value
  const [checklist, setChecklist] = useState<Record<string, string>>({});
  const [damageMarkers, setDamageMarkers] = useState<DamageMarker[]>([]);
  const [existingInspection, setExistingInspection] = useState<Inspection | null>(null);

  // Reference lists for dropdowns
  const [customers, setCustomers] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const diagramRef = useRef<HTMLDivElement>(null);

  const currentDraftPayload = {
    formData,
    checklist,
    damageMarkers
  };

  const handleRestoreInspectionDraft = (draft: any) => {
    if (draft.formData) setFormData(draft.formData);
    if (draft.checklist) setChecklist(draft.checklist);
    if (draft.damageMarkers) setDamageMarkers(draft.damageMarkers);
  };

  const {
    lastSavedTime,
    isSaving: isAutosaving,
    hasDraftAvailable,
    draftUpdatedAt,
    restoreDraft,
    discardDraft,
    clearDraft,
    handleBlur
  } = useDraftAutoSave({
    formKey: isNew ? 'inspection_new' : `inspection_${id}`,
    formData: currentDraftPayload,
    onRestore: handleRestoreInspectionDraft,
    isFormOpen: true
  });

  useEffect(() => {
    initPage();
  }, [id]);

  const initPage = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load reference lists
      const [custList, woList] = await Promise.all([
        customerService.getAll().catch(() => []),
        workOrderService.getAll().catch(() => [])
      ]);
      setCustomers(custList);
      setWorkOrders(woList);

      if (id) {
        const insp = await inspectionService.getById(parseInt(id, 10));
        setExistingInspection(insp);

        setFormData({
          customerId: insp.customerId ? insp.customerId.toString() : '',
          customerName: insp.customerName || '',
          customerPhone: insp.customerPhone || '',
          carId: insp.carId ? insp.carId.toString() : '',
          carPlate: insp.carPlate || '',
          carChassis: insp.carChassis || '',
          carMake: insp.carMake || '',
          carModel: insp.carModel || '',
          carYear: insp.carYear ? insp.carYear.toString() : '',
          odometerKm: insp.odometerKm ? insp.odometerKm.toString() : '',
          workOrderId: insp.workOrderId ? insp.workOrderId.toString() : '',
          invoiceId: insp.invoiceId ? insp.invoiceId.toString() : '',
          invoiceNumber: insp.invoiceNumber || '',
          invoiceAmount: insp.invoiceAmount ? insp.invoiceAmount.toString() : '',
          diagnosticScanResult: insp.diagnosticScanResult || '',
          notes: insp.notes || '',
        });

        if (insp.checklistDataJson) {
          try {
            setChecklist(JSON.parse(insp.checklistDataJson));
          } catch {}
        }

        if (insp.damageMarkersJson) {
          try {
            setDamageMarkers(JSON.parse(insp.damageMarkersJson));
          } catch {}
        }

        if (insp.customerId) {
          const custCars = await carService.getByCustomerId(insp.customerId).catch(() => []);
          setCars(custCars);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load inspection data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerChange = async (custId: string) => {
    setFormData(prev => ({ ...prev, customerId: custId }));
    if (!custId) {
      setCars([]);
      return;
    }

    const selectedCust = customers.find(c => c.id.toString() === custId);
    if (selectedCust) {
      setFormData(prev => ({
        ...prev,
        customerName: selectedCust.fullName,
        customerPhone: selectedCust.phone
      }));
    }

    try {
      const custCars = await carService.getByCustomerId(parseInt(custId, 10));
      setCars(custCars);
      if (custCars.length === 1) {
        handleCarSelect(custCars[0]);
      }
    } catch {}
  };

  const handleCarSelect = (car: any) => {
    setFormData(prev => ({
      ...prev,
      carId: car.id.toString(),
      carPlate: car.licensePlate,
      carChassis: car.vin || '',
      carMake: car.make,
      carModel: car.model,
      carYear: car.year ? car.year.toString() : '',
      odometerKm: car.currentOdometerKm ? car.currentOdometerKm.toString() : prev.odometerKm
    }));
  };

  const handleWorkOrderChange = (woId: string) => {
    setFormData(prev => ({ ...prev, workOrderId: woId }));
    if (!woId) return;

    const wo = workOrders.find(w => w.id.toString() === woId);
    if (wo) {
      setFormData(prev => ({
        ...prev,
        customerId: wo.customerId ? wo.customerId.toString() : prev.customerId,
        customerName: wo.customerName || prev.customerName,
        customerPhone: wo.customerPhone || prev.customerPhone,
        carId: wo.carId ? wo.carId.toString() : prev.carId,
        carPlate: wo.carPlate || prev.carPlate,
        carMake: wo.carMake || prev.carMake,
        carModel: wo.carModel || prev.carModel,
        odometerKm: wo.odometerKm ? wo.odometerKm.toString() : prev.odometerKm,
      }));
    }
  };

  const handleChecklistChange = (key: string, value: string) => {
    setChecklist(prev => ({ ...prev, [key]: value }));
  };

  const handleDiagramClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!diagramRef.current) return;
    const rect = diagramRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newMarker: DamageMarker = {
      id: Date.now().toString(),
      number: damageMarkers.length + 1,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      label: `Damage #${damageMarkers.length + 1}`,
      severity: 'scratch'
    };

    setDamageMarkers([...damageMarkers, newMarker]);
  };

  const removeMarker = (index: number) => {
    const updated = damageMarkers.filter((_, i) => i !== index).map((m, i) => ({
      ...m,
      number: i + 1
    }));
    setDamageMarkers(updated);
  };

  const saveInspection = async (finalize = false) => {
    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        customerId: formData.customerId ? parseInt(formData.customerId, 10) : null,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        carId: formData.carId ? parseInt(formData.carId, 10) : null,
        carPlate: formData.carPlate,
        carChassis: formData.carChassis,
        carMake: formData.carMake,
        carModel: formData.carModel,
        carYear: formData.carYear ? parseInt(formData.carYear, 10) : 0,
        odometerKm: formData.odometerKm ? parseInt(formData.odometerKm, 10) : 0,
        workOrderId: formData.workOrderId ? parseInt(formData.workOrderId, 10) : null,
        invoiceId: formData.invoiceId ? parseInt(formData.invoiceId, 10) : null,
        invoiceNumber: formData.invoiceNumber || null,
        invoiceAmount: formData.invoiceAmount ? parseFloat(formData.invoiceAmount) : null,
        checklistDataJson: JSON.stringify(checklist),
        damageMarkersJson: JSON.stringify(damageMarkers),
        diagnosticScanResult: formData.diagnosticScanResult,
        notes: formData.notes
      };

      let resultId = id ? parseInt(id, 10) : 0;

      if (isNew) {
        const created = await inspectionService.create(payload);
        resultId = created.id;
      } else if (isReviseMode) {
        const revised = await inspectionService.revise(resultId, payload);
        resultId = revised.id;
      } else {
        await inspectionService.update(resultId, payload);
      }

      if (finalize) {
        await inspectionService.finalize(resultId);
      }

      await clearDraft();
      navigate(`/inspections/${resultId}/print`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save inspection report');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div onBlur={handleBlur} style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto', direction: 'ltr' }}>
      <DraftIndicator
        lastSavedTime={lastSavedTime}
        isSaving={isAutosaving}
        hasDraftAvailable={hasDraftAvailable}
        draftUpdatedAt={draftUpdatedAt}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
      />
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/inspections')}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {isNew ? 'New Comprehensive Inspection' : isReviseMode ? `Revise Report: ${existingInspection?.reportNumber}` : `Edit Inspection: ${existingInspection?.reportNumber}`}
            </h1>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'Cairo, sans-serif' }}>
              فحص شامل وتحديد الملاحظات وعلامات الهيكل (3 صفحات معتمدة)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            disabled={isSaving}
            onClick={() => saveInspection(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Save size={16} />
            <span>Save Draft / حفظ مسودة</span>
          </button>

          <button
            disabled={isSaving}
            onClick={() => saveInspection(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
            }}
          >
            <CheckCircle size={18} />
            <span>Finalize & Lock / اعتماد نهائي</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '14px',
          background: 'var(--danger-dim)',
          border: '1px solid var(--danger)',
          borderRadius: '8px',
          color: 'var(--danger)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Basic Client & Vehicle Data (Auto-filled + Editable) */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={18} />
          <span>Client & Vehicle Information (بيانات العميل والسيارة)</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Select Customer */}
          <div>
            <label style={labelStyle}>Link Customer / اختر العميل</label>
            <select
              value={formData.customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Choose Existing Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName} ({c.phone})</option>
              ))}
            </select>
          </div>

          {/* Customer Name */}
          <div>
            <label style={labelStyle}>Client Name / اسم العميل</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              style={inputStyle}
              placeholder="e.g. أحمد محمد"
            />
          </div>

          {/* Customer Phone */}
          <div>
            <label style={labelStyle}>Client Phone / موبايل العميل</label>
            <input
              type="text"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              style={inputStyle}
              placeholder="010XXXXXXXX"
            />
          </div>

          {/* Work Order Link */}
          <div>
            <label style={labelStyle}>Link Work Order / أمر الشغل</label>
            <select
              value={formData.workOrderId}
              onChange={(e) => handleWorkOrderChange(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- None / اختياري --</option>
              {workOrders.map((w) => (
                <option key={w.id} value={w.id}>{w.orderNumber} - {w.customerName}</option>
              ))}
            </select>
          </div>

          {/* Vehicle Select */}
          {cars.length > 0 && (
            <div>
              <label style={labelStyle}>Select Vehicle / اختر سيارة</label>
              <select
                value={formData.carId}
                onChange={(e) => {
                  const car = cars.find(c => c.id.toString() === e.target.value);
                  if (car) handleCarSelect(car);
                }}
                style={inputStyle}
              >
                <option value="">-- Choose Vehicle --</option>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>{c.make} {c.model} ({c.licensePlate})</option>
                ))}
              </select>
            </div>
          )}

          {/* Car Make / Type */}
          <div>
            <label style={labelStyle}>Make & Type / الطراز</label>
            <input
              type="text"
              value={formData.carMake}
              onChange={(e) => setFormData({ ...formData, carMake: e.target.value })}
              style={inputStyle}
              placeholder="e.g. Mercedes-Benz"
            />
          </div>

          {/* Car Model */}
          <div>
            <label style={labelStyle}>Model / الموديل</label>
            <input
              type="text"
              value={formData.carModel}
              onChange={(e) => setFormData({ ...formData, carModel: e.target.value })}
              style={inputStyle}
              placeholder="e.g. C180"
            />
          </div>

          {/* Plate No */}
          <div>
            <label style={labelStyle}>Plate No / رقم اللوحة</label>
            <input
              type="text"
              value={formData.carPlate}
              onChange={(e) => setFormData({ ...formData, carPlate: e.target.value })}
              style={inputStyle}
              placeholder="e.g. س ق د 1234"
            />
          </div>

          {/* Chassis / VIN */}
          <div>
            <label style={labelStyle}>VIN / رقم الشاسية</label>
            <input
              type="text"
              value={formData.carChassis}
              onChange={(e) => setFormData({ ...formData, carChassis: e.target.value })}
              style={inputStyle}
              placeholder="17-character VIN"
            />
          </div>

          {/* Odometer */}
          <div>
            <label style={labelStyle}>KM Reading / قراءة العداد</label>
            <input
              type="number"
              value={formData.odometerKm}
              onChange={(e) => setFormData({ ...formData, odometerKm: e.target.value })}
              style={inputStyle}
              placeholder="e.g. 125000"
            />
          </div>
        </div>
      </div>

      {/* 5-View Car Damage Diagram with Interactive Click-to-Place Markers */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Car size={18} />
              <span>Interactive Body Damage Diagram (رسم أماكن الخدوش والصدمات)</span>
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Click anywhere on the car views below to add a numbered damage marker. Click a marker list item to remove.
            </span>
          </div>

          {damageMarkers.length > 0 && (
            <button
              onClick={() => setDamageMarkers([])}
              style={{
                fontSize: '12px',
                color: 'var(--danger)',
                background: 'transparent',
                border: '1px solid var(--border)',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Clear All Markers ({damageMarkers.length})
            </button>
          )}
        </div>

        {/* SVG Diagram Canvas */}
        <div
          ref={diagramRef}
          onClick={handleDiagramClick}
          style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '2px dashed #94a3b8',
            cursor: 'crosshair',
            overflow: 'hidden',
            userSelect: 'none'
          }}
        >
          {/* Background SVG representing 5 Views */}
          <svg viewBox="0 0 800 240" style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
            {/* Top View */}
            <g transform="translate(320, 15)">
              <rect x="0" y="0" width="160" height="200" rx="25" fill="#f1f5f9" stroke="#1e293b" strokeWidth="2.5" />
              <rect x="25" y="45" width="110" height="110" rx="12" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.5" />
              {/* Wheels */}
              <rect x="-10" y="25" width="14" height="35" rx="3" fill="#334155" />
              <rect x="156" y="25" width="14" height="35" rx="3" fill="#334155" />
              <rect x="-10" y="140" width="14" height="35" rx="3" fill="#334155" />
              <rect x="156" y="140" width="14" height="35" rx="3" fill="#334155" />
              <text x="80" y="105" fontSize="13" fontWeight="bold" fill="#0f172a" textAnchor="middle">TOP / السقف</text>
            </g>

            {/* Left Side View */}
            <g transform="translate(20, 25)">
              <rect x="0" y="30" width="260" height="90" rx="15" fill="#f1f5f9" stroke="#1e293b" strokeWidth="2" />
              <circle cx="55" cy="120" r="22" fill="#334155" stroke="#000" strokeWidth="2" />
              <circle cx="205" cy="120" r="22" fill="#334155" stroke="#000" strokeWidth="2" />
              <rect x="65" y="40" width="60" height="35" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.5" />
              <rect x="135" y="40" width="60" height="35" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.5" />
              <text x="130" y="100" fontSize="12" fontWeight="bold" fill="#0f172a" textAnchor="middle">LEFT / الجانب الأيسر</text>
            </g>

            {/* Right Side View */}
            <g transform="translate(520, 25)">
              <rect x="0" y="30" width="260" height="90" rx="15" fill="#f1f5f9" stroke="#1e293b" strokeWidth="2" />
              <circle cx="55" cy="120" r="22" fill="#334155" stroke="#000" strokeWidth="2" />
              <circle cx="205" cy="120" r="22" fill="#334155" stroke="#000" strokeWidth="2" />
              <rect x="65" y="40" width="60" height="35" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.5" />
              <rect x="135" y="40" width="60" height="35" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.5" />
              <text x="130" y="100" fontSize="12" fontWeight="bold" fill="#0f172a" textAnchor="middle">RIGHT / الجانب الأيمن</text>
            </g>
          </svg>

          {/* Interactive Marker Pins */}
          {damageMarkers.map((m, idx) => (
            <div
              key={m.id}
              style={{
                position: 'absolute',
                left: `${m.x}%`,
                top: `${m.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: '#dc2626',
                border: '2px solid #ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
              title={`${m.label} (Click to remove)`}
              onClick={(e) => {
                e.stopPropagation();
                removeMarker(idx);
              }}
            >
              {m.number}
            </div>
          ))}
        </div>

        {/* Marker Details List */}
        {damageMarkers.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {damageMarkers.map((m, idx) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              >
                <span style={{
                  background: '#dc2626',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '10px'
                }}>
                  {m.number}
                </span>
                <input
                  type="text"
                  value={m.label}
                  onChange={(e) => {
                    const updated = [...damageMarkers];
                    updated[idx].label = e.target.value;
                    setDamageMarkers(updated);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    width: '120px'
                  }}
                />
                <button
                  onClick={() => removeMarker(idx)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checklist Sections (Fast Technician Form) */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Checklist Fields (بنود الفحص الفني)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
          {CHECKLIST_SECTIONS.map((sec, secIdx) => (
            <div
              key={secIdx}
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                padding: '16px'
              }}
            >
              <h4 style={{
                margin: '0 0 12px 0',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border)',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text-primary)'
              }}>
                {sec.title}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sec.items.map((item) => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.en}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Cairo, sans-serif' }}>{item.ar}</div>
                    </div>

                    <select
                      value={checklist[item.key] || ''}
                      onChange={(e) => handleChecklistChange(item.key, e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        width: '180px'
                      }}
                    >
                      {RATING_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostic Scan & Notes */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        padding: '20px',
        marginBottom: '28px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Diagnostic Scan & General Notes (كشف الأعطال والملاحظات)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Diagnostic Scan with Device / كشف الأعطال بالجهاز</label>
            <textarea
              rows={3}
              value={formData.diagnosticScanResult}
              onChange={(e) => setFormData({ ...formData, diagnosticScanResult: e.target.value })}
              style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
              placeholder="e.g. لا توجد أعطال مسجلة بوحدة التحكم (No fault codes found) / DTC P0300"
            />
          </div>

          <div>
            <label style={labelStyle}>General Notes & Observations / ملاحظات عامة</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
              placeholder="e.g. يوصى بتغيير زيت المحرك بعد 1000 كم..."
            />
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        padding: '16px 0',
        borderTop: '1px solid var(--border)'
      }}>
        <button
          disabled={isSaving}
          onClick={() => saveInspection(false)}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Save Draft (حفظ مسودة)
        </button>

        <button
          disabled={isSaving}
          onClick={() => saveInspection(true)}
          style={{
            padding: '10px 24px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: 'white',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Finalize & Print Report (اعتماد وطباعة التقرير)
        </button>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: 'var(--text-muted)',
  marginBottom: '6px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  background: 'var(--bg-main)',
  color: 'var(--text-primary)',
  fontSize: '13px'
};

export default InspectionEditorPage;
