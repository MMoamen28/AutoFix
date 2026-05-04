import React, { useState, useEffect } from 'react';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { purchaseReceiptService } from '../../services/purchaseReceiptService';
import { PurchaseOrder } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { Package, Clock, CheckCircle, XCircle, Search, Eye, Receipt, Trash2, X, FileText, User, Car } from 'lucide-react';

const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await purchaseOrderService.getMyOrders();
      setOrders(data);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) return;
    try {
      await purchaseOrderService.cancelOrder(id);
      toast.success('Order cancelled successfully');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    }
  };

  const viewReceipt = async (orderId: number) => {
    try {
      const data = await purchaseReceiptService.getPurchaseReceiptByOrder(orderId);
      setReceipt(data);
    } catch (err) {
      toast.error('Receipt not available yet');
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

  const filteredOrders = orders.filter(o => filter === 'All' || o.status === filter);

  if (loading) return <div className="p-20 text-center"><LoadingSpinner /></div>;

  return (
    <div className="p-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            <Package className="text-blue-500" size={36} />
            My Orders
          </h1>
          <p className="text-gray-400 mt-2">Track the status of your services and spare parts purchases.</p>
        </div>

        <div className="flex bg-gray-900/50 p-1.5 rounded-2xl border border-gray-800">
          {['All', 'Pending', 'InProgress', 'Completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              {f === 'InProgress' ? 'In Progress' : f}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {filteredOrders.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-[3rem] p-20 text-center">
            <Package className="mx-auto text-gray-700 mb-6" size={64} />
            <p className="text-gray-500 text-xl font-medium">No orders found in this category.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-8 hover:border-blue-500/50 transition-all group">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="flex-1 flex flex-col md:flex-row items-center gap-8">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-blue-500">#{order.id}</span>
                  </div>
                  
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-700">
                        {order.items.length} Items
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{order.carInfo}</h3>
                    <p className="text-sm text-gray-500">Placed on {new Date(order.placedAt).toLocaleDateString()} at {new Date(order.placedAt).toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="text-center md:text-right">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Amount</p>
                    <p className="text-3xl font-black text-white">${order.totalAmount.toFixed(2)}</p>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="p-4 bg-gray-800 hover:bg-gray-700 rounded-2xl text-white transition-all flex items-center gap-2"
                    >
                      <Eye size={20} />
                      <span className="text-sm font-bold">Details</span>
                    </button>
                    {order.status === 'Completed' && (
                      <button 
                        onClick={() => viewReceipt(order.id)}
                        className="p-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 rounded-2xl transition-all flex items-center gap-2 border border-emerald-500/20"
                      >
                        <Receipt size={20} />
                        <span className="text-sm font-bold">Receipt</span>
                      </button>
                    )}
                    {order.status === 'Pending' && (
                      <button 
                        onClick={() => handleCancel(order.id)}
                        className="p-4 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-2xl transition-all flex items-center gap-2 border border-red-500/20"
                      >
                        <Trash2 size={20} />
                        <span className="text-sm font-bold">Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedOrder(null)}></div>
          <div className="relative bg-[#0B0F1A] border border-gray-800 rounded-[3rem] w-full max-w-3xl p-12 overflow-hidden shadow-2xl">
            <header className="flex justify-between items-start mb-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                  <h2 className="text-3xl font-black text-white">Order Details <span className="text-blue-500">#{selectedOrder.id}</span></h2>
                </div>
                <p className="text-gray-400">Review your purchase and its current status.</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-3 bg-gray-900 rounded-2xl hover:bg-gray-800 transition-colors">
                <X size={20} />
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="bg-gray-900/50 p-6 rounded-[2rem] border border-gray-800">
                <div className="flex items-center gap-3 mb-4 text-blue-400">
                  <Car size={20} />
                  <span className="text-xs font-black uppercase tracking-widest">Vehicle Info</span>
                </div>
                <p className="text-white font-bold text-lg">{selectedOrder.carInfo}</p>
              </div>
              <div className="bg-gray-900/50 p-6 rounded-[2rem] border border-gray-800">
                <div className="flex items-center gap-3 mb-4 text-purple-400">
                  <User size={20} />
                  <span className="text-xs font-black uppercase tracking-widest">Assigned Technician</span>
                </div>
                <p className="text-white font-bold text-lg">{selectedOrder.mechanicName || 'Awaiting Assignment'}</p>
              </div>
            </div>

            <div className="space-y-4 mb-10 max-h-60 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-800">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Purchased Items</p>
              {selectedOrder.items.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                  <div>
                    <p className="text-white font-bold">{item.itemName}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{item.itemType} • {item.quantity} Unit(s)</p>
                  </div>
                  <p className="text-white font-black">${item.subtotal.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6 flex justify-between items-center">
              <div>
                <p className="text-blue-400 text-xs font-black uppercase tracking-widest mb-1">Final Total</p>
                <p className="text-3xl font-black text-white">${selectedOrder.totalAmount.toFixed(2)}</p>
              </div>
              <CheckCircle className="text-blue-500" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setReceipt(null)}></div>
          <div className="relative bg-white text-black w-full max-w-xl rounded-none shadow-2xl overflow-hidden font-mono p-12 animate-in fade-in zoom-in duration-300">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>
            <div className="text-center mb-10">
              <div className="inline-flex p-3 bg-emerald-600 rounded-xl mb-4 text-white">
                <Receipt size={32} />
              </div>
              <h2 className="text-3xl font-black tracking-tighter uppercase">Order Receipt</h2>
              <p className="text-sm font-bold text-gray-500 mt-1">TRANS-ID: {receipt.purchaseOrderId}</p>
            </div>

            <div className="border-y-2 border-dashed border-gray-300 py-6 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="font-bold text-gray-500 uppercase">Customer</span>
                <span className="font-black">{receipt.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-gray-500 uppercase">Vehicle</span>
                <span className="font-black">{receipt.carInfo}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-gray-500 uppercase">Status</span>
                <span className="font-black uppercase">{receipt.status}</span>
              </div>
            </div>

            <div className="py-8 space-y-4">
              <p className="text-xs font-black uppercase text-gray-400 mb-4">Line Items</p>
              {receipt.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <p className="font-black uppercase text-sm">{item.ItemName || item.itemName}</p>
                    <p className="text-[10px] text-gray-500">QTY: {item.Quantity || item.quantity} × ${(item.Subtotal / item.Quantity || item.subtotal / item.quantity || 0).toFixed(2)}</p>
                  </div>
                  <span className="font-black">${(item.Subtotal || item.subtotal || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-dashed border-gray-300 pt-8 pb-4 flex justify-between items-end">
              <span className="font-black text-xl uppercase">Total Paid</span>
              <span className="font-black text-3xl">${receipt.totalAmount.toFixed(2)}</span>
            </div>

            <div className="mt-12 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-10">This is an electronically generated receipt.</p>
              <button 
                onClick={() => setReceipt(null)}
                className="w-full bg-black text-white py-4 font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
              >
                Close
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

export default MyOrdersPage;
