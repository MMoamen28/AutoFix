import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Car, User, Wrench, CheckCircle, 
  Clock, AlertCircle, ChevronRight, X, DollarSign,
  FileText, ArrowRight
} from 'lucide-react';
import { repairOrderService } from '../../services/repairOrderService';
import { useToast } from '../../hooks/useToast';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import Skeleton from '../../components/shared/Skeleton';

const AvailableRepairOrdersPage: React.FC = () => {
  const { showToast } = useToast();
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaimingId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'mine'>('available');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [available, mine] = await Promise.all([
        repairOrderService.getAvailable().catch(() => []),
        repairOrderService.getMyAssigned().catch(() => [])
      ]);
      setAvailableOrders(available);
      setMyOrders(mine);
    } catch (err) {
      showToast('Failed to load repair orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (orderId: number) => {
    setClaimingId(orderId);
    try {
      await repairOrderService.claimOrder(orderId);
      showToast('Repair order claimed successfully! Customer has been notified.', 'success');
      setSelectedOrder(null);
      fetchAll();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Failed to claim order', 
        'error'
      );
    } finally {
      setClaimingId(null);
    }
  };

  const handleMarkComplete = async (orderId: number) => {
    try {
      await repairOrderService.updateStatus(orderId, 'Completed');
      showToast('Order marked as completed!', 'success');
      fetchAll();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Failed to update status', 
        'error'
      );
    }
  };

  const getStatusStyle = (status: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      borderRadius: '99px',
      fontSize: '10px',
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    };
    switch (status) {
      case 'Pending': 
        return { ...base, 
          backgroundColor: 'var(--warning-dim)', 
          color: 'var(--warning)' 
        };
      case 'InProgress': 
        return { ...base, 
          backgroundColor: 'var(--blue-dim)', 
          color: 'var(--blue)' 
        };
      case 'Completed': 
        return { ...base, 
          backgroundColor: 'var(--success-dim)', 
          color: 'var(--success)' 
        };
      default: 
        return { ...base, 
          backgroundColor: 'var(--bg-secondary)', 
          color: 'var(--text-muted)' 
        };
    }
  };

  const displayOrders = activeTab === 'available' ? availableOrders : myOrders;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start' 
      }}>
        <div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 800, 
            color: 'white',
            marginBottom: '6px'
          }}>
            Repair Orders
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Browse available customer requests and manage your assignments
          </p>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '6px'
        }}>
          {/* Available Tab */}
          <button
            onClick={() => setActiveTab('available')}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: activeTab === 'available' 
                ? 'var(--accent)' 
                : 'transparent',
              color: activeTab === 'available' 
                ? 'white' 
                : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ClipboardList size={16} />
            Available
            {availableOrders.length > 0 && (
              <span style={{
                backgroundColor: activeTab === 'available' 
                  ? 'rgba(255,255,255,0.3)' 
                  : 'var(--accent)',
                color: 'white',
                borderRadius: '99px',
                padding: '1px 7px',
                fontSize: '10px',
                fontWeight: 800
              }}>
                {availableOrders.length}
              </span>
            )}
          </button>

          {/* My Orders Tab */}
          <button
            onClick={() => setActiveTab('mine')}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: activeTab === 'mine' 
                ? 'var(--accent)' 
                : 'transparent',
              color: activeTab === 'mine' 
                ? 'white' 
                : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Wrench size={16} />
            My Assignments
            {myOrders.length > 0 && (
              <span style={{
                backgroundColor: activeTab === 'mine' 
                  ? 'rgba(255,255,255,0.3)' 
                  : 'var(--blue)',
                color: 'white',
                borderRadius: '99px',
                padding: '1px 7px',
                fontSize: '10px',
                fontWeight: 800
              }}>
                {myOrders.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Info Banner for Available Tab */}
      {activeTab === 'available' && (
        <div style={{
          backgroundColor: 'var(--blue-dim)',
          border: '1px solid var(--blue)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertCircle size={18} color="var(--blue)" />
          <p style={{ 
            fontSize: '13px', 
            color: 'var(--blue)', 
            fontWeight: 600 
          }}>
            These are customer repair requests waiting for a mechanic. 
            Click "Claim This Job" to assign yourself and notify the customer.
          </p>
        </div>
      )}

      {/* Orders Grid */}
      {loading ? (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '20px' 
        }}>
          {[1,2,3,4].map(i => (
            <Skeleton key={i} height="260px" borderRadius="var(--radius-xl)" />
          ))}
        </div>
      ) : displayOrders.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '80px',
          textAlign: 'center'
        }}>
          <ClipboardList 
            size={56} 
            color="var(--text-muted)" 
            style={{ marginBottom: '16px', opacity: 0.4 }} 
          />
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: 700, 
            color: 'white', 
            marginBottom: '8px' 
          }}>
            {activeTab === 'available' 
              ? 'No available repair requests right now' 
              : 'You have no assigned orders yet'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {activeTab === 'available' 
              ? 'New customer requests will appear here automatically.'
              : 'Claim an available repair order to get started.'}
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '20px' 
        }}>
          {displayOrders.map(order => (
            <div
              key={order.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedOrder(order)}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Card Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: activeTab === 'available' 
                      ? 'var(--warning-dim)' 
                      : 'var(--blue-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: activeTab === 'available' 
                      ? 'var(--warning)' 
                      : 'var(--blue)'
                  }}>
                    <ClipboardList size={22} />
                  </div>
                  <div>
                    <p style={{ 
                      fontSize: '11px', 
                      color: 'var(--text-muted)', 
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Order #{order.id}
                    </p>
                    <p style={{ 
                      fontSize: '16px', 
                      fontWeight: 800, 
                      color: 'white' 
                    }}>
                      {order.carInfo}
                    </p>
                  </div>
                </div>
                <span style={getStatusStyle(order.status)}>
                  {order.status}
                </span>
              </div>

              {/* Customer Info */}
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.15)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px' 
                }}>
                  <User size={15} color="var(--text-muted)" />
                  <div>
                    <span style={{ 
                      fontSize: '10px', 
                      color: 'var(--text-muted)', 
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      Customer
                    </span>
                    <p style={{ 
                      fontSize: '14px', 
                      fontWeight: 700, 
                      color: 'white' 
                    }}>
                      {order.customerName}
                    </p>
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px' 
                }}>
                  <Car size={15} color="var(--text-muted)" />
                  <div>
                    <span style={{ 
                      fontSize: '10px', 
                      color: 'var(--text-muted)', 
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      License Plate
                    </span>
                    <p style={{ 
                      fontSize: '14px', 
                      fontWeight: 700, 
                      color: 'white' 
                    }}>
                      {order.carPlate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div>
                <p style={{ 
                  fontSize: '10px', 
                  fontWeight: 800, 
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Requested Services
                </p>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '6px' 
                }}>
                  {order.services?.map((service: string, idx: number) => (
                    <span key={idx} style={{
                      backgroundColor: 'var(--accent-dim)',
                      color: 'var(--accent)',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '99px',
                      border: '1px solid var(--accent)'
                    }}>
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)'
              }}>
                <div>
                  <p style={{ 
                    fontSize: '10px', 
                    color: 'var(--text-muted)', 
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    Total Value
                  </p>
                  <p style={{ 
                    fontSize: '20px', 
                    fontWeight: 800, 
                    color: 'var(--success)' 
                  }}>
                    ${order.totalCost?.toFixed(2)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {activeTab === 'available' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaim(order.id);
                      }}
                      disabled={claiming === order.id}
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 18px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: claiming === order.id 
                          ? 'not-allowed' 
                          : 'pointer',
                        opacity: claiming === order.id ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <CheckCircle size={16} />
                      {claiming === order.id ? 'Claiming...' : 'Claim This Job'}
                    </button>
                  )}
                  {activeTab === 'mine' && order.status === 'InProgress' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkComplete(order.id);
                      }}
                      style={{
                        backgroundColor: 'var(--success-dim)',
                        color: 'var(--success)',
                        border: '1px solid var(--success)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 18px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <CheckCircle size={16} />
                      Mark Complete
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                    }}
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '85vh',
              overflowY: 'auto',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '24px',
              paddingBottom: '20px',
              borderBottom: '1px solid var(--border)'
            }}>
              <div>
                <p style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-muted)', 
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px'
                }}>
                  Order #{selectedOrder.id} — Full Details
                </p>
                <h2 style={{ 
                  fontSize: '22px', 
                  fontWeight: 800, 
                  color: 'white' 
                }}>
                  {selectedOrder.carInfo}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={getStatusStyle(selectedOrder.status)}>
                  {selectedOrder.status}
                </span>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Info Rows */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              marginBottom: '24px'
            }}>
              {[
                { 
                  icon: <User size={16} />, 
                  label: 'Customer', 
                  value: selectedOrder.customerName 
                },
                { 
                  icon: <Car size={16} />, 
                  label: 'Vehicle', 
                  value: `${selectedOrder.carInfo} (${selectedOrder.carPlate})` 
                },
                { 
                  icon: <DollarSign size={16} />, 
                  label: 'Total Cost', 
                  value: `$${selectedOrder.totalCost?.toFixed(2)}`,
                  highlight: true 
                },
                { 
                  icon: <Clock size={16} />, 
                  label: 'Requested On', 
                  value: new Date(selectedOrder.createdAt).toLocaleString() 
                },
                ...(selectedOrder.mechanicName ? [{
                  icon: <Wrench size={16} />,
                  label: 'Assigned Mechanic',
                  value: selectedOrder.mechanicName,
                  success: true
                }] : []),
                ...(selectedOrder.notes ? [{
                  icon: <FileText size={16} />,
                  label: 'Customer Notes',
                  value: selectedOrder.notes
                }] : [])
              ].map((row, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '14px 16px',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <span style={{ 
                    color: 'var(--text-muted)', 
                    marginTop: '2px',
                    flexShrink: 0
                  }}>
                    {row.icon}
                  </span>
                  <div>
                    <p style={{ 
                      fontSize: '10px', 
                      fontWeight: 800, 
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '3px'
                    }}>
                      {row.label}
                    </p>
                    <p style={{ 
                      fontSize: '14px', 
                      fontWeight: 700,
                      color: (row as any).highlight 
                        ? 'var(--success)' 
                        : (row as any).success 
                        ? 'var(--blue)'
                        : 'white'
                    }}>
                      {row.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Services */}
            <div style={{ marginBottom: '28px' }}>
              <p style={{ 
                fontSize: '11px', 
                fontWeight: 800, 
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px'
              }}>
                Services Requested
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedOrder.services?.map((s: string, idx: number) => (
                  <span key={idx} style={{
                    backgroundColor: 'var(--accent-dim)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    padding: '6px 14px',
                    borderRadius: '99px',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Claim Button in Modal */}
            {selectedOrder.status === 'Pending' && !selectedOrder.mechanicId && (
              <button
                onClick={() => handleClaim(selectedOrder.id)}
                disabled={claiming === selectedOrder.id}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  fontWeight: 800,
                  fontSize: '15px',
                  cursor: claiming === selectedOrder.id 
                    ? 'not-allowed' : 'pointer',
                  opacity: claiming === selectedOrder.id ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease'
                }}
              >
                <CheckCircle size={20} />
                {claiming === selectedOrder.id 
                  ? 'Claiming Job...' 
                  : 'Claim This Repair Job'}
              </button>
            )}

            {selectedOrder.status === 'InProgress' && 
             activeTab === 'mine' && (
              <button
                onClick={() => {
                  handleMarkComplete(selectedOrder.id);
                  setSelectedOrder(null);
                }}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--success-dim)',
                  color: 'var(--success)',
                  border: '1px solid var(--success)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  fontWeight: 800,
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                <CheckCircle size={20} />
                Mark as Completed
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableRepairOrdersPage;
