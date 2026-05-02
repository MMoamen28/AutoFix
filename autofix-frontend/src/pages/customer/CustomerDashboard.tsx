import React from 'react';
import { Car, ClipboardList, Clock, ShieldCheck, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();

  const quickStats = [
    { label: 'My Vehicles', value: '2', icon: Car, color: 'text-blue-400' },
    { label: 'Active Orders', value: '1', icon: Clock, color: 'text-amber-400' },
    { label: 'Loyalty Points', value: '450', icon: Star, color: 'text-purple-400' },
  ];

  return (
    <div className="p-8 space-y-10 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Welcome back, <span className="text-blue-500">{user?.preferred_username || 'Customer'}</span>
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Your vehicle's health is our top priority.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl px-6 py-3 flex items-center gap-3">
            <ShieldCheck className="text-green-400" size={24} />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Account Status</p>
              <p className="text-white font-semibold text-sm">Verified Member</p>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickStats.map((stat, i) => (
          <div key={i} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 hover:border-blue-500/50 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className={`w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className={stat.color} size={28} />
              </div>
              <span className="text-gray-600 font-bold text-sm">Real-time Data</span>
            </div>
            <p className="text-4xl font-black text-white mb-1">{stat.value}</p>
            <p className="text-gray-500 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Service Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <Clock size={24} className="animate-pulse" />
              <span className="uppercase tracking-widest text-xs font-bold opacity-80">Current Service Status</span>
            </div>
            <h3 className="text-3xl font-black mb-4">BMW X5 - Oil Change</h3>
            <p className="text-blue-100 mb-8 max-w-sm">Our master technician <span className="font-bold text-white">Ahmed</span> is currently working on your vehicle. Estimated completion in 45 minutes.</p>
            <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden mb-10">
              <div className="bg-white h-full rounded-full w-[65%] shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
            </div>
            <button className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-colors shadow-lg">
              View Detailed Progress
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-10 flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <ClipboardList className="text-blue-400" size={24} />
              Recent Service History
            </h3>
            <button className="text-blue-400 text-sm font-bold hover:underline">View All</button>
          </div>
          
          <div className="space-y-6 flex-1">
            {[
              { car: 'Toyota Camry', service: 'Brake Pad Replacement', date: 'Oct 12, 2023', cost: '$180.00' },
              { car: 'Toyota Camry', service: 'Full Inspection', date: 'Sep 05, 2023', cost: '$120.00' },
              { car: 'BMW X5', service: 'Tire Rotation', date: 'Aug 22, 2023', cost: '$60.00' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                    <Car className="text-gray-400" size={20} />
                  </div>
                  <div>
                    <p className="text-white font-bold">{item.car}</p>
                    <p className="text-xs text-gray-500">{item.service} • {item.date}</p>
                  </div>
                </div>
                <p className="text-white font-black">{item.cost}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
