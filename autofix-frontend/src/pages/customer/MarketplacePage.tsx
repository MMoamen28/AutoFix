import React, { useState, useEffect } from 'react';
import { serviceService } from '../../services/serviceService';
import { sparePartService } from '../../services/sparePartService';
import { cartService } from '../../services/cartService';
import { ShoppingBag, Wrench, Package, Search, Filter, ShoppingCart, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/shared/Button';
import Skeleton from '../../components/shared/Skeleton';
import Badge from '../../components/shared/Badge';

const MarketplacePage: React.FC = () => {
  const [services, setServices] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'services' | 'parts'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addingToCart, setAddingToCart] = useState<number | string | null>(null);

  useEffect(() => {
    fetchMarketplace();
  }, []);

  const fetchMarketplace = async () => {
    setLoading(true);
    try {
      const [serviceRes, partRes] = await Promise.all([
        serviceService.getAll(),
        sparePartService.getMarketplace()
      ]);
      setServices(serviceRes);
      setParts(partRes);
    } catch (err) {
      toast.error('Failed to load marketplace items');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (item: any, type: 'Service' | 'SparePart') => {
    const itemId = type === 'Service' ? item.id : item.id;
    setAddingToCart(`${type}-${itemId}`);
    try {
      await cartService.addToCart({
        itemId: item.id,
        itemType: type,
        quantity: 1
      });
      toast.success(`${item.name} added to cart!`);
      window.dispatchEvent(new Event('cart-updated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  const filteredServices = services.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredParts = parts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>AutoFix Marketplace</h1>
          <p style={subtitleStyle}>Premium services and precision spare parts for your vehicle</p>
        </div>
        <div style={searchWrapperStyle}>
          <Search size={20} style={searchIconStyle} />
          <input 
            placeholder="Search items..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchInputStyle} 
          />
        </div>
      </header>

      <div style={filterBarStyle}>
        <div style={tabsStyle}>
          <button 
            onClick={() => setActiveTab('all')}
            style={{ ...tabStyle, ...(activeTab === 'all' ? activeTabStyle : {}) }}
          >All Items</button>
          <button 
            onClick={() => setActiveTab('services')}
            style={{ ...tabStyle, ...(activeTab === 'services' ? activeTabStyle : {}) }}
          >Professional Services</button>
          <button 
            onClick={() => setActiveTab('parts')}
            style={{ ...tabStyle, ...(activeTab === 'parts' ? activeTabStyle : {}) }}
          >Spare Parts</button>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>
          Showing {activeTab === 'all' ? filteredServices.length + filteredParts.length : (activeTab === 'services' ? filteredServices.length : filteredParts.length)} items
        </div>
      </div>

      {loading ? (
        <div style={gridStyle}>
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} height="320px" borderRadius="24px" />)}
        </div>
      ) : (
        <div style={gridStyle}>
          {(activeTab === 'all' || activeTab === 'services') && filteredServices.map(service => (
            <MarketplaceCard 
              key={`service-${service.id}`}
              item={service} 
              type="Service" 
              onAdd={() => handleAddToCart(service, 'Service')}
              isAdding={addingToCart === `Service-${service.id}`}
            />
          ))}
          {(activeTab === 'all' || activeTab === 'parts') && filteredParts.map(part => (
            <MarketplaceCard 
              key={`part-${part.id}`}
              item={part} 
              type="SparePart" 
              onAdd={() => handleAddToCart(part, 'SparePart')}
              isAdding={addingToCart === `SparePart-${part.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MarketplaceCard = ({ item, type, onAdd, isAdding }: any) => (
  <div style={cardStyle}>
    <div style={cardBadgeWrapper}>
      <Badge variant={type === 'Service' ? 'info' : 'purple'}>{type.toUpperCase()}</Badge>
    </div>
    
    <div style={cardIconWrapper}>
      {type === 'Service' ? <Wrench size={32} /> : <Package size={32} />}
    </div>

    <div style={cardContentStyle}>
      <h3 style={cardTitleStyle}>{item.name}</h3>
      <p style={cardDescStyle}>{item.description || `High-quality ${type.toLowerCase()} for your vehicle maintenance.`}</p>
      
      <div style={cardFooterStyle}>
        <div>
          <span style={priceLabelStyle}>Price</span>
          <p style={priceValueStyle}>${(type === 'Service' ? item.basePrice : item.unitPrice).toFixed(2)}</p>
        </div>
        <button 
          onClick={onAdd} 
          disabled={isAdding}
          style={{ ...cartButtonStyle, ...(isAdding ? cartButtonAddingStyle : {}) }}
        >
          {isAdding ? <Check size={20} /> : <ShoppingCart size={20} />}
        </button>
      </div>
    </div>
  </div>
);

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '40px',
  background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(30, 41, 59, 0.5) 100%)',
  borderRadius: '32px',
  border: '1px solid var(--border)',
  position: 'relative',
  overflow: 'hidden'
};

const titleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 900,
  color: 'white',
  marginBottom: '8px',
  letterSpacing: '-1px'
};

const subtitleStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '16px',
  fontWeight: 500
};

const searchWrapperStyle: React.CSSProperties = {
  position: 'relative',
  width: '320px'
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-muted)'
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px 16px 16px 48px',
  backgroundColor: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  color: 'white',
  outline: 'none',
  fontSize: '14px',
  transition: 'all 0.2s ease'
};

const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 8px'
};

const tabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  backgroundColor: 'var(--bg-card)',
  padding: '6px',
  borderRadius: '16px',
  border: '1px solid var(--border)'
};

const tabStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '12px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const activeTabStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  color: 'white',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '32px'
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: '28px',
  border: '1px solid var(--border)',
  padding: '32px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  transition: 'all 0.3s ease',
  position: 'relative',
  cursor: 'pointer'
};

const cardBadgeWrapper: React.CSSProperties = {
  position: 'absolute',
  top: '24px',
  right: '24px'
};

const cardIconWrapper: React.CSSProperties = {
  width: '64px',
  height: '64px',
  borderRadius: '20px',
  backgroundColor: 'rgba(255,255,255,0.03)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--accent)',
  border: '1px solid var(--border)'
};

const cardContentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 800,
  color: 'white',
  marginBottom: '12px'
};

const cardDescStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--text-muted)',
  lineHeight: '1.6',
  marginBottom: '24px'
};

const cardFooterStyle: React.CSSProperties = {
  marginTop: 'auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const priceLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 800,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const priceValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 900,
  color: 'white'
};

const cartButtonStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '14px',
  backgroundColor: 'var(--accent)',
  color: 'white',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 8px 16px rgba(220, 38, 38, 0.2)'
};

const cartButtonAddingStyle: React.CSSProperties = {
  backgroundColor: 'var(--success)',
  boxShadow: '0 8px 16px rgba(34, 197, 94, 0.2)'
};

export default MarketplacePage;
