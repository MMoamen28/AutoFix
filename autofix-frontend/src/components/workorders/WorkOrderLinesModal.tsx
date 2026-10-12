import React, { useState, useEffect } from 'react';
import { WorkOrder, WorkOrderLine, workOrderService } from '../../services/workOrderService';
import Money from '../shared/Money';
import PriceInput from '../shared/PriceInput';
import DraftIndicator from '../shared/DraftIndicator';
import useDraftAutoSave from '../../hooks/useDraftAutoSave';
import { getCurrencyLabel } from '../../i18n/formatters';
import { useTranslation } from 'react-i18next';
import { 
  X, Plus, Edit2, Trash2, Printer, Lock, AlertTriangle, 
  CheckCircle, Wrench, ShieldAlert 
} from 'lucide-react';

interface Props {
  workOrder: WorkOrder;
  onClose: () => void;
  onOrderUpdated: (updated: WorkOrder) => void;
  services: any[];
}

const WorkOrderLinesModal: React.FC<Props> = ({
  workOrder: initialWo,
  onClose,
  onOrderUpdated,
  services
}) => {
  const { t } = useTranslation();
  const [currentWo, setCurrentWo] = useState<WorkOrder>(initialWo);
  const [editingLineId, setEditingLineId] = useState<number | null>(null);

  // Form state for adding/editing a line
  const initialLineState = {
    selectedServiceId: 0,
    description: '',
    quantity: 1,
    unitPrice: 0,
    unitCost: 0,
    revisionReason: ''
  };

  const [lineForm, setLineForm] = useState(initialLineState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isInvoiced = currentWo.status === 'Invoiced';

  const handleRestoreDraft = (draft: any) => {
    setLineForm(prev => ({ ...prev, ...draft }));
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
    formKey: `wo_line_editor_${currentWo.id}`,
    formData: lineForm,
    initialData: initialLineState,
    onRestore: handleRestoreDraft,
    isFormOpen: true
  });

  // Handle service pick from list
  const handleServiceSelect = (serviceId: number) => {
    if (serviceId === 0) {
      setLineForm(prev => ({
        ...prev,
        selectedServiceId: 0
      }));
      return;
    }

    const found = services.find(s => s.id === serviceId);
    if (found) {
      setLineForm(prev => ({
        ...prev,
        selectedServiceId: found.id,
        description: found.nameArabic ? `${found.nameArabic} (${found.name})` : found.name,
        unitPrice: found.basePrice || 0,
        unitCost: found.defaultCost || 0
      }));
    }
  };

  const handleStartEdit = (line: WorkOrderLine) => {
    setEditingLineId(line.id || null);
    setLineForm({
      selectedServiceId: line.serviceId || 0,
      description: line.description || '',
      quantity: line.quantity || 1,
      unitPrice: line.unitPrice || 0,
      unitCost: line.unitCost || 0,
      revisionReason: ''
    });
    setFormError(null);
  };

  const handleCancelEdit = () => {
    setEditingLineId(null);
    setLineForm(initialLineState);
    setFormError(null);
  };

  const handleSaveLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineForm.description.trim()) {
      setFormError('Line description is required.');
      return;
    }
    if (isInvoiced && !lineForm.revisionReason.trim()) {
      setFormError(t('workOrders.revisionReasonPrompt'));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      let updated: WorkOrder;
      if (editingLineId) {
        updated = await workOrderService.updateLine(currentWo.id, editingLineId, {
          lineType: 'LaborManufacturer',
          serviceId: lineForm.selectedServiceId > 0 ? lineForm.selectedServiceId : undefined,
          description: lineForm.description,
          quantity: Number(lineForm.quantity),
          unitPrice: Number(lineForm.unitPrice),
          unitCost: Number(lineForm.unitCost),
          revisionReason: lineForm.revisionReason || undefined
        });
        setSuccessMsg('Workmanship line updated successfully!');
      } else {
        updated = await workOrderService.addLine(currentWo.id, {
          lineType: 'LaborManufacturer',
          serviceId: lineForm.selectedServiceId > 0 ? lineForm.selectedServiceId : undefined,
          description: lineForm.description,
          quantity: Number(lineForm.quantity),
          unitPrice: Number(lineForm.unitPrice),
          unitCost: Number(lineForm.unitCost),
          revisionReason: lineForm.revisionReason || undefined
        });
        setSuccessMsg('Workmanship line added successfully!');
      }

      clearDraft();
      setCurrentWo(updated);
      onOrderUpdated(updated);
      setEditingLineId(null);
      setLineForm(initialLineState);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save workmanship line.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLine = async (line: WorkOrderLine) => {
    if (!line.id) return;
    let reason: string | undefined = undefined;
    if (isInvoiced) {
      const promptReason = window.prompt(`${t('workOrders.revisionReasonPrompt')}\n(Line: ${line.description})`);
      if (promptReason === null) return;
      if (!promptReason.trim()) {
        alert(t('workOrders.revisionReasonPrompt'));
        return;
      }
      reason = promptReason.trim();
    } else {
      if (!window.confirm(`Are you sure you want to remove line "${line.description}"?`)) return;
    }

    try {
      const updated = await workOrderService.deleteLine(currentWo.id, line.id, reason);
      setCurrentWo(updated);
      onOrderUpdated(updated);
      setSuccessMsg('Line removed successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove line.');
    }
  };

  // Classify lines
  const allLines = currentWo.lines || [];
  const workmanshipLines = allLines.filter(l => 
    l.lineType === 'LaborManufacturer' || l.lineType?.startsWith('Labor')
  );
  const otherLines = allLines.filter(l => 
    l.lineType !== 'LaborManufacturer' && !l.lineType?.startsWith('Labor')
  );

  const workmanshipSubtotal = workmanshipLines.reduce((sum, l) => sum + (l.subtotal ?? (l.quantity * l.unitPrice)), 0);
  const partsSubtotal = otherLines.reduce((sum, l) => sum + (l.subtotal ?? (l.quantity * l.unitPrice)), 0);

  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wrench size={22} color="var(--accent)" />
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                {currentWo.orderNumber} - {t('workOrders.workmanshipSection')}
              </h2>
              <span style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                textTransform: 'uppercase',
                backgroundColor: isInvoiced ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isInvoiced ? '#8b5cf6' : '#10b981'
              }}>
                {currentWo.status}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
              Customer: <strong>{currentWo.customerName}</strong> | Vehicle: <strong>{currentWo.carMake} {currentWo.carModel} ({currentWo.carPlate})</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => window.open(workOrderService.getPrintUrl(currentWo.id), '_blank')}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                color: 'white', padding: '6px 12px', borderRadius: '6px',
                cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px'
              }}
              title="Print Order"
            >
              <Printer size={14} /> {t('common.print')}
            </button>
            <button 
              onClick={onClose} 
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Locked Order Notice */}
        {isInvoiced && (
          <div style={{
            backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', color: '#f59e0b',
            padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px'
          }}>
            <Lock size={18} />
            <span>
              <strong>{t('workOrders.lockedOrder')}:</strong> Lines are locked because an invoice has been issued. Any addition, edit, or removal requires a revision reason and is permanently recorded in the audit log.
            </span>
          </div>
        )}

        {/* Feedback banners */}
        {successMsg && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981',
            padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'
          }}>
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        {/* WORKMANSHIP SECTION */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {t('workOrders.workmanshipSection')} (مصنعية)
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                ({workmanshipLines.length} {workmanshipLines.length === 1 ? 'item' : 'items'})
              </span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981' }}>
              {t('workOrders.workmanshipSubtotal')}: <Money value={workmanshipSubtotal} style={{ color: '#10b981' }} />
            </div>
          </div>

          {/* Workmanship Lines Table */}
          {workmanshipLines.length === 0 ? (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No workmanship lines added yet. Add one below.
            </div>
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border)', overflowX: 'auto', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 700 }}>#</th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 700 }}>{t('workOrders.lineDescription')}</th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>{t('workOrders.lineQuantity')}</th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 700 }}>{t('workOrders.linePrice')}</th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 700 }}>{t('workOrders.lineCost')}</th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 700 }}>{t('workOrders.lineTotal')}</th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workmanshipLines.map((line, idx) => (
                    <tr key={line.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }} dir="auto">
                        {line.description}
                        {line.serviceName && line.serviceName !== line.description && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                            Ref: {line.serviceName}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{line.quantity}</td>
                      <td style={{ padding: '10px 12px' }}><Money value={line.unitPrice} /></td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {line.unitCost && line.unitCost > 0 ? <Money value={line.unitCost} /> : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#10b981' }}>
                        <Money value={line.subtotal ?? (line.quantity * line.unitPrice)} />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => handleStartEdit(line)}
                            style={{
                              background: 'transparent', border: '1px solid #3b82f6',
                              color: '#3b82f6', padding: '4px 8px', borderRadius: '4px',
                              cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                            title="Edit Line"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteLine(line)}
                            style={{
                              background: 'transparent', border: '1px solid #ef4444',
                              color: '#ef4444', padding: '4px 8px', borderRadius: '4px',
                              cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                            title="Remove Line"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add / Edit Workmanship Line Form */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                {editingLineId ? 'Edit Workmanship Line (تعديل البند)' : t('workOrders.addWorkmanshipLine')}
              </span>
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
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveLine} onBlur={handleBlur} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Service Quick Picker */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={miniLabelStyle}>{t('workOrders.servicePicker')}:</label>
                  <select
                    value={lineForm.selectedServiceId}
                    onChange={e => handleServiceSelect(Number(e.target.value))}
                    style={inputStyle}
                  >
                    <option value={0}>-- {t('workOrders.customService')} --</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nameArabic ? `${s.nameArabic} (${s.name})` : s.name} - {s.basePrice} L.E
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={miniLabelStyle}>{t('workOrders.lineDescription')} *:</label>
                  <input
                    type="text"
                    dir="auto"
                    value={lineForm.description}
                    onChange={e => setLineForm({ ...lineForm, description: e.target.value })}
                    placeholder="e.g. تغيير تيل فرامل أمامي / Front brake pads..."
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Price, Qty, Cost & Line Subtotal */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1.5fr', gap: '10px', alignItems: 'flex-end' }}>
                <div>
                  <label style={miniLabelStyle}>{t('workOrders.lineQuantity')}:</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={lineForm.quantity}
                    onChange={e => setLineForm({ ...lineForm, quantity: Math.max(1, Number(e.target.value)) })}
                    style={inputStyle}
                    required
                  />
                </div>

                <div>
                  <PriceInput
                    label={`${t('workOrders.linePrice')} (${getCurrencyLabel()}):`}
                    value={lineForm.unitPrice}
                    onChange={val => setLineForm({ ...lineForm, unitPrice: val })}
                    allowNegative={false}
                  />
                </div>

                <div>
                  <PriceInput
                    label={`${t('workOrders.lineCost')} (${getCurrencyLabel()} - Optional):`}
                    value={lineForm.unitCost}
                    onChange={val => setLineForm({ ...lineForm, unitCost: val })}
                    allowNegative={false}
                  />
                </div>

                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{t('workOrders.lineTotal')}:</span>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: '#10b981' }}>
                    <Money value={lineForm.quantity * lineForm.unitPrice} style={{ color: '#10b981' }} />
                  </span>
                </div>
              </div>

              {/* Revision reason if invoiced */}
              {isInvoiced && (
                <div>
                  <label style={{ ...miniLabelStyle, color: '#f59e0b' }}>
                    * {t('workOrders.revisionReasonPrompt')}:
                  </label>
                  <input
                    type="text"
                    value={lineForm.revisionReason}
                    onChange={e => setLineForm({ ...lineForm, revisionReason: e.target.value })}
                    placeholder="e.g. Additional workmanship authorized by customer / corrected labor rate"
                    style={{ ...inputStyle, borderColor: '#f59e0b' }}
                    required
                  />
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                {editingLineId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', color: 'white', borderRadius: '6px', fontSize: '12px' }}
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 18px', background: 'var(--accent)', color: 'white', border: 'none',
                    borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Plus size={15} />
                  {isSubmitting ? 'Saving...' : editingLineId ? 'Save Changes' : t('workOrders.addWorkmanshipLine')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* PARTS & OTHER ITEMS SECTION (IF ANY) */}
        {otherLines.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Parts & Materials (قطع الغيار والخامات)
              </h3>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>
                {t('workOrders.partsSubtotal')}: <Money value={partsSubtotal} />
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Description</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Price</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {otherLines.map((line, idx) => (
                    <tr key={line.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 12px' }}>{line.description}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{line.quantity}</td>
                      <td style={{ padding: '8px 12px' }}><Money value={line.unitPrice} /></td>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}><Money value={line.subtotal ?? (line.quantity * line.unitPrice)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FINANCIAL SUMMARY TOTALS */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
        }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>
                {t('workOrders.workmanshipSubtotal')}:
              </span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>
                <Money value={workmanshipSubtotal} style={{ color: '#10b981' }} />
              </span>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>
                {t('workOrders.partsSubtotal')}:
              </span>
              <span style={{ fontSize: '16px', fontWeight: 800 }}>
                <Money value={partsSubtotal} />
              </span>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>
                {t('workOrders.grandTotal')}:
              </span>
              <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--accent)' }}>
                <Money value={workmanshipSubtotal + partsSubtotal} style={{ color: 'var(--accent)' }} />
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '8px 24px', background: 'var(--border)', color: 'white',
              border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer'
            }}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.75)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 1000,
  padding: '16px'
};

const modalBox: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '12px',
  padding: '24px',
  width: '840px',
  maxWidth: '96%',
  border: '1px solid var(--border)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  maxHeight: '92vh',
  overflowY: 'auto'
};

const miniLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px'
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: '6px',
  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
  color: 'white', fontSize: '13px'
};

export default WorkOrderLinesModal;
