import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Search, Wrench, Package, Info, AlertCircle, CheckCircle2, ShoppingBag, Plus, Minus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cartService } from '../services/cartService';
import Skeleton from '../components/shared/Skeleton';
import { useToast } from '../hooks/useToast';
import { Link } from 'react-router-dom';
import Button from '../components/shared/Button';

const MarketplacePage: React.FC = () => {
  const { isAuthenticated, role } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'Services' | 'SpareParts'>('Services');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchMarketplace();
  }, []);

  const fetchMarketplace = async () => {
    setLoading(true);
    setError(null);
    try {
      const [svcRes, partRes] = await Promise.all([
        axios.get('/api/Services'),
        axios.get('/api/SpareParts/public-list')
      ]);
      setServices(svcRes.data);
      setParts(partRes.data);
    } catch (err: any) {
      setError('Failed to load marketplace items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (itemType: 'Service' | 'SparePart', itemId: number, itemName: string) => {
    const quantity = quantities[itemId] || 1;
    try {
      await cartService.addToCart({ itemType, itemId, quantity });
      showToast(`${itemName} added to cart!`, 'success');
      window.dispatchEvent(new Event('cart-updated'));
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to add to cart', 'error');
    }
  };

  const filteredServices = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const filteredParts = parts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header Banner */}
      <header style={{
        height: '280px',
        position: 'relative',
        backgroundImage: `linear-gradient(to bottom, rgba(13,15,20,0.4), rgba(13,15,20,0.9)), url('/images/mechanic-engine.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 32px'
      }}>
        <h1 style={{ fontSize: '48px', fontWeight: 900, color: 'white', marginBottom: '12px' }}>AutoFix Marketplace</h1>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', maxWidth: '600px' }}>
          Browse our professional services and genuine spare parts
        </p>

        {/* Overlapping Search Bar */}
        <div style={{
          position: 'absolute',
          bottom: '-28px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '600px',
          display: 'flex',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          padding: '8px',
          boxShadow: 'var(--shadow)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '0 12px' }}>
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text"
              placeholder="Search for services or parts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                padding: '12px',
                width: '100%',
                outline: 'none',
                fontSize: '15px'
              }}
            />
          </div>
          <Button>Search</Button>
        </div>
      </header>

      <div style={{ maxWidth: '1400px', margin: '80px auto 60px', padding: '0 32px' }}>
        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '32px', 
          borderBottom: '1px solid var(--border)', 
          marginBottom: '40px' 
        }}>
          <button
            onClick={() => setActiveTab('Services')}
            style={{
              padding: '16px 8px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'Services' ? '3px solid var(--accent)' : '3px solid transparent',
              color: activeTab === 'Services' ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <Wrench size={20} /> Services
          </button>
          <button
            onClick={() => setActiveTab('SpareParts')}
            style={{
              padding: '16px 8px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'SpareParts' ? '3px solid var(--accent)' : '3px solid transparent',
              color: activeTab === 'SpareParts' ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <Package size={20} /> Spare Parts
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--danger-dim)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Content Grids */}
        {loading ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: activeTab === 'Services' ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', 
            gap: '20px' 
          }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} height="320px" borderRadius="var(--radius-lg)" />
            ))}
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: activeTab === 'Services' ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', 
            gap: '20px' 
          }}>
            {activeTab === 'Services' ? (
              filteredServices.length > 0 ? (
                filteredServices.map(svc => (
                  <div key={svc.id} style={cardStyle} className="item-card">
                    <div style={{ color: 'var(--accent)', marginBottom: '20px' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--accent-dim)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Wrench size={24} />
                      </div>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginBottom: '12px' }}>{svc.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', flex: 1 }}>{svc.description}</p>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      paddingTop: '20px',
                      borderTop: '1px solid var(--border)'
                    }}>
                      <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--accent)' }}>${svc.basePrice.toFixed(2)}</span>
                      {isAuthenticated && role === 'Customer' ? (
                        <Button onClick={() => handleAddToCart('Service', svc.id, svc.name)} style={{ padding: '8px 16px' }}>
                          <ShoppingCart size={18} />
                        </Button>
                      ) : (
                        <Link to="/login" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Login to Buy</Link>
                      )}
                    </div>
                  </div>
                ))
              ) : <EmptyState message="No services found" />
            ) : (
              filteredParts.length > 0 ? (
                filteredParts.map(part => (
                  <div key={part.id} style={cardStyle} className="item-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--blue-dim)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--blue)'
                      }}>
                        <Package size={20} />
                      </div>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: 800, 
                        backgroundColor: part.stockQuantity <= part.minimumStockLevel ? 'var(--danger-dim)' : 'var(--success-dim)',
                        color: part.stockQuantity <= part.minimumStockLevel ? 'var(--danger)' : 'var(--success)',
                        padding: '4px 10px',
                        borderRadius: '99px'
                      }}>
                        {part.stockQuantity <= part.minimumStockLevel ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>{part.name}</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 700 }}>{part.brand} • {part.partNumber}</p>
                    <span style={{ 
                      fontSize: '11px', 
                      backgroundColor: 'var(--bg-secondary)', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      border: '1px solid var(--border)',
                      marginBottom: '20px',
                      display: 'inline-block'
                    }}>
                      {part.categoryName}
                    </span>
                    
                    <div style={{ flex: 1 }}></div>

                    <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ fontSize: '22px', fontWeight: 900, color: 'white' }}>${part.unitPrice.toFixed(2)}</span>
                        {isAuthenticated && role === 'Customer' && (
                          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            <button 
                              style={qtyBtnStyle}
                              onClick={() => setQuantities(q => ({...q, [part.id]: Math.max(1, (q[part.id] || 1) - 1)}))}
                            ><Minus size={14} /></button>
                            <span style={{ padding: '0 10px', fontSize: '14px', fontWeight: 700 }}>{quantities[part.id] || 1}</span>
                            <button 
                              style={qtyBtnStyle}
                              onClick={() => setQuantities(q => ({...q, [part.id]: Math.min(part.stockQuantity, (q[part.id] || 1) + 1)}))}
                            ><Plus size={14} /></button>
                          </div>
                        )}
                      </div>
                      
                      {isAuthenticated && role === 'Customer' ? (
                        <Button onClick={() => handleAddToCart('SparePart', part.id, part.name)} style={{ width: '100%' }}>
                          Add to Cart
                        </Button>
                      ) : (
                        <Link to="/login" style={{ display: 'block', textAlign: 'center', fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>Login to Purchase</Link>
                      )}
                    </div>
                  </div>
                ))
              ) : <EmptyState message="No spare parts found" />
            )}
          </div>
        )}
      </div>

      <style>{`
        .item-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-accent); border-color: var(--accent); }
      `}</style>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderLeft: '4px solid var(--accent)',
  borderRadius: 'var(--radius-lg)',
  padding: '28px',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '320px',
  transition: 'all 0.2s ease',
  cursor: 'default'
};

const qtyBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  padding: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div style={{ 
    gridColumn: '1 / -1', 
    padding: '80px 0', 
    textAlign: 'center', 
    backgroundColor: 'var(--bg-card)', 
    borderRadius: 'var(--radius-xl)',
    border: '2px dashed var(--border)'
  }}>
    <ShoppingBag size={48} color="var(--text-muted)" style={{ marginBottom: '20px' }} />
    <p style={{ color: 'var(--text-secondary)', fontSize: '18px', fontWeight: 500 }}>{message}</p>
  </div>
);

export default MarketplacePage;
