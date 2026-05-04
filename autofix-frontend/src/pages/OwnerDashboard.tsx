import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Users, Wrench, Package, 
  DollarSign, Activity, Bell, FileText
} from 'lucide-react';
import receiptService, { Receipt } from '../services/receiptService';
import actionRequestService, { ActionRequest } from '../services/actionRequestService';
import customerService from '../services/customerService';
import mechanicService from '../services/mechanicService';
import sparePartService from '../services/sparePartService';
import { useToast } from '../hooks/useToast';
import StatCard from '../components/shared/StatCard';
import Table from '../components/shared/Table';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import Skeleton from '../components/shared/Skeleton';

const OwnerDashboard: React.FC = () => {
  const { showToast } = useToast();
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
        showToast('Failed to load dashboard intelligence', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white' }}>Admin Intelligence</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Strategic overview of workshop operations</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" onClick={() => window.location.href='/owner/all-data'}>System Data</Button>
          <Button onClick={() => window.location.href='/mechanics'}>Team Management</Button>
        </div>
      </header>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <StatCard 
          label="Total Revenue" 
          value={`$${stats.revenue.toLocaleString()}`} 
          icon={<DollarSign size={24} />} 
          color="var(--success)"
          trend={{ value: '+12%', isPositive: true }}
        />
        <StatCard 
          label="Total Customers" 
          value={stats.customers} 
          icon={<Users size={24} />} 
          color="var(--blue)"
          trend={{ value: '+5', isPositive: true }}
        />
        <StatCard 
          label="Active Mechanics" 
          value={stats.mechanics} 
          icon={<Wrench size={24} />} 
          color="var(--purple)"
        />
        <StatCard 
          label="Pending Approvals" 
          value={stats.pendingApprovals} 
          icon={<Bell size={24} />} 
          color="var(--warning)"
          trend={{ value: '-2', isPositive: false }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Approvals Section */}
        <section style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Critical Approvals</h2>
            <Link to="/owner/requests" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700 }}>VIEW ALL</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pendingRequests.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>No pending actions to review.</p>
            ) : (
              pendingRequests.slice(0, 4).map(req => (
                <div key={req.id} style={itemRowStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                      <Activity size={18} color="var(--accent)" />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '14px' }}>{req.actionType}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.mechanicName} • {new Date(req.requestedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant="warning">PENDING</Badge>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Transactions */}
        <section style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Recent Transactions</h2>
            <Link to="/owner/receipts" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700 }}>VIEW ALL</Link>
          </div>
          <Table 
            columns={[
              { header: 'Customer', key: 'customerName' },
              { header: 'Vehicle', key: 'carInfo' },
              { header: 'Amount', key: 'totalCost', render: (r) => <span style={{ fontWeight: 800, color: 'var(--success)' }}>${r.totalCost.toFixed(2)}</span> }
            ]}
            data={recentReceipts}
          />
        </section>
      </div>
    </div>
  );
};

const sectionCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: 'var(--radius-xl)',
  border: '1px solid var(--border)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px'
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '16px',
  borderBottom: '1px solid var(--border)'
};

const itemRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'rgba(0,0,0,0.1)',
  border: '1px solid var(--border)'
};

export default OwnerDashboard;
