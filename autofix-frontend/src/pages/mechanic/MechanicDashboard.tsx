import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Wrench, CheckCircle, Play, Package, ArrowRight, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import repairOrderService from '../../services/repairOrderService';
import signalRService from '../../services/signalRService';

const MechanicDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const unsub = signalRService.on("order-updated", fetchData);
    return () => { unsub(); };
  }, []);

  const fetchData = async () => {
    try {
      const [orderRes, availableRes] = await Promise.all([
        repairOrderService.getAll(),
        repairOrderService.getAvailable().catch(() => [])
      ]);
      setOrders(orderRes);
      setAvailableCount(availableRes.length);
    } catch (err) {
      console.error('Failed to fetch mechanic dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const assignedOrders = orders.filter(o => o.status === 'AssignedToMechanic');
  const inProgressOrders = orders.filter(o => o.status === 'InProgress');
  const completedToday = orders.filter(o => o.status === 'Completed' && new Date(o.completedAt || '').toDateString() === new Date().toDateString());

  const stats = [
    { 
      label: 'Assigned Jobs', 
      value: assignedOrders.length, 
      icon: ClipboardList, 
      color: 'text-blue-400',
      bgColor: 'rgba(59,130,246,0.1)'
    },
    { 
      label: 'In Progress', 
      value: inProgressOrders.length, 
      icon: Play, 
      color: 'text-amber-400',
      bgColor: 'rgba(245,158,11,0.1)'
    },
    { 
      label: 'Completed Today', 
      value: completedToday.length, 
      icon: CheckCircle, 
      color: 'text-emerald-400',
      bgColor: 'rgba(16,185,129,0.1)'
    },
    { 
      label: 'Available Requests', 
      value: availableCount, 
      icon: ClipboardList, 
      color: 'text-yellow-400',
      bgColor: 'rgba(234,179,8,0.1)'
    },
  ];

  return (
    <div className="p-8 space-y-10 animate-fade-in">
      <header>
        <h1 className="text-4xl font-black text-white tracking-tight">
          Technician Terminal: <span className="text-blue-500">{user?.preferred_username || 'Mechanic'}</span>
        </h1>
        <p className="text-gray-400 mt-2 text-lg">System online. Managing active repair and marketplace workflows.</p>
      </header>

      {availableCount > 0 && (
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid var(--warning)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ClipboardList size={20} color="var(--warning)" />
            <p style={{ fontWeight: 700, color: 'white', fontSize: '14px' }}>
              {availableCount} customer repair request(s) waiting for a mechanic
            </p>
          </div>
          <Link to="/mechanic/available-orders" style={{
            backgroundColor: 'var(--warning)',
            color: 'black',
            fontWeight: 800,
            fontSize: '12px',
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          }}>
            VIEW & CLAIM
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 hover:border-blue-500/50 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ backgroundColor: stat.bgColor }}
              >
                <stat.icon className={stat.color} size={28} />
              </div>
              <Wrench className="text-gray-800" size={24} />
            </div>
            <p className="text-4xl font-black text-white mb-1">{stat.value}</p>
            <p className="text-gray-500 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Active Jobs List */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-10">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <Package className="text-blue-400" size={24} />
              My Assigned Orders
            </h3>
            <Link to="/mechanic/orders" className="text-blue-400 text-sm font-bold hover:underline flex items-center gap-2">
              View All <ArrowRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {orders.filter(o => o.status !== 'Completed').slice(0, 5).map((order, i) => (
              <div key={i} className="group bg-gray-800/30 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 transition-all hover:bg-gray-800/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className={`w-3 h-12 rounded-full ${order.status === 'InProgress' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-bold text-gray-500 tracking-widest">#{order.id}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${order.status === 'InProgress' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
                          {order.status}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white">{order.carInfo?.split('—')[0]}</h4>
                      <p className="text-sm text-gray-500">Customer: {order.customerName}</p>
                    </div>
                  </div>
                  <Link to="/mechanic/orders" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Play size={16} />
                    Manage Order
                  </Link>
                </div>
              </div>
            ))}
            {orders.filter(o => o.status !== 'Completed').length === 0 && (
              <div className="text-center py-20 bg-gray-900/30 rounded-3xl border border-dashed border-gray-800">
                <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
                <p className="text-gray-500 font-medium">All assigned orders are completed.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/marketplace" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--accent-dim)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            textDecoration: 'none',
          }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '12px' 
            }}>
              <ShoppingBag size={20} color="var(--accent)" />
              <div>
                <p style={{ 
                  fontWeight: 700, color: 'white', fontSize: '14px' 
                }}>
                  Parts Marketplace
                </p>
                <p style={{ 
                  fontSize: '12px', color: 'var(--text-muted)' 
                }}>
                  Browse shared inventory and check part availability
                </p>
              </div>
            </div>
            <ArrowRight size={18} color="var(--accent)" />
          </Link>

          <Link to="/mechanic/available-orders" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.5)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            textDecoration: 'none',
          }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '12px' 
            }}>
              <ClipboardList size={20} color="var(--blue)" />
              <div>
                <p style={{ 
                  fontWeight: 700, color: 'white', fontSize: '14px' 
                }}>
                  Customer Requests
                </p>
                <p style={{ 
                  fontSize: '12px', color: 'var(--text-muted)' 
                }}>
                  {availableCount} new requests waiting for a technician
                </p>
              </div>
            </div>
            <ArrowRight size={18} color="var(--blue)" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MechanicDashboard;
