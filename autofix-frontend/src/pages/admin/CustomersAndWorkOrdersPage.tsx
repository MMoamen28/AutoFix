import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ClipboardList, Plus, Search, Car, User, Phone, CheckCircle, Clock, 
  Wrench, AlertTriangle, Printer, Eye, X, RefreshCw, FileText, 
  ChevronDown, ChevronUp, History, MessageCircle, AlertCircle, Ban, ArrowRight
} from 'lucide-react';
import api from '../../services/axiosClient';
import { workOrderService, WorkOrder } from '../../services/workOrderService';
import { customerService } from '../../services/customerService';
import serviceService from '../../services/serviceService';
import useDraftAutoSave from '../../hooks/useDraftAutoSave';
import DraftIndicator from '../../components/shared/DraftIndicator';
import Money from '../../components/shared/Money';
import PriceInput from '../../components/shared/PriceInput';
import { getCurrencyLabel } from '../../i18n/formatters';
import WorkOrderLinesModal from '../../components/workorders/WorkOrderLinesModal';
import { InvoicePreviewModal } from '../../components/shared/InvoicePreviewModal';
import { CarServiceHistoryModal } from '../../components/shared/CarServiceHistoryModal';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';

interface BundleLine {
  lineType: string;
  description: string;
  serviceId?: number;
  sparePartId?: number;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
}

interface FormState {
  // Customer
  isNewCustomer: boolean;
  selectedCustomerId: number;
  customerName: string;
  customerPhone: string;
  customerNotes: string;

  // Car
  isNewCar: boolean;
  selectedCarId: number;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  odometerKm: number;

  // Work Order
  workType: 'Maintenance' | 'Inspection';
  customerComplaint: string;
  notes: string;
  workDone: string;
  workToBeDone: string;
  assignedTechnicianId: number;

  // Lines
  lines: BundleLine[];
}

const initialFormState: FormState = {
  isNewCustomer: false,
  selectedCustomerId: 0,
  customerName: '',
  customerPhone: '',
  customerNotes: '',

  isNewCar: false,
  selectedCarId: 0,
  make: 'Toyota',
  model: 'Corolla',
  year: new Date().getFullYear(),
  licensePlate: '',
  vin: '',
  odometerKm: 0,

  workType: 'Maintenance',
  customerComplaint: '',
  notes: '',
  workDone: '',
  workToBeDone: '',
  assignedTechnicianId: 0,

  lines: [
    {
      lineType: 'LaborMechanical',
      description: 'فحص ميكانيكي وصيانة دورية',
      quantity: 1,
      unitPrice: 300,
      unitCost: 0
    }
  ]
};

export const CustomersAndWorkOrdersPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  // Data lists
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form Collapse toggle
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Search & Filters for Work Orders List
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [workTypeFilter, setWorkTypeFilter] = useState<string>('All');
  const [mechanicFilter, setMechanicFilter] = useState<number>(0);
  const [showArchivedCustomers, setShowArchivedCustomers] = useState<boolean>(false);

  // Modals state
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<number | undefined>(undefined);
  const [previewInspectionId, setPreviewInspectionId] = useState<number | undefined>(undefined);
  const [previewWorkOrderId, setPreviewWorkOrderId] = useState<number | undefined>(undefined);
  const [previewWorkOrderInvoiceId, setPreviewWorkOrderInvoiceId] = useState<number | undefined>(undefined);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const [linesModalWo, setLinesModalWo] = useState<WorkOrder | null>(null);
  const [historyCarId, setHistoryCarId] = useState<number | null>(null);
  const [historyCarInfo, setHistoryCarInfo] = useState<string>('');

  // Invoice creation modal
  const [invoiceModalWo, setInvoiceModalWo] = useState<WorkOrder | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Settings
  const [showVatSetting, setShowVatSetting] = useState<boolean>(false);

  // Lower Odometer Warning
  const [odometerWarning, setOdometerWarning] = useState<string | null>(null);
  // Duplicate Phone Warning
  const [duplicatePhoneWarning, setDuplicatePhoneWarning] = useState<string | null>(null);

  // Draft AutoSave Hook
  const {
    lastSavedTime,
    isSaving,
    hasDraftAvailable,
    draftUpdatedAt,
    restoreDraft,
    discardDraft,
    clearDraft
  } = useDraftAutoSave<FormState>({
    formKey: 'autofix_bundle_workorder_draft',
    formData,
    initialData: initialFormState,
    onRestore: (draft) => {
      setFormData(draft);
    },
    isFormOpen
  });

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, custRes, mechRes, servRes, partsRes, setRes] = await Promise.all([
        workOrderService.getAll(),
        customerService.getAll(true),
        api.get<any[]>('/mechanics'),
        serviceService.getAll(),
        api.get<any[]>('/spare-parts'),
        api.get<any>('/settings').catch(() => ({ data: { showVat: false } }))
      ]);

      setOrders(ordersRes || []);
      setCustomers(custRes || []);
      setMechanics(mechRes.data || []);
      setAvailableServices(servRes || []);
      setSpareParts(partsRes.data || []);
      setShowVatSetting(setRes.data?.showVat ?? false);
    } catch (err) {
      console.error('Failed to load initial workshop data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Selected customer's cars
  const selectedCustomerCars = useMemo(() => {
    if (formData.isNewCustomer || !formData.selectedCustomerId) return [];
    const cust = customers.find((c: any) => c.id === formData.selectedCustomerId);
    return cust?.cars || [];
  }, [customers, formData.isNewCustomer, formData.selectedCustomerId]);

  // Check duplicate phone on new customer phone change
  useEffect(() => {
    if (formData.isNewCustomer && formData.customerPhone.trim().length >= 8) {
      const existing = customers.find((c: any) => c.phone && c.phone.trim() === formData.customerPhone.trim());
      if (existing) {
        setDuplicatePhoneWarning(
          isArabic 
            ? `⚠️ رقم الهاتف مسجل بالفعل للعميل: ${existing.fullName}` 
            : `⚠️ Phone number already belongs to: ${existing.fullName}`
        );
      } else {
        setDuplicatePhoneWarning(null);
      }
    } else {
      setDuplicatePhoneWarning(null);
    }
  }, [formData.isNewCustomer, formData.customerPhone, customers, isArabic]);

  // Check odometer against selected car
  useEffect(() => {
    if (!formData.isNewCar && formData.selectedCarId && formData.odometerKm > 0) {
      const car = selectedCustomerCars.find((c: any) => c.id === formData.selectedCarId);
      if (car && car.odometerKm && formData.odometerKm < car.odometerKm) {
        setOdometerWarning(
          isArabic
            ? `⚠️ قراءة العداد المدخلة (${formData.odometerKm.toLocaleString()} كم) أقل من آخر قراءة مسجلة (${car.odometerKm.toLocaleString()} كم).`
            : `⚠️ Entered odometer (${formData.odometerKm.toLocaleString()} km) is lower than previous recorded reading (${car.odometerKm.toLocaleString()} km).`
        );
      } else {
        setOdometerWarning(null);
      }
    } else {
      setOdometerWarning(null);
    }
  }, [formData.isNewCar, formData.selectedCarId, formData.odometerKm, selectedCustomerCars, isArabic]);

  // Handle customer selection change
  const handleSelectCustomer = (custId: number) => {
    const cust = customers.find((c: any) => c.id === custId);
    if (cust && cust.cars && cust.cars.length > 0) {
      const firstCar = cust.cars[0];
      setFormData(prev => ({
        ...prev,
        selectedCustomerId: custId,
        isNewCustomer: false,
        selectedCarId: firstCar.id,
        isNewCar: false,
        odometerKm: firstCar.odometerKm || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedCustomerId: custId,
        isNewCustomer: false,
        selectedCarId: 0,
        isNewCar: true,
        odometerKm: 0
      }));
    }
  };

  // Handle car selection change
  const handleSelectCar = (carId: number) => {
    const car = selectedCustomerCars.find((c: any) => c.id === carId);
    setFormData(prev => ({
      ...prev,
      selectedCarId: carId,
      isNewCar: false,
      odometerKm: car?.odometerKm || 0
    }));
  };

  // Add line
  const handleAddLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          lineType: 'LaborMechanical',
          description: '',
          quantity: 1,
          unitPrice: 0,
          unitCost: 0
        }
      ]
    }));
  };

  // Update line
  const handleUpdateLine = (index: number, updates: Partial<BundleLine>) => {
    setFormData(prev => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], ...updates };
      return { ...prev, lines: newLines };
    });
  };

  // Remove line
  const handleRemoveLine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  // Calculate lines subtotal
  const formSubtotal = useMemo(() => {
    return formData.lines.reduce((acc, l) => acc + (Number(l.quantity || 0) * Number(l.unitPrice || 0)), 0);
  }, [formData.lines]);

  // Submit Bundle
  const handleSubmitBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validations
    if (formData.isNewCustomer) {
      if (!formData.customerName.trim() || !formData.customerPhone.trim()) {
        setFormError(isArabic ? 'يرجى إدخال اسم العميل ورقم الهاتف.' : 'Please enter customer name and phone number.');
        return;
      }
    } else {
      if (!formData.selectedCustomerId) {
        setFormError(isArabic ? 'يرجى اختيار عميل أو إضافة عميل جديد.' : 'Please select a customer or add a new customer.');
        return;
      }
    }

    if (formData.isNewCar) {
      if (!formData.licensePlate.trim() || !formData.make.trim()) {
        setFormError(isArabic ? 'يرجى إدخال رقم اللوحة وماركة السيارة.' : 'Please enter car plate and make.');
        return;
      }
    } else {
      if (!formData.selectedCarId) {
        setFormError(isArabic ? 'يرجى اختيار سيارة أو إضافة سيارة جديدة.' : 'Please select a car or add a new car.');
        return;
      }
    }

    if (formData.lines.length === 0) {
      setFormError(isArabic ? 'يرجى إضافة خدمة أو قطعة واحدة على الأقل.' : 'Please add at least one service or part line.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: formData.isNewCustomer ? null : formData.selectedCustomerId,
        customerName: formData.isNewCustomer ? formData.customerName.trim() : null,
        customerPhone: formData.isNewCustomer ? formData.customerPhone.trim() : null,
        customerNotes: formData.isNewCustomer ? formData.customerNotes.trim() : null,

        carId: formData.isNewCar ? null : formData.selectedCarId,
        make: formData.isNewCar ? formData.make.trim() : null,
        model: formData.isNewCar ? formData.model.trim() : null,
        year: formData.isNewCar ? Number(formData.year) : 2024,
        licensePlate: formData.isNewCar ? formData.licensePlate.trim() : null,
        vin: formData.isNewCar ? formData.vin.trim() : null,
        odometerInKm: Number(formData.odometerKm) || 0,

        workType: formData.workType,
        customerComplaint: formData.customerComplaint.trim(),
        notes: formData.notes.trim(),
        workDone: formData.workDone.trim(),
        workToBeDone: formData.workToBeDone.trim(),
        assignedTechnicianId: formData.assignedTechnicianId > 0 ? Number(formData.assignedTechnicianId) : null,

        lines: formData.lines.map(l => ({
          lineType: l.lineType,
          description: l.description,
          serviceId: l.serviceId || null,
          sparePartId: l.sparePartId || null,
          quantity: Number(l.quantity) || 1,
          unitPrice: Number(l.unitPrice) || 0,
          unitCost: Number(l.unitCost) || 0
        }))
      };

      const res = await api.post('/work-orders/bundle', payload);
      const createdOrder = res.data;

      // Clear draft & reset form
      await clearDraft();
      setFormData(initialFormState);

      // Reload lists
      await loadData();

      // Offer immediate preview / print modal
      if (createdOrder && createdOrder.id) {
        if (formData.workType === 'Inspection') {
          setPreviewInspectionId(undefined);
          setPreviewWorkOrderId(createdOrder.id);
          setPreviewWorkOrderInvoiceId(undefined);
          setPreviewInvoiceId(undefined);
          setPreviewTitle(`فحص سيارة شامل - ${createdOrder.orderNumber}`);
        } else {
          setPreviewWorkOrderInvoiceId(createdOrder.id);
          setPreviewWorkOrderId(undefined);
          setPreviewInspectionId(undefined);
          setPreviewInvoiceId(undefined);
          setPreviewTitle(`فاتورة صيانة - ${createdOrder.orderNumber}`);
        }
        setPreviewModalOpen(true);
      }
    } catch (err: any) {
      console.error('Bundle creation failed:', err);
      setFormError(err.response?.data?.message || (isArabic ? 'فشل حفظ أمر الشغل والبيانات' : 'Failed to create work order bundle'));
    } finally {
      setSubmitting(false);
    }
  };

  // Work Orders status transitions
  const handleTransition = async (id: number, nextStatus: string) => {
    try {
      await workOrderService.transitionStatus(id, nextStatus);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || `Cannot transition to ${nextStatus}`);
    }
  };

  // Convert to Invoice
  const handleConfirmInvoice = async () => {
    if (!invoiceModalWo) return;
    try {
      await workOrderService.convertToInvoice(invoiceModalWo.id, {
        vatPercentage: 0,
        discountAmount: Number(discountAmount)
      });
      setInvoiceModalWo(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to convert to invoice.');
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(wo => {
      // Status filter
      if (statusFilter !== 'All' && wo.status !== statusFilter) return false;
      // Work type filter
      if (workTypeFilter !== 'All' && wo.workType !== workTypeFilter) return false;
      // Mechanic filter
      if (mechanicFilter > 0 && wo.assignedTechnicianId !== mechanicFilter && wo.helperTechnicianId !== mechanicFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = (wo.orderNumber || '').toLowerCase();
        const cust = (wo.customerName || '').toLowerCase();
        const phone = (wo.customerPhone || '').toLowerCase();
        const plate = (wo.carPlate || '').toLowerCase();
        const car = `${wo.carMake || ''} ${wo.carModel || ''}`.toLowerCase();
        if (!num.includes(q) && !cust.includes(q) && !phone.includes(q) && !plate.includes(q) && !car.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [orders, statusFilter, workTypeFilter, mechanicFilter, searchQuery]);

  // Open Car History
  const handleOpenCarHistory = (carId: number, carInfo: string) => {
    setHistoryCarId(carId);
    setHistoryCarInfo(carInfo);
  };

  // Smart print
  const handleSmartPrint = (wo: WorkOrder) => {
    if (wo.workType === 'Inspection') {
      setPreviewWorkOrderId(wo.id);
      setPreviewWorkOrderInvoiceId(undefined);
      setPreviewInspectionId(undefined);
      setPreviewInvoiceId(undefined);
      setPreviewTitle(`فحص سيارة شامل - ${wo.orderNumber}`);
    } else {
      setPreviewWorkOrderInvoiceId(wo.id);
      setPreviewWorkOrderId(undefined);
      setPreviewInspectionId(undefined);
      setPreviewInvoiceId(undefined);
      setPreviewTitle(`فاتورة صيانة - ${wo.orderNumber}`);
    }
    setPreviewModalOpen(true);
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '60px' }} dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {isArabic ? 'العملاء وأوامر الشغل' : 'Customers & Work Orders'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
            {isArabic 
              ? 'إدارة متكاملة: تسجيل العميل والسيارة، فتح أوامر الشغل والصيانة والفحص، وإصدار الفواتير فوراً' 
              : 'Unified workflow: reception, customer & car registration, maintenance & inspection orders, and instant invoicing.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button 
            variant="secondary"
            onClick={() => setIsFormOpen(!isFormOpen)}
          >
            {isFormOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span style={{ marginInlineStart: '6px' }}>
              {isFormOpen 
                ? (isArabic ? 'إخفاء استمارة الإدخال' : 'Hide Order Form') 
                : (isArabic ? 'فتح أمر شغل جديد' : 'New Work Order Form')}
            </span>
          </Button>
          <Button variant="primary" onClick={loadData}>
            <RefreshCw size={15} />
            <span style={{ marginInlineStart: '6px' }}>{isArabic ? 'تحديث' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ATOMIC ORDER CREATION FORM                                             */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', padding: '24px', marginBottom: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                <ClipboardList size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {isArabic ? 'استمارة استقبال وفتح أمر شغل شامل' : 'Single Reception & Work Order Bundle'}
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {isArabic ? 'حفظ ذري واحد ينشئ العميل والسيارة وأمر الشغل والعمليات معاً' : 'Atomic transaction creates Customer, Car, Work Order and Operations together.'}
                </div>
              </div>
            </div>

            <DraftIndicator
              lastSavedTime={lastSavedTime}
              isSaving={isSaving}
              hasDraftAvailable={hasDraftAvailable}
              draftUpdatedAt={draftUpdatedAt}
              onRestore={restoreDraft}
              onDiscard={discardDraft}
            />
          </div>

          {formError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitBundle}>
            {/* Row 1: Work Type Selector */}
            <div style={{ marginBottom: '20px', background: 'var(--bg-card-hover)', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>{isArabic ? 'نوع أمر الشغل والتقرير:' : 'Work Type & Template:'}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  ({formData.workType === 'Maintenance' ? (isArabic ? 'يطبع نموذج فاتورة صيانة' : 'Prints Maintenance Invoice') : (isArabic ? 'يطبع تقرير فحص سيارة شامل 3 صفحات' : 'Prints 3-Page Inspection Report')})
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, workType: 'Maintenance' }))}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    border: formData.workType === 'Maintenance' ? '2px solid #2563EB' : '1px solid var(--border)',
                    background: formData.workType === 'Maintenance' ? '#2563EB' : 'transparent',
                    color: formData.workType === 'Maintenance' ? '#FFFFFF' : 'var(--text-primary)'
                  }}
                >
                  🛠️ {isArabic ? 'صيانة دورية (فاتورة صيانة)' : 'Maintenance (فاتورة صيانة)'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, workType: 'Inspection' }))}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    border: formData.workType === 'Inspection' ? '2px solid #D97706' : '1px solid var(--border)',
                    background: formData.workType === 'Inspection' ? '#D97706' : 'transparent',
                    color: formData.workType === 'Inspection' ? '#FFFFFF' : 'var(--text-primary)'
                  }}
                >
                  🔍 {isArabic ? 'فحص شامل (فحص سيارة شامل)' : 'Inspection (فحص سيارة شامل)'}
                </button>
              </div>
            </div>

            {/* Grid 2 Columns: Customer & Car */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              {/* Customer Box */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', background: 'var(--bg-main)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: '#2563EB' }}>
                    <User size={16} />
                    <span>{isArabic ? 'بيانات العميل' : 'Customer Info'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isNewCustomer: !prev.isNewCustomer }))}
                    style={{ fontSize: '12px', background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {formData.isNewCustomer ? (isArabic ? 'اختيار عميل مسجل' : 'Pick Existing Customer') : (isArabic ? '+ تسجيل عميل جديد' : '+ New Customer')}
                  </button>
                </div>

                {!formData.isNewCustomer ? (
                  <div>
                    <label style={fieldLabelStyle}>{isArabic ? 'اختر العميل الحالي' : 'Select Customer'} *</label>
                    <select
                      value={formData.selectedCustomerId}
                      onChange={e => handleSelectCustomer(Number(e.target.value))}
                      style={fieldInputStyle}
                    >
                      <option value={0}>{isArabic ? '-- اختر العميل من القائمة --' : '-- Select Customer --'}</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} - {c.phone} {c.cars?.length ? `(${c.cars.length} ${isArabic ? 'سيارات' : 'cars'})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={fieldLabelStyle}>{isArabic ? 'اسم العميل بالكامل' : 'Full Name'} *</label>
                      <input
                        type="text"
                        placeholder={isArabic ? 'مثال: محمد أحمد علي' : 'e.g. John Doe'}
                        value={formData.customerName}
                        onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>{isArabic ? 'رقم الهاتف' : 'Phone Number'} *</label>
                      <input
                        type="text"
                        placeholder="010XXXXXXXX"
                        value={formData.customerPhone}
                        onChange={e => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                        style={fieldInputStyle}
                      />
                      {duplicatePhoneWarning && (
                        <div style={{ color: '#D97706', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>
                          {duplicatePhoneWarning}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>{isArabic ? 'ملاحظات العميل' : 'Customer Notes'}</label>
                      <input
                        type="text"
                        placeholder={isArabic ? 'ملاحظات خاصة بالعميل...' : 'Special notes...'}
                        value={formData.customerNotes}
                        onChange={e => setFormData(prev => ({ ...prev, customerNotes: e.target.value }))}
                        style={fieldInputStyle}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Car Box */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', background: 'var(--bg-main)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: '#10B981' }}>
                    <Car size={16} />
                    <span>{isArabic ? 'بيانات السيارة' : 'Vehicle Info'}</span>
                  </div>
                  {!formData.isNewCustomer && selectedCustomerCars.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isNewCar: !prev.isNewCar }))}
                      style={{ fontSize: '12px', background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {formData.isNewCar ? (isArabic ? 'اختيار سيارة مسجلة' : 'Pick Existing Car') : (isArabic ? '+ سيارة جديدة للعميل' : '+ New Car for Customer')}
                    </button>
                  )}
                </div>

                {!formData.isNewCar && !formData.isNewCustomer && selectedCustomerCars.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={fieldLabelStyle}>{isArabic ? 'اختر السيارة' : 'Select Car'} *</label>
                      <select
                        value={formData.selectedCarId}
                        onChange={e => handleSelectCar(Number(e.target.value))}
                        style={fieldInputStyle}
                      >
                        {selectedCustomerCars.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.make} {c.model} {c.year} - {c.licensePlate} ({c.odometerKm || 0} km)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>{isArabic ? 'قراءة العداد الحالية (كم)' : 'Current Odometer (km)'}</label>
                      <input
                        type="number"
                        value={formData.odometerKm || ''}
                        onChange={e => setFormData(prev => ({ ...prev, odometerKm: Number(e.target.value) }))}
                        style={fieldInputStyle}
                      />
                      {odometerWarning && (
                        <div style={{ color: '#D97706', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>
                          {odometerWarning}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={fieldLabelStyle}>{isArabic ? 'الماركة' : 'Make'} *</label>
                      <input
                        type="text"
                        placeholder="Toyota"
                        value={formData.make}
                        onChange={e => setFormData(prev => ({ ...prev, make: e.target.value }))}
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>{isArabic ? 'الموديل' : 'Model'} *</label>
                      <input
                        type="text"
                        placeholder="Corolla"
                        value={formData.model}
                        onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))}
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>{isArabic ? 'رقم اللوحة' : 'Plate'} *</label>
                      <input
                        type="text"
                        placeholder={isArabic ? 'مثال: أ ب ج 1234' : 'ABC 1234'}
                        value={formData.licensePlate}
                        onChange={e => setFormData(prev => ({ ...prev, licensePlate: e.target.value }))}
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>{isArabic ? 'سنة الصنع' : 'Year'}</label>
                      <input
                        type="number"
                        value={formData.year}
                        onChange={e => setFormData(prev => ({ ...prev, year: Number(e.target.value) }))}
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>{isArabic ? 'رقم الشاسيه / VIN' : 'VIN (Optional)'}</label>
                      <input
                        type="text"
                        placeholder="VIN..."
                        value={formData.vin}
                        onChange={e => setFormData(prev => ({ ...prev, vin: e.target.value }))}
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>{isArabic ? 'العداد (كم)' : 'Odometer (km)'}</label>
                      <input
                        type="number"
                        value={formData.odometerKm || ''}
                        onChange={e => setFormData(prev => ({ ...prev, odometerKm: Number(e.target.value) }))}
                        style={fieldInputStyle}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Complaints, Internal Notes & Work Done */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={fieldLabelStyle}>{isArabic ? 'شكوى العميل / سبب الدخول' : 'Customer Complaint'}</label>
                <textarea
                  rows={2}
                  placeholder={isArabic ? 'صوت بالفرامل، صيانة دورية، فحص كامل...' : 'Customer issue...'}
                  value={formData.customerComplaint}
                  onChange={e => setFormData(prev => ({ ...prev, customerComplaint: e.target.value }))}
                  style={{ ...fieldInputStyle, resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={fieldLabelStyle}>
                  {isArabic ? 'الأعمال المنجزة (تحفظ بأمر الشغل)' : 'Work Done (Saved on WO)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isArabic ? 'تم تغيير تيل الفرامل، ضبط الزوايا...' : 'Completed repairs...'}
                  value={formData.workDone}
                  onChange={e => setFormData(prev => ({ ...prev, workDone: e.target.value }))}
                  style={{ ...fieldInputStyle, resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={fieldLabelStyle}>
                  {isArabic ? 'أعمال يوصى بها مستقبلاً' : 'Work To Be Done / Recommendations'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isArabic ? 'تغيير كوتش، تغيير زيت بعد 5000 كم...' : 'Recommended future work...'}
                  value={formData.workToBeDone}
                  onChange={e => setFormData(prev => ({ ...prev, workToBeDone: e.target.value }))}
                  style={{ ...fieldInputStyle, resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={fieldLabelStyle}>{isArabic ? 'الفني المسؤول' : 'Assigned Mechanic'}</label>
                <select
                  value={formData.assignedTechnicianId}
                  onChange={e => setFormData(prev => ({ ...prev, assignedTechnicianId: Number(e.target.value) }))}
                  style={fieldInputStyle}
                >
                  <option value={0}>{isArabic ? '-- بدون تعيين فني --' : '-- Unassigned --'}</option>
                  {mechanics.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.specialty || 'General'})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Lines (Requested Services & Parts) */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '20px', background: 'var(--bg-main)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                  {isArabic ? 'الخدمات وقطع الغيار المطلوبة' : 'Requested Services & Spare Parts'}
                </div>
                <button
                  type="button"
                  onClick={handleAddLine}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid #2563EB',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={14} /> {isArabic ? 'إضافة بند' : 'Add Line'}
                </button>
              </div>

              {formData.lines.map((line, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 130px 130px 36px', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  {/* Line Type */}
                  <select
                    value={line.lineType}
                    onChange={e => handleUpdateLine(idx, { lineType: e.target.value })}
                    style={fieldInputStyle}
                  >
                    <option value="LaborMechanical">{isArabic ? 'مصنعية ميكانيكا' : 'Labor Mechanical'}</option>
                    <option value="LaborElectrical">{isArabic ? 'مصنعية كهرباء' : 'Labor Electrical'}</option>
                    <option value="SparePart">{isArabic ? 'قطعة غيار' : 'Spare Part'}</option>
                    <option value="LaborOils">{isArabic ? 'تغيير زيوت' : 'Oils & Filters'}</option>
                  </select>

                  {/* Description or Preset Picker */}
                  <input
                    type="text"
                    placeholder={isArabic ? 'وصف الخدمة أو اسم القطعة' : 'Operation / Part description'}
                    value={line.description}
                    onChange={e => handleUpdateLine(idx, { description: e.target.value })}
                    style={fieldInputStyle}
                  />

                  {/* Quantity */}
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={e => handleUpdateLine(idx, { quantity: Number(e.target.value) })}
                    style={{ ...fieldInputStyle, textAlign: 'center' }}
                  />

                  {/* Unit Price */}
                  <PriceInput
                    value={line.unitPrice}
                    onChange={val => handleUpdateLine(idx, { unitPrice: val })}
                    allowNegative={false}
                  />

                  {/* Total for line */}
                  <div style={{ textAlign: 'end', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                    <Money amount={Number(line.quantity || 1) * Number(line.unitPrice || 0)} />
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                    title={isArabic ? 'حذف البند' : 'Remove Line'}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{isArabic ? 'إجمالي بنود أمر الشغل:' : 'Subtotal:'}</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#2563EB' }}>
                  <Money amount={formSubtotal} />
                </span>
              </div>
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFormData(initialFormState)}
              >
                {isArabic ? 'إعادة تعيين' : 'Reset'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
              >
                {submitting ? (
                  <span>{isArabic ? 'جاري فتح أمر الشغل...' : 'Creating...'}</span>
                ) : (
                  <span>{isArabic ? 'فتح أمر الشغل وحفظ البيانات (معاينة وطباعة)' : 'Open Work Order (Save & Preview)'}</span>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. WORK ORDERS TABLE & FILTERS                                            */}
      {/* ========================================================================= */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        {/* Filters bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: '1 1 300px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
              <Search size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isArabic ? 'right' : 'left']: '12px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder={isArabic ? 'بحث بالعميل، الهاتف، اللوحة، رقم الأمر...' : 'Search customer, phone, plate, WO #...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: isArabic ? '8px 36px 8px 12px' : '8px 12px 8px 36px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="All">{isArabic ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="Pending">{isArabic ? 'قيد الانتظار (Pending)' : 'Pending'}</option>
              <option value="InProgress">{isArabic ? 'قيد التنفيذ (InProgress)' : 'In Progress'}</option>
              <option value="WaitingForParts">{isArabic ? 'انتظار قطع (WaitingForParts)' : 'Waiting for Parts'}</option>
              <option value="Completed">{isArabic ? 'مكتمل (Completed)' : 'Completed'}</option>
              <option value="Invoiced">{isArabic ? 'مفوتر (Invoiced)' : 'Invoiced'}</option>
              <option value="Cancelled">{isArabic ? 'ملغي (Cancelled)' : 'Cancelled'}</option>
            </select>

            {/* Work Type Filter */}
            <select
              value={workTypeFilter}
              onChange={e => setWorkTypeFilter(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="All">{isArabic ? 'كل الأنواع' : 'All Types'}</option>
              <option value="Maintenance">{isArabic ? 'صيانة (فاتورة صيانة)' : 'Maintenance'}</option>
              <option value="Inspection">{isArabic ? 'فحص شامل (فحص سيارة شامل)' : 'Inspection'}</option>
            </select>

            {/* Mechanic Filter */}
            <select
              value={mechanicFilter}
              onChange={e => setMechanicFilter(Number(e.target.value))}
              style={filterSelectStyle}
            >
              <option value={0}>{isArabic ? 'كل الفنيين' : 'All Mechanics'}</option>
              {mechanics.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={tableTh}>{isArabic ? 'رقم الأمر' : 'WO #'}</th>
                <th style={tableTh}>{isArabic ? 'العميل' : 'Customer'}</th>
                <th style={tableTh}>{isArabic ? 'السيارة واللوحة' : 'Car & Plate'}</th>
                <th style={tableTh}>{isArabic ? 'نوع العمل' : 'Work Type'}</th>
                <th style={tableTh}>{isArabic ? 'الحالة' : 'Status'}</th>
                <th style={tableTh}>{isArabic ? 'الإجمالي' : 'Total'}</th>
                <th style={{ ...tableTh, textAlign: 'center' }}>{isArabic ? 'إجراءات ومتابعة' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 10px' }} />
                    {isArabic ? 'جاري تحميل أوامر الشغل...' : 'Loading orders...'}
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ClipboardList size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <p style={{ fontWeight: 600 }}>{isArabic ? 'لا توجد أوامر شغل مطابقة' : 'No matching work orders found'}</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((wo, idx) => (
                  <tr key={wo.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-card-hover)' }}>
                    {/* Order Number & Date */}
                    <td style={tableTd}>
                      <div style={{ fontWeight: 800, color: '#2563EB', fontFamily: 'monospace', fontSize: '14px' }}>
                        {wo.orderNumber || `#${wo.id}`}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(wo.receivedAt || Date.now()).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}
                      </div>
                    </td>

                    {/* Customer */}
                    <td style={tableTd}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{wo.customerName || '—'}</div>
                      {wo.customerPhone && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <span dir="ltr">{wo.customerPhone}</span>
                          <a
                            href={`https://wa.me/20${wo.customerPhone.replace(/^0+/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#25D366' }}
                            title="WhatsApp"
                          >
                            <MessageCircle size={13} />
                          </a>
                        </div>
                      )}
                    </td>

                    {/* Car & Plate */}
                    <td style={tableTd}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span dir="auto">{wo.carPlate || '—'}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {wo.carMake} {wo.carModel} {wo.odometerInKm ? `(${wo.odometerInKm.toLocaleString()} km)` : ''}
                      </div>
                    </td>

                    {/* Work Type Badge */}
                    <td style={tableTd}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: wo.workType === 'Inspection' ? '#FEF3C7' : '#EFF6FF',
                        color: wo.workType === 'Inspection' ? '#B45309' : '#1D4ED8'
                      }}>
                        {wo.workType === 'Inspection' 
                          ? (isArabic ? 'فحص سيارة شامل' : 'Inspection') 
                          : (isArabic ? 'فاتورة صيانة' : 'Maintenance')}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td style={tableTd}>
                      {renderStatusBadge(wo.status, isArabic)}
                    </td>

                    {/* Total Amount */}
                    <td style={{ ...tableTd, fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                      <Money amount={wo.totalAmount} />
                    </td>

                    {/* Actions */}
                    <td style={{ ...tableTd, textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {/* Status progression */}
                        {wo.status === 'Pending' && (
                          <button
                            onClick={() => handleTransition(wo.id, 'InProgress')}
                            style={statusActionBtnStyle('#2563EB')}
                            title={isArabic ? 'بدء العمل' : 'Start'}
                          >
                            <Clock size={13} /> {isArabic ? 'بدء' : 'Start'}
                          </button>
                        )}
                        {wo.status === 'InProgress' && (
                          <button
                            onClick={() => handleTransition(wo.id, 'Completed')}
                            style={statusActionBtnStyle('#16A34A')}
                            title={isArabic ? 'إتمام الشغل' : 'Complete'}
                          >
                            <CheckCircle size={13} /> {isArabic ? 'إتمام' : 'Complete'}
                          </button>
                        )}
                        {wo.status === 'Completed' && (
                          <button
                            onClick={() => {
                              setInvoiceModalWo(wo);
                              setDiscountAmount(0);
                            }}
                            style={statusActionBtnStyle('#9333EA')}
                            title={isArabic ? 'إصدار فاتورة مباشرة' : 'Invoice Directly'}
                          >
                            <FileText size={13} /> {isArabic ? 'إصدار فاتورة' : 'Invoice'}
                          </button>
                        )}

                        {/* Workmanship Lines (Always available while not Invoiced/Delivered) */}
                        {wo.status !== 'Invoiced' && wo.status !== 'Cancelled' && (
                          <button
                            onClick={() => setLinesModalWo(wo)}
                            style={iconBtnStyle('#D97706')}
                            title={isArabic ? 'إدارة بنود ومصنعيات أمر الشغل' : 'Manage Operations & Lines'}
                          >
                            <Wrench size={14} />
                          </button>
                        )}

                        {/* Car History */}
                        {wo.carId && (
                          <button
                            onClick={() => handleOpenCarHistory(wo.carId, `${wo.carMake || ''} ${wo.carModel || ''} (${wo.carPlate || ''})`)}
                            style={iconBtnStyle('#0284C7')}
                            title={isArabic ? 'سجل العمليات السابقة للسيارة' : 'Car Service History'}
                          >
                            <History size={14} />
                          </button>
                        )}

                        {/* Smart Preview / Print */}
                        <button
                          onClick={() => handleSmartPrint(wo)}
                          style={iconBtnStyle('#2563EB')}
                          title={isArabic ? 'معاينة وطباعة المستند الرسمي' : 'Preview & Print'}
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONVERT TO INVOICE MODAL                                               */}
      {/* ========================================================================= */}
      {invoiceModalWo && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {isArabic ? 'إصدار فاتورة لأمر الشغل' : 'Convert to Invoice'} - {invoiceModalWo.orderNumber}
              </h3>
              <button onClick={() => setInvoiceModalWo(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              {isArabic 
                ? 'سيتم إنشاء فاتورة رسمية نهائية لأمر الشغل وإدراجها بدفتر الفواتير والحسابات.' 
                : 'This will lock the work order and generate an official Invoice.'}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={fieldLabelStyle}>{isArabic ? 'خصم (ج.م)' : 'Discount (EGP)'}</label>
              <PriceInput
                value={discountAmount}
                onChange={val => setDiscountAmount(val)}
                allowNegative={false}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setInvoiceModalWo(null)}>
                {isArabic ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button variant="primary" onClick={handleConfirmInvoice}>
                {isArabic ? 'تأكيد إصدار الفاتورة' : 'Confirm Invoice'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. WORKMANSHIP LINES MODAL                                                */}
      {/* ========================================================================= */}
      {linesModalWo && (
        <WorkOrderLinesModal
          workOrder={linesModalWo}
          onClose={() => setLinesModalWo(null)}
          onOrderUpdated={(updatedWo) => {
            setOrders(prev => prev.map(o => o.id === updatedWo.id ? updatedWo : o));
            setLinesModalWo(updatedWo);
          }}
          services={availableServices}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. CAR SERVICE HISTORY MODAL                                              */}
      {/* ========================================================================= */}
      <CarServiceHistoryModal
        isOpen={!!historyCarId}
        onClose={() => setHistoryCarId(null)}
        carId={historyCarId}
        carInfo={historyCarInfo}
      />

      {/* ========================================================================= */}
      {/* 6. DOCUMENT PREVIEW MODAL (USES ASSETS TEMPLATES)                         */}
      {/* ========================================================================= */}
      <InvoicePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        invoiceId={previewInvoiceId}
        inspectionId={previewInspectionId}
        workOrderId={previewWorkOrderId}
        workOrderInvoicePreviewId={previewWorkOrderInvoiceId}
        title={previewTitle}
      />
    </div>
  );
};

// Helper badge renderer
const renderStatusBadge = (status: string, isArabic: boolean) => {
  const configs: Record<string, { bg: string; color: string; labelAr: string; labelEn: string }> = {
    Pending: { bg: '#FEF3C7', color: '#B45309', labelAr: 'قيد الانتظار', labelEn: 'Pending' },
    InProgress: { bg: '#EFF6FF', color: '#1D4ED8', labelAr: 'قيد التنفيذ', labelEn: 'In Progress' },
    WaitingForParts: { bg: '#FFF7ED', color: '#C2410C', labelAr: 'انتظار قطع', labelEn: 'Waiting For Parts' },
    Completed: { bg: '#F0FDF4', color: '#15803D', labelAr: 'مكتمل', labelEn: 'Completed' },
    Delivered: { bg: '#F5F3FF', color: '#6D28D9', labelAr: 'تم التسليم', labelEn: 'Delivered' },
    Invoiced: { bg: '#FAF5FF', color: '#7E22CE', labelAr: 'مفوتر', labelEn: 'Invoiced' },
    Cancelled: { bg: '#FEF2F2', color: '#B91C1C', labelAr: 'ملغي', labelEn: 'Cancelled' }
  };

  const conf = configs[status] || { bg: '#F1F5F9', color: '#475569', labelAr: status, labelEn: status };
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 700,
      background: conf.bg,
      color: conf.color
    }}>
      {isArabic ? conf.labelAr : conf.labelEn}
    </span>
  );
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: 'var(--text-muted)',
  marginBottom: '4px'
};

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-main)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none'
};

const filterSelectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-main)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none'
};

const tableTh: React.CSSProperties = {
  padding: '12px 14px',
  textAlign: 'start',
  fontWeight: 700,
  fontSize: '12px'
};

const tableTd: React.CSSProperties = {
  padding: '12px 14px',
  verticalAlign: 'middle'
};

const statusActionBtnStyle = (color: string): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: '6px',
  border: `1px solid ${color}`,
  backgroundColor: `${color}15`,
  color: color,
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px'
});

const iconBtnStyle = (color: string): React.CSSProperties => ({
  padding: '5px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: color,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center'
});

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '16px'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: '14px',
  width: '100%',
  border: '1px solid var(--border)',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  padding: '20px'
};

export default CustomersAndWorkOrdersPage;
