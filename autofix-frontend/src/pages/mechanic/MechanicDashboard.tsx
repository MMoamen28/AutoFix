import React from 'react';
import { ClipboardList, Wrench, Clock, CheckCircle, AlertTriangle, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MechanicDashboard: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Assigned Jobs', value: '4', icon: ClipboardList, color: 'text-blue-400' },
    { label: 'In Progress', value: '2', icon: Play, color: 'text-amber-400' },
    { label: 'Completed Today', value: '3', icon: CheckCircle, color: 'text-green-400' },
  ];

  const recentJobs = [
    { id: 'RO-2023-001', customer: 'Mohamed Salah', car: 'BMW X5', service: 'Engine Tuning', status: 'In Progress', priority: 'High' },
    { id: 'RO-2023-002', customer: 'Jane Doe', car: 'Toyota Camry', service: 'Brake Check', status: 'Pending', priority: 'Medium' },
    { id: 'RO-2023-003', customer: 'John Smith', car: 'Audi A4', service: 'Oil Change', status: 'Pending', priority: 'Low' },
  ];

  return (
    <div className="p-8 space-y-10 animate-fade-in">
      <header>
        <h1 className="text-4xl font-black text-white tracking-tight">
          Technician Terminal: <span className="text-blue-500">{user?.preferred_username || 'Mechanic'}</span>
        </h1>
        <p className="text-gray-400 mt-2 text-lg">System online. Managing active repair workflows.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 hover:border-blue-500/50 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <stat.icon className={stat.color} size={28} />
              </div>
              <Wrench className="text-gray-800" size={24} />
            </div>
            <p className="text-4xl font-black text-white mb-1">{stat.value}</p>
            <p className="text-gray-500 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Jobs List */}
        <div className="lg:col-span-2 bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-10">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <ClipboardList className="text-blue-400" size={24} />
              Current Work Queue
            </h3>
            <span className="bg-blue-600/10 text-blue-400 text-xs font-bold px-4 py-1.5 rounded-full border border-blue-500/20">
              {recentJobs.length} Tasks Total
            </span>
          </div>

          <div className="space-y-4">
            {recentJobs.map((job, i) => (
              <div key={i} className="group bg-gray-800/30 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 transition-all hover:bg-gray-800/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className={`w-3 h-12 rounded-full ${job.priority === 'High' ? 'bg-red-500' : job.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-bold text-gray-500 tracking-widest">{job.id}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${job.status === 'In Progress' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
                          {job.status}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white">{job.car} • {job.service}</h4>
                      <p className="text-sm text-gray-500">Customer: {job.customer}</p>
                    </div>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Play size={16} />
                    Continue Job
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Alerts / Notes */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-10 relative overflow-hidden group">
            <AlertTriangle className="text-amber-500 mb-6 group-hover:rotate-12 transition-transform" size={40} />
            <h4 className="text-xl font-bold text-white mb-2">Inventory Alert</h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">Brake Fluid (Dot 4) is running low. Please notify the owner or update stock levels.</p>
            <button className="text-amber-500 font-bold text-sm hover:underline">Manage Inventory →</button>
          </div>

          <div className="bg-blue-600/10 border border-blue-600/20 rounded-[2.5rem] p-10">
            <Clock className="text-blue-500 mb-6" size={40} />
            <h4 className="text-xl font-bold text-white mb-2">Shift Overview</h4>
            <div className="space-y-4 mt-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Clocked In</span>
                <span className="text-white font-bold">08:00 AM</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Active Time</span>
                <span className="text-white font-bold">6h 15m</span>
              </div>
              <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-4">
                <div className="bg-blue-500 h-full w-[78%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MechanicDashboard;
