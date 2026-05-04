import React, { useState, useEffect } from 'react';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { mechanicService } from '../../services/mechanicService';
import { purchaseReceiptService } from '../../services/purchaseReceiptService';
import { PurchaseOrder } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { 
  Package, Search, Filter, Eye, UserPlus, Play, Receipt, 
  X, User, Car, FileText, CheckCircle, Clock, AlertCircle, Trash2,
  ChevronRight
} from 'lucide-react';

const PurchaseOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedMechanicId, setSelectedMechanicId] = useState<number | string>('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
    fetchMechanics();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await purchaseOrderService.getAllOrders();
      setOrders(data);
    } catch (err) {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchMechanics = async () => {
    try {
      const data = await mechanicService.getAll();
      setMechanics(data);
    } catch (err) {
      console.error('Failed to load mechanics');
    }
  };

  const handleAssign = async () => {
    if (!selectedOrder || !selectedMechanicId) return;
    try {
      await purchaseOrderService.assignMechanic(selectedOrder.id, Number(selectedMechanicId));
      toast.success('Mechanic assigned successfully');
      setIsAssignModalOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error('Assignment failed');
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await purchaseOrderService.updateOrderStatus(id, status);
      toast.success(`Order status updated to ${status}`);
      fetchOrders();
      if (selectedOrder?.id === id) {
        const updated = await purchaseOrderService.getOrderById(id);
        setSelectedOrder(updated);
      }
    } catch (err) {
      toast.error('Status update failed');
    }
  };

  const viewReceipt = async (orderId: number) => {
    try {
      const data = await purchaseReceiptService.getPurchaseReceiptByOrder(orderId);
      // We need owner copy specifically
      const ownerCopies = await purchaseReceiptService.getOwnerPurchaseCopies();
      const ownerCopy = ownerCopies.find(r => r.purchaseOrderId === orderId);
      setReceipt(ownerCopy || data);
      setIsReceiptModalOpen(true);
    } catch (err) {
      toast.error('Receipt not found');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-amber-500/20 text-amber-500 border-amber-500/20';
      case 'AssignedToMechanic': return 'bg-blue-500/20 text-blue-500 border-blue-500/20';
      case 'InProgress': return 'bg-purple-500/20 text-purple-500 border-purple-500/20';
      case 'Completed': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
      case 'Cancelled': return 'bg-red-500/20 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/20';
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(search.toLowerCase()) || 
                         o.carInfo.toLowerCase().includes(search.toLowerCase()) ||
                         o.id.toString().includes(search);
    const matchesFilter = filter === 'All' || o.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="p-20 text-center"><LoadingSpinner /></div>;

  return (
    <div className="p-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            <Package className="text-blue-500" size={36} />
            Fleet Purchase Orders
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Comprehensive view of all marketplace transactions and service workflows.</p>
        </div>

        <div className="flex bg-gray-900/50 p-1.5 rounded-2xl border border-gray-800">
          {['All', 'Pending', 'AssignedToMechanic', 'InProgress', 'Completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              {f === 'AssignedToMechanic' ? 'Assigned' : f === 'InProgress' ? 'In Progress' : f}
            </button>
          ))}
        </div>
      </header>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto mb-10 relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
        <input 
          type="text"
          placeholder="Search by Customer Name, Vehicle, or Order ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900/50 border border-gray-800 rounded-3xl pl-16 pr-6 py-6 text-xl text-white outline-none focus:border-blue-500 transition-all backdrop-blur-xl"
        />
      </div>

      {/* Table-like Grid */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-[3rem] p-20 text-center">
            <Package className="mx-auto text-gray-700 mb-6" size={64} />
            <p className="text-gray-500 text-xl font-medium">No purchase orders found matching your criteria.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-8 hover:border-blue-500/50 transition-all group">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* ID & Status */}
                <div className="lg:col-span-2 flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center text-blue-500 font-black text-xs shrink-0">
                    #{order.id}
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                    {order.status}
                  </div>
                </div>

                {/* Customer & Car */}
                <div className="lg:col-span-4">
                  <h3 className="text-xl font-bold text-white mb-1">{order.customerName}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Car size={14} />
                    {order.carInfo}
                  </p>
                </div>

                {/* Mechanic */}
                <div className="lg:col-span-2">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Technician</p>
                  {order.mechanicName ? (
                    <div className="flex items-center gap-2 text-white font-bold">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-[10px]">
                        {order.mechanicName[0]}
                      </div>
                      {order.mechanicName}
                    </div>
                  ) : (
                    <span className="text-red-400 text-xs font-bold uppercase tracking-widest">Unassigned</span>
                  )}
                </div>

                {/* Total */}
                <div className="lg:col-span-1 text-right">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Revenue</p>
                  <p className="text-xl font-black text-white">${order.totalAmount.toFixed(2)}</p>
                </div>

                {/* Actions */}
                <div className="lg:col-span-3 flex justify-end gap-2">
                  <button 
                    onClick={() => setSelectedOrder(order)}
                    className="p-4 bg-gray-800 hover:bg-gray-700 rounded-2xl text-white transition-all group-hover:scale-105 active:scale-95"
                    title="View Details"
                  >
                    <Eye size={20} />
                  </button>
                  
                  {!order.mechanicId && (
                    <button 
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsAssignModalOpen(true);
                      }}
                      className="p-4 bg-blue-600/20 hover:bg-blue-600/30 text-blue-500 border border-blue-500/20 rounded-2xl transition-all group-hover:scale-105 active:scale-95"
                      title="Assign Mechanic"
                    >
                      <UserPlus size={20} />
                    </button>
                  )}

                  <button 
                    onClick={() => viewReceipt(order.id)}
                    className="p-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 border border-emerald-500/20 rounded-2xl transition-all group-hover:scale-105 active:scale-95"
                    title="View Receipt"
                  >
                    <Receipt size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedOrder && !isAssignModalOpen && !isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedOrder(null)}></div>
          <div className="relative bg-[#0B0F1A] border border-gray-800 rounded-[3rem] w-full max-w-4xl p-12 overflow-hidden shadow-2xl">
            <header className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center">
                  <Package className="text-blue-500" size={40} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-blue-500 font-black text-lg">#{selectedOrder.id}</span>
                    <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-white">Full Order Breakdown</h2>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-3 bg-gray-900 rounded-2xl hover:bg-gray-800 transition-colors">
                <X size={20} />
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-gray-900/50 p-6 rounded-[2rem] border border-gray-800">
                <User className="text-blue-500 mb-4" size={24} />
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Customer</p>
                <p className="text-white font-bold">{selectedOrder.customerName}</p>
              </div>
              <div className="bg-gray-900/50 p-6 rounded-[2rem] border border-gray-800">
                <Car className="text-purple-500 mb-4" size={24} />
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Vehicle</p>
                <p className="text-white font-bold">{selectedOrder.carInfo}</p>
              </div>
              <div className="bg-gray-900/50 p-6 rounded-[2rem] border border-gray-800">
                <Play className="text-amber-500 mb-4" size={24} />
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Current Workflow</p>
                <p className="text-white font-bold">{selectedOrder.status}</p>
              </div>
            </div>

            <div className="space-y-4 mb-10 max-h-60 overflow-y-auto pr-4">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Order Items</p>
              {selectedOrder.items.map(item => (
                <div key={item.id} className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800 flex justify-between items-center group/item hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-10 rounded-full ${item.itemType === 'Service' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                    <div>
                      <p className="text-white font-bold">{item.itemName}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{item.itemType} • {item.quantity} Unit(s) @ ${item.unitPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="text-white font-black group-hover/item:text-blue-500 transition-colors">${item.subtotal.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-8 border-t border-gray-800">
              <div className="flex gap-2">
                {['InProgress', 'Completed', 'Cancelled'].map(s => (
                  <button 
                    key={s}
                    onClick={() => handleUpdateStatus(selectedOrder.id, s)}
                    className={`px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                      selectedOrder.status === s ? 'bg-white text-black' : 'bg-gray-900 text-gray-500 hover:text-white'
                    }`}
                  >
                    Set {s}
                  </button>
                ))}
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-1">Total Revenue</p>
                <p className="text-4xl font-black text-blue-500">${selectedOrder.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Mechanic Modal */}
      {isAssignModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsAssignModalOpen(false)}></div>
          <div className="relative bg-[#0B0F1A] border border-gray-800 rounded-[3rem] w-full max-w-md p-12 overflow-hidden shadow-2xl">
            <header className="text-center mb-10">
              <div className="inline-flex p-4 bg-blue-600/20 rounded-3xl mb-6">
                <UserPlus className="text-blue-500" size={32} />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Assign Technician</h2>
              <p className="text-gray-400">Select a mechanic for Order #{selectedOrder.id}</p>
            </header>

            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Choose Mechanic</label>
                <select 
                  value={selectedMechanicId}
                  onChange={(e) => setSelectedMechanicId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500 appearance-none transition-all"
                >
                  <option value="" disabled>Select a professional...</option>
                  {mechanics.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.specialization})</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleAssign}
                disabled={!selectedMechanicId}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 active:scale-95"
              >
                Assign & Initialize Workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal (Owner View) */}
      {isReceiptModalOpen && receipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setIsReceiptModalOpen(false)}></div>
          <div className="relative bg-white text-black w-full max-w-xl rounded-none shadow-2xl overflow-hidden font-mono p-12 animate-in slide-in-from-bottom-10 duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 flex items-center justify-center rotate-45 translate-x-16 -translate-y-16">
              <span className="text-[10px] font-black text-gray-400 -rotate-45">OFFICIAL COPY</span>
            </div>
            
            <div className="text-center mb-12">
              <div className="inline-flex p-4 bg-black rounded-2xl mb-4 text-white">
                <Receipt size={32} />
              </div>
              <h2 className="text-3xl font-black tracking-tighter uppercase">Purchase Receipt</h2>
              <p className="text-xs font-bold text-gray-500 mt-1">ISSUED BY AUTOFIX PRO OS</p>
            </div>

            <div className="space-y-6 text-sm mb-12">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-bold text-gray-400">ORDER ID</span>
                <span className="font-black">#{receipt.purchaseOrderId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-bold text-gray-400">CUSTOMER</span>
                <span className="font-black">{receipt.customerName}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-bold text-gray-400">VEHICLE</span>
                <span className="font-black">{receipt.carInfo}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-bold text-gray-400">TECHNICIAN</span>
                <span className="font-black">{receipt.mechanicName || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-bold text-gray-400">COPY TYPE</span>
                <span className="font-black uppercase">{receipt.isOwnerCopy ? 'Owner Master' : 'Customer Copy'}</span>
              </div>
            </div>

            <div className="space-y-4 mb-12">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Billing Line Items</p>
              {receipt.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-start">
                  <div className="flex-1 pr-8">
                    <p className="font-black uppercase text-sm">{item.ItemName || item.itemName}</p>
                    <p className="text-[10px] text-gray-500">QTY: {item.Quantity || item.quantity} UNITS</p>
                  </div>
                  <span className="font-black text-lg">${(item.Subtotal || item.subtotal || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t-4 border-double border-black pt-8 mb-12 flex justify-between items-end">
              <span className="font-black text-2xl uppercase tracking-tighter">Gross Total</span>
              <span className="font-black text-4xl">${receipt.totalAmount.toFixed(2)}</span>
            </div>

            <div className="text-center pt-8 border-t border-gray-100">
              <button 
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-full bg-black text-white py-5 font-black uppercase tracking-widest hover:bg-gray-900 transition-all active:scale-95"
              >
                Close Archive View
              </button>
            </div>
            
            <div className="absolute -bottom-2 left-0 w-full flex">
              {Array.from({length: 20}).map((_, i) => (
                <div key={i} className="w-1/20 h-4 bg-[#0B0F1A] rounded-t-full"></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersPage;
