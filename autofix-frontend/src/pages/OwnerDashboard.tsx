import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Users, Wrench, Package, 
  DollarSign, FileText, ShoppingBag
} from 'lucide-react';
import receiptService, { Receipt } from '../services/receiptService';
import customerService from '../services/customerService';
import mechanicService from '../services/mechanicService';
import sparePartService from '../services/sparePartService';
import repairOrderService from '../services/repairOrderService';
import { useToast } from '../hooks/useToast';
import StatCard from '../components/shared/StatCard';
import Table from '../components/shared/Table';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import Skeleton from '../components/shared/Skeleton';
import signalRService from '../services/signalRService';

const OwnerDashboard: React.FC = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState({
    revenue: 0,
    customers: 0,
    mechanics: 0,
    parts: 0,
    activeRepairs: 0
  });
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [recentRepairs, setRecentRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [receipts, customers, mechanics, parts, repairOrders] = await Promise.all([
          receiptService.getAll().catch(() => []),
          customerService.getAllCustomers().catch(() => []),
          mechanicService.getAll().catch(() => []),
          sparePartService.getAll().catch(() => []),
          repairOrderService.getAll().catch(() => [])
        ]);

        const totalRevenue = receipts.reduce((sum: number, r: any) => sum + (r.totalCost || r.totalAmount || 0), 0);
        const activeRepairs = repairOrders.filter((r: any) => r.status !== 'Completed' && r.status !== 'Cancelled').length;

        setStats({
          revenue: totalRevenue,
          customers: customers.length,
          mechanics: mechanics.length,
          parts: parts.length,
          activeRepairs: activeRepairs
        });

        setRecentReceipts(repairOrders.slice(0, 6));
        setRecentRepairs(repairOrders.slice(0, 5));
      } catch (err) {
        showToast('Failed to load dashboard intelligence', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    const unsub1 = signalRService.on("order-updated", fetchDashboardData);
    const unsub3 = signalRService.on("repair-updated", fetchDashboardData);
    
    return () => { 
      unsub1(); 
      unsub3();
    };
  }, []);

  const thStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: '10px',
    fontWeight: 800,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    textAlign: 'left',
    whiteSpace: 'nowrap'
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap'
  };

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
      {[1, 2, 3, 4].map(i => <Skeleton key={i} height="160px" borderRadius="var(--radius-lg)" />)}
      <div style={{ gridColumn: 'span 2' }}><Skeleton height="400px" borderRadius="var(--radius-lg)" /></div>
      <div style={{ gridColumn: 'span 2' }}><Skeleton height="400px" borderRadius="var(--radius-lg)" /></div>
    </div>
  );

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px',
      width: '100%'
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white' }}>Admin Intelligence</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Strategic overview of workshop operations</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            to="/marketplace"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              border: '1px solid var(--border)'
            }}
          >
            <ShoppingBag size={18} /> View Marketplace
          </Link>
          <Button variant="secondary" onClick={() => window.location.href='/owner/all-data'}>System Data</Button>
          <Button onClick={() => window.location.href='/mechanics'}>Team Management</Button>
        </div>
      </header>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <StatCard 
          label="Total Revenue" 
          value={`$${stats.revenue.toLocaleString()}`} 
          icon={<DollarSign size={24} />} 
          color="var(--success)"
          trend={{ value: '+12%', isPositive: true }}
        />
        <StatCard 
          label="Active Repair Jobs" 
          value={stats.activeRepairs} 
          icon={<TrendingUp size={24} />} 
          color="var(--blue)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        {/* Recent Repair Orders Section */}
        <section style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border)'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'white' }}>
              Recent Repair Orders
            </h2>
            <Link 
              to="/repair-orders" 
              style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700 }}
            >
              VIEW ALL
            </Link>
          </div>

          {/* Compact Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ 
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Vehicle</th>
                  <th style={thStyle}>Mechanic</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentReceipts.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={6} 
                      style={{ 
                        padding: '24px', 
                        textAlign: 'center', 
                        color: 'var(--text-muted)',
                        fontSize: '13px'
                      }}
                    >
                      No recent repair orders found.
                    </td>
                  </tr>
                ) : (
                  recentReceipts.slice(0, 6).map((r: any, idx: number) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => 
                        (e.currentTarget.style.backgroundColor = 
                          'var(--bg-card-hover)')
                      }
                      onMouseLeave={e => 
                        (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 700, color: 'white' }}>
                          {r.customerName}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {r.carInfo}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {r.mechanicName || (
                            <span style={{ 
                              color: 'var(--warning)', 
                              fontSize: '11px', 
                              fontWeight: 700 
                            }}>
                              Unassigned
                            </span>
                          )}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 10px',
                          borderRadius: '99px',
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.5px',
                          backgroundColor: 
                            r.status === 'Completed' 
                              ? 'var(--success-dim)' 
                              : r.status === 'InProgress' 
                              ? 'var(--blue-dim)' 
                              : r.status === 'Cancelled'
                              ? 'var(--danger-dim)'
                              : 'var(--warning-dim)',
                          color: 
                            r.status === 'Completed' 
                              ? 'var(--success)' 
                              : r.status === 'InProgress' 
                              ? 'var(--blue)' 
                              : r.status === 'Cancelled' 
                              ? 'var(--danger)'
                              : 'var(--warning)',
                        }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ 
                          fontWeight: 800, 
                          color: 'var(--success)' 
                        }}>
                          ${(r.totalCost ?? r.totalAmount ?? 0).toFixed(2)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ 
                          color: 'var(--text-muted)', 
                          fontSize: '12px' 
                        }}>
                          {new Date(r.issuedAt ?? r.placedAt ?? 
                            r.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
