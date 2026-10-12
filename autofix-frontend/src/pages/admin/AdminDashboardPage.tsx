import React, { useEffect, useState } from 'react';
import { dashboardService, AdminDashboardData } from '../../services/dashboardService';
import { 
  ClipboardList, DollarSign, Users, Car, AlertTriangle, 
  CheckCircle, Clock, FileText, ArrowRight, TrendingUp, RefreshCw 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Money from '../../components/shared/Money';

const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getAdminDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load admin dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <RefreshCw className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  if (!data) return <div>Failed to load dashboard data.</div>;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>Workshop Overview (لوحة التحكم الرئيسية)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0' }}>
            Real-time status of workshop jobs, revenue, inventory, and inspections
          </p>
        </div>
        <button 
          onClick={loadData}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            padding: '8px 16px', borderRadius: '8px', color: 'var(--text-primary)',
            cursor: 'pointer', fontWeight: 600
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '16px', 
        marginBottom: '28px' 
      }}>
        {/* Active Work Orders */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIVE JOBS (أوامر الشغل)</span>
            <div style={{ ...kpiIconBox, backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <ClipboardList size={22} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px' }}>{data.totalActiveWorkOrders}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {data.pendingOrdersCount} Pending | {data.inProgressOrdersCount} In Progress
          </div>
        </div>

        {/* Today's Revenue */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>TODAY'S REVENUE (إيراد اليوم)</span>
            <div style={{ ...kpiIconBox, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <DollarSign size={22} />
            </div>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '8px', color: '#10b981' }}>
            <Money value={data.todayRevenue} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Month: <Money value={data.monthRevenue} />
          </div>
        </div>

        {/* Receivables */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>OUTSTANDING (متبقي فواتير)</span>
            <div style={{ ...kpiIconBox, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <TrendingUp size={22} />
            </div>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '8px', color: '#f59e0b' }}>
            <Money value={data.outstandingReceivables} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Pending Customer Payments</div>
        </div>

        {/* Customers & Cars */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>CUSTOMERS & CARS</span>
            <div style={{ ...kpiIconBox, backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <Users size={22} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px' }}>
            {data.totalCustomers} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Cust / {data.totalCars} Cars</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Inspections: {data.totalInspectionsCount} Total
          </div>
        </div>

        {/* Low Stock Warning */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>LOW STOCK (نواقص المخزن)</span>
            <div style={{ ...kpiIconBox, backgroundColor: data.lowStockPartsCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: data.lowStockPartsCount > 0 ? '#ef4444' : '#10b981' }}>
              <AlertTriangle size={22} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: data.lowStockPartsCount > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {data.lowStockPartsCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {data.lowStockPartsCount > 0 ? 'Parts below minimum threshold' : 'Stock levels optimal'}
          </div>
        </div>
      </div>

      {/* Main Sections: Recent Work Orders & Inspections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        {/* Recent Work Orders */}
        <div style={sectionCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={20} color="var(--accent)" /> Recent Work Orders (أحدث أوامر الشغل)
            </h2>
            <Link to="/work-orders" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              View All →
            </Link>
          </div>

          {data.recentWorkOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No active work orders found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.recentWorkOrders.map(wo => (
                <div key={wo.id} style={listItemStyle}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{wo.orderNumber}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {wo.customerName} - {wo.carMake} {wo.carModel} ({wo.carPlate})
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      ...statusChipStyle,
                      backgroundColor: wo.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' :
                                       wo.status === 'InProgress' ? 'rgba(59, 130, 246, 0.15)' :
                                       wo.status === 'Delivered' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: wo.status === 'Completed' ? '#10b981' :
                             wo.status === 'InProgress' ? '#3b82f6' :
                             wo.status === 'Delivered' ? '#8b5cf6' : '#f59e0b'
                    }}>
                      {wo.status}
                    </span>
                    <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px' }}>
                      <Money value={wo.totalAmount} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Inspections */}
        <div style={sectionCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="var(--accent)" /> Recent Inspections (فحص السيارات)
            </h2>
            <Link to="/inspections" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              View All →
            </Link>
          </div>

          {data.recentInspections.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No vehicle inspection reports yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.recentInspections.map(insp => (
                <div key={insp.id} style={listItemStyle}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{insp.reportNumber}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {insp.customerName} - {insp.carMakeModel} ({insp.carPlate})
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      ...statusChipStyle,
                      backgroundColor: insp.status === 'Final' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: insp.status === 'Final' ? '#10b981' : '#f59e0b'
                    }}>
                      {insp.status} ({insp.overallScore}%)
                    </span>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(insp.inspectedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const kpiCardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '12px',
  padding: '20px',
  border: '1px solid var(--border)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
};

const kpiIconBox: React.CSSProperties = {
  width: '42px',
  height: '42px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const sectionCardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid var(--border)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
};

const listItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.06)'
};

const statusChipStyle: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase'
};

export default AdminDashboardPage;
