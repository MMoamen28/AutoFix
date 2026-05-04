import React, { useState, useEffect } from 'react';
import { purchaseReceiptService } from '../../services/purchaseReceiptService';
import { PurchaseReceipt } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { Receipt, Search, Filter, Eye, Trash2, X, User, Car, Calendar, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

const PurchaseReceiptsPage: React.FC = () => {
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [copyFilter, setCopyFilter] = useState<'All' | 'Owner' | 'Customer'>('All');
  const [selectedReceipt, setSelectedReceipt] = useState<PurchaseReceipt | null>(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const data = await purchaseReceiptService.getAllPurchaseReceipts();
      setReceipts(data);
    } catch (err) {
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async (id: number) => {
    if (!window.confirm('Are you sure you want to void this receipt? This cannot be undone.')) return;
    try {
      await purchaseReceiptService.voidPurchaseReceipt(id);
      toast.success('Receipt voided');
      fetchReceipts();
    } catch (err) {
      toast.error('Failed to void receipt');
    }
  };

  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = r.customerName.toLowerCase().includes(search.toLowerCase()) || 
                         r.carInfo.toLowerCase().includes(search.toLowerCase()) ||
                         r.id.toString().includes(search);
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesCopy = copyFilter === 'All' || 
                       (copyFilter === 'Owner' && r.isOwnerCopy) || 
                       (copyFilter === 'Customer' && !r.isOwnerCopy);
    return matchesSearch && matchesStatus && matchesCopy;
  });

  if (loading) return <div className="p-20 text-center"><LoadingSpinner /></div>;

  return (
    <div className="p-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            <Receipt className="text-blue-500" size={36} />
            Fiscal Archives
          </h1>
          <p className="text-gray-400 mt-2 text-lg">System-generated receipts for every marketplace transaction.</p>
        </div>

        <div className="flex gap-4">
          <div className="flex bg-gray-900/50 p-1.5 rounded-2xl border border-gray-800">
            {(['All', 'Issued', 'Void'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${statusFilter === s ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex bg-gray-900/50 p-1.5 rounded-2xl border border-gray-800">
            {(['All', 'Owner', 'Customer'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCopyFilter(c)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${copyFilter === c ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                {c === 'All' ? 'All Copies' : `${c} Only`}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="max-w-7xl mx-auto mb-10 relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
        <input 
          type="text"
          placeholder="Filter archives by customer, vehicle, or receipt ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900/50 border border-gray-800 rounded-3xl pl-16 pr-6 py-6 text-xl text-white outline-none focus:border-blue-500 transition-all backdrop-blur-xl"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredReceipts.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-[3rem] p-20 text-center">
            <Receipt className="mx-auto text-gray-700 mb-6" size={64} />
            <p className="text-gray-500 text-xl font-medium">No archived receipts match your filters.</p>
          </div>
        ) : (
          filteredReceipts.map(receipt => (
            <div key={receipt.id} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all group">
              <div className="flex flex-wrap items-center gap-6">
                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-blue-500 font-black text-[10px]">
                  R-{receipt.id}
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <h3 className="text-white font-bold">{receipt.customerName}</h3>
                  <p className="text-xs text-gray-500">{receipt.carInfo}</p>
                </div>

                <div className="w-40">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Issue Date</p>
                  <p className="text-sm text-white font-medium">{new Date(receipt.issuedAt).toLocaleDateString()}</p>
                </div>

                <div className="w-32">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Copy Type</p>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${receipt.isOwnerCopy ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                    {receipt.isOwnerCopy ? 'Owner' : 'Customer'}
                  </span>
                </div>

                <div className="w-32 text-right">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Gross Total</p>
                  <p className="text-lg font-black text-white">${receipt.totalAmount.toFixed(2)}</p>
                </div>

                <div className={`w-24 text-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${receipt.status === 'Void' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                  {receipt.status}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedReceipt(receipt)}
                    className="p-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white transition-all"
                  >
                    <Eye size={18} />
                  </button>
                  {receipt.status !== 'Void' && (
                    <button 
                      onClick={() => handleVoid(receipt.id)}
                      className="p-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Receipt View Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedReceipt(null)}></div>
          <div className="relative bg-white text-black w-full max-w-xl rounded-none shadow-2xl overflow-hidden font-mono p-12">
            <div className={`absolute top-0 left-0 w-full h-2 ${selectedReceipt.status === 'Void' ? 'bg-red-600' : 'bg-blue-600'}`}></div>
            
            {selectedReceipt.status === 'Void' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 opacity-10 pointer-events-none">
                <span className="text-9xl font-black border-8 border-red-600 p-8 text-red-600">VOID</span>
              </div>
            )}

            <div className="text-center mb-10">
              <div className={`inline-flex p-4 rounded-xl mb-4 text-white ${selectedReceipt.status === 'Void' ? 'bg-red-600' : 'bg-black'}`}>
                <Receipt size={32} />
              </div>
              <h2 className="text-3xl font-black tracking-tighter uppercase">Purchase Receipt</h2>
              <p className="text-xs font-bold text-gray-500 mt-1">REC-ID: {selectedReceipt.id} • ORD-ID: {selectedReceipt.purchaseOrderId}</p>
            </div>

            <div className="space-y-4 text-sm mb-10 border-y-2 border-dashed border-gray-200 py-6">
              <div className="flex justify-between"><span className="font-bold text-gray-400">CUSTOMER</span><span className="font-black">{selectedReceipt.customerName}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-400">EMAIL</span><span className="font-black">{selectedReceipt.customerEmail}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-400">VEHICLE</span><span className="font-black">{selectedReceipt.carInfo}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-400">COPY</span><span className="font-black uppercase">{selectedReceipt.isOwnerCopy ? 'Owner Master' : 'Customer Copy'}</span></div>
            </div>

            <div className="space-y-4 mb-10">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Transaction Details</p>
              {selectedReceipt.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <div>
                    <p className="font-black uppercase text-sm">{item.ItemName || item.itemName}</p>
                    <p className="text-[10px] text-gray-500">QTY: {item.Quantity || item.quantity}</p>
                  </div>
                  <span className="font-black">${(item.Subtotal || item.subtotal || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t-4 border-double border-black pt-8 mb-10 flex justify-between items-end">
              <span className="font-black text-2xl uppercase">Total</span>
              <span className="font-black text-4xl">${selectedReceipt.totalAmount.toFixed(2)}</span>
            </div>

            <button 
              onClick={() => setSelectedReceipt(null)}
              className="w-full bg-black text-white py-4 font-black uppercase tracking-widest hover:bg-gray-900 transition-all"
            >
              Close Archive
            </button>
            
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

export default PurchaseReceiptsPage;
