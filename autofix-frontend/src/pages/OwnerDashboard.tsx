import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Users, Wrench, Package, 
  ArrowUpRight, ArrowDownRight, Clock, 
  CheckCircle2, AlertCircle, MoreHorizontal,
  DollarSign, Activity, Calendar
} from 'lucide-react';
import receiptService, { Receipt } from '../services/receiptService';
import actionRequestService, { ActionRequest } from '../services/actionRequestService';
import customerService from '../services/customerService';
import mechanicService from '../services/mechanicService';
import sparePartService from '../services/sparePartService';
import { toast } from 'react-hot-toast';

const OwnerDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    revenue: 0,
    customers: 0,
    mechanics: 0,
    parts: 0,
    pendingApprovals: 0
  });
  const [pendingRequests, setPendingRequests] = useState<ActionRequest[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [receipts, customers, mechanics, parts, requests] = await Promise.all([
          receiptService.getAll().catch(() => []),
          customerService.getAllCustomers().catch(() => []),
          mechanicService.getAll().catch(() => []),
          sparePartService.getAll().catch(() => []),
          actionRequestService.getPending().catch(() => [])
        ]);

        const totalRevenue = receipts.reduce((sum: number, r: any) => sum + (r.totalCost || r.totalAmount || 0), 0);

        setStats({
          revenue: totalRevenue,
          customers: customers.length,
          mechanics: mechanics.length,
          parts: parts.length,
          pendingApprovals: requests.length
        });

        setPendingRequests(requests);
        setRecentReceipts(receipts.slice(0, 5));
      } catch (err) {
        toast.error('Failed to load dashboard intelligence');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Owner Dashboard</h1>
          <p className="text-gray-400 mt-1">Overview of your workshop operations</p>
        </div>
        <div className="flex space-x-4">
          <Link to="/owner/all-data" className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all border border-gray-700">
            System Data
          </Link>
          <Link to="/mechanics" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-500/20">
            Manage Mechanics
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="text-green-400" size={24} />
            <span className="text-green-400 text-xs font-medium bg-green-400/10 px-2 py-1 rounded-full">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-white">${stats.revenue.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-1">Total receipts</p>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="text-blue-400" size={24} />
            <span className="text-blue-400 text-xs font-medium bg-blue-400/10 px-2 py-1 rounded-full">Customers</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.customers}</p>
          <p className="text-gray-500 text-xs mt-1">Registered customers</p>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Wrench className="text-purple-400" size={24} />
            <span className="text-purple-400 text-xs font-medium bg-purple-400/10 px-2 py-1 rounded-full">Mechanics</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.mechanics}</p>
          <p className="text-gray-500 text-xs mt-1">Active mechanics</p>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Package className="text-amber-400" size={24} />
            <span className="text-amber-400 text-xs font-medium bg-amber-400/10 px-2 py-1 rounded-full">Inventory</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.parts}</p>
          <p className="text-gray-500 text-xs mt-1">Spare parts in stock</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pending Approvals Card */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all group">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3 animate-pulse"></span>
              Pending Approvals
            </h2>
            <span className="bg-yellow-400/10 text-yellow-400 px-3 py-1 rounded-full text-xs font-medium">
              {pendingRequests.length} Waiting
            </span>
          </div>
          
          <div className="space-y-4">
            {pendingRequests.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No pending actions to review.</p>
            ) : (
              pendingRequests.slice(0, 3).map(req => (
                <div key={req.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">{req.actionType}</p>
                    <p className="text-xs text-gray-400">Requested by {req.mechanicName} • {new Date(req.requestedAt).toLocaleDateString()}</p>
                  </div>
                  <Link to={`/owner/requests/${req.id}`} className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                    Review →
                  </Link>
                </div>
              ))
            )}
            {pendingRequests.length > 3 && (
              <Link to="/owner/requests" className="block text-center text-sm text-gray-400 hover:text-white pt-2">
                View all pending requests
              </Link>
            )}
          </div>
        </div>

        {/* Revenue Snapshot Card */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 hover:border-purple-500/50 transition-all">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Receipts</h2>
            <Link to="/owner/receipts" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
              Full History →
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentReceipts.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No receipts generated yet.</p>
            ) : (
              recentReceipts.map(rec => (
                <div key={rec.id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{rec.customerName}</p>
                    <p className="text-xs text-gray-500">{rec.carInfo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">${rec.totalCost.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-500">{new Date(rec.issuedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
