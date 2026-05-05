import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Search, Tag, DollarSign,
  Hash, BarChart3, Trash2, Edit3, Save,
  X, AlertTriangle, CheckCircle, TrendingUp,
  ChevronDown, Box, Filter
} from 'lucide-react';
import { sparePartService } from '../../services/sparePartService';
import { sparePartCategoryService } from 
  '../../services/sparePartCategoryService';
import { useToast } from '../../hooks/useToast';
import Skeleton from '../../components/shared/Skeleton';

const SparePartsPage: React.FC = () => {
  const { showToast } = useToast();

  const [parts, setParts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state — matches CreateSparePartDto exactly
  const [form, setForm] = useState({
    name: '',
    partNumber: '',
    categoryId: '',
    brand: '',
    description: '',
    unitPrice: '',
    stockQuantity: '',
    minimumStockLevel: '5',
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        sparePartService.getAll().catch(() => []),
        sparePartCategoryService.getAll().catch(() => []),
      ]);
      setParts(p);
      setCategories(c);
      // Set default category if available
      if (c.length > 0 && !form.categoryId) {
        setForm(prev => ({ ...prev, categoryId: String(c[0].id) }));
      }
    } catch {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.categoryId) {
      showToast('Please select a category', 'error');
      return;
    }
    if (!form.name.trim()) {
      showToast('Part name is required', 'error');
      return;
    }
    if (!form.partNumber.trim()) {
      showToast('Part number is required', 'error');
      return;
    }
    if (!form.unitPrice || parseFloat(form.unitPrice) <= 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }
    if (!form.stockQuantity || parseInt(form.stockQuantity) < 0) {
      showToast('Please enter a valid stock quantity', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await sparePartService.create({
        categoryId: parseInt(form.categoryId),
        name: form.name.trim(),
        partNumber: form.partNumber.trim(),
        brand: form.brand.trim(),
        description: form.description.trim(),
        unitPrice: parseFloat(form.unitPrice),
        stockQuantity: parseInt(form.stockQuantity),
        minimumStockLevel: parseInt(form.minimumStockLevel) || 5,
      });
      showToast(`"${form.name}" added to inventory!`, 'success');
      setShowForm(false);
      setForm({
        name: '', partNumber: '',
        categoryId: categories.length > 0 ? String(categories[0].id) : '',
        brand: '', description: '',
        unitPrice: '', stockQuantity: '',
        minimumStockLevel: '5',
      });
      fetchAll();
    } catch (err: any) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(', ')
        : err.response?.data?.message
        ?? err.response?.data?.title
        ?? 'Failed to create spare part';
      showToast(String(msg), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustStock = async (id: number) => {
    const delta = parseInt(adjustValue);
    if (isNaN(delta) || delta === 0) {
      showToast('Enter a non-zero adjustment value', 'error');
      return;
    }
    if (!adjustReason.trim()) {
      showToast('Please enter a reason for the adjustment', 'error');
      return;
    }
    try {
      await sparePartService.adjustStock(id, delta, adjustReason.trim());
      showToast('Stock adjusted successfully', 'success');
      setAdjustingId(null);
      setAdjustValue('');
      setAdjustReason('');
      fetchAll();
    } catch (err: any) {
      showToast(
        err.response?.data?.error ?? 'Adjustment failed', 
        'error'
      );
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}" from inventory?`)) return;
    try {
      await sparePartService.delete(id);
      showToast(`"${name}" removed from inventory`, 'success');
      fetchAll();
    } catch (err: any) {
      showToast(
        err.response?.data?.message ?? 'Cannot delete this part', 
        'error'
      );
    }
  };

  // Filter parts
  const displayed = parts.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name?.toLowerCase().includes(q) ||
      p.partNumber?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q);
    const matchCat =
      !filterCategory || String(p.categoryId) === filterCategory;
    return matchSearch && matchCat;
  });

  const lowStockCount = parts.filter(p => p.isLowStock).length;
  const totalValue = parts.reduce(
    (sum, p) => sum + (p.unitPrice * p.stockQuantity), 0
  );

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '11px 14px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Page Header ── */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <h1 style={{
            fontSize: '28px', fontWeight: 800,
            color: 'white', marginBottom: '6px',
          }}>
            Spare Parts Inventory
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Manage all spare parts visible in the shared marketplace
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: showForm
              ? 'var(--bg-card)'
              : 'linear-gradient(135deg, var(--accent), #b91c1c)',
            color: showForm ? 'var(--text-secondary)' : 'white',
            border: showForm ? '1px solid var(--border)' : 'none',
            borderRadius: 'var(--radius-md)',
            padding: '12px 22px',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: showForm
              ? 'none'
              : '0 4px 14px rgba(220,38,38,0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          {showForm ? <><X size={18} /> Cancel</> 
                    : <><Plus size={18} /> Add New Part</>}
        </button>
      </header>

      {/* ── Stats Row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
      }}>
        {[
          {
            label: 'Total Parts',
            value: parts.length,
            icon: <Package size={22} />,
            color: 'var(--blue)',
            bg: 'var(--blue-dim)',
          },
          {
            label: 'Low Stock Alerts',
            value: lowStockCount,
            icon: <AlertTriangle size={22} />,
            color: lowStockCount > 0 ? 'var(--danger)' : 'var(--success)',
            bg: lowStockCount > 0 ? 'var(--danger-dim)' : 'var(--success-dim)',
          },
          {
            label: 'Categories',
            value: categories.length,
            icon: <Tag size={22} />,
            color: 'var(--purple)',
            bg: 'var(--purple-dim)',
          },
          {
            label: 'Total Value',
            value: `$${totalValue.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}`,
            icon: <TrendingUp size={22} />,
            color: 'var(--success)',
            bg: 'var(--success-dim)',
          },
        ].map((s, i) => (
          <div key={i} style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{
              width: '48px', height: '48px',
              borderRadius: '12px',
              backgroundColor: s.bg,
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              color: s.color,
              flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div>
              <p style={{
                fontSize: '22px', fontWeight: 800,
                color: 'white', lineHeight: 1.2,
              }}>
                {s.value}
              </p>
              <p style={{
                fontSize: '11px', fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add New Part Form (collapsible) ── */}
      {showForm && (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: '0 0 0 1px var(--accent-dim)',
        }}>
          {/* Form Header */}
          <div style={{
            background: 'linear-gradient(135deg, var(--accent), #b91c1c)',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '36px', height: '36px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Plus size={20} color="white" />
            </div>
            <div>
              <h2 style={{
                fontSize: '16px', fontWeight: 800,
                color: 'white',
              }}>
                Add New Spare Part
              </h2>
              <p style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.7)',
              }}>
                This part will appear in the shared marketplace 
                once added
              </p>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} style={{ padding: '28px' }}>
            {/* Row 1 — Name, Part Number, Category */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr',
              gap: '20px',
              marginBottom: '20px',
            }}>
              <div>
                <label style={labelStyle}>
                  Part Name <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Brake Pad Set"
                  required
                  style={inputStyle}
                  onFocus={e => 
                    (e.target.style.borderColor = 'var(--accent)')
                  }
                  onBlur={e => 
                    (e.target.style.borderColor = 'var(--border)')
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Part Number <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  name="partNumber"
                  value={form.partNumber}
                  onChange={handleFormChange}
                  placeholder="e.g. BP-2024"
                  required
                  style={inputStyle}
                  onFocus={e => 
                    (e.target.style.borderColor = 'var(--accent)')
                  }
                  onBlur={e => 
                    (e.target.style.borderColor = 'var(--border)')
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Category <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <select
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleFormChange}
                  required
                  style={{
                    ...inputStyle,
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                  onFocus={e => 
                    (e.target.style.borderColor = 'var(--accent)')
                  }
                  onBlur={e => 
                    (e.target.style.borderColor = 'var(--border)')
                  }
                >
                  <option value="">— Select category —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2 — Brand, Description */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr',
              gap: '20px',
              marginBottom: '20px',
            }}>
              <div>
                <label style={labelStyle}>Brand</label>
                <input
                  name="brand"
                  value={form.brand}
                  onChange={handleFormChange}
                  placeholder="e.g. Bosch, NGK, Brembo"
                  style={inputStyle}
                  onFocus={e => 
                    (e.target.style.borderColor = 'var(--accent)')
                  }
                  onBlur={e => 
                    (e.target.style.borderColor = 'var(--border)')
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Brief description of the part..."
                  style={inputStyle}
                  onFocus={e => 
                    (e.target.style.borderColor = 'var(--accent)')
                  }
                  onBlur={e => 
                    (e.target.style.borderColor = 'var(--border)')
                  }
                />
              </div>
            </div>

            {/* Row 3 — Price, Stock, Min Stock */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '20px',
              marginBottom: '28px',
            }}>
              <div>
                <label style={labelStyle}>
                  Unit Price ($) <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '13px',
                    top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--success)', fontWeight: 700,
                    fontSize: '14px',
                  }}>$</span>
                  <input
                    name="unitPrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.unitPrice}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    required
                    style={{ ...inputStyle, paddingLeft: '28px' }}
                    onFocus={e => 
                      (e.target.style.borderColor = 'var(--accent)')
                    }
                    onBlur={e => 
                      (e.target.style.borderColor = 'var(--border)')
                    }
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>
                  Initial Stock <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  name="stockQuantity"
                  type="number"
                  min="0"
                  value={form.stockQuantity}
                  onChange={handleFormChange}
                  placeholder="e.g. 100"
                  required
                  style={inputStyle}
                  onFocus={e => 
                    (e.target.style.borderColor = 'var(--accent)')
                  }
                  onBlur={e => 
                    (e.target.style.borderColor = 'var(--border)')
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Minimum Stock Level
                </label>
                <input
                  name="minimumStockLevel"
                  type="number"
                  min="0"
                  value={form.minimumStockLevel}
                  onChange={handleFormChange}
                  placeholder="e.g. 5"
                  style={inputStyle}
                  onFocus={e => 
                    (e.target.style.borderColor = 'var(--accent)')
                  }
                  onBlur={e => 
                    (e.target.style.borderColor = 'var(--border)')
                  }
                />
                <p style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  marginTop: '5px',
                }}>
                  Alert triggers below this quantity
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border)',
            }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 24px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <X size={16} /> Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: submitting
                    ? 'var(--bg-secondary)'
                    : 'linear-gradient(135deg, var(--accent), #b91c1c)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 28px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: submitting
                    ? 'none'
                    : '0 4px 14px rgba(220,38,38,0.35)',
                  opacity: submitting ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                  minWidth: '160px',
                  justifyContent: 'center',
                }}
              >
                {submitting ? (
                  'Adding Part...'
                ) : (
                  <><Plus size={18} /> Add to Inventory</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters Row ── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: 1, position: 'relative', maxWidth: '380px' }}>
          <Search size={16} style={{
            position: 'absolute', left: '13px',
            top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            type="text"
            placeholder="Search by name, number or brand..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              ...inputStyle,
              paddingLeft: '40px',
              backgroundColor: 'var(--bg-card)',
            }}
          />
        </div>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          style={{
            ...inputStyle,
            width: 'auto',
            minWidth: '180px',
            backgroundColor: 'var(--bg-card)',
            cursor: 'pointer',
          }}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>

        <span style={{
          color: 'var(--text-muted)',
          fontSize: '13px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          {displayed.length} part{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Parts Table ── */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '1px',
          }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} height="64px" borderRadius="0" />
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '900px',
            }}>
              <thead>
                <tr>
                  {[
                    { label: '#', w: '60px' },
                    { label: 'Part Details', w: undefined },
                    { label: 'Category', w: '140px' },
                    { label: 'Brand', w: '120px' },
                    { label: 'Price', w: '100px' },
                    { label: 'Stock', w: '120px' },
                    { label: 'Status', w: '110px' },
                    { label: 'Actions', w: '180px' },
                  ].map((col, i) => (
                    <th key={i} style={{
                      padding: '12px 16px',
                      fontSize: '10px',
                      fontWeight: 800,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      textAlign: 'left',
                      backgroundColor: 'var(--bg-secondary)',
                      borderBottom: '1px solid var(--border)',
                      width: col.w,
                      whiteSpace: 'nowrap',
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{
                      padding: '60px',
                      textAlign: 'center',
                    }}>
                      <Package
                        size={40}
                        color="var(--text-muted)"
                        style={{ marginBottom: '12px', opacity: 0.3 }}
                      />
                      <p style={{
                        color: 'var(--text-muted)', fontSize: '14px',
                      }}>
                        {search
                          ? `No parts matching "${search}"`
                          : 'No spare parts in inventory yet'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayed.map(part => (
                    <React.Fragment key={part.id}>
                      <tr
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
                        <td style={{
                          padding: '14px 16px',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          <span style={{
                            fontWeight: 800,
                            color: 'var(--text-muted)',
                            fontSize: '12px',
                          }}>
                            #{part.id}
                          </span>
                        </td>

                        {/* Part Details */}
                        <td style={{
                          padding: '14px 16px',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}>
                            <div style={{
                              width: '40px', height: '40px',
                              borderRadius: '10px',
                              backgroundColor: 'var(--accent-dim)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--accent)',
                              flexShrink: 0,
                            }}>
                              <Package size={18} />
                            </div>
                            <div>
                              <p style={{
                                fontWeight: 700, color: 'white',
                                fontSize: '14px', marginBottom: '2px',
                              }}>
                                {part.name}
                              </p>
                              <p style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                fontFamily: 'monospace',
                              }}>
                                {part.partNumber}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{
                          padding: '14px 16px',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          <span style={{
                            backgroundColor: 'var(--purple-dim)',
                            color: 'var(--purple)',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '99px',
                            whiteSpace: 'nowrap',
                          }}>
                            {part.categoryName}
                          </span>
                        </td>

                        {/* Brand */}
                        <td style={{
                          padding: '14px 16px',
                          borderBottom: '1px solid var(--border)',
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          fontWeight: 600,
                        }}>
                          {part.brand || '—'}
                        </td>

                        {/* Price */}
                        <td style={{
                          padding: '14px 16px',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          <span style={{
                            fontSize: '15px',
                            fontWeight: 800,
                            color: 'var(--success)',
                          }}>
                            ${(part.unitPrice ?? 0).toFixed(2)}
                          </span>
                        </td>

                        {/* Stock */}
                        <td style={{
                          padding: '14px 16px',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          <div>
                            <span style={{
                              fontSize: '16px',
                              fontWeight: 800,
                              color: part.isLowStock
                                ? 'var(--danger)'
                                : 'white',
                            }}>
                              {part.stockQuantity}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              marginLeft: '4px',
                            }}>
                              units
                            </span>
                          </div>
                          {part.isLowStock && (
                            <p style={{
                              fontSize: '10px',
                              color: 'var(--danger)',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px',
                            }}>
                              ⚠ Low Stock
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{
                          padding: '14px 16px',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 12px',
                            borderRadius: '99px',
                            fontSize: '10px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            backgroundColor: part.isActive
                              ? 'var(--success-dim)'
                              : 'var(--bg-secondary)',
                            color: part.isActive
                              ? 'var(--success)'
                              : 'var(--text-muted)',
                          }}>
                            <CheckCircle size={10} />
                            {part.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{
                          padding: '14px 16px',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {/* Adjust Stock Button */}
                            <button
                              onClick={() => {
                                setAdjustingId(
                                  adjustingId === part.id 
                                    ? null 
                                    : part.id
                                );
                                setAdjustValue('');
                                setAdjustReason('');
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                backgroundColor: 'var(--blue-dim)',
                                border: '1px solid var(--blue)',
                                color: 'var(--blue)',
                                padding: '7px 12px',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 700,
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor =
                                  'var(--blue)';
                                e.currentTarget.style.color = 'white';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor =
                                  'var(--blue-dim)';
                                e.currentTarget.style.color = 'var(--blue)';
                              }}
                            >
                              <BarChart3 size={13} />
                              Stock
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() =>
                                handleDelete(part.id, part.name)
                              }
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                backgroundColor: 'var(--danger-dim)',
                                border: '1px solid var(--danger)',
                                color: 'var(--danger)',
                                padding: '7px 12px',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 700,
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor =
                                  'var(--danger)';
                                e.currentTarget.style.color = 'white';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor =
                                  'var(--danger-dim)';
                                e.currentTarget.style.color = 'var(--danger)';
                              }}
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline Stock Adjustment Panel */}
                      {adjustingId === part.id && (
                        <tr>
                          <td colSpan={8} style={{
                            padding: '0',
                            borderBottom: '1px solid var(--border)',
                            backgroundColor: 'var(--blue-dim)',
                          }}>
                            <div style={{
                              padding: '16px 24px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              flexWrap: 'wrap',
                            }}>
                              <span style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: 'var(--blue)',
                                whiteSpace: 'nowrap',
                              }}>
                                Adjust stock for{' '}
                                <strong style={{ color: 'white' }}>
                                  {part.name}
                                </strong>
                                {' '}(current: {part.stockQuantity}):
                              </span>

                              <input
                                type="number"
                                value={adjustValue}
                                onChange={e =>
                                  setAdjustValue(e.target.value)
                                }
                                placeholder="+10 or -5"
                                style={{
                                  ...inputStyle,
                                  width: '120px',
                                  backgroundColor: 'var(--bg-card)',
                                }}
                              />

                              <input
                                type="text"
                                value={adjustReason}
                                onChange={e =>
                                  setAdjustReason(e.target.value)
                                }
                                placeholder="Reason (e.g. New shipment)"
                                style={{
                                  ...inputStyle,
                                  flex: 1,
                                  minWidth: '200px',
                                  backgroundColor: 'var(--bg-card)',
                                }}
                              />

                              <div style={{
                                display: 'flex',
                                gap: '8px',
                              }}>
                                <button
                                  onClick={() =>
                                    handleAdjustStock(part.id)
                                  }
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    backgroundColor: 'var(--blue)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px 18px',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <Save size={14} /> Apply
                                </button>
                                <button
                                  onClick={() => setAdjustingId(null)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-muted)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px 14px',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SparePartsPage;
