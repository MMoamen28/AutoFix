import React, { useEffect, useState } from 'react';
import { workOrderService, WorkOrder } from '../../services/workOrderService';
import { 
  ClipboardList, Plus, Clock, Wrench, CheckCircle, 
  Truck, FileText, AlertCircle, RefreshCw, X, Printer, UserCheck, Users, Ban
} from 'lucide-react';
import api from '../../services/axiosClient';
import useDraftAutoSave from '../../hooks/useDraftAutoSave';
import DraftIndicator from '../../components/shared/DraftIndicator';

const WorkOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterMechanicId, setFilterMechanicId] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [customerCars, setCustomerCars] = useState<any[]>([]);

  // Assign Mechanics Modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedWoForAssign, setSelectedWoForAssign] = useState<WorkOrder | null>(null);
  const [targetMainMechId, setTargetMainMechId] = useState<number | null>(null);
  const [targetHelperMechId, setTargetHelperMechId] = useState<number | null>(null);
  const [assignReason, setAssignReason] = useState('');
  const [assignHistory, setAssignHistory] = useState<any[]>([]);

  // Convert to Invoice Modal state
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedWoForInvoice, setSelectedWoForInvoice] = useState<WorkOrder | null>(null);
  const [vatPercentage, setVatPercentage] = useState<number>(14);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const initialNewOrderState = {
    customerId: 0,
    carId: 0,
    assignedTechnicianId: 0,
    helperTechnicianId: 0,
    odometerInKm: 0,
    fuelLevel: 'Quarter',
    customerComplaint: '',
    inspectionNotes: '',
    laborDescription: 'Mechanical Inspection & Labor',
    laborPrice: 300,
    partDescription: '',
    partPrice: 0
  };

  // New Work Order form state
  const [newOrder, setNewOrder] = useState(initialNewOrderState);

  const handleRestoreWoDraft = (draft: any) => {
    setNewOrder(prev => ({ ...prev, ...draft }));
    if (draft.customerId && draft.customerId > 0) {
      handleCustomerChange(draft.customerId);
      if (draft.carId) {
        setTimeout(() => {
          setNewOrder(prev => ({ ...prev, carId: draft.carId }));
        }, 100);
      }
    }
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
    formKey: 'work_order_create',
    formData: newOrder,
    initialData: initialNewOrderState,
    onRestore: handleRestoreWoDraft,
    isFormOpen: isModalOpen
  });

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await workOrderService.getAll(
        filterStatus === 'All' ? undefined : filterStatus,
        undefined,
        filterMechanicId > 0 ? filterMechanicId : undefined
      );
      setOrders(res);
    } catch (err) {
      console.error('Failed to load work orders', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await api.get('/Customers');
      setCustomers(res.data);
    } catch (err) { }
  };

  const loadMechanics = async () => {
    try {
      const res = await api.get('/Mechanics');
      setMechanics(res.data);
    } catch (err) { }
  };

  useEffect(() => {
    loadOrders();
    loadCustomers();
    loadMechanics();
  }, [filterStatus, filterMechanicId]);

  const handleCustomerChange = (custId: number) => {
    setSelectedCustomerId(custId);
    const found = customers.find(c => c.id === custId);
    if (found && found.cars) {
      setCustomerCars(found.cars);
      setNewOrder(prev => ({ ...prev, customerId: custId, carId: found.cars[0]?.id || 0 }));
    } else {
      setCustomerCars([]);
      setNewOrder(prev => ({ ...prev, customerId: custId, carId: 0 }));
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.customerId || !newOrder.carId) {
      alert('Please select a customer and car.');
      return;
    }

    try {
      const lines: any[] = [];
      if (newOrder.laborPrice > 0) {
        lines.push({
          lineType: 'LaborMechanical',
          description: newOrder.laborDescription || 'Labor',
          quantity: 1,
          unitPrice: Number(newOrder.laborPrice)
        });
      }
      if (newOrder.partPrice > 0 && newOrder.partDescription) {
        lines.push({
          lineType: 'SparePart',
          description: newOrder.partDescription,
          quantity: 1,
          unitPrice: Number(newOrder.partPrice)
        });
      }

      await workOrderService.create({
        customerId: Number(newOrder.customerId),
        carId: Number(newOrder.carId),
        assignedTechnicianId: newOrder.assignedTechnicianId > 0 ? Number(newOrder.assignedTechnicianId) : undefined,
        helperTechnicianId: newOrder.helperTechnicianId > 0 ? Number(newOrder.helperTechnicianId) : undefined,
        odometerInKm: Number(newOrder.odometerInKm),
        fuelLevel: newOrder.fuelLevel,
        customerComplaint: newOrder.customerComplaint,
        inspectionNotes: newOrder.inspectionNotes,
        lines
      });

      await clearDraft();
      setIsModalOpen(false);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create work order.');
    }
  };

  const handleTransition = async (id: number, nextStatus: string) => {
    try {
      await workOrderService.transitionStatus(id, nextStatus);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || `Cannot transition to ${nextStatus}`);
    }
  };

  const handleOpenAssignModal = async (wo: WorkOrder) => {
    setSelectedWoForAssign(wo);
    setTargetMainMechId(wo.assignedTechnicianId || 0);
    setTargetHelperMechId(wo.helperTechnicianId || 0);
    setAssignReason('');
    setAssignModalOpen(true);

    try {
      const history = await workOrderService.getMechanicHistory(wo.id);
      setAssignHistory(history);
    } catch (err) { }
  };

  const handleSaveMechanics = async () => {
    if (!selectedWoForAssign) return;
    try {
      await workOrderService.assignMechanics(selectedWoForAssign.id, {
        mainMechanicId: targetMainMechId && targetMainMechId > 0 ? targetMainMechId : null,
        helperMechanicId: targetHelperMechId && targetHelperMechId > 0 ? targetHelperMechId : null,
        reason: assignReason || 'Reassigned from dashboard'
      });
      alert('Mechanics assigned successfully!');
      setAssignModalOpen(false);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign mechanics.');
    }
  };

  const handleOpenInvoiceModal = (wo: WorkOrder) => {
    setSelectedWoForInvoice(wo);
    setVatPercentage(14);
    setDiscountAmount(0);
    setInvoiceModalOpen(true);
  };

  const handleConfirmInvoice = async () => {
    if (!selectedWoForInvoice) return;
    try {
      await workOrderService.convertToInvoice(selectedWoForInvoice.id, {
        vatPercentage: Number(vatPercentage),
        discountAmount: Number(discountAmount)
      });
      alert('Work order successfully converted to Invoice!');
      setInvoiceModalOpen(false);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to convert to invoice.');
    }
  };

  const handlePrint = (id: number) => {
    window.open(`/api/work-orders/${id}/print`, '_blank');
  };

  const statuses = ['All', 'Pending', 'InProgress', 'WaitingForParts', 'Completed', 'Delivered', 'Invoiced'];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>Work Orders (أوامر الشغل والورشة)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0' }}>
            Full repair lifecycle: reception, mechanic assignment, stock issue, and one-click invoicing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select 
            value={filterMechanicId} 
            onChange={e => setFilterMechanicId(Number(e.target.value))}
            style={{ ...inputStyle, width: '200px' }}
          >
            <option value={0}>All Mechanics (كل الفنيين)</option>
            {mechanics.map(m => (
              <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
            ))}
          </select>

          <button 
            onClick={() => setIsModalOpen(true)}
            style={{
              background: 'var(--accent)', color: 'white', border: 'none',
              padding: '10px 18px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <Plus size={18} /> New Work Order
          </button>
          <button 
            onClick={loadOrders}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              padding: '10px', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer'
            }}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {statuses.map(st => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
              border: filterStatus === st ? '1px solid var(--accent)' : '1px solid var(--border)',
              backgroundColor: filterStatus === st ? 'var(--accent)' : 'var(--bg-card)',
              color: filterStatus === st ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <RefreshCw className="animate-spin text-accent" size={36} />
        </div>
      ) : orders.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No work orders found in status "{filterStatus}".
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
          {orders.map(wo => (
            <div key={wo.id} style={{
              background: 'var(--bg-card)', borderRadius: '12px', padding: '20px',
              border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>{wo.orderNumber}</span>
                  <span style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: wo.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' :
                                     wo.status === 'InProgress' ? 'rgba(59, 130, 246, 0.15)' :
                                     wo.status === 'Invoiced' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: wo.status === 'Completed' ? '#10b981' :
                           wo.status === 'InProgress' ? '#3b82f6' :
                           wo.status === 'Invoiced' ? '#8b5cf6' : '#f59e0b'
                  }}>
                    {wo.status}
                  </span>
                </div>

                <div style={{ fontSize: '14px', fontWeight: 700 }}>
                  {wo.carMake} {wo.carModel} <span style={{ color: 'var(--accent)' }}>({wo.carPlate})</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Customer: {wo.customerName} ({wo.customerPhone})
                </div>

                {/* Mechanics Assignment Display */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px', margin: '8px 0', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><strong>Main Tech:</strong> {wo.assignedTechnicianName || 'Not Assigned'}</span>
                    <span><strong>Helper:</strong> {wo.helperTechnicianName || 'None'}</span>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Odometer: <strong>{wo.odometerInKm?.toLocaleString()} KM</strong> | Fuel: {wo.fuelLevel}
                </div>
                <div style={{ fontSize: '13px', marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                  <strong>Complaint:</strong> {wo.customerComplaint || 'N/A'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px', fontWeight: 700 }}>
                  <span>Labor: {wo.totalLabor} EGP</span>
                  <span>Parts: {wo.totalParts} EGP</span>
                  <span style={{ color: '#10b981' }}>Total: {wo.totalAmount} EGP</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => handlePrint(wo.id)}
                  style={actionBtnStyle('#64748b')}
                  title="Print Work Order"
                >
                  <Printer size={13} style={{ marginRight: '4px' }} /> Print
                </button>

                <button 
                  onClick={() => handleOpenAssignModal(wo)}
                  style={actionBtnStyle('#0284c7')}
                  title="Assign Mechanics"
                >
                  <UserCheck size={13} style={{ marginRight: '4px' }} /> Assign
                </button>

                {wo.status === 'Pending' && !wo.assignedTechnicianId && (
                  <button 
                    onClick={async () => {
                      try {
                        await api.patch(`/work-orders/${wo.id}/claim`);
                        alert('Order claimed successfully!');
                        loadOrders();
                      } catch (err: any) {
                        alert(err.response?.data?.message || 'Failed to claim order.');
                      }
                    }}
                    style={actionBtnStyle('#10b981')}
                    title="Claim Order"
                  >
                    Claim Order
                  </button>
                )}

                {wo.status === 'Pending' && (
                  <>
                    <button 
                      onClick={() => handleTransition(wo.id, 'InProgress')}
                      style={actionBtnStyle('#3b82f6')}
                    >
                      Start Work
                    </button>
                    <button 
                      onClick={() => handleTransition(wo.id, 'Cancelled')}
                      style={actionBtnStyle('#ef4444')}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {wo.status === 'InProgress' && (
                  <>
                    <button 
                      onClick={() => handleTransition(wo.id, 'WaitingForParts')}
                      style={actionBtnStyle('#f59e0b')}
                    >
                      Wait for Parts
                    </button>
                    <button 
                      onClick={() => handleTransition(wo.id, 'Completed')}
                      style={actionBtnStyle('#10b981')}
                    >
                      Complete
                    </button>
                    <button 
                      onClick={() => handleTransition(wo.id, 'Cancelled')}
                      style={actionBtnStyle('#ef4444')}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {wo.status === 'WaitingForParts' && (
                  <>
                    <button 
                      onClick={() => handleTransition(wo.id, 'InProgress')}
                      style={actionBtnStyle('#3b82f6')}
                    >
                      Resume
                    </button>
                    <button 
                      onClick={() => handleTransition(wo.id, 'Cancelled')}
                      style={actionBtnStyle('#ef4444')}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {wo.status === 'Completed' && (
                  <>
                    <button 
                      onClick={() => handleTransition(wo.id, 'Delivered')}
                      style={actionBtnStyle('#8b5cf6')}
                    >
                      Deliver Car
                    </button>
                    <button 
                      onClick={() => handleOpenInvoiceModal(wo)}
                      style={actionBtnStyle('var(--accent)')}
                    >
                      Invoice
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel this completed order? Any issued parts will be automatically returned to stock.')) {
                          handleTransition(wo.id, 'Cancelled');
                        }
                      }}
                      style={actionBtnStyle('#ef4444')}
                      title="Cancel completed order and restore inventory"
                    >
                      Cancel & Restore Stock
                    </button>
                  </>
                )}
                {wo.status === 'Delivered' && (
                  <button 
                    onClick={() => handleOpenInvoiceModal(wo)}
                    style={actionBtnStyle('var(--accent)')}
                  >
                    Invoice
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Assign Mechanics */}
      {assignModalOpen && selectedWoForAssign && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                Assign Mechanics: {selectedWoForAssign.orderNumber}
              </h2>
              <button onClick={() => setAssignModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Main Mechanic (الفني الرئيسي):</label>
                <select 
                  style={inputStyle}
                  value={targetMainMechId || 0}
                  onChange={e => setTargetMainMechId(Number(e.target.value))}
                >
                  <option value={0}>-- None / Unassigned --</option>
                  {mechanics.map(m => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.specialty || 'General'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Helper Mechanic (الفني المساعد):</label>
                <select 
                  style={inputStyle}
                  value={targetHelperMechId || 0}
                  onChange={e => setTargetHelperMechId(Number(e.target.value))}
                >
                  <option value={0}>-- None / Unassigned --</option>
                  {mechanics.map(m => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.specialty || 'General'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Assignment Reason / Notes:</label>
                <input 
                  type="text" 
                  style={inputStyle} 
                  placeholder="e.g. Workload balance, specialized engine repair" 
                  value={assignReason} 
                  onChange={e => setAssignReason(e.target.value)} 
                />
              </div>

              {/* History list */}
              {assignHistory.length > 0 && (
                <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Assignment Change History:</span>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', marginTop: '6px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {assignHistory.map(h => (
                      <div key={h.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '4px' }}>
                        <strong>{h.role}:</strong> {h.previousMechanicName || 'None'} &rarr; <strong>{h.newMechanicName || 'None'}</strong> by {h.assignedBy} ({new Date(h.assignedAt).toLocaleDateString()}) - <em>{h.reason}</em>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button 
                  type="button" onClick={() => setAssignModalOpen(false)}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', color: 'white', borderRadius: '6px' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveMechanics}
                  style={{ padding: '8px 20px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700 }}
                >
                  Save Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Convert to Invoice */}
      {invoiceModalOpen && selectedWoForInvoice && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                Convert to Invoice: {selectedWoForInvoice.orderNumber}
              </h2>
              <button onClick={() => setInvoiceModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                <div><strong>Subtotal:</strong> {selectedWoForInvoice.totalAmount.toLocaleString()} EGP</div>
              </div>

              <div>
                <label style={labelStyle}>Discount Amount (EGP):</label>
                <input 
                  type="number" style={inputStyle} 
                  value={discountAmount} 
                  onChange={e => setDiscountAmount(Number(e.target.value))} 
                />
              </div>

              <div>
                <label style={labelStyle}>VAT Percentage % (Default 14%, 0 for tax-exempt):</label>
                <input 
                  type="number" style={inputStyle} 
                  value={vatPercentage} 
                  onChange={e => setVatPercentage(Number(e.target.value))} 
                />
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                <div><strong>Estimated Taxable:</strong> {(Math.max(0, selectedWoForInvoice.totalAmount - discountAmount)).toLocaleString()} EGP</div>
                <div><strong>Estimated VAT:</strong> {(Math.round(Math.max(0, selectedWoForInvoice.totalAmount - discountAmount) * (vatPercentage / 100))).toLocaleString()} EGP</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                  Total Invoice: {(Math.max(0, selectedWoForInvoice.totalAmount - discountAmount) + Math.round(Math.max(0, selectedWoForInvoice.totalAmount - discountAmount) * (vatPercentage / 100))).toLocaleString()} EGP
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button 
                  type="button" onClick={() => setInvoiceModalOpen(false)}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', color: 'white', borderRadius: '6px' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmInvoice}
                  style={{ padding: '8px 20px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700 }}
                >
                  Issue Invoice (إصدار الفاتورة)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Work Order */}
      {isModalOpen && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Create Work Order (فتح أمر شغل)</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} onBlur={handleBlur} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <DraftIndicator
                lastSavedTime={lastSavedTime}
                isSaving={isSaving}
                hasDraftAvailable={hasDraftAvailable}
                draftUpdatedAt={draftUpdatedAt}
                onRestore={restoreDraft}
                onDiscard={discardDraft}
              />
              <div>
                <label style={labelStyle}>Select Customer (العميل):</label>
                <select 
                  style={inputStyle}
                  value={selectedCustomerId}
                  onChange={e => handleCustomerChange(Number(e.target.value))}
                  required
                >
                  <option value={0}>-- Select Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.fullName} - {c.phone}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Select Vehicle (السيارة):</label>
                <select 
                  style={inputStyle}
                  value={newOrder.carId}
                  onChange={e => setNewOrder({ ...newOrder, carId: Number(e.target.value) })}
                  required
                >
                  <option value={0}>-- Select Car --</option>
                  {customerCars.map(car => (
                    <option key={car.id} value={car.id}>{car.make} {car.model} ({car.licensePlate})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Main Mechanic (الفني الرئيسي):</label>
                  <select 
                    style={inputStyle}
                    value={newOrder.assignedTechnicianId}
                    onChange={e => setNewOrder({ ...newOrder, assignedTechnicianId: Number(e.target.value) })}
                  >
                    <option value={0}>-- None / Unassigned --</option>
                    {mechanics.map(m => (
                      <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Helper Mechanic (الفني المساعد):</label>
                  <select 
                    style={inputStyle}
                    value={newOrder.helperTechnicianId}
                    onChange={e => setNewOrder({ ...newOrder, helperTechnicianId: Number(e.target.value) })}
                  >
                    <option value={0}>-- None / Unassigned --</option>
                    {mechanics.map(m => (
                      <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Odometer KM (العداد):</label>
                  <input 
                    type="number" style={inputStyle} 
                    value={newOrder.odometerInKm}
                    onChange={e => setNewOrder({ ...newOrder, odometerInKm: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Fuel Level (مستوى الوقود):</label>
                  <select 
                    style={inputStyle}
                    value={newOrder.fuelLevel}
                    onChange={e => setNewOrder({ ...newOrder, fuelLevel: e.target.value })}
                  >
                    <option value="Empty">Empty (فارغ)</option>
                    <option value="Quarter">Quarter (ربع)</option>
                    <option value="Half">Half (نصف)</option>
                    <option value="ThreeQuarters">Three Quarters (ثلاثة أرباع)</option>
                    <option value="Full">Full (ممتلئ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Customer Complaint (شكوى العميل وأسباب الفحص):</label>
                <textarea 
                  style={{ ...inputStyle, height: '60px' }}
                  value={newOrder.customerComplaint}
                  onChange={e => setNewOrder({ ...newOrder, customerComplaint: e.target.value })}
                  placeholder="e.g. Engine noise, brake vibration, routine check..."
                  required
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Estimated Labor & Parts:</span>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <input 
                    type="text" placeholder="Labor description" style={inputStyle}
                    value={newOrder.laborDescription}
                    onChange={e => setNewOrder({ ...newOrder, laborDescription: e.target.value })}
                  />
                  <input 
                    type="number" placeholder="Labor EGP" style={inputStyle}
                    value={newOrder.laborPrice}
                    onChange={e => setNewOrder({ ...newOrder, laborPrice: Number(e.target.value) })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <input 
                    type="text" placeholder="Part description (optional)" style={inputStyle}
                    value={newOrder.partDescription}
                    onChange={e => setNewOrder({ ...newOrder, partDescription: e.target.value })}
                  />
                  <input 
                    type="number" placeholder="Part EGP" style={inputStyle}
                    value={newOrder.partPrice}
                    onChange={e => setNewOrder({ ...newOrder, partPrice: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', color: 'white', borderRadius: '6px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ padding: '8px 20px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700 }}
                >
                  Open Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const actionBtnStyle = (color: string): React.CSSProperties => ({
  flex: '1 1 auto',
  padding: '6px 10px',
  borderRadius: '6px',
  border: `1px solid ${color}`,
  backgroundColor: `${color}15`,
  color: color,
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  whiteSpace: 'nowrap'
});

const modalOverlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 1000
};

const modalBox: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '12px',
  padding: '24px',
  width: '560px',
  maxWidth: '90%',
  border: '1px solid var(--border)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  maxHeight: '90vh',
  overflowY: 'auto'
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px'
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: '6px',
  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
  color: 'white', fontSize: '13px'
};

export default WorkOrdersPage;
