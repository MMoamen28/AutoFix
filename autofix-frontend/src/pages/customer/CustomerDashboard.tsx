import React, { useState, useEffect } from 'react';
import { 
  Car, Clock, CheckCircle, Star, ShoppingBag, 
  ArrowRight, Wrench, Shield, Calendar, Activity 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { carService } from '../../services/carService';
import { repairOrderService } from '../../services/repairOrderService';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { Link } from 'react-router-dom';
import StatCard from '../../components/shared/StatCard';
import Table from '../../components/shared/Table';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import Skeleton from '../../components/shared/Skeleton';

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [cars, setCars] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [repairRequests, setRepairRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [carRes, orderRes, repairRes] = await Promise.all([
        carService.getAll().catch(() => []),
        purchaseOrderService.getMyOrders().catch(() => []),
        repairOrderService.getMyOrders().catch(() => [])
      ]);
      setCars(carRes);
      setOrders(orderRes);
      // Filter repair requests for this customer if needed
      setRepairRequests(repairRes.slice(0, 5));
    } catch (err) {
      console.error('Failed to load customer dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter(o => ['Pending', 'AssignedToMechanic', 'InProgress'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'Completed');
  const totalSpent = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
      {[1, 2, 3, 4].map(i => <Skeleton key={i} height="160px" borderRadius="var(--radius-lg)" />)}
      <div style={{ gridColumn: 'span 2' }}><Skeleton height="400px" borderRadius="var(--radius-lg)" /></div>
      <div style={{ gridColumn: 'span 2' }}><Skeleton height="400px" borderRadius="var(--radius-lg)" /></div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white' }}>
            Welcome, <span style={{ color: 'var(--accent)' }}>{user?.preferred_username || 'Customer'}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Your vehicle maintenance and parts overview</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="ghost" onClick={() => window.location.href='/customer/cars'}>My Garage</Button>
          <Button onClick={() => window.location.href='/marketplace'} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} /> Marketplace
          </Button>
        </div>
      </header>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <StatCard 
          label="My Vehicles" 
          value={cars.length} 
          icon={<Car size={24} />} 
          color="var(--blue)"
        />
        <StatCard 
          label="Active Orders" 
          value={activeOrders.length} 
          icon={<Clock size={24} />} 
          color="var(--warning)"
        />
        <StatCard 
          label="Completed Repairs" 
          value={completedOrders.length} 
          icon={<CheckCircle size={24} />} 
          color="var(--success)"
        />
        <StatCard 
          label="Total Investment" 
          value={`$${totalSpent.toFixed(0)}`} 
          icon={<Star size={24} />} 
          color="var(--purple)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
        {/* Recent Service Requests */}
        <section style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <Wrench size={18} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Recent Service History</h2>
            </div>
            <Link to="/customer/repair-orders" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700 }}>VIEW RECORDS</Link>
          </div>
          
          <Table 
            columns={[
              { header: 'Vehicle', key: 'carInfo' },
              { header: 'Status', key: 'status', render: (val) => <Badge variant={val === 'Completed' ? 'success' : 'warning'}>{val}</Badge> },
              { header: 'Date', key: 'createdAt', render: (val) => new Date(val).toLocaleDateString() }
            ]}
            data={repairRequests}
          />
          {repairRequests.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No recent service records found.
            </div>
          )}
        </section>

        {/* My Garage Preview */}
        <section style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>My Garage</h2>
            <Link to="/customer/cars" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700 }}>MANAGE</Link>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cars.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Your garage is empty</p>
                <Button variant="ghost" onClick={() => window.location.href='/customer/cars'}>Add First Car</Button>
              </div>
            ) : (
              cars.slice(0, 3).map(car => (
                <div key={car.id} style={carItemStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                      <Car size={20} color="var(--blue)" />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '14px' }}>{car.make} {car.model}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{car.licensePlate}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              ))
            )}
            {cars.length > 3 && (
              <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                + {cars.length - 3} more vehicles
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const ChevronRight = ({ size, color }: { size: number, color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

const sectionCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: 'var(--radius-xl)',
  border: '1px solid var(--border)',
  padding: '28px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px'
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '20px',
  borderBottom: '1px solid var(--border)'
};

const carItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'rgba(255,255,255,0.02)',
  border: '1px solid var(--border)',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

export default CustomerDashboard;
