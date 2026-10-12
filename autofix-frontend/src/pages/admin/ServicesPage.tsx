import React, { useState, useEffect } from 'react';
import { serviceService } from '../../services/serviceService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Money from '../../components/shared/Money';
import PriceInput from '../../components/shared/PriceInput';
import { getCurrencyLabel } from '../../i18n/formatters';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Archive, RotateCcw, X, Layers, Search, CheckCircle, AlertCircle } from 'lucide-react';

interface ServiceItem {
  id: number;
  name: string;
  nameArabic?: string;
  basePrice: number;
  defaultCost?: number;
  category?: string;
  isActive: boolean;
  isDeleted?: boolean;
}

const ServicesPage: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formNameArabic, setFormNameArabic] = useState('');
  const [formBasePrice, setFormBasePrice] = useState<number>(0);
  const [formDefaultCost, setFormDefaultCost] = useState<number>(0);
  const [formCategory, setFormCategory] = useState('General');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, [showArchived]);

  const fetchServices = () => {
    setLoading(true);
    setError(null);
    serviceService.getAll(showArchived)
      .then(res => setData(res))
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load workmanship price list'))
      .finally(() => setLoading(false));
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormNameArabic('');
    setFormBasePrice(0);
    setFormDefaultCost(0);
    setFormCategory('General');
    setFormIsActive(true);
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: ServiceItem) => {
    setEditingItem(item);
    setFormName(item.name || '');
    setFormNameArabic(item.nameArabic || '');
    setFormBasePrice(item.basePrice || 0);
    setFormDefaultCost(item.defaultCost || 0);
    setFormCategory(item.category || 'General');
    setFormIsActive(item.isActive !== false);
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName && !formNameArabic) {
      setSubmitError('Please provide at least an English or Arabic service name.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        name: formName || formNameArabic,
        nameArabic: formNameArabic || formName,
        basePrice: Number(formBasePrice),
        defaultCost: Number(formDefaultCost),
        category: formCategory || 'General',
        isActive: formIsActive
      };

      if (editingItem) {
        await serviceService.update(editingItem.id, payload);
      } else {
        await serviceService.create(payload);
      }

      setNotification(t('workmanshipPrices.saveSuccess'));
      setTimeout(() => setNotification(null), 3000);
      setModalOpen(false);
      fetchServices();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message ?? 'Error saving workmanship service.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (item: ServiceItem) => {
    if (!window.confirm(`${t('workmanshipPrices.archiveConfirm')}\n${item.nameArabic || item.name}`)) return;
    try {
      await serviceService.archive(item.id);
      setNotification(t('workmanshipPrices.archiveSuccess'));
      setTimeout(() => setNotification(null), 3000);
      fetchServices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to archive service.');
    }
  };

  const handleRestore = async (item: ServiceItem) => {
    if (!window.confirm(`${t('workmanshipPrices.restoreConfirm')}\n${item.nameArabic || item.name}`)) return;
    try {
      await serviceService.restore(item.id);
      setNotification('Service restored successfully!');
      setTimeout(() => setNotification(null), 3000);
      fetchServices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to restore service.');
    }
  };

  const filteredData = data.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.nameArabic?.toLowerCase().includes(term) ||
      s.category?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={28} color="var(--accent)" />
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>
              {t('workmanshipPrices.title')}
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '6px 0 0' }}>
            {t('workmanshipPrices.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={e => setShowArchived(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            {t('workmanshipPrices.showArchived')}
          </label>

          <button
            onClick={handleOpenAdd}
            style={{
              background: 'var(--accent)', color: 'white', border: 'none',
              padding: '10px 18px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
            }}
          >
            <Plus size={18} /> {t('workmanshipPrices.addNew')}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981',
          padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <CheckCircle size={18} /> {notification}
        </div>
      )}

      {/* Search Bar */}
      <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '400px' }}>
        <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', top: '12px', left: '12px' }} />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search Arabic, English or category..."
          style={{
            width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px',
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'white', fontSize: '14px'
          }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <LoadingSpinner />
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('workmanshipPrices.noServices')}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 700 }}>{t('workmanshipPrices.nameAr')}</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 700 }}>{t('workmanshipPrices.nameEn')}</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 700 }}>{t('workmanshipPrices.category')}</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 700 }}>{t('workmanshipPrices.defaultPrice')}</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 700 }}>{t('workmanshipPrices.defaultCost')}</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 700 }}>{t('workmanshipPrices.status')}</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>{t('workmanshipPrices.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => (
                <tr 
                  key={item.id} 
                  style={{ 
                    borderBottom: '1px solid var(--border)',
                    opacity: item.isDeleted ? 0.6 : 1,
                    backgroundColor: item.isDeleted ? 'rgba(0,0,0,0.2)' : 'transparent'
                  }}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '15px' }} dir="auto">
                    {item.nameArabic || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {item.name}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '12px',
                      background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)'
                    }}>
                      {item.category || 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 800, color: '#10b981' }}>
                    <Money value={item.basePrice} />
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {item.defaultCost && item.defaultCost > 0 ? (
                      <Money value={item.defaultCost} />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {item.isDeleted ? (
                      <span style={{
                        padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                        backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444'
                      }}>
                        {t('workmanshipPrices.archived')}
                      </span>
                    ) : item.isActive ? (
                      <span style={{
                        padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                        backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981'
                      }}>
                        {t('workmanshipPrices.active')}
                      </span>
                    ) : (
                      <span style={{
                        padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                        backgroundColor: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af'
                      }}>
                        {t('workmanshipPrices.inactive')}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6',
                          color: '#3b82f6', padding: '6px 10px', borderRadius: '6px',
                          cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}
                        title={t('common.edit')}
                      >
                        <Edit2 size={13} /> {t('common.edit')}
                      </button>

                      {item.isDeleted ? (
                        <button
                          onClick={() => handleRestore(item)}
                          style={{
                            background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981',
                            color: '#10b981', padding: '6px 10px', borderRadius: '6px',
                            cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}
                          title={t('workmanshipPrices.restoreBtn')}
                        >
                          <RotateCcw size={13} /> {t('workmanshipPrices.restoreBtn')}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchive(item)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
                            color: '#ef4444', padding: '6px 10px', borderRadius: '6px',
                            cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}
                          title={t('workmanshipPrices.archiveBtn')}
                        >
                          <Archive size={13} /> {t('workmanshipPrices.archiveBtn')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', width: '520px', maxWidth: '90%',
            border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                {editingItem ? t('workmanshipPrices.editService') : t('workmanshipPrices.addNew')}
              </h2>
              <button 
                onClick={() => setModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {submitError && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                  {submitError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {t('workmanshipPrices.nameAr')} *
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={formNameArabic}
                  onChange={e => setFormNameArabic(e.target.value)}
                  placeholder="مثال: تغيير تيل فرامل، تغيير زيت وفلتر..."
                  required
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '6px',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                    color: 'white', fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {t('workmanshipPrices.nameEn')} *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Brake pads replacement, Oil change..."
                  required
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '6px',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                    color: 'white', fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <PriceInput
                    label={`${t('workmanshipPrices.defaultPrice')} (${getCurrencyLabel()}):`}
                    value={formBasePrice}
                    onChange={val => setFormBasePrice(val)}
                    allowNegative={false}
                  />
                </div>
                <div>
                  <PriceInput
                    label={`${t('workmanshipPrices.defaultCost')} (${getCurrencyLabel()} - Optional):`}
                    value={formDefaultCost}
                    onChange={val => setFormDefaultCost(val)}
                    allowNegative={false}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {t('workmanshipPrices.category')}:
                </label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '6px',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                    color: 'white', fontSize: '14px'
                  }}
                >
                  <option value="General">General (عام)</option>
                  <option value="Brakes">Brakes (فرامل)</option>
                  <option value="Maintenance">Maintenance (صيانة دورية)</option>
                  <option value="AC">Air Conditioning (تكييف)</option>
                  <option value="Electrical">Electrical (كهرباء)</option>
                  <option value="Engine">Engine (محرك)</option>
                  <option value="Suspension">Suspension (عفشة ونظام تعليق)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="formIsActive"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="formIsActive" style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>
                  {t('workmanshipPrices.active')} ({t('workmanshipPrices.status')})
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '8px 16px', background: 'transparent',
                    border: '1px solid var(--border)', color: 'white',
                    borderRadius: '6px', cursor: 'pointer'
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 22px', background: 'var(--accent)',
                    color: 'white', border: 'none', borderRadius: '6px',
                    fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;
