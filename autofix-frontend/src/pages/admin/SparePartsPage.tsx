import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Plus, Search, Tag, DollarSign, 
  Trash2, Edit3, Save, X, AlertTriangle, CheckCircle, 
  TrendingUp, FileSpreadsheet, RefreshCw, Archive, RotateCcw, 
  Layers, ArrowUpDown, ChevronDown 
} from 'lucide-react';
import { sparePartService } from '../../services/sparePartService';
import { sparePartCategoryService } from '../../services/sparePartCategoryService';
import Money from '../../components/shared/Money';
import axiosClient from '../../services/axiosClient';
import toast from 'react-hot-toast';

export const SparePartsPage: React.FC = () => {
  const [parts, setParts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter tabs: 'all' | 'low' | 'out' | 'archived'
  const [activeTab, setActiveTab] = useState<'all' | 'low' | 'out' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Modals & Forms
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPart, setEditingPart] = useState<any | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    partNumber: '',
    categoryId: '',
    brand: '',
    shelfLocation: '',
    description: '',
    purchaseCost: '',
    unitPrice: '',
    stockQuantity: '0',
    minimumStockLevel: '5'
  });

  // Stock Adjustment modal state (adjustment only with reason!)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustTargetPart, setAdjustTargetPart] = useState<any | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustError, setAdjustError] = useState<string>('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        sparePartService.getAll().catch(() => []),
        sparePartCategoryService.getAll().catch(() => [])
      ]);
      setParts(p);
      setCategories(c);
      if (c.length > 0 && !formData.categoryId) {
        setFormData(prev => ({ ...prev, categoryId: String(c[0].id) }));
      }
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleOpenAdd = () => {
    setEditingPart(null);
    setFormData({
      name: '',
      partNumber: '',
      categoryId: categories.length > 0 ? String(categories[0].id) : '',
      brand: '',
      shelfLocation: '',
      description: '',
      purchaseCost: '',
      unitPrice: '',
      stockQuantity: '0',
      minimumStockLevel: '5'
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (part: any) => {
    setEditingPart(part);
    setFormData({
      name: part.name || '',
      partNumber: part.partNumber || '',
      categoryId: String(part.categoryId || (categories[0]?.id || '')),
      brand: part.brand || '',
      shelfLocation: part.shelfLocation || '',
      description: part.description || '',
      purchaseCost: String(part.purchaseCost || ''),
      unitPrice: String(part.unitPrice || part.sellingPrice || ''),
      stockQuantity: String(part.stockQuantity || '0'),
      minimumStockLevel: String(part.minimumStockLevel || '5')
    });
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPart) {
        await sparePartService.update(editingPart.id, {
          categoryId: parseInt(formData.categoryId) || categories[0]?.id || 1,
          name: formData.name.trim(),
          partNumber: formData.partNumber.trim(),
          brand: formData.brand.trim(),
          description: formData.description.trim(),
          unitPrice: parseFloat(formData.unitPrice) || 0,
          minimumStockLevel: parseInt(formData.minimumStockLevel) || 5
        });
      } else {
        await sparePartService.create({
          categoryId: parseInt(formData.categoryId) || categories[0]?.id || 1,
          name: formData.name.trim(),
          partNumber: formData.partNumber.trim(),
          brand: formData.brand.trim(),
          description: formData.description.trim(),
          unitPrice: parseFloat(formData.unitPrice) || 0,
          stockQuantity: parseInt(formData.stockQuantity) || 0,
          minimumStockLevel: parseInt(formData.minimumStockLevel) || 5
        });
      }
      setShowFormModal(false);
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حفظ قطعة الغيار');
    }
  };

  // Stock Adjustment (ONLY through a movement with a reason)
  const handleOpenAdjust = (part: any) => {
    setAdjustTargetPart(part);
    setAdjustDelta('');
    setAdjustReason('');
    setAdjustError('');
    setAdjustModalOpen(true);
  };

  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const delta = parseInt(adjustDelta);
    if (isNaN(delta) || delta === 0) {
      setAdjustError('يرجى إدخال قيمة تعديل صحيحة (موجبة للإضافة أو سالبة للصرف)');
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError('يرجى كتابة سبب التعديل (إجباري لتوثيق حركة المخزن)');
      return;
    }

    setIsSubmittingAdjust(true);
    setAdjustError('');

    try {
      await sparePartService.adjustStock(adjustTargetPart.id, delta, adjustReason.trim());
      setAdjustModalOpen(false);
      await fetchAll();
    } catch (err: any) {
      setAdjustError(err.response?.data?.message || 'فشل تعديل المخزون');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Soft Delete (Archive)
  const handleArchive = async (id: number, name: string) => {
    if (!window.confirm(`هل أنت متأكد من أرشفة "${name}" ونقلها إلى الأرشيف؟`)) return;
    try {
      await sparePartService.delete(id);
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشلت أرشفة القطعة');
    }
  };

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const filterParam = activeTab === 'all' ? '' : activeTab;
      const res = await axiosClient.get(`/spareparts/export?format=${format}&filter=${filterParam}`, {
        responseType: 'blob'
      });
      const today = new Date().toISOString().split('T')[0];
      const fileName = `AP_Spareparts_${today}.${format}`;
      const blob = new Blob([res.data], {
        type: format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv; charset=utf-8'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      toast.success(format === 'xlsx' ? 'تم تصدير ملف Excel بنجاح' : 'تم تصدير ملف CSV بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء تصدير قطع الغيار');
    } finally {
      setIsExporting(false);
    }
  };

  // Filtered Parts
  const filteredParts = useMemo(() => {
    return parts.filter(p => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.partNumber || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.shelfLocation || '').toLowerCase().includes(q);

      const matchCat = !selectedCategory || String(p.categoryId) === selectedCategory;

      const isOut = (p.stockQuantity || 0) <= 0;
      const isLow = !isOut && (p.stockQuantity || 0) <= (p.minimumStockLevel || 5);

      let matchTab = true;
      if (activeTab === 'low') matchTab = isLow;
      else if (activeTab === 'out') matchTab = isOut;
      else if (activeTab === 'archived') matchTab = !!p.isDeleted;
      else matchTab = !p.isDeleted;

      return matchSearch && matchCat && matchTab;
    });
  }, [parts, searchQuery, selectedCategory, activeTab]);

  const totalValue = parts.reduce(
    (sum, p) => sum + ((p.unitPrice || p.sellingPrice || 0) * (p.stockQuantity || 0)), 
    0
  );

  const lowStockCount = parts.filter(p => !p.isDeleted && (p.stockQuantity || 0) > 0 && (p.stockQuantity || 0) <= (p.minimumStockLevel || 5)).length;
  const outOfStockCount = parts.filter(p => !p.isDeleted && (p.stockQuantity || 0) <= 0).length;

  return (
    <div dir="rtl" style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: 'Cairo, sans-serif', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={26} color="#10b981" />
            المخزن وإدارة قطع الغيار
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            متابعة دقيقة للأرصدة، حركات الصرف والإضافة، النواقص، وأسعار الشراء والبيع
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(prev => !prev)}
              disabled={isExporting}
              style={{ ...actionBtnStyle, opacity: isExporting ? 0.7 : 1 }}
              title="تصدير بيانات المخزن إلى ملف Excel أو CSV"
            >
              <FileSpreadsheet size={16} color="#3b82f6" />
              <span>{isExporting ? 'جاري التصدير...' : 'تصدير Excel/CSV'}</span>
              <ChevronDown size={14} color="#94a3b8" />
            </button>

            {showExportMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  zIndex: 50,
                  minWidth: '180px',
                  overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => handleExport('xlsx')}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    textAlign: 'right',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#f8fafc',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <FileSpreadsheet size={15} color="#10b981" />
                  <span>تصدير Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    textAlign: 'right',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#f8fafc',
                    background: 'transparent',
                    border: 'none',
                    borderTop: '1px solid #334155',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <FileSpreadsheet size={15} color="#3b82f6" />
                  <span>تصدير CSV (.csv)</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleOpenAdd}
            style={primaryAddBtnStyle}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div style={statsGridStyle}>
        <div style={statCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statLabelStyle}>إجمالي الأصناف بالمخزن</span>
            <div style={{ ...iconBadgeStyle, backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Package size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', marginTop: '6px' }}>
            {parts.length} صنف
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statLabelStyle}>نواقص المخزن (تحت الحد الأدنى)</span>
            <div style={{ ...iconBadgeStyle, backgroundColor: lowStockCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: lowStockCount > 0 ? '#f59e0b' : '#10b981' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: lowStockCount > 0 ? '#f59e0b' : '#10b981', marginTop: '6px' }}>
            {lowStockCount} أصناف
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statLabelStyle}>أصناف نفدت تماماً</span>
            <div style={{ ...iconBadgeStyle, backgroundColor: outOfStockCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: outOfStockCount > 0 ? '#ef4444' : '#10b981' }}>
              <X size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: outOfStockCount > 0 ? '#ef4444' : '#10b981', marginTop: '6px' }}>
            {outOfStockCount} صنف
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statLabelStyle}>إجمالي قيمة المخزون الحالي</span>
            <div style={{ ...iconBadgeStyle, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#10b981', marginTop: '6px' }}>
            <Money value={totalValue} />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={filterBarContainerStyle}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `الكل (${parts.length})` },
            { id: 'low', label: `نواقص المخزن (${lowStockCount})` },
            { id: 'out', label: `نفد من المخزن (${outOfStockCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                ...filterTabBtnStyle,
                backgroundColor: activeTab === tab.id ? '#10b981' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
                fontWeight: activeTab === tab.id ? 800 : 600
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '420px', minWidth: '220px' }}>
          <div style={searchBoxStyle}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="ابحث بالاسم، رقم القطعة، أو الرف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={searchInputStyle}
            />
          </div>

          <button onClick={fetchAll} style={refreshIconBtnStyle} title="تحديث">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table (Laptop/Tablet) or Cards (Phone) */}
      <div style={tableContainerStyle}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <RefreshCw size={28} className="animate-spin text-accent" style={{ margin: '0 auto 8px' }} />
            جاري تحميل قطع الغيار...
          </div>
        ) : filteredParts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            لا توجد أصناف تطابق معايير البحث والفلترة
          </div>
        ) : isMobile ? (
          /* Mobile Cards View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
            {filteredParts.map(part => (
              <div key={part.id} style={mobileCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#ffffff' }}>{part.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>رقم: {part.partNumber} • {part.brand || 'عام'}</div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#10b981' }}>
                      <Money value={part.unitPrice || part.sellingPrice} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      الرصيد: <strong>{part.stockQuantity}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #212c3d' }}>
                  <button onClick={() => handleOpenAdjust(part)} style={mobileActionBtnStyle}>
                    <ArrowUpDown size={12} /> تعديل الرصيد بحركة
                  </button>
                  <button onClick={() => handleOpenEdit(part)} style={mobileActionBtnStyle}>
                    <Edit3 size={12} /> تعديل
                  </button>
                  <button onClick={() => handleArchive(part.id, part.name)} style={{ ...mobileActionBtnStyle, color: '#ef4444' }}>
                    <Archive size={12} /> أرشفة
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop Table View */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#11161d', color: '#94a3b8', borderBottom: '1px solid #212c3d', textAlign: 'right' }}>
                  <th style={{ padding: '12px 14px' }}>اسم الصنف</th>
                  <th style={{ padding: '12px 14px' }}>رقم القطعة (Part No)</th>
                  <th style={{ padding: '12px 14px' }}>الماركة / التصنيف</th>
                  <th style={{ padding: '12px 14px' }}>الرصيد بالمخزن</th>
                  <th style={{ padding: '12px 14px' }}>سعر الشراء (التكلفة)</th>
                  <th style={{ padding: '12px 14px' }}>سعر البيع</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredParts.map((part, idx) => {
                  const isOutOfStock = (part.stockQuantity || 0) <= 0;
                  const isLowStock = !isOutOfStock && (part.stockQuantity || 0) <= (part.minimumStockLevel || 5);

                  return (
                    <tr key={part.id} style={{ borderBottom: '1px solid #1c2430', backgroundColor: idx % 2 === 0 ? '#161c24' : '#141920' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#ffffff' }}>
                        {part.name}
                      </td>

                      <td style={{ padding: '10px 14px', color: '#cbd5e1', direction: 'ltr', textAlign: 'right' }}>
                        {part.partNumber}
                      </td>

                      <td style={{ padding: '10px 14px', color: '#94a3b8' }}>
                        {part.brand || 'عام'} {part.categoryName ? `• ${part.categoryName}` : ''}
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          backgroundColor: isOutOfStock ? 'rgba(239, 68, 68, 0.15)' : isLowStock ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: isOutOfStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#10b981',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 800
                        }}>
                          {part.stockQuantity} وحدة
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px', color: '#94a3b8' }}>
                        <Money value={part.purchaseCost || 0} />
                      </td>

                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#ffffff' }}>
                        <Money value={part.unitPrice || part.sellingPrice || 0} />
                      </td>

                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenAdjust(part)}
                            style={tableAdjustBtnStyle}
                            title="تعديل الرصيد بحركة مع بيان السبب"
                          >
                            <ArrowUpDown size={13} />
                            <span>حركة رصيد</span>
                          </button>

                          <button
                            onClick={() => handleOpenEdit(part)}
                            style={tableEditBtnStyle}
                            title="تعديل بيانات الصنف"
                          >
                            <Edit3 size={13} />
                            <span>تعديل</span>
                          </button>

                          <button
                            onClick={() => handleArchive(part.id, part.name)}
                            style={tableArchiveBtnStyle}
                            title="أرشفة الصنف"
                          >
                            <Archive size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STOCK ADJUSTMENT MODAL (ONLY with mandatory reason) */}
      {adjustModalOpen && adjustTargetPart && (
        <div style={modalOverlayStyle} dir="rtl">
          <div style={modalCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowUpDown size={18} color="#10b981" />
                <span>تسجيل حركة تعديل مخزون: {adjustTargetPart.name}</span>
              </div>
              <button onClick={() => setAdjustModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: '#0d1117', padding: '10px 12px', borderRadius: '8px', border: '1px solid #212c3d', marginBottom: '14px', fontSize: '12px' }}>
              <span style={{ color: '#94a3b8' }}>الرصيد الحالي بالمخزن: </span>
              <strong style={{ color: '#ffffff' }}>{adjustTargetPart.stockQuantity} وحدة</strong>
            </div>

            <form onSubmit={handleConfirmAdjust}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
                  مقدار التعديل (أدخل رقماً موجباً للإضافة أو سالباً للصرف) *
                </label>
                <input
                  type="number"
                  required
                  autoFocus
                  placeholder="مثال: +5 أو -2"
                  value={adjustDelta}
                  onChange={e => setAdjustDelta(e.target.value)}
                  style={modalInputStyle}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
                  سبب حركة التعديل (إجباري) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="مثال: جرد دوري، تالف، صرف داخلي للورشة، إضافة شحنة جديدة..."
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  style={{ ...modalInputStyle, height: '70px' }}
                />
              </div>

              {adjustError && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '10px' }}>
                  {adjustError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  style={modalCancelBtnStyle}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  style={modalPrimaryBtnStyle}
                >
                  {isSubmittingAdjust ? 'جاري الحفظ...' : 'تأكيد حركة المخزون'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT SPARE PART MODAL */}
      {showFormModal && (
        <div style={modalOverlayStyle} dir="rtl">
          <div style={{ ...modalCardStyle, maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color="#10b981" />
                <span>{editingPart ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد إلى المخزن'}</span>
              </div>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={modalLabelStyle}>اسم الصنف *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: تيل فرامل أمامي"
                    style={modalInputStyle}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={modalLabelStyle}>رقم القطعة (Part No) *</label>
                  <input
                    type="text"
                    required
                    value={formData.partNumber}
                    onChange={e => setFormData({ ...formData, partNumber: e.target.value })}
                    placeholder="BP-1234"
                    style={modalInputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={modalLabelStyle}>التصنيف</label>
                  <select
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    style={modalInputStyle}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nameArabic || cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={modalLabelStyle}>الماركة</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Toyota / Bosch"
                    style={modalInputStyle}
                  />
                </div>
                <div>
                  <label style={modalLabelStyle}>الرف / المكان بالمخزن</label>
                  <input
                    type="text"
                    value={formData.shelfLocation}
                    onChange={e => setFormData({ ...formData, shelfLocation: e.target.value })}
                    placeholder="A-12"
                    style={modalInputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={modalLabelStyle}>سعر الشراء (التكلفة) ج.م</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchaseCost}
                    onChange={e => setFormData({ ...formData, purchaseCost: e.target.value })}
                    placeholder="0.00"
                    style={modalInputStyle}
                  />
                </div>
                <div>
                  <label style={modalLabelStyle}>سعر البيع ج.م *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.unitPrice}
                    onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="0.00"
                    style={modalInputStyle}
                  />
                </div>
              </div>

              {!editingPart && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={modalLabelStyle}>الرصيد الافتتاحي *</label>
                    <input
                      type="number"
                      required
                      value={formData.stockQuantity}
                      onChange={e => setFormData({ ...formData, stockQuantity: e.target.value })}
                      style={modalInputStyle}
                    />
                  </div>
                  <div>
                    <label style={modalLabelStyle}>الحد الأدنى للتنبيه</label>
                    <input
                      type="number"
                      value={formData.minimumStockLevel}
                      onChange={e => setFormData({ ...formData, minimumStockLevel: e.target.value })}
                      style={modalInputStyle}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={modalLabelStyle}>وصف / ملاحظات</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="اختياري"
                  style={modalInputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowFormModal(false)} style={modalCancelBtnStyle}>
                  إلغاء
                </button>
                <button type="submit" style={modalPrimaryBtnStyle}>
                  {editingPart ? 'تحديث الصنف' : 'إضافة الصنف للمخزن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px'
};

const statCardStyle: React.CSSProperties = {
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '12px',
  padding: '16px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
};

const statLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#94a3b8'
};

const iconBadgeStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const filterBarContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '12px',
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '10px',
  padding: '10px 14px'
};

const filterTabBtnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: '6px',
  padding: '6px 12px',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

const searchBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: '#0d1117',
  border: '1px solid #212c3d',
  borderRadius: '8px',
  padding: '6px 12px',
  flex: 1
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'none',
  border: 'none',
  color: '#ffffff',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'Cairo, sans-serif'
};

const refreshIconBtnStyle: React.CSSProperties = {
  background: '#1c2430',
  border: '1px solid #2a3749',
  color: '#cbd5e1',
  borderRadius: '6px',
  padding: '6px 10px',
  cursor: 'pointer'
};

const tableContainerStyle: React.CSSProperties = {
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '12px',
  overflow: 'hidden'
};

const actionBtnStyle: React.CSSProperties = {
  backgroundColor: '#161c24',
  border: '1px solid #2a3749',
  color: '#cbd5e1',
  borderRadius: '8px',
  padding: '8px 14px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontFamily: 'Cairo, sans-serif'
};

const primaryAddBtnStyle: React.CSSProperties = {
  backgroundColor: '#10b981',
  border: 'none',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontFamily: 'Cairo, sans-serif'
};

const tableAdjustBtnStyle: React.CSSProperties = {
  backgroundColor: 'rgba(16, 185, 129, 0.12)',
  color: '#10b981',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontFamily: 'Cairo, sans-serif'
};

const tableEditBtnStyle: React.CSSProperties = {
  backgroundColor: 'rgba(59, 130, 246, 0.12)',
  color: '#60a5fa',
  border: '1px solid rgba(59, 130, 246, 0.3)',
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontFamily: 'Cairo, sans-serif'
};

const tableArchiveBtnStyle: React.CSSProperties = {
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  color: '#ef4444',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '11px',
  cursor: 'pointer'
};

const mobileCardStyle: React.CSSProperties = {
  backgroundColor: '#141920',
  border: '1px solid #212c3d',
  borderRadius: '10px',
  padding: '12px'
};

const mobileActionBtnStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#1c2430',
  border: '1px solid #2a3749',
  color: '#cbd5e1',
  borderRadius: '6px',
  padding: '6px',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  fontFamily: 'Cairo, sans-serif'
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  backdropFilter: 'blur(6px)',
  zIndex: 100000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px'
};

const modalCardStyle: React.CSSProperties = {
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '14px',
  padding: '24px',
  width: '100%',
  maxWidth: '460px',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)'
};

const modalLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  display: 'block',
  marginBottom: '4px'
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  backgroundColor: '#0d1117',
  border: '1px solid #2a3749',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'Cairo, sans-serif'
};

const modalCancelBtnStyle: React.CSSProperties = {
  backgroundColor: '#1c2430',
  color: '#94a3b8',
  border: '1px solid #2a3749',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

const modalPrimaryBtnStyle: React.CSSProperties = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 20px',
  fontSize: '13px',
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

export default SparePartsPage;
