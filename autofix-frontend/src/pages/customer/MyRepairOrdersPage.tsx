import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Car, Wrench, Clock, 
  CheckCircle, XCircle, User, AlertCircle
} from 'lucide-react';
import { repairOrderService } from '../../services/repairOrderService';
import { useToast } from '../../hooks/useToast';
import Skeleton from '../../components/shared/Skeleton';

const MyRepairOrdersPage: React.FC = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await repairOrderService.getMyOrders();
      setOrders(data);
    } catch (err) {
      showToast('Failed to load your repair orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock size={18} color="var(--warning)" />;
      case 'InProgress': return <Wrench size={18} color="var(--blue)" />;
      case 'Completed': return <CheckCircle size={18} color="var(--success)" />;
      case 'Cancelled': return <XCircle size={18} color="var(--danger)" />;
      default: return <AlertCircle size={18} color="var(--text-muted)" />;
    }
  };

  const getStatusStyle = (status: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 14px',
    borderRadius: '99px',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    backgroundColor:
      status === 'Completed' ? 'var(--success-dim)' :
      status === 'InProgress' ? 'var(--blue-dim)' :
      status === 'Cancelled' ? 'var(--danger-dim)' :
      'var(--warning-dim)',
    color:
      status === 'Completed' ? 'var(--success)' :
      status === 'InProgress' ? 'var(--blue)' :
      status === 'Cancelled' ? 'var(--danger)' :
      'var(--warning)',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <header>
        <h1 style={{ 
          fontSize: '28px', fontWeight: 800, color: 'white', 
          marginBottom: '6px' 
        }}>
          My Repair Requests
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Track your vehicle repair orders and see which mechanic 
          is working on your car
        </p>
      </header>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1,2,3].map(i => (
            <Skeleton key={i} height="160px" borderRadius="var(--radius-xl)" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '80px',
          textAlign: 'center'
        }}>
          <ClipboardList size={56} color="var(--text-muted)" 
            style={{ marginBottom: '16px', opacity: 0.4 }} />
          <h3 style={{ 
            fontSize: '18px', fontWeight: 700, color: 'white', 
            marginBottom: '8px' 
          }}>
            No repair requests yet
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Go to My Garage and book a service to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(order => (
            <div key={order.id} style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Top Row */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start' 
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '14px' 
                }}>
                  <div style={{
                    width: '48px', height: '48px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--accent-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)'
                  }}>
                    <Car size={24} />
                  </div>
                  <div>
                    <p style={{ 
                      fontSize: '11px', color: 'var(--text-muted)', 
                      fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.5px', marginBottom: '3px'
                    }}>
                      Order #{order.id}
                    </p>
                    <p style={{ 
                      fontSize: '18px', fontWeight: 800, color: 'white' 
                    }}>
                      {order.carInfo}
                    </p>
                    <p style={{ 
                      fontSize: '12px', color: 'var(--text-muted)' 
                    }}>
                      Plate: {order.carPlate} • 
                      Requested: {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span style={getStatusStyle(order.status)}>
                  {getStatusIcon(order.status)}
                  {order.status}
                </span>
              </div>

              {/* Services */}
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '6px' 
              }}>
                {order.services?.map((s: string, idx: number) => (
                  <span key={idx} style={{
                    backgroundColor: 'var(--accent-dim)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    padding: '3px 10px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {s}
                  </span>
                ))}
              </div>

              {/* Mechanic Assignment Status */}
              <div style={{
                backgroundColor: order.mechanicName 
                  ? 'var(--blue-dim)' 
                  : 'rgba(0,0,0,0.15)',
                border: `1px solid ${order.mechanicName 
                  ? 'var(--blue)' 
                  : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  backgroundColor: order.mechanicName 
                    ? 'var(--blue)' 
                    : 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {order.mechanicName 
                    ? <Wrench size={18} color="white" />
                    : <Clock size={18} color="var(--text-muted)" />
                  }
                </div>
                <div>
                  <p style={{ 
                    fontSize: '10px', 
                    fontWeight: 800,
                    color: order.mechanicName 
                      ? 'var(--blue)' 
                      : 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '2px'
                  }}>
                    {order.mechanicName 
                      ? 'Assigned Mechanic' 
                      : 'Awaiting Mechanic'}
                  </p>
                  <p style={{ 
                    fontSize: '15px', 
                    fontWeight: 700,
                    color: order.mechanicName ? 'white' : 'var(--text-muted)'
                  }}>
                    {order.mechanicName || 'A mechanic will claim your request shortly'}
                  </p>
                </div>
              </div>

              {/* Bottom Row */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid var(--border)'
              }}>
                <div>
                  <p style={{ 
                    fontSize: '10px', color: 'var(--text-muted)', 
                    fontWeight: 700, textTransform: 'uppercase' 
                  }}>
                    Total Cost
                  </p>
                  <p style={{ 
                    fontSize: '22px', fontWeight: 800, color: 'var(--success)' 
                  }}>
                    ${order.totalCost?.toFixed(2)}
                  </p>
                </div>
                {order.notes && (
                  <div style={{ 
                    maxWidth: '60%', 
                    textAlign: 'right' 
                  }}>
                    <p style={{ 
                      fontSize: '10px', color: 'var(--text-muted)', 
                      fontWeight: 700, textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}>
                      Your Notes
                    </p>
                    <p style={{ 
                      fontSize: '13px', 
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic'
                    }}>
                      "{order.notes}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyRepairOrdersPage;
