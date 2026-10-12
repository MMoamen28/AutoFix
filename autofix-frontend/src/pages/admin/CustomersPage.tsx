import React, { useState, useEffect } from 'react';
import { customerService } from '../../services/customerService';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';
import Table from '../../components/shared/Table';
import Modal from '../../components/shared/Modal';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import { User, Phone, Plus, Trash2, RotateCcw, AlertTriangle, Car, Search, Archive } from 'lucide-react';
import useDraftAutoSave from '../../hooks/useDraftAutoSave';
import DraftIndicator from '../../components/shared/DraftIndicator';
import { useTranslation } from 'react-i18next';

const CustomersPage: React.FC<{ openModal?: boolean }> = ({ openModal = false }) => {
  const { showToast } = useToast();
  const { role } = useAuth();
  const { t } = useTranslation();

  // List State
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  // Quick-Add Modal State
  const [showQuickAdd, setShowQuickAdd] = useState(openModal);
  const [submitting, setSubmitting] = useState(false);

  // Quick-Add Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [extraPhone, setExtraPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Car Fields
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('Corolla');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [licensePlate, setLicensePlate] = useState('');
  const [vin, setVin] = useState('');
  const [color, setColor] = useState('');
  const [odometerKm, setOdometerKm] = useState<number>(0);
  const [carNotes, setCarNotes] = useState('');

  // Duplicate Warning Modal State
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const initialFormData = {
    fullName: '',
    phone: '',
    customerNotes: '',
    make: 'Toyota',
    model: 'Corolla',
    year: new Date().getFullYear(),
    licensePlate: '',
    odometerKm: 0,
    carNotes: ''
  };

  const currentFormData = {
    fullName,
    phone,
    customerNotes,
    make,
    model,
    year,
    licensePlate,
    odometerKm,
    carNotes
  };

  const handleRestoreDraft = (draft: any) => {
    if (!draft) return;
    if (draft.fullName !== undefined) setFullName(draft.fullName);
    if (draft.phone !== undefined) setPhone(draft.phone);
    if (draft.customerNotes !== undefined) setCustomerNotes(draft.customerNotes);
    if (draft.make !== undefined) setMake(draft.make);
    if (draft.model !== undefined) setModel(draft.model);
    if (draft.year !== undefined) setYear(draft.year);
    if (draft.licensePlate !== undefined) setLicensePlate(draft.licensePlate);
    if (draft.odometerKm !== undefined) setOdometerKm(draft.odometerKm);
    if (draft.carNotes !== undefined) setCarNotes(draft.carNotes);
  };

  const {
    lastSavedTime,
    isSaving,
    hasDraftAvailable,
    draftUpdatedAt,
    restoreDraft,
    discardDraft,
    clearDraft,
    handleBlur
  } = useDraftAutoSave({
    formKey: 'quick_add_customer',
    formData: currentFormData,
    initialData: initialFormData,
    onRestore: handleRestoreDraft,
    isFormOpen: showQuickAdd
  });

  useEffect(() => {
    fetchCustomers();
  }, [includeArchived]);

  const fetchCustomers = async (search?: string) => {
    setLoading(true);
    try {
      const q = search !== undefined ? search : searchQuery;
      let data;
      if (q.trim()) {
        data = await customerService.searchCustomers(q, includeArchived);
      } else {
        data = await customerService.getAllCustomers(includeArchived);
      }
      setCustomers(data);
    } catch (err: any) {
      showToast('Could not fetch customer records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(searchQuery);
  };

  const handleQuickAddSubmit = async (e?: React.FormEvent, allowDuplicateOverride = false) => {
    if (e) e.preventDefault();
    setSubmitting(true);

    const payload = {
      fullName,
      phone,
      customerNotes,
      allowDuplicatePhone: allowDuplicateOverride,
      make,
      model,
      year: Number(year),
      licensePlate,
      currentOdometerKm: Number(odometerKm),
      carNotes,
      allowDuplicateCar: allowDuplicateOverride
    };

    try {
      await customerService.quickAdd(payload);
      await clearDraft();
      showToast('Customer & vehicle onboarded successfully!', 'success');
      setShowQuickAdd(false);
      setDuplicateWarning(null);
      resetForm();
      fetchCustomers();
    } catch (err: any) {
      if (err.response?.status === 409 && (err.response?.data?.isDuplicateWarning || err.response?.data?.message?.includes('Duplicate'))) {
        setDuplicateWarning(err.response.data.message || 'Duplicate detected for customer phone or vehicle plate.');
      } else {
        showToast(err.response?.data?.message ?? 'Validation failed', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName(''); setPhone(''); setCustomerNotes('');
    setMake('Toyota'); setModel('Corolla'); setYear(new Date().getFullYear());
    setLicensePlate(''); setOdometerKm(0); setCarNotes('');
    setDuplicateWarning(null);
  };

  const handleArchive = async (id: number, name: string) => {
    if (!window.confirm(`Archive customer "${name}"?\nAll history (work orders, invoices) will be safely kept in the system.`)) return;
    try {
      await customerService.archiveCustomer(id);
      showToast(`Customer "${name}" has been archived`, 'success');
      fetchCustomers();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Cannot archive customer with active in-progress orders', 'error');
    }
  };

  const handleRestore = async (id: number, name: string) => {
    try {
      await customerService.restoreCustomer(id);
      showToast(`Customer "${name}" restored successfully`, 'success');
      fetchCustomers();
    } catch (err: any) {
      showToast('Failed to restore customer', 'error');
    }
  };

  const columns = [
    { 
      header: t('customers.tableRef'), 
      key: 'id', 
      width: '90px', 
      render: (c: any) => (
        <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>
          #{c.id}
        </span>
      ) 
    },
    { 
      header: t('customers.tableDetails'), 
      key: 'fullName', 
      render: (c: any) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>{c.fullName}</span>
            {c.isDeleted && <Badge variant="warning">{t('common.archived')}</Badge>}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '10px', marginTop: '2px' }}>
            <span><Phone size={11} style={{ display: 'inline', marginInlineEnd: '3px' }} />{c.phone}</span>
            {c.extraPhone && <span>/ {c.extraPhone}</span>}
          </div>
        </div>
      ) 
    },
    { 
      header: t('customers.tableVehicles'), 
      key: 'cars', 
      render: (c: any) => (
        <div>
          {(!c.cars || c.cars.length === 0) ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{t('customers.noVehicles')}</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {c.cars.map((car: any) => (
                <div key={car.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <Car size={13} color="var(--primary)" />
                  <strong>{car.make} {car.model}</strong> ({car.licensePlate})
                  <span style={{ color: 'var(--text-muted)' }}>{car.currentOdometerKm.toLocaleString()} km</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) 
    },
    { 
      header: 'Onboarded At', 
      key: 'createdAt', 
      width: '130px', 
      render: (c: any) => (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {new Date(c.createdAt).toLocaleDateString()}
        </span>
      ) 
    },
    {
      header: t('customers.tableActions'),
      key: 'actions',
      width: '120px',
      render: (c: any) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {c.isDeleted ? (
            <Button variant="secondary" onClick={() => handleRestore(c.id, c.fullName)} title={t('common.restore')}>
              <RotateCcw size={14} style={{ marginInlineEnd: '4px' }} /> {t('common.restore')}
            </Button>
          ) : (
            <Button variant="danger" onClick={() => handleArchive(c.id, c.fullName)} title={t('common.archive')}>
              <Archive size={14} style={{ marginInlineEnd: '4px' }} /> {t('common.archive')}
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>{t('customers.title')}</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            {t('customers.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', background: 'var(--card-bg)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <input 
              type="checkbox" 
              checked={includeArchived} 
              onChange={e => setIncludeArchived(e.target.checked)} 
            />
            {t('customers.showArchived')}
          </label>

          <Button variant="primary" onClick={() => { resetForm(); setShowQuickAdd(true); }}>
            <Plus size={16} style={{ marginInlineEnd: '6px' }} /> {t('customers.quickAddBtn')}
          </Button>
        </div>
      </div>

      {/* Fast Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', insetInlineStart: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            placeholder={t('customers.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px' }}
          />
        </div>
        <Button type="submit" variant="secondary">{t('common.search')}</Button>
        {searchQuery && (
          <Button type="button" variant="secondary" onClick={() => { setSearchQuery(''); fetchCustomers(''); }}>{t('common.reset')}</Button>
        )}
      </form>

      {/* Customers Table */}
      <Table 
        columns={columns} 
        data={customers} 
        isLoading={loading} 
        emptyMessage="No customer records found matching search criteria." 
      />

      {/* Quick-Add Customer + Car Modal */}
      {showQuickAdd && (
        <Modal 
          isOpen={showQuickAdd} 
          onClose={() => setShowQuickAdd(false)} 
          title={t('customers.modalTitle')}
        >
          <form onSubmit={e => handleQuickAddSubmit(e, false)} onBlur={handleBlur}>
            <DraftIndicator
              lastSavedTime={lastSavedTime}
              isSaving={isSaving}
              hasDraftAvailable={hasDraftAvailable}
              draftUpdatedAt={draftUpdatedAt}
              onRestore={restoreDraft}
              onDiscard={discardDraft}
            />
            <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                {t('customers.customerSection')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <Input label={t('customers.fullName')} value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="e.g. Tarek Mansour" />
                <Input label={t('customers.mobilePhone')} value={phone} onChange={e => setPhone(e.target.value)} required placeholder="e.g. 01012345678" />
                <div style={{ gridColumn: 'span 2' }}>
                  <Input label={t('customers.customerNotes')} value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} placeholder="Notes, preferences..." />
                </div>
              </div>

              <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                {t('customers.vehicleSection')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <Input label={t('customers.make')} value={make} onChange={e => setMake(e.target.value)} required placeholder="e.g. Toyota" />
                <Input label={t('customers.model')} value={model} onChange={e => setModel(e.target.value)} required placeholder="e.g. Corolla" />
                <Input label={t('customers.year')} type="number" value={year} onChange={e => setYear(Number(e.target.value))} required />
                <Input label={t('customers.plateNumber')} value={licensePlate} onChange={e => setLicensePlate(e.target.value)} required placeholder="e.g. س ل م 1 2 3" />
                <Input label={t('customers.odometer')} type="number" value={odometerKm} onChange={e => setOdometerKm(Number(e.target.value))} placeholder="e.g. 45000" />
                <Input label={t('customers.carNotes')} value={carNotes} onChange={e => setCarNotes(e.target.value)} placeholder="Notes, trim, scratches..." />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <Button type="button" variant="secondary" onClick={() => setShowQuickAdd(false)}>{t('common.cancel')}</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? t('common.saving') : t('customers.submitBtn')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Duplicate Warning Dialog with Continue Anyway button */}
      {duplicateWarning && (
        <Modal 
          isOpen={!!duplicateWarning} 
          onClose={() => setDuplicateWarning(null)} 
          title={t('customers.duplicateWarningTitle')}
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <AlertTriangle size={48} color="#eab308" style={{ marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 10px 0', fontSize: '17px', fontWeight: 800 }}>{t('customers.duplicateWarningTitle')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6, background: 'rgba(234, 179, 8, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
              {duplicateWarning}
            </p>
            <p style={{ fontSize: '13px', marginTop: '12px' }}>
              {t('customers.duplicateWarningPrompt')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
              <Button variant="secondary" onClick={() => setDuplicateWarning(null)}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" onClick={() => handleQuickAddSubmit(undefined, true)}>
                {t('common.continueAnyway')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomersPage;
