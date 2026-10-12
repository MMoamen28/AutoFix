import React, { useState, useEffect } from 'react';
import { mechanicService, MechanicDto, MechanicWorkHistory } from '../../services/mechanicService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { 
  UserPlus, Wrench, Phone, FileText, CheckCircle, 
  XCircle, History, Archive, RotateCcw, Calendar, Car, Search
} from 'lucide-react';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import Modal from '../../components/shared/Modal';
import { useTranslation } from 'react-i18next';
import { formatDate, formatCurrency } from '../../i18n/formatters';

const MechanicsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<MechanicDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fast Add Staff Form state (Takes < 10 seconds)
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Profile / Work History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<MechanicDto | null>(null);
  const [historyData, setHistoryData] = useState<MechanicWorkHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchMechanics();
  }, [includeArchived]);

  const fetchMechanics = () => {
    setLoading(true);
    mechanicService.getAll(includeArchived)
      .then(setData)
      .catch(err => {
        toast.error(err.response?.data?.message ?? 'Failed to load mechanics');
      })
      .finally(() => setLoading(false));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Mechanic full name is required');
      return;
    }

    setSubmitting(true);
    try {
      await mechanicService.create({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        isActive
      });
      setFullName('');
      setPhone('');
      setNotes('');
      setIsActive(true);
      toast.success('Mechanic staff record created successfully! / تم إضافة الفني بنجاح');
      fetchMechanics();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error creating mechanic');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (m: MechanicDto) => {
    if (!window.confirm(`Archive mechanic "${m.fullName || m.firstName}"?\nAll assignment history on work orders will remain intact.`)) return;
    try {
      await mechanicService.archive(m.id);
      toast.success(`Mechanic "${m.fullName || m.firstName}" archived successfully`);
      fetchMechanics();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to archive mechanic');
    }
  };

  const handleRestore = async (m: MechanicDto) => {
    try {
      await mechanicService.restore(m.id);
      toast.success(`Mechanic "${m.fullName || m.firstName}" restored successfully`);
      fetchMechanics();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to restore mechanic');
    }
  };

  const openWorkHistory = async (m: MechanicDto) => {
    setSelectedMechanic(m);
    setDateFrom('');
    setDateTo('');
    setHistoryModalOpen(true);
    await loadHistory(m.id);
  };

  const loadHistory = async (id: number, from?: string, to?: string) => {
    setHistoryLoading(true);
    try {
      const history = await mechanicService.getWorkHistory(id, { from, to });
      setHistoryData(history);
    } catch (err: any) {
      toast.error('Failed to load mechanic history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFilterHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMechanic) {
      loadHistory(selectedMechanic.id, dateFrom || undefined, dateTo || undefined);
    }
  };

  const handleResetFilter = () => {
    setDateFrom('');
    setDateTo('');
    if (selectedMechanic) {
      loadHistory(selectedMechanic.id);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wrench className="text-primary" size={26} />
            {t('mechanics.title')}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            {t('mechanics.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={e => setIncludeArchived(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
            />
            {t('mechanics.showArchived')}
          </label>
        </div>
      </div>

      {/* Quick Add Mechanic Staff Form */}
      <div style={{ 
        background: 'var(--card-bg, #1e293b)', 
        border: '1px solid var(--border, #334155)', 
        borderRadius: '12px', 
        padding: '20px', 
        marginBottom: '28px' 
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={18} color="var(--primary, #3b82f6)" />
          {t('mechanics.quickAddTitle')}
        </h2>

        <form onSubmit={handleAddSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div>
              <Input
                label={t('mechanics.fullName')}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Mahmoud Mostafa"
                required
              />
            </div>

            <div>
              <Input
                label={t('mechanics.phone')}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 01012345678"
              />
            </div>

            <div>
              <Input
                label={t('mechanics.notes')}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Mechanical specialist, transmission"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                />
                {t('mechanics.active')}
              </label>

              <Button type="submit" variant="primary" disabled={submitting} style={{ flex: 1 }}>
                {submitting ? t('common.saving') : t('mechanics.addBtn')}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Mechanics Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '48px', 
          background: 'var(--card-bg, #1e293b)', 
          border: '1px solid var(--border, #334155)', 
          borderRadius: '12px' 
        }}>
          <Wrench size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted)' }}>
            {t('mechanics.noHistory')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {data.map(m => {
            const isStaffActive = m.isActive && !m.isDeleted;
            const displayName = m.fullName || `${m.firstName} ${m.lastName}`.trim();
            return (
              <div
                key={m.id}
                style={{
                  background: 'var(--card-bg, #1e293b)',
                  border: `1px solid ${isStaffActive ? 'var(--border, #334155)' : '#ef4444'}`,
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                      {displayName}
                    </h3>
                    {m.phone && (
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} /> <span className="ltr-text">{m.phone}</span>
                      </p>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: isStaffActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isStaffActive ? '#10b981' : '#ef4444'
                    }}
                  >
                    {isStaffActive ? t('common.active') : t('common.archived')}
                  </span>
                </div>

                {m.notes && (
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                    {m.notes}
                  </p>
                )}

                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  marginTop: 'auto', 
                  paddingTop: '12px', 
                  borderTop: '1px solid var(--border, #334155)' 
                }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openWorkHistory(m)}
                    style={{ flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <History size={14} />
                    {t('mechanics.workHistory')}
                  </Button>

                  {m.isDeleted ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleRestore(m)}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title={t('common.restore')}
                    >
                      <RotateCcw size={14} />
                      {t('common.restore')}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleArchive(m)}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}
                      title={t('common.archive')}
                    >
                      <Archive size={14} />
                      {t('common.archive')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mechanic Work History Profile Modal */}
      {historyModalOpen && selectedMechanic && (
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title={`${t('mechanics.profile')}: ${selectedMechanic.fullName || selectedMechanic.firstName}`}
        >
          <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '6px' }}>
            {/* Header info */}
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.08)', 
              border: '1px solid rgba(59, 130, 246, 0.2)', 
              borderRadius: '8px', 
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>{selectedMechanic.fullName || selectedMechanic.firstName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('mechanics.phone')}: <span className="ltr-text">{selectedMechanic.phone || '—'}</span></div>
              </div>

              <div style={{ textAlign: 'start' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('mechanics.workHistory')}: </span>
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{historyData?.totalOrdersWorked ?? 0}</span>
              </div>
            </div>

            {/* Date filter form */}
            <form onSubmit={handleFilterHistory} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  {t('mechanics.filterFrom')}
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  {t('mechanics.filterTo')}
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                />
              </div>

              <Button type="submit" variant="primary" style={{ padding: '8px 16px' }}>
                {t('mechanics.filterBtn')}
              </Button>

              {(dateFrom || dateTo) && (
                <Button type="button" variant="secondary" onClick={handleResetFilter} style={{ padding: '8px 12px' }}>
                  {t('common.reset')}
                </Button>
              )}
            </form>

            {/* Work orders table */}
            {historyLoading ? (
              <LoadingSpinner />
            ) : !historyData || historyData.workOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                {t('mechanics.noHistory')}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'start' }}>
                    <th style={{ padding: '8px' }}>{t('common.date')}</th>
                    <th style={{ padding: '8px' }}>{t('mechanics.orderNum')}</th>
                    <th style={{ padding: '8px' }}>{t('mechanics.car')}</th>
                    <th style={{ padding: '8px' }}>{t('mechanics.role')}</th>
                    <th style={{ padding: '8px' }}>{t('mechanics.orderStatus')}</th>
                    <th style={{ padding: '8px', textAlign: 'end' }}>{t('common.details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.workOrders.map(wo => (
                    <tr key={wo.workOrderId} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                        {formatDate(wo.date)}
                      </td>
                      <td style={{ padding: '8px', fontWeight: 700 }}>
                        {wo.orderNumber}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div className="plate-badge">{wo.carPlate}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{wo.carDescription}</div>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          background: wo.role === 'Main' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                          color: wo.role === 'Main' ? '#60a5fa' : '#c084fc'
                        }}>
                          {wo.role === 'Main' ? t('mechanics.roleMain') : t('mechanics.roleHelper')}
                        </span>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>{wo.status}</span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'end', fontWeight: 700 }}>
                        {formatCurrency(wo.totalAmount, i18n.language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MechanicsPage;
