import React, { useEffect, useState } from 'react';
import { 
  Database, Users, Wrench, Package, 
  Search, Filter, ChevronRight, FileText,
  Activity, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import customerService from '../services/customerService';
import mechanicService from '../services/mechanicService';
import sparePartService from '../services/sparePartService';
import receiptService from '../services/receiptService';
import { toast } from 'react-hot-toast';

const AllDataPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'customers' | 'mechanics' | 'parts' | 'receipts'>('customers');
  const [data, setData] = useState<any>({
    customers: [],
    mechanics: [],
    parts: [],
    receipts: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [c, m, p, r] = await Promise.all([
          customerService.getAll(),
          mechanicService.getAll(),
          sparePartService.getAll(),
          receiptService.getAll()
        ]);
        setData({ customers: c, mechanics: m, parts: p, receipts: r });
      } catch (err) {
        toast.error('Failed to load system data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const tabs = [
    { id: 'customers', label: 'Customers', icon: Users, color: 'blue' },
    { id: 'mechanics', label: 'Mechanics', icon: Wrench, color: 'purple' },
    { id: 'parts', label: 'Inventory', icon: Package, color: 'emerald' },
    { id: 'receipts', label: 'Receipts', icon: FileText, color: 'amber' }
  ];

  const filteredData = data[activeTab].filter((item: any) => {
    const searchStr = JSON.stringify(item).toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 mb-2 cursor-pointer hover:text-blue-300 transition-colors" onClick={() => navigate('/owner')}>
            <ArrowLeft size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Back to Hub</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Database className="text-blue-500" size={32} />
            System Explorer
          </h1>
          <p className="text-gray-400 mt-1">Full-scale access to all system entities and records.</p>
        </div>

        <div className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-2 w-full md:w-96 focus-within:border-blue-500/50 transition-all">
          <Search size={18} className="text-gray-500" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-white w-full"
          />
          <Filter size={18} className="text-gray-500" />
        </div>
      </header>

      {/* Modern Tab Bar */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setSearchTerm(''); }}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all
              ${activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}
            `}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-800/20">
                <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">ID</th>
                {activeTab === 'customers' && (
                  <>
                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Name</th>
                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Contact</th>
                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Joined</th>
                  </>
                )}
                {activeTab === 'mechanics' && (
                  <>
                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Name</th>
                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Email</th>
                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Specialization</th>
                  </>
                )}
                {activeTab === 'parts' && (
                  <>
                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Part Name</th>
                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Price</th>
                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Stock</th>
                  </>
                )}
                {activeTab === 'receipts' && (
                  <>
                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Customer</th>
                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Date</th>
                  </>
                )}
                <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredData.map((item: any) => (
                <tr key={item.id} className="hover:bg-blue-600/5 transition-colors group">
                  <td className="px-6 py-5 text-sm font-bold text-gray-400">#{item.id}</td>
                  {activeTab === 'customers' && (
                    <>
                      <td className="px-6 py-5 font-bold text-white">{item.fullName}</td>
                      <td className="px-6 py-5 text-sm text-gray-400">{item.email}</td>
                      <td className="px-6 py-5 text-sm text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                    </>
                  )}
                  {activeTab === 'mechanics' && (
                    <>
                      <td className="px-6 py-5 font-bold text-white">{item.firstName} {item.lastName}</td>
                      <td className="px-6 py-5 text-sm text-gray-400">{item.email}</td>
                      <td className="px-6 py-5"><span className="badge badge-primary">Certified</span></td>
                    </>
                  )}
                  {activeTab === 'parts' && (
                    <>
                      <td className="px-6 py-5 font-bold text-white">{item.name}</td>
                      <td className="px-6 py-5 font-bold text-blue-400">${item.unitPrice}</td>
                      <td className="px-6 py-5">
                        <span className={`badge ${item.stockQuantity < 10 ? 'badge-danger' : 'badge-success'}`}>
                          {item.stockQuantity} in stock
                        </span>
                      </td>
                    </>
                  )}
                  {activeTab === 'receipts' && (
                    <>
                      <td className="px-6 py-5 font-bold text-white">{item.customerName}</td>
                      <td className="px-6 py-5 font-bold text-emerald-400">${item.totalAmount}</td>
                      <td className="px-6 py-5 text-sm text-gray-500">{new Date(item.generatedAt).toLocaleDateString()}</td>
                    </>
                  )}
                  <td className="px-6 py-5">
                    <button className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-800 rounded-3xl flex items-center justify-center mx-auto text-gray-600">
                <Search size={32} />
              </div>
              <p className="text-gray-500 font-medium">No records found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllDataPage;
