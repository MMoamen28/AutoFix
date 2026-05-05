import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, Search, Filter, ShoppingCart,
  Package, Tag, CheckCircle, AlertCircle,
  ChevronDown, X, Plus, Minus, Star
} from 'lucide-react';
import { sparePartService } from '../services/sparePartService';
import { cartService } from '../services/cartService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { Link } from 'react-router-dom';
import Skeleton from '../components/shared/Skeleton';

interface SparePart {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  partNumber: string;
  description: string;
  brand: string;
  unitPrice: number;
  stockQuantity: number;
  minimumStockLevel: number;
  isLowStock: boolean;
  isActive: boolean;
}

const MarketplacePage: React.FC = () => {
  const { role, token } = useAuth();
  const { showToast } = useToast();
  
  const [parts, setParts] = useState<SparePart[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc' | 'newest'>('name');
  const [addingId, setAddingId] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [cartItemIds, setCartItemIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchParts();
    fetchCategories();
    if (role === 'Customer' && token) {
      fetchCartItems();
    }
  }, [selectedCategory, role, token]);

  const fetchParts = async () => {
    setLoading(true);
    try {
      let data: SparePart[];
      if (selectedCategory) {
        data = await sparePartService
          .getMarketplaceByCategory(selectedCategory);
      } else {
        data = await sparePartService.getMarketplace();
      }
      setParts(data);
      // Initialize quantities to 1 for all parts
      const q: Record<number, number> = {};
      data.forEach(p => { q[p.id] = 1; });
      setQuantities(q);
    } catch (err) {
      showToast('Failed to load marketplace', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // Use public endpoint — categories are also public info
      const data = await sparePartService.getMarketplace();
      // Extract unique categories from parts
      const cats = Array.from(
        new Map(data.map((p: SparePart) => [
          p.categoryId, 
          { id: p.categoryId, name: p.categoryName }
        ])).values()
      );
      setCategories(cats);
    } catch {}
  };

  const fetchCartItems = async () => {
    try {
      const cart = await cartService.getCart();
      // Track which part IDs are already in cart
      const ids = new Set<number>(
        cart
          .filter((item: any) => item.itemType === 'SparePart')
          .map((item: any) => item.itemId)
      );
      setCartItemIds(ids);
    } catch {}
  };

  const handleAddToCart = async (part: SparePart) => {
    if (role !== 'Customer') {
      showToast('Please log in as a customer to add items to cart', 'info');
      return;
    }

    const qty = quantities[part.id] || 1;
    
    if (qty > part.stockQuantity) {
      showToast(`Only ${part.stockQuantity} units available`, 'error');
      return;
    }

    setAddingId(part.id);
    try {
      await cartService.addToCart({
        itemType: 'SparePart',
        itemId: part.id,
        quantity: qty
      });
      setCartItemIds(prev => new Set([...prev, part.id]));
      window.dispatchEvent(new Event('cart-updated'));
      showToast(`${part.name} added to your cart!`, 'success');
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Failed to add to cart', 
        'error'
      );
    } finally {
      setAddingId(null);
    }
  };

  const updateQuantity = (partId: number, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [partId]: Math.max(1, (prev[partId] || 1) + delta)
    }));
  };

  // Filter and sort parts
  const displayParts = parts
    .filter(p => {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.partNumber.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': return a.unitPrice - b.unitPrice;
        case 'price-desc': return b.unitPrice - a.unitPrice;
        case 'name': return a.name.localeCompare(b.name);
        default: return b.id - a.id;
      }
    });

  const isCustomer = role === 'Customer';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, var(--accent) 0%, #991b1b 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', right: '-40px', top: '-40px',
          width: '200px', height: '200px', borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.05)'
        }} />
        <div style={{
          position: 'absolute', right: '60px', bottom: '-60px',
          width: '160px', height: '160px', borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.05)'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '14px', 
            marginBottom: '8px' 
          }}>
            <div style={{
              width: '48px', height: '48px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', 
              justifyContent: 'center'
            }}>
              <ShoppingBag size={26} color="white" />
            </div>
            <h1 style={{ 
              fontSize: '32px', fontWeight: 800, color: 'white' 
            }}>
              AutoFix Marketplace
            </h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px' }}>
            Browse genuine spare parts — same inventory, 
            updated in real time by our team
          </p>
        </div>

        {/* Stats bar */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', gap: '32px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              fontSize: '28px', fontWeight: 800, color: 'white' 
            }}>
              {parts.length}
            </p>
            <p style={{ 
              fontSize: '11px', color: 'rgba(255,255,255,0.7)',
              fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Parts Available
            </p>
          </div>
          <div style={{ 
            width: '1px', 
            backgroundColor: 'rgba(255,255,255,0.2)' 
          }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              fontSize: '28px', fontWeight: 800, color: 'white' 
            }}>
              {categories.length}
            </p>
            <p style={{ 
              fontSize: '11px', color: 'rgba(255,255,255,0.7)',
              fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Categories
            </p>
          </div>
          {isCustomer && (
            <>
              <div style={{ 
                width: '1px', 
                backgroundColor: 'rgba(255,255,255,0.2)' 
              }} />
              <Link to="/cart" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
                backgroundColor: 'rgba(255,255,255,0.15)',
                padding: '12px 20px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'all 0.2s ease'
              }}>
                <ShoppingCart size={22} color="white" />
                <span style={{ 
                  fontSize: '11px', color: 'white', fontWeight: 700 
                }}>
                  My Cart
                </span>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Non-customer notice */}
      {!isCustomer && token && (
        <div style={{
          backgroundColor: 'var(--warning-dim)',
          border: '1px solid var(--warning)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertCircle size={18} color="var(--warning)" />
          <p style={{ 
            fontSize: '13px', color: 'var(--warning)', fontWeight: 600 
          }}>
            You are viewing the marketplace as {role}. 
            Only customers can add items to a cart and place orders.
          </p>
        </div>
      )}

      {/* Filters Row */}
      <div style={{ 
        display: 'flex', 
        gap: '14px', 
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{ 
          flex: 1, 
          minWidth: '280px',
          position: 'relative' 
        }}>
          <Search size={16} style={{
            position: 'absolute', left: '14px',
            top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />
          <input
            type="text"
            placeholder="Search by name, brand, part number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px 12px 42px',
              color: 'white',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: '12px',
                top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: 'white',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="name">Sort: Name A-Z</option>
          <option value="price-asc">Sort: Price Low-High</option>
          <option value="price-desc">Sort: Price High-Low</option>
          <option value="newest">Sort: Newest First</option>
        </select>

        {/* Result count */}
        <span style={{ 
          color: 'var(--text-muted)', 
          fontSize: '13px',
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}>
          {displayParts.length} result{displayParts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Category Pills */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        flexWrap: 'wrap' 
      }}>
        <button
          onClick={() => {
            setSelectedCategory(null);
            fetchParts();
          }}
          style={{
            padding: '7px 16px',
            borderRadius: '99px',
            border: '1px solid',
            borderColor: selectedCategory === null 
              ? 'var(--accent)' 
              : 'var(--border)',
            backgroundColor: selectedCategory === null 
              ? 'var(--accent-dim)' 
              : 'var(--bg-card)',
            color: selectedCategory === null 
              ? 'var(--accent)' 
              : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          All Categories
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id);
            }}
            style={{
              padding: '7px 16px',
              borderRadius: '99px',
              border: '1px solid',
              borderColor: selectedCategory === cat.id 
                ? 'var(--accent)' 
                : 'var(--border)',
              backgroundColor: selectedCategory === cat.id 
                ? 'var(--accent-dim)' 
                : 'var(--bg-card)',
              color: selectedCategory === cat.id 
                ? 'var(--accent)' 
                : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Parts Grid */}
      {loading ? (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '20px' 
        }}>
          {[1,2,3,4,5,6].map(i => (
            <Skeleton 
              key={i} 
              height="320px" 
              borderRadius="var(--radius-xl)" 
            />
          ))}
        </div>
      ) : displayParts.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '80px',
          textAlign: 'center'
        }}>
          <Package 
            size={56} 
            color="var(--text-muted)" 
            style={{ marginBottom: '16px', opacity: 0.4 }} 
          />
          <h3 style={{ 
            fontSize: '18px', fontWeight: 700, 
            color: 'white', marginBottom: '8px' 
          }}>
            No parts found
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {search 
              ? `No parts matching "${search}"` 
              : 'No parts available in this category'}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                marginTop: '16px',
                backgroundColor: 'var(--accent-dim)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 20px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '13px'
              }}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '20px' 
        }}>
          {displayParts.map(part => {
            const qty = quantities[part.id] || 1;
            const inCart = cartItemIds.has(part.id);
            const isAdding = addingId === part.id;
            
            return (
              <div
                key={part.id}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: `1px solid ${inCart 
                    ? 'var(--success)' 
                    : 'var(--border)'}`,
                  borderRadius: 'var(--radius-xl)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  if (!inCart) {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = 
                      '0 8px 24px rgba(0,0,0,0.3)';
                  }
                }}
                onMouseLeave={e => {
                  if (!inCart) {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {/* In Cart Badge */}
                {inCart && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: 'var(--success-dim)',
                    border: '1px solid var(--success)',
                    borderRadius: '99px',
                    padding: '3px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10px',
                    fontWeight: 800,
                    color: 'var(--success)',
                    textTransform: 'uppercase'
                  }}>
                    <CheckCircle size={10} />
                    In Cart
                  </div>
                )}

                {/* Part Icon & Category */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  justifyContent: 'space-between' 
                }}>
                  <div style={{
                    width: '52px', height: '52px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--accent-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)'
                  }}>
                    <Package size={26} />
                  </div>
                  <span style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '99px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {part.categoryName}
                  </span>
                </div>

                {/* Part Info */}
                <div style={{ flex: 1 }}>
                  <p style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                  }}>
                    {part.partNumber}
                  </p>
                  <h3 style={{ 
                    fontSize: '17px', 
                    fontWeight: 800, 
                    color: 'white',
                    marginBottom: '4px',
                    lineHeight: 1.3
                  }}>
                    {part.name}
                  </h3>
                  {part.brand && (
                    <p style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}>
                      by {part.brand}
                    </p>
                  )}
                  {part.description && (
                    <p style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as any,
                      overflow: 'hidden'
                    }}>
                      {part.description}
                    </p>
                  )}
                </div>

                {/* Stock indicator */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px' 
                  }}>
                    <div style={{
                      width: '8px', height: '8px',
                      borderRadius: '50%',
                      backgroundColor: part.stockQuantity > 10 
                        ? 'var(--success)' 
                        : part.stockQuantity > 3 
                        ? 'var(--warning)' 
                        : 'var(--danger)'
                    }} />
                    <span style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-secondary)',
                      fontWeight: 600
                    }}>
                      {part.stockQuantity > 10 
                        ? `${part.stockQuantity} in stock`
                        : part.stockQuantity > 0 
                        ? `Only ${part.stockQuantity} left!`
                        : 'Out of stock'}
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: '20px', 
                    fontWeight: 800, 
                    color: 'var(--success)' 
                  }}>
                    ${part.unitPrice.toFixed(2)}
                  </span>
                </div>

                {/* Quantity + Add to Cart */}
                {isCustomer ? (
                  <div style={{ 
                    display: 'flex', 
                    gap: '10px',
                    alignItems: 'center'
                  }}>
                    {/* Quantity selector */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      <button
                        onClick={() => updateQuantity(part.id, -1)}
                        style={{
                          padding: '8px 11px',
                          background: 'none', border: 'none',
                          color: 'white', cursor: 'pointer',
                          fontSize: '16px', fontWeight: 700
                        }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{
                        padding: '8px 6px',
                        fontWeight: 700, color: 'white',
                        fontSize: '14px', minWidth: '28px',
                        textAlign: 'center'
                      }}>
                        {qty}
                      </span>
                      <button
                        onClick={() => updateQuantity(part.id, 1)}
                        disabled={qty >= part.stockQuantity}
                        style={{
                          padding: '8px 11px',
                          background: 'none', border: 'none',
                          color: qty >= part.stockQuantity 
                            ? 'var(--text-muted)' 
                            : 'white',
                          cursor: qty >= part.stockQuantity 
                            ? 'not-allowed' 
                            : 'pointer',
                          fontSize: '16px', fontWeight: 700
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Add to cart button */}
                    <button
                      onClick={() => handleAddToCart(part)}
                      disabled={isAdding || inCart}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        backgroundColor: inCart 
                          ? 'var(--success-dim)' 
                          : 'var(--accent)',
                        color: inCart ? 'var(--success)' : 'white',
                        border: inCart 
                          ? '1px solid var(--success)' 
                          : 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 16px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: isAdding || inCart 
                          ? 'not-allowed' 
                          : 'pointer',
                        opacity: isAdding ? 0.7 : 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isAdding ? (
                        <>Adding...</>
                      ) : inCart ? (
                        <><CheckCircle size={15} /> In Cart</>
                      ) : (
                        <><ShoppingCart size={15} /> Add to Cart</>
                      )}
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {token 
                      ? 'Log in as Customer to purchase' 
                      : 'Log in to add to cart'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;
