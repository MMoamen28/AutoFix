import React, { useEffect, useState } from 'react';
import { dashboardService, CustomerDashboardData } from '../../services/dashboardService';
import { Car, ClipboardList, FileText, CheckCircle, Clock, Printer, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const CustomerDashboardPage: React.FC = () => {
  const [data, setData] = useState<CustomerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getCustomerDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load customer dashboard', err);
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

  if (!data) return <div style={{ padding: '24px' }}>Customer profile not found or not linked.</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card), rgba(220, 38, 38, 0.15))',
        borderRadius: '16px',
        padding: '24px 32px',
        marginBottom: '28px',
        border: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>
            Welcome, {data.customerName} (أهلاً بك)
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '6px 0 0' }}>
            Phone: {data.phone} {data.email ? `| Email: ${data.email}` : ''}
          </p>
        </div>
        <button 
          onClick={loadData}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            padding: '8px 16px', borderRadius: '8px', color: 'var(--text-primary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Grid: My Cars & Active Orders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* My Vehicles */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Car size={20} color="var(--accent)" /> My Vehicles (سياراتي المسجلة)
          </h2>
          {data.myCars.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No vehicles registered yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.myCars.map(c => (
                <div key={c.id} style={itemStyle}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{c.make} {c.model} ({c.year})</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Plate: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{c.licensePlate}</span> | VIN: {c.vin}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Odometer:<br /><strong style={{ color: 'var(--text-primary)' }}>{c.currentOdometerKm?.toLocaleString()} KM</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Work Orders */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="#3b82f6" /> Active Workshop Jobs (أوامر الشغل الحالية)
          </h2>
          {data.activeOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No active workshop jobs in progress.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.activeOrders.map(wo => (
                <div key={wo.id} style={itemStyle}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{wo.orderNumber}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {wo.carMake} {wo.carModel} ({wo.carPlate})
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Complaint: {wo.customerComplaint}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                      backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', textTransform: 'uppercase'
                    }}>
                      {wo.status}
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '6px' }}>
                      {wo.totalAmount.toLocaleString()} EGP
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Finalized Vehicle Inspection Reports */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} color="#10b981" /> Comprehensive Inspection Reports (تقارير الفحص الفني المعتمدة)
        </h2>
        {data.finalizedInspections.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No finalized inspection reports available yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {data.finalizedInspections.map(insp => (
              <div key={insp.id} style={{ ...itemStyle, flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>{insp.reportNumber}</div>
                  <span style={{
                    padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                    backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981'
                  }}>
                    SCORE: {insp.overallScore}% ({insp.generalVerdict})
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Vehicle: <strong>{insp.carMakeModel}</strong> ({insp.carPlate})<br />
                  Inspection Date: {new Date(insp.inspectedAt).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px' }}>
                  <Link 
                    to={`/inspections/${insp.id}/print`}
                    target="_blank"
                    style={{
                      flex: 1, textAlign: 'center', padding: '8px 12px', borderRadius: '8px',
                      background: 'var(--accent)', color: 'white', textDecoration: 'none',
                      fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <Printer size={15} /> View & Print (A4)
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid var(--border)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 16px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.06)'
};

export default CustomerDashboardPage;
