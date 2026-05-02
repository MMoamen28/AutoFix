import React, { useEffect, useState } from 'react';
import receiptService, { Receipt } from '../services/receiptService';
import { toast } from 'react-hot-toast';

const ReceiptsPage: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const data = await receiptService.getOwnerCopies();
      setReceipts(data);
    } catch (error) {
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async (id: number) => {
    if (!window.confirm('Are you sure you want to void this receipt? This action cannot be undone.')) return;
    try {
      await receiptService.voidReceipt(id);
      toast.success('Receipt voided');
      loadReceipts();
    } catch (error) {
      toast.error('Failed to void receipt');
    }
  };

  const filtered = receipts.filter(r => 
    r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.carInfo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-white">Loading receipts...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-white">System Receipts</h1>
        <input 
          type="text"
          placeholder="Search by customer or car..."
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500 w-full md:w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-800/50 border-b border-gray-800">
              <th className="px-6 py-4 text-gray-400 font-medium text-sm">Date</th>
              <th className="px-6 py-4 text-gray-400 font-medium text-sm">Customer</th>
              <th className="px-6 py-4 text-gray-400 font-medium text-sm">Car</th>
              <th className="px-6 py-4 text-gray-400 font-medium text-sm">Amount</th>
              <th className="px-6 py-4 text-gray-400 font-medium text-sm">Status</th>
              <th className="px-6 py-4 text-gray-400 font-medium text-sm">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4 text-gray-300 text-sm">{new Date(r.issuedAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <p className="text-white font-medium">{r.customerName}</p>
                  <p className="text-xs text-gray-500">{r.customerEmail}</p>
                </td>
                <td className="px-6 py-4 text-gray-300 text-sm">{r.carInfo}</td>
                <td className="px-6 py-4 font-bold text-green-400">${r.totalCost.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    r.status === 'Issued' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {r.status === 'Issued' && (
                    <button 
                      onClick={() => handleVoid(r.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-semibold"
                    >
                      Void
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReceiptsPage;
