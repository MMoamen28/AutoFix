import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Trash2, ArrowRight, 
  Car, FileText, Info
} from 'lucide-react';
import { cartService } from '../../services/cartService';
import { CartItem } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

const CartPage: React.FC = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const data = await cartService.getCart();
      setItems(data);
    } catch {
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (id: number, quantity: number) => {
    if (quantity < 1) return;
    try {
      await cartService.updateQuantity(id, { quantity });
      fetchCart();
      window.dispatchEvent(new Event('cart-updated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleRemove = async (id: number) => {
    if (!window.confirm('Remove this item?')) return;
    try {
      await cartService.removeFromCart(id);
      fetchCart();
      window.dispatchEvent(new Event('cart-updated'));
      toast.success('Item removed');
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear your entire cart?')) return;
    try {
      await cartService.clearCart();
      fetchCart();
      window.dispatchEvent(new Event('cart-updated'));
      toast.success('Cart cleared');
    } catch {
      toast.error('Failed to clear cart');
    }
  };

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  if (loading) return (
    <div style={{ padding: '80px', textAlign: 'center' }}>
      <LoadingSpinner />
    </div>
  );

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
            fontSize: '28px', fontWeight: 800, color: 'white', 
            marginBottom: '6px',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <ShoppingCart size={28} color="var(--accent)" />
            My Shopping Cart
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Review your selected services and spare parts
          </p>
        </div>
        {items.length > 0 && (
          <button 
            onClick={handleClear} 
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'none', border: 'none',
              color: 'var(--danger)', cursor: 'pointer',
              fontWeight: 700, fontSize: '13px'
            }}
          >
            <Trash2 size={16} /> Clear Cart
          </button>
        )}
      </header>

      {/* Info Banner */}
      <div style={{
        backgroundColor: 'var(--blue-dim)',
        border: '1px solid var(--blue)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <Info size={18} color="var(--blue)" />
        <p style={{ 
          fontSize: '13px', color: 'var(--blue)', fontWeight: 600 
        }}>
          To book a repair service, go to{' '}
          <Link 
            to="/customer/cars" 
            style={{ 
              color: 'white', fontWeight: 800, 
              textDecoration: 'underline' 
            }}
          >
            My Garage
          </Link>
          {' '}and click "Book Service" on your vehicle.
        </p>
      </div>

      {items.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '80px',
          textAlign: 'center'
        }}>
          <ShoppingCart 
            size={64} 
            color="var(--text-muted)" 
            style={{ marginBottom: '20px', opacity: 0.3 }} 
          />
          <h3 style={{ 
            fontSize: '20px', fontWeight: 700, 
            color: 'white', marginBottom: '10px' 
          }}>
            Your cart is empty
          </h3>
          <p style={{ 
            color: 'var(--text-muted)', marginBottom: '24px' 
          }}>
            Browse spare parts below to add them to your cart.
          </p>
          <Link 
            to="/customer/cars"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--accent)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            Go to My Garage <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 320px', 
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Items List */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}>
            {items.map(item => (
              <div 
                key={item.id} 
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px'
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '52px', height: '52px',
                  borderRadius: '14px',
                  backgroundColor: item.itemType === 'Service' 
                    ? 'var(--blue-dim)' 
                    : 'var(--purple-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: item.itemType === 'Service' 
                    ? 'var(--blue)' 
                    : 'var(--purple)',
                  flexShrink: 0
                }}>
                  {item.itemType === 'Service' 
                    ? <FileText size={24} /> 
                    : <Car size={24} />}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <p style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-muted)', 
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '3px'
                  }}>
                    {item.itemType}
                  </p>
                  <p style={{ 
                    fontSize: '16px', 
                    fontWeight: 800, 
                    color: 'white' 
                  }}>
                    {item.itemName}
                  </p>
                  <p style={{ 
                    fontSize: '13px', 
                    color: 'var(--text-muted)' 
                  }}>
                    ${item.unitPrice.toFixed(2)} per unit
                  </p>
                </div>

                {/* Quantity Control */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden'
                }}>
                  <button
                    onClick={() => handleUpdateQuantity(
                      item.id, item.quantity - 1
                    )}
                    style={{
                      padding: '8px 14px',
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: 700
                    }}
                  >−</button>
                  <span style={{ 
                    padding: '8px 12px',
                    fontWeight: 700,
                    color: 'white',
                    fontSize: '14px',
                    minWidth: '36px',
                    textAlign: 'center'
                  }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(
                      item.id, item.quantity + 1
                    )}
                    style={{
                      padding: '8px 14px',
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: 700
                    }}
                  >+</button>
                </div>

                {/* Subtotal */}
                <div style={{ 
                  textAlign: 'right', 
                  minWidth: '80px' 
                }}>
                  <p style={{ 
                    fontSize: '20px', 
                    fontWeight: 800, 
                    color: 'var(--success)' 
                  }}>
                    ${item.subtotal.toFixed(2)}
                  </p>
                </div>

                {/* Remove */}
                <button
                  onClick={() => handleRemove(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            position: 'sticky',
            top: '24px'
          }}>
            <h2 style={{ 
              fontSize: '18px', fontWeight: 800, 
              color: 'white', marginBottom: '20px' 
            }}>
              Order Summary
            </h2>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              marginBottom: '20px' 
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between' 
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Items ({items.length})
                </span>
                <span style={{ 
                  color: 'white', fontWeight: 700 
                }}>
                  ${total.toFixed(2)}
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between' 
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Tax
                </span>
                <span style={{ 
                  color: 'white', fontWeight: 700 
                }}>
                  $0.00
                </span>
              </div>
              <div style={{ 
                borderTop: '1px solid var(--border)', 
                paddingTop: '12px',
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: 800, 
                  color: 'white' 
                }}>
                  Total
                </span>
                <span style={{ 
                  fontSize: '24px', 
                  fontWeight: 800, 
                  color: 'var(--success)' 
                }}>
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <Link
              to="/customer/cars"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                backgroundColor: 'var(--accent)',
                color: 'white',
                padding: '14px',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 800,
                fontSize: '14px',
                textDecoration: 'none',
                width: '100%'
              }}
            >
              Book a Repair Service
              <ArrowRight size={18} />
            </Link>
            <p style={{ 
              fontSize: '11px', 
              color: 'var(--text-muted)', 
              textAlign: 'center', 
              marginTop: '10px' 
            }}>
              Go to My Garage to attach these to a repair job
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
