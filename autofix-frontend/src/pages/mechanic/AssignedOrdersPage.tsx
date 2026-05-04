import React, { useState, useEffect } from 'react';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { PurchaseOrder } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ClipboardList, User, Car, FileText, Play, CheckCircle2, Search, Filter, X, AlertTriangle, ArrowRight } from 'lucide-react';

const AssignedOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await purchaseOrderService.getAssignedOrders();
      setOrders(data);
    } catch (err) {
      toast.error('Failed to load assigned orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      await purchaseOrderService.updateOrderStatus(selectedOrder.id, newStatus);
      toast.success('Order status updated successfully');
      setStatusModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AssignedToMechanic': return 'bg-blue-500/20 text-blue-500 border-blue-500/20';
      case 'InProgress': return 'bg-purple-500/20 text-purple-500 border-purple-500/20';
      case 'Completed': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/20';
    }
  };

  const filteredOrders = orders.filter(o => filter === 'All' || o.status === filter);

  if (loading) return <div className="p-20 text-center"><LoadingSpinner /></div>;

  return (
    <div className="p-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            <ClipboardList className="text-blue-500" size={36} />
            My assigned Work
          </h1>
          <p className="text-gray-400 mt-2">Manage your assigned marketplace services and installations.</p>
        </div>

        <div className="flex bg-gray-900/50 p-1.5 rounded-2xl border border-gray-800">
          {['All', 'AssignedToMechanic', 'InProgress', 'Completed'].map(f => (
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full bg-gray-900/50 border border-gray-800 rounded-[3rem] p-20 text-center">
            <ClipboardList className="mx-auto text-gray-700 mb-6" size={64} />
            <p className="text-gray-500 text-xl font-medium">No assigned orders found.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-8 hover:border-blue-500/50 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <FileText size={120} />
              </div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 font-black text-xs">
                  #{order.id}
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                  {order.status}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-500">
                    <User size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">Customer</span>
                  </div>
                  <p className="text-white font-bold text-lg">{order.customerName}</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-500">
                    <Car size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">Vehicle</span>
                  </div>
                  <p className="text-white font-bold text-lg">{order.carInfo}</p>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-800 mb-8">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Required Services/Parts</p>
                <div className="space-y-3">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.itemType === 'Service' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                        <span className="text-white font-medium">{item.itemName}</span>
                      </div>
                      <span className="text-gray-500 font-bold">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedOrder(order)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={18} />
                  Full Details
                </button>
                {order.status !== 'Completed' && (
                  <button 
                    onClick={() => {
                      setSelectedOrder(order);
                      setNewStatus(order.status === 'AssignedToMechanic' ? 'InProgress' : 'Completed');
                      setStatusModalOpen(true);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <Play size={18} />
                    Update Status
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedOrder && !statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedOrder(null)}></div>
          <div className="relative bg-[#0B0F1A] border border-gray-800 rounded-[3rem] w-full max-w-2xl p-12 overflow-hidden shadow-2xl">
            <header className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-3xl font-black text-white mb-2">Work Order Detail</h2>
                <p className="text-gray-400">Complete breakdown of tasks and customer notes.</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-3 bg-gray-900 rounded-2xl hover:bg-gray-800 transition-colors">
                <X size={20} />
              </button>
            </header>

            <div className="space-y-8">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 text-amber-500 mb-3">
                  <AlertTriangle size={20} />
                  <span className="text-xs font-black uppercase tracking-widest">Technician Notes from Customer</span>
                </div>
                <p className="text-white font-medium italic">"{selectedOrder.notes || 'No notes provided.'}"</p>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Full Parts & Service List</p>
                <div className="space-y-3">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-bold text-white">{item.itemName}</h4>
                        <span className="bg-gray-800 text-gray-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-700">QTY: {item.quantity}</span>
                      </div>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.itemDescription}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {statusModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setStatusModalOpen(false)}></div>
          <div className="relative bg-[#0B0F1A] border border-gray-800 rounded-[3rem] w-full max-w-md p-12 overflow-hidden shadow-2xl">
            <header className="text-center mb-10">
              <div className="inline-flex p-4 bg-blue-600/20 rounded-3xl mb-6">
                <Play className="text-blue-500" size={32} />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Advance Workflow</h2>
              <p className="text-gray-400">Update the progress of Order #{selectedOrder.id}</p>
            </header>

            <div className="space-y-8">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <span className="text-gray-500 font-bold">{selectedOrder.status}</span>
                  <ArrowRight className="text-blue-500" size={20} />
                  <span className="text-white font-black text-lg underline decoration-blue-500 underline-offset-4">{newStatus}</span>
                </div>
                <p className="text-xs text-gray-500 font-medium">Advancing status will notify the customer and owner.</p>
              </div>

              <button 
                onClick={handleUpdateStatus}
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
              >
                {submitting ? 'Updating System...' : 'Confirm Status Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignedOrdersPage;
