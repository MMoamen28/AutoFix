import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Car, User, Wrench, Search,
  Eye, X, Clock, CheckCircle, XCircle, 
  AlertCircle, DollarSign, FileText, Calendar
} from 'lucide-react';
import { repairOrderService } from '../../services/repairOrderService';
import { useToast } from '../../hooks/useToast';
import Skeleton from '../../components/shared/Skeleton';

const RepairOrdersPage: React.FC = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await repairOrderService.getAll();
      setOrders(data);
    } catch (err) {
      showToast('Failed to load repair orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await repairOrderService.updateStatus(id, status);
      showToast('Status updated successfully', 'success');
      fetchOrders();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Failed to update status', 
        'error'
      );
    }
  };

  const getStatusStyle = (status: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 12px',
    borderRadius: '99px',
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase' as const,
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock size={12} />;
      case 'InProgress': return <Wrench size={12} />;
      case 'Completed': return <CheckCircle size={12} />;
      case 'Cancelled': return <XCircle size={12} />;
      default: return <AlertCircle size={12} />;
    }
  };

  const filtered = orders.filter(o => {
    const matchSearch =
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.carInfo?.toLowerCase().includes(search.toLowerCase()) ||
      o.carPlate?.toLowerCase().includes(search.toLowerCase()) ||
      o.mechanicName?.toLowerCase().includes(search.toLowerCase()) ||
      String(o.id).includes(search);
    const matchStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const thStyle: React.CSSProperties = {
    padding: '12px 18px',
    fontSize: '10px',
    fontWeight: 800,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)'
  };

  const tdStyle: React.CSSProperties = {
    padding: '14px 18px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle'
  };

  const statusCounts = {
    All: orders.length,
    Pending: orders.filter(o => o.status === 'Pending').length,
    InProgress: orders.filter(o => o.status === 'InProgress').length,
    Completed: orders.filter(o => o.status === 'Completed').length,
    Cancelled: orders.filter(o => o.status === 'Cancelled').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start' 
      }}>
        <div>
          <h1 style={{ 
            fontSize: '28px', fontWeight: 800, color: 'white', 
            marginBottom: '6px' 
          }}>
            Repair Orders
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Full overview of all customer repair requests and their status
          </p>
        </div>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          display: 'flex',
          gap: '32px'
        }}>
          {[
            { label: 'Total', value: orders.length, color: 'var(--text-primary)' },
            { label: 'Pending', value: statusCounts.Pending, color: 'var(--warning)' },
            { label: 'In Progress', value: statusCounts.InProgress, color: 'var(--blue)' },
            { label: 'Completed', value: statusCounts.Completed, color: 'var(--success)' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{ 
                fontSize: '22px', fontWeight: 800, color: stat.color 
              }}>
                {stat.value}
              </p>
              <p style={{ 
                fontSize: '10px', fontWeight: 700, 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase' 
              }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </header>

      {/* Filters Row */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ 
          flex: 1, position: 'relative', maxWidth: '420px' 
        }}>
          <Search 
            size={16} 
            style={{ 
              position: 'absolute', left: '14px', 
              top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)' 
            }} 
          />
          <input
            type="text"
            placeholder="Search by customer, car, mechanic..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 16px 10px 40px',
              color: 'white',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Pending', 'InProgress', 'Completed', 'Cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid',
                borderColor: statusFilter === s 
                  ? 'var(--accent)' 
                  : 'var(--border)',
                backgroundColor: statusFilter === s 
                  ? 'var(--accent-dim)' 
                  : 'var(--bg-card)',
                color: statusFilter === s 
                  ? 'var(--accent)' 
                  : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {s === 'InProgress' ? 'In Progress' : s}
              {' '}
              <span style={{ opacity: 0.7 }}>
                ({statusCounts[s as keyof typeof statusCounts] ?? 0})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ 
            display: 'flex', flexDirection: 'column', gap: '1px' 
          }}>
            {[1,2,3,4,5].map(i => (
              <Skeleton key={i} height="60px" borderRadius="0" />
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              minWidth: '900px' 
            }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '60px' }}>#</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Vehicle</th>
                  <th style={thStyle}>Services</th>
                  <th style={thStyle}>Mechanic</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Date</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ 
                      padding: '60px', 
                      textAlign: 'center' 
                    }}>
                      <ClipboardList 
                        size={40} 
                        color="var(--text-muted)" 
                        style={{ marginBottom: '12px', opacity: 0.3 }} 
                      />
                      <p style={{ 
                        color: 'var(--text-muted)', fontSize: '14px' 
                      }}>
                        No repair orders found
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(order => (
                    <tr
                      key={order.id}
                      style={{ transition: 'background 0.15s ease' }}
                      onMouseEnter={e =>
                        (e.currentTarget.style.backgroundColor = 
                          'var(--bg-card-hover)')
                      }
                      onMouseLeave={e =>
                        (e.currentTarget.style.backgroundColor = 
                          'transparent')
                      }
                    >
                      {/* ID */}
                      <td style={tdStyle}>
                        <span style={{ 
                          fontWeight: 800, 
                          color: 'var(--text-muted)',
                          fontSize: '12px'
                        }}>
                          #{order.id}
                        </span>
                      </td>

                      {/* Customer */}
                      <td style={tdStyle}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px' 
                        }}>
                          <div style={{
                            width: '32px', height: '32px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--accent-dim)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent)',
                            fontSize: '11px',
                            fontWeight: 800,
                            flexShrink: 0
                          }}>
                            {order.customerName?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <span style={{ 
                            fontWeight: 700, color: 'white',
                            whiteSpace: 'nowrap'
                          }}>
                            {order.customerName || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td style={tdStyle}>
                        <div>
                          <p style={{ 
                            fontWeight: 700, color: 'white', 
                            fontSize: '13px' 
                          }}>
                            {order.carInfo || '—'}
                          </p>
                          <p style={{ 
                            fontSize: '11px', 
                            color: 'var(--text-muted)',
                            marginTop: '2px'
                          }}>
                            {order.carPlate || ''}
                          </p>
                        </div>
                      </td>

                      {/* Services */}
                      <td style={tdStyle}>
                        <div style={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: '4px',
                          maxWidth: '200px'
                        }}>
                          {order.services?.length > 0 ? (
                            order.services.slice(0, 2).map(
                              (s: string, idx: number) => (
                                <span key={idx} style={{
                                  backgroundColor: 'var(--accent-dim)',
                                  color: 'var(--accent)',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '99px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {s}
                                </span>
                              )
                            )
                          ) : (
                            <span style={{ 
                              color: 'var(--text-muted)', 
                              fontSize: '12px' 
                            }}>
                              —
                            </span>
                          )}
                          {order.services?.length > 2 && (
                            <span style={{
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-muted)',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '99px'
                            }}>
                              +{order.services.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Mechanic */}
                      <td style={tdStyle}>
                        {order.mechanicName ? (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px' 
                          }}>
                            <div style={{
                              width: '28px', height: '28px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--blue-dim)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--blue)',
                              fontSize: '10px',
                              fontWeight: 800,
                              flexShrink: 0
                            }}>
                              {order.mechanicName.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ 
                              fontWeight: 600, 
                              color: 'var(--blue)',
                              fontSize: '13px',
                              whiteSpace: 'nowrap'
                            }}>
                              {order.mechanicName}
                            </span>
                          </div>
                        ) : (
                          <span style={{
                            backgroundColor: 'var(--warning-dim)',
                            color: 'var(--warning)',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '99px',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap'
                          }}>
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={tdStyle}>
                        <span style={getStatusStyle(order.status)}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                      </td>

                      {/* Total */}
                      <td style={tdStyle}>
                        <span style={{ 
                          fontWeight: 800, 
                          color: 'var(--success)',
                          fontSize: '14px'
                        }}>
                          ${order.totalCost?.toFixed(2) || '0.00'}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={tdStyle}>
                        <span style={{ 
                          color: 'var(--text-muted)', 
                          fontSize: '12px',
                          whiteSpace: 'nowrap'
                        }}>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ 
                          display: 'flex', 
                          gap: '6px', 
                          justifyContent: 'center' 
                        }}>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            style={{
                              backgroundColor: 'var(--bg-primary)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-secondary)',
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            <Eye size={14} /> View
                          </button>
                          {order.status === 'InProgress' && (
                            <button
                              onClick={() => 
                                handleStatusUpdate(order.id, 'Completed')
                              }
                              style={{
                                backgroundColor: 'var(--success-dim)',
                                border: '1px solid var(--success)',
                                color: 'var(--success)',
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600
                              }}
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
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
              maxWidth: '580px',
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
                  fontSize: '11px', color: 'var(--text-muted)',
                  fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.5px', marginBottom: '4px'
                }}>
                  Repair Order #{selectedOrder.id}
                </p>
                <h2 style={{ 
                  fontSize: '22px', fontWeight: 800, color: 'white' 
                }}>
                  {selectedOrder.carInfo || 'Vehicle Details'}
                </h2>
              </div>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '12px' 
              }}>
                <span style={getStatusStyle(selectedOrder.status)}>
                  {getStatusIcon(selectedOrder.status)}
                  {selectedOrder.status}
                </span>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-muted)', cursor: 'pointer'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px',
              marginBottom: '24px'
            }}>
              {[
                { 
                  icon: <User size={15} />, 
                  label: 'Customer', 
                  value: selectedOrder.customerName || '—' 
                },
                { 
                  icon: <Car size={15} />, 
                  label: 'Vehicle', 
                  value: selectedOrder.carInfo || '—' 
                },
                { 
                  icon: <Car size={15} />, 
                  label: 'License Plate', 
                  value: selectedOrder.carPlate || '—' 
                },
                { 
                  icon: <Wrench size={15} />, 
                  label: 'Mechanic', 
                  value: selectedOrder.mechanicName || 'Unassigned',
                  color: selectedOrder.mechanicName 
                    ? 'var(--blue)' 
                    : 'var(--warning)'
                },
                { 
                  icon: <DollarSign size={15} />, 
                  label: 'Total Cost', 
                  value: `$${selectedOrder.totalCost?.toFixed(2) || '0.00'}`,
                  color: 'var(--success)'
                },
                { 
                  icon: <Calendar size={15} />, 
                  label: 'Created', 
                  value: new Date(selectedOrder.createdAt)
                    .toLocaleString() 
                },
                ...(selectedOrder.completedAt ? [{
                  icon: <CheckCircle size={15} />,
                  label: 'Completed',
                  value: new Date(selectedOrder.completedAt)
                    .toLocaleString(),
                  color: 'var(--success)'
                }] : [])
              ].map((item, idx) => (
                <div key={idx} style={{
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ 
                    color: 'var(--text-muted)', marginTop: '1px', 
                    flexShrink: 0 
                  }}>
                    {item.icon}
                  </span>
                  <div>
                    <p style={{
                      fontSize: '9px', fontWeight: 800,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '2px'
                    }}>
                      {item.label}
                    </p>
                    <p style={{
                      fontSize: '13px', fontWeight: 700,
                      color: (item as any).color || 'white'
                    }}>
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Services */}
            {selectedOrder.services?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <p style={{
                  fontSize: '11px', fontWeight: 800,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '10px'
                }}>
                  Services Requested
                </p>
                <div style={{ 
                  display: 'flex', flexWrap: 'wrap', gap: '8px' 
                }}>
                  {selectedOrder.services.map((s: string, idx: number) => (
                    <span key={idx} style={{
                      backgroundColor: 'var(--accent-dim)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                      padding: '5px 14px',
                      borderRadius: '99px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedOrder.notes && (
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.15)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                marginBottom: '24px'
              }}>
                <p style={{
                  fontSize: '10px', fontWeight: 800,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}>
                  Customer Notes
                </p>
                <p style={{ 
                  fontSize: '13px', 
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic'
                }}>
                  "{selectedOrder.notes}"
                </p>
              </div>
            )}

            {/* Status Update Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {selectedOrder.status === 'Pending' && (
                <button
                  onClick={() => {
                    handleStatusUpdate(selectedOrder.id, 'InProgress');
                    setSelectedOrder(null);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--blue-dim)',
                    color: 'var(--blue)',
                    border: '1px solid var(--blue)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Wrench size={16} /> Mark In Progress
                </button>
              )}
              {selectedOrder.status === 'InProgress' && (
                <button
                  onClick={() => {
                    handleStatusUpdate(selectedOrder.id, 'Completed');
                    setSelectedOrder(null);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--success-dim)',
                    color: 'var(--success)',
                    border: '1px solid var(--success)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <CheckCircle size={16} /> Mark Completed
                </button>
              )}
              {selectedOrder.status !== 'Cancelled' && 
               selectedOrder.status !== 'Completed' && (
                <button
                  onClick={() => {
                    handleStatusUpdate(selectedOrder.id, 'Cancelled');
                    setSelectedOrder(null);
                  }}
                  style={{
                    backgroundColor: 'var(--danger-dim)',
                    color: 'var(--danger)',
                    border: '1px solid var(--danger)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <XCircle size={16} /> Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairOrdersPage;
