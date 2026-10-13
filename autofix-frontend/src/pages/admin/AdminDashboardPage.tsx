import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Receipt, Wrench, 
  Car, Plus, Search, Trash2, Printer, CheckCircle, Clock, 
  MoreVertical, Edit2, User, RefreshCw, Eye, Ban, ShieldAlert,
  ChevronDown, AlertTriangle, Layers, Calendar, ArrowRight
} from 'lucide-react';
import Money from '../../components/shared/Money';
import axiosClient from '../../services/axiosClient';
import signalRService from '../../services/signalRService';
import { workOrderService } from '../../services/workOrderService';

// Modals
import NewWorkOrderModal from '../../components/dashboard/NewWorkOrderModal';
import ExpensesModal from '../../components/dashboard/ExpensesModal';
import CancelWorkOrderModal from '../../components/dashboard/CancelWorkOrderModal';
import InvoicePaymentModal from '../../components/dashboard/InvoicePaymentModal';
import CreditNoteModal from '../../components/dashboard/CreditNoteModal';
import CustomerSearchHistoryModal from '../../components/dashboard/CustomerSearchHistoryModal';
import { InvoicePreviewModal } from '../../components/shared/InvoicePreviewModal';
import { CarServiceHistoryModal } from '../../components/shared/CarServiceHistoryModal';

export const AdminDashboardPage: React.FC = () => {
  // Financial Summary State
  const [period, setPeriod] = useState<string>('month');
  const [financialData, setFinancialData] = useState<{
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    revenueChangePercentage: number;
    expenseChangePercentage: number;
    profitChangePercentage: number;
    revenueTrend: number[];
  }>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    revenueChangePercentage: 0,
    expenseChangePercentage: 0,
    profitChangePercentage: 0,
    revenueTrend: []
  });

  // Workshop & Active Cars State
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [carSearchQuery, setCarSearchQuery] = useState('');

  // Quick Parts State
  const [parts, setParts] = useState<any[]>([]);
  const [partsSearch, setPartsSearch] = useState('');
  const [loadingParts, setLoadingParts] = useState(false);

  // Workmanship Quick State
  const [workmanshipPrice, setWorkmanshipPrice] = useState<number>(300);
  const [workmanshipDesc, setWorkmanshipDesc] = useState<string>('فحص ومصنعية صيانة');

  // Concurrency Conflict Banner State
  const [concurrencyNotice, setConcurrencyNotice] = useState<{
    device: string;
    time: string;
    orderId: number;
  } | null>(null);

  // Modals Visibility
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [expensesModalOpen, setExpensesModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetOrder, setCancelTargetOrder] = useState<any | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false);
  const [searchHistoryModalOpen, setSearchHistoryModalOpen] = useState(false);
  const [searchHistoryTarget, setSearchHistoryTarget] = useState<any>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<{
    invoiceId?: number;
    workOrderInvoicePreviewId?: number;
    inspectionId?: number;
  }>({});
  const [carHistoryModalOpen, setCarHistoryModalOpen] = useState(false);
  const [carHistoryTarget, setCarHistoryTarget] = useState<{ carId?: number; carInfo?: string }>({});

  // 3-dots Card Menu dropdown state
  const [activeMenuOrderId, setActiveMenuOrderId] = useState<number | null>(null);

  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Financial Data
  const loadFinancial = async () => {
    try {
      const res = await axiosClient.get(`/dashboard/financial?period=${period}`);
      if (res.data) {
        setFinancialData(res.data);
      }
    } catch (err) {
      console.error('Failed to load financial summary', err);
    }
  };

  // Fetch Active Orders (cars with open jobs until invoice is printed or cancelled)
  const loadActiveOrders = async () => {
    try {
      const res = await axiosClient.get('/work-orders');
      if (Array.isArray(res.data)) {
        // Filter: active jobs where invoice is not issued/printed and not soft-deleted
        const filtered = res.data.filter(
          (o: any) => !o.isDeleted && o.status !== 'Invoiced' && o.status !== 'Cancelled'
        );
        setActiveOrders(filtered);

        // Keep selection or default to first
        if (selectedOrderId) {
          const updated = filtered.find(o => o.id === selectedOrderId);
          if (updated) setSelectedOrder(updated);
          else if (filtered.length > 0) {
            setSelectedOrderId(filtered[0].id);
            setSelectedOrder(filtered[0]);
          } else {
            setSelectedOrderId(null);
            setSelectedOrder(null);
          }
        } else if (filtered.length > 0) {
          setSelectedOrderId(filtered[0].id);
          setSelectedOrder(filtered[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load active orders', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch Spare Parts for Quick Inventory panel
  const loadParts = async () => {
    setLoadingParts(true);
    try {
      const res = await axiosClient.get('/spareparts');
      if (Array.isArray(res.data)) {
        setParts(res.data);
      }
    } catch (err) {
      console.error('Failed to load spare parts', err);
    } finally {
      setLoadingParts(false);
    }
  };

  // Reload selected order lines directly
  const reloadSelectedOrder = async (orderId: number) => {
    try {
      const res = await axiosClient.get(`/work-orders/${orderId}`);
      if (res.data) {
        setSelectedOrder(res.data);
      }
    } catch {}
  };

  useEffect(() => {
    loadFinancial();
  }, [period]);

  useEffect(() => {
    loadActiveOrders();
    loadParts();
  }, []);

  // Listen to global open-new-work-order and search events
  useEffect(() => {
    const handleOpenNewOrder = () => setNewOrderModalOpen(true);
    const handleOpenSearchDetail = (e: any) => {
      if (e.detail) {
        const { type, item } = e.detail;
        if (type === 'customer') {
          setSearchHistoryTarget({ customerId: item.id });
        } else if (type === 'workOrder') {
          setSearchHistoryTarget({ workOrderId: item.id });
        } else if (type === 'invoice') {
          setSearchHistoryTarget({ invoiceId: item.id });
        }
        setSearchHistoryModalOpen(true);
      }
    };

    window.addEventListener('open-new-work-order', handleOpenNewOrder);
    window.addEventListener('open-search-detail', handleOpenSearchDetail);
    return () => {
      window.removeEventListener('open-new-work-order', handleOpenNewOrder);
      window.removeEventListener('open-search-detail', handleOpenSearchDetail);
    };
  }, []);

  // Live Sync with SignalR
  useEffect(() => {
    const handleRefresh = (data?: any) => {
      loadActiveOrders();
      loadFinancial();
      if (selectedOrderId && data?.OrderId === selectedOrderId) {
        reloadSelectedOrder(selectedOrderId);
      }
    };

    const unsub1 = signalRService.on('workorder-updated', (data) => {
      if (data?.OrderId === selectedOrderId && data?.UpdatedByDevice) {
        const myDevice = localStorage.getItem('autofix_device_name') || '';
        if (data.UpdatedByDevice !== myDevice) {
          setConcurrencyNotice({
            device: data.UpdatedByDevice,
            time: new Date().toLocaleTimeString('ar-EG'),
            orderId: data.OrderId
          });
        }
      }
      handleRefresh(data);
    });
    const unsub2 = signalRService.on('workorder-created', handleRefresh);
    const unsub3 = signalRService.on('invoice-updated', handleRefresh);
    const unsub4 = signalRService.on('invoice-issued', handleRefresh);
    const unsub5 = signalRService.on('inventory-updated', loadParts);
    const unsub6 = signalRService.on('expense-updated', loadFinancial);
    const unsub7 = signalRService.on('dashboard-updated', () => {
      loadFinancial();
      loadActiveOrders();
    });

    return () => {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7();
    };
  }, [selectedOrderId]);

  // Quick Add Part to Active Car
  const handleQuickAddPart = async (part: any) => {
    if (!selectedOrder) {
      alert('يرجى اختيار سيارة نشطة أولاً لإضافة القطعة إليها');
      return;
    }

    try {
      await workOrderService.addLine(selectedOrder.id, {
        lineType: 'SparePart',
        sparePartId: part.id,
        description: `${part.partNumber} - ${part.name}`,
        quantity: 1,
        unitPrice: part.sellingPrice,
        unitCost: part.purchaseCost || 0
      });

      await reloadSelectedOrder(selectedOrder.id);
      await loadActiveOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل إضافة قطعة الغيار إلى الفاتورة');
    }
  };

  // Add / Update Workmanship Line
  const handleApplyWorkmanship = async () => {
    if (!selectedOrder) return;
    try {
      // Find existing workmanship line or add new
      const existing = (selectedOrder.lines || []).find(
        (l: any) => l.lineType.startsWith('Labor') || l.description.includes('مصنعية')
      );

      if (existing) {
        await workOrderService.updateLine(selectedOrder.id, existing.id, {
          lineType: existing.lineType,
          description: workmanshipDesc,
          quantity: 1,
          unitPrice: Number(workmanshipPrice) || 0
        });
      } else {
        await workOrderService.addLine(selectedOrder.id, {
          lineType: 'LaborMechanical',
          description: workmanshipDesc,
          quantity: 1,
          unitPrice: Number(workmanshipPrice) || 0
        });
      }

      await reloadSelectedOrder(selectedOrder.id);
      await loadActiveOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل تحديث المصنعية');
    }
  };

  // Delete line from active invoice
  const handleDeleteLine = async (lineId: number) => {
    if (!selectedOrder) return;
    try {
      await workOrderService.deleteLine(selectedOrder.id, lineId);
      await reloadSelectedOrder(selectedOrder.id);
      await loadActiveOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حذف البند');
    }
  };

  // Update line quantity inline
  const handleUpdateLineQty = async (line: any, newQty: number) => {
    if (!selectedOrder || newQty <= 0) return;
    try {
      await workOrderService.updateLine(selectedOrder.id, line.id, {
        lineType: line.lineType,
        description: line.description,
        quantity: newQty,
        unitPrice: line.unitPrice,
        unitCost: line.unitCost
      });
      await reloadSelectedOrder(selectedOrder.id);
      await loadActiveOrders();
    } catch {}
  };

  // Update line price inline
  const handleUpdateLinePrice = async (line: any, newPrice: number) => {
    if (!selectedOrder || newPrice < 0) return;
    try {
      await workOrderService.updateLine(selectedOrder.id, line.id, {
        lineType: line.lineType,
        description: line.description,
        quantity: line.quantity,
        unitPrice: newPrice,
        unitCost: line.unitCost
      });
      await reloadSelectedOrder(selectedOrder.id);
      await loadActiveOrders();
    } catch {}
  };

  // "طباعة وحفظ الفاتورة" flow:
  // Opens in-app preview modal first (no new tab), converts to invoice, removes from active list!
  const handleSaveAndPrintInvoice = async () => {
    if (!selectedOrder) return;

    try {
      // 1. Convert to invoice in backend (if not already converted)
      const invRes = await axiosClient.post(`/work-orders/${selectedOrder.id}/convert-to-invoice`, {});
      
      // 2. Open Preview modal
      if (selectedOrder.workType === 'Inspection') {
        setPreviewTarget({ workOrderInvoicePreviewId: selectedOrder.id, inspectionId: selectedOrder.inspectionId || selectedOrder.id });
      } else {
        setPreviewTarget({ workOrderInvoicePreviewId: selectedOrder.id });
      }
      setPreviewModalOpen(true);

      // 3. Refresh list (car will be removed from active cars)
      await loadActiveOrders();
      await loadFinancial();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل إصدار الفاتورة للطباعة');
    }
  };

  // Days open calculation helper
  const getDaysOpen = (createdAt: string) => {
    if (!createdAt) return 0;
    const diff = Date.now() - new Date(createdAt).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  // Filtered active cars
  const filteredActiveOrders = useMemo(() => {
    const q = carSearchQuery.trim().toLowerCase();
    if (!q) return activeOrders;
    return activeOrders.filter(
      o => (o.carPlate || '').toLowerCase().includes(q) ||
           (o.customerName || '').toLowerCase().includes(q) ||
           (o.carMake || '').toLowerCase().includes(q) ||
           (o.carModel || '').toLowerCase().includes(q) ||
           (o.orderNumber || '').toLowerCase().includes(q)
    );
  }, [activeOrders, carSearchQuery]);

  // Filtered quick parts
  const filteredParts = useMemo(() => {
    const q = partsSearch.trim().toLowerCase();
    if (!q) return parts.slice(0, 30);
    return parts.filter(
      p => (p.name || '').toLowerCase().includes(q) ||
           (p.partNumber || '').toLowerCase().includes(q) ||
           (p.categoryName || '').toLowerCase().includes(q)
    ).slice(0, 30);
  }, [parts, partsSearch]);

  // Total calculation for selected order
  const activeInvoiceTotal = useMemo(() => {
    if (!selectedOrder || !selectedOrder.lines) return 0;
    return selectedOrder.lines.reduce(
      (sum: number, line: any) => sum + ((line.quantity || 1) * (line.unitPrice || 0)),
      0
    );
  }, [selectedOrder]);

  return (
    <div dir="rtl" style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: 'Cairo, sans-serif' }}>
      
      {/* Concurrency Conflict Banner */}
      {concurrencyNotice && (
        <div style={concurrencyBannerStyle}>
          <AlertTriangle size={18} />
          <span>
            تم تعديل هذا السجل بواسطة ({concurrencyNotice.device}) في {concurrencyNotice.time}
          </span>
          <button
            onClick={() => {
              reloadSelectedOrder(concurrencyNotice.orderId);
              setConcurrencyNotice(null);
            }}
            style={concurrencyReloadBtnStyle}
          >
            إعادة تحميل السجل
          </button>
        </div>
      )}

      {/* Top: Financial Overview Header & Cards */}
      <section style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={22} color="#e52535" />
              الأداء المالي (الأرباح والخسائر)
            </h1>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
              متابعة مباشرة للإيرادات، المصروفات، وصافي الأرباح في ورشة العمل
            </p>
          </div>

          {/* Period Selector Tabs */}
          <div style={periodTabsContainerStyle}>
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'week', label: 'الأسبوع' },
              { id: 'month', label: 'الشهر' },
              { id: 'year', label: 'السنة' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                style={{
                  ...periodTabBtnStyle,
                  backgroundColor: period === tab.id ? '#e52535' : 'transparent',
                  color: period === tab.id ? '#ffffff' : '#94a3b8',
                  fontWeight: period === tab.id ? 800 : 600
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Finance Cards matching reference photo */}
        <div style={financeCardsGridStyle}>
          
          {/* Card 1: Total Revenue (Green mini sparkline chart) */}
          <div style={financeCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>إجمالي الإيرادات (Total Revenue)</span>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff', marginTop: '4px' }}>
                  <Money value={financialData.totalRevenue} />
                </div>
              </div>
              <div style={{ ...kpiIconBoxStyle, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <DollarSign size={20} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                <TrendingUp size={14} />
                <span>+{financialData.revenueChangePercentage}% مقارنة بالفترة السابقة</span>
              </div>
              
              {/* Mini SVG Sparkline */}
              <svg width="60" height="20" style={{ overflow: 'visible' }}>
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="2,16 12,12 24,14 36,8 48,10 58,3"
                />
              </svg>
            </div>
          </div>

          {/* Card 2: Expenses (Orange with down arrow, clicking opens ExpensesModal) */}
          <div 
            onClick={() => setExpensesModalOpen(true)}
            style={{ ...financeCardStyle, cursor: 'pointer', border: '1px solid rgba(245, 158, 11, 0.3)' }}
            title="انقر لتسجيل أو عرض تفاصيل المصروفات"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>المصروفات (ما تم إنفاقه)</span>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#f59e0b', marginTop: '4px' }}>
                  <Money value={financialData.totalExpenses} />
                </div>
              </div>
              <div style={{ ...kpiIconBoxStyle, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <Receipt size={20} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>
                <TrendingDown size={14} />
                <span>{financialData.expenseChangePercentage}% مقارنة بالفترة السابقة</span>
              </div>
              <span style={{ fontSize: '11px', color: '#f59e0b', textDecoration: 'underline' }}>تسجيل سريع +</span>
            </div>
          </div>

          {/* Card 3: Net Profit (Green with up arrow) */}
          <div style={financeCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>صافي الأرباح (Net Profit)</span>
                <div style={{ fontSize: '26px', fontWeight: 900, color: financialData.netProfit >= 0 ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                  <Money value={financialData.netProfit} />
                </div>
              </div>
              <div style={{ ...kpiIconBoxStyle, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <TrendingUp size={20} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px', fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
              <TrendingUp size={14} />
              <span>+{financialData.profitChangePercentage}% العائد الصافي</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main 3 Panels Layout (Matching Reference Photo) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1.2fr 1.5fr',
        gap: '16px',
        alignItems: 'start'
      }}>
        
        {/* PANEL 1: السيارات النشطة والورشة (Active Cars Panel) */}
        <div style={panelContainerStyle}>
          <div style={panelHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Car size={18} color="#e52535" />
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                السيارات النشطة والورشة ({activeOrders.length})
              </span>
            </div>
            <button
              onClick={() => setNewOrderModalOpen(true)}
              style={panelAddBtnStyle}
              title="كارت عمل جديد"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>كارت جديد</span>
            </button>
          </div>

          {/* Search Input for Active Cars */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #212c3d' }}>
            <div style={panelSearchBoxStyle}>
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="بحث برقم اللوحة، العميل، أو السيارة..."
                value={carSearchQuery}
                onChange={e => setCarSearchQuery(e.target.value)}
                style={panelSearchInputStyle}
              />
            </div>
          </div>

          {/* Active Cars List (NO status badges) */}
          <div style={{ maxHeight: '620px', overflowY: 'auto', padding: '10px' }}>
            {loadingOrders ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                <RefreshCw size={24} className="animate-spin text-accent" style={{ margin: '0 auto 8px' }} />
                جاري التحميل...
              </div>
            ) : filteredActiveOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '13px' }}>
                لا توجد سيارات نشطة بالورشة حالياً. اضغط "+ كارت جديد" لاستقبال سيارة.
              </div>
            ) : (
              filteredActiveOrders.map(order => {
                const isSelected = selectedOrderId === order.id;
                const daysOpen = getDaysOpen(order.createdAt);

                return (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setSelectedOrder(order);
                    }}
                    style={{
                      ...carCardStyle,
                      border: isSelected ? '2px solid #e52535' : '1px solid #212c3d',
                      backgroundColor: isSelected ? '#1c2430' : '#141a22',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      
                      {/* Car Plate & Make Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={carPlateBadgeStyle}>
                          <bdi dir="auto">{order.carPlate}</bdi>
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                            {order.carMake} {order.carModel} ({order.carYear || ''})
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            العميل: <bdi dir="auto">{order.customerName}</bdi>
                          </div>
                        </div>
                      </div>

                      {/* 3-dots Menu Button */}
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuOrderId(activeMenuOrderId === order.id ? null : order.id);
                          }}
                          style={menuDotsBtnStyle}
                        >
                          <MoreVertical size={16} color="#94a3b8" />
                        </button>

                        {/* Card 3-dots Popup Menu */}
                        {activeMenuOrderId === order.id && (
                          <div style={cardPopupMenuStyle}>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuOrderId(null);
                                setSelectedOrderId(order.id);
                                setSelectedOrder(order);
                              }}
                              style={cardPopupItemStyle}
                            >
                              <Edit2 size={14} /> تعديل الكارت والبنود
                            </div>

                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuOrderId(null);
                                setPreviewTarget({ workOrderInvoicePreviewId: order.id });
                                setPreviewModalOpen(true);
                              }}
                              style={cardPopupItemStyle}
                            >
                              <Eye size={14} /> معاينة الفاتورة
                            </div>

                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuOrderId(null);
                                setSelectedOrderId(order.id);
                                setSelectedOrder(order);
                                handleSaveAndPrintInvoice();
                              }}
                              style={cardPopupItemStyle}
                            >
                              <Printer size={14} /> طباعة الفاتورة
                            </div>

                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuOrderId(null);
                                setCarHistoryTarget({ carId: order.carId, carInfo: `${order.carMake} ${order.carModel} (${order.carPlate})` });
                                setCarHistoryModalOpen(true);
                              }}
                              style={cardPopupItemStyle}
                            >
                              <Clock size={14} /> سجل خدمات السيارة
                            </div>

                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuOrderId(null);
                                setCancelTargetOrder(order);
                                setCancelModalOpen(true);
                              }}
                              style={{ ...cardPopupItemStyle, color: '#ef4444' }}
                            >
                              <Ban size={14} /> إلغاء الكارت (حذف)
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Technician & Days Open & Total */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px' }}>
                      <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Wrench size={12} color="#3b82f6" />
                        <span>{order.technicianName || 'فني غير محدد'}</span>
                        <span style={{ color: '#64748b' }}>•</span>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>مفتوح منذ {daysOpen} يوم</span>
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981' }}>
                        <Money value={order.totalAmount || 0} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: المخزن والإضافة السريعة (Quick Parts & Workmanship) */}
        <div style={panelContainerStyle}>
          <div style={panelHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#10b981" />
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                المخزن والإضافة السريعة
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {selectedOrder ? `إلى: ${selectedOrder.carPlate}` : 'اختر سيارة'}
            </span>
          </div>

          {/* Quick Search */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #212c3d' }}>
            <div style={panelSearchBoxStyle}>
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="ابحث في قطع الغيار..."
                value={partsSearch}
                onChange={e => setPartsSearch(e.target.value)}
                style={panelSearchInputStyle}
              />
            </div>
          </div>

          {/* Workmanship Box (Fixed with editable price) */}
          <div style={workmanshipBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#e2e8f0' }}>بند المصنعية / أتعاب الورشة</span>
              <button
                type="button"
                onClick={handleApplyWorkmanship}
                disabled={!selectedOrder}
                style={applyWorkmanshipBtnStyle}
              >
                تحديث للفاتورة ✓
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={workmanshipDesc}
                onChange={e => setWorkmanshipDesc(e.target.value)}
                placeholder="بيان المصنعية..."
                style={{ ...panelSearchInputStyle, flex: 2, background: '#0d1117', border: '1px solid #212c3d', borderRadius: '6px', padding: '6px 10px' }}
              />
              <input
                type="number"
                value={workmanshipPrice}
                onChange={e => setWorkmanshipPrice(Number(e.target.value))}
                placeholder="السعر"
                style={{ ...panelSearchInputStyle, flex: 1, background: '#0d1117', border: '1px solid #212c3d', borderRadius: '6px', padding: '6px 10px', fontWeight: 800, color: '#10b981' }}
              />
            </div>
          </div>

          {/* Spare Parts List */}
          <div style={{ maxHeight: '490px', overflowY: 'auto', padding: '8px 10px' }}>
            {filteredParts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '12px' }}>
                لا توجد قطع مطابقة للبحث
              </div>
            ) : (
              filteredParts.map(part => {
                const isOutOfStock = (part.stockQuantity || 0) <= 0;
                const isLowStock = !isOutOfStock && (part.stockQuantity || 0) <= (part.minStockThreshold || 2);

                return (
                  <div key={part.id} style={partItemRowStyle}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {part.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', gap: '8px', marginTop: '2px' }}>
                        <span>رقم: {part.partNumber}</span>
                        <span style={{ color: isOutOfStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                          المخزون: {part.stockQuantity}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                        <Money value={part.sellingPrice} />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleQuickAddPart(part)}
                        disabled={!selectedOrder || isOutOfStock}
                        style={{
                          ...quickAddPartBtnStyle,
                          opacity: (!selectedOrder || isOutOfStock) ? 0.4 : 1,
                          cursor: (!selectedOrder || isOutOfStock) ? 'not-allowed' : 'pointer'
                        }}
                        title={isOutOfStock ? 'الكمية نفدت من المخزن' : 'إضافة إلى الفاتورة النشطة'}
                      >
                        <Plus size={14} /> إضافة
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 3: الفاتورة النشطة (Active Invoice with Save & Print) */}
        <div style={panelContainerStyle}>
          <div style={panelHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} color="#3b82f6" />
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                الفاتورة النشطة {selectedOrder ? `(#${selectedOrder.orderNumber})` : ''}
              </span>
            </div>
            {selectedOrder && (
              <span style={activePlateBadgeStyle}>
                <bdi dir="auto">{selectedOrder.carPlate}</bdi>
              </span>
            )}
          </div>

          {!selectedOrder ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <Car size={36} color="#64748b" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#cbd5e1' }}>لم يتم اختيار سيارة بعد</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>انقر على أي سيارة من القائمة لعرض وتعديل فاتورتها هنا</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Order Info Bar */}
              <div style={{ padding: '10px 14px', background: '#11161d', borderBottom: '1px solid #212c3d', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>العميل: </span>
                  <span style={{ color: '#ffffff', fontWeight: 700 }}><bdi dir="auto">{selectedOrder.customerName}</bdi></span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>النوع: </span>
                  <span style={{ color: selectedOrder.workType === 'Inspection' ? '#3b82f6' : '#10b981', fontWeight: 700 }}>
                    {selectedOrder.workType === 'Inspection' ? 'فحص شامل' : 'صيانة وإصلاح'}
                  </span>
                </div>
              </div>

              {/* Lines Table */}
              <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '8px 10px', flex: 1 }}>
                {(!selectedOrder.lines || selectedOrder.lines.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '12px' }}>
                    لا توجد بنود مضافة بعد. أضف مصنعية أو قطع غيار من القائمة.
                  </div>
                ) : (
                  selectedOrder.lines.map((line: any) => {
                    const lineTotal = (line.quantity || 1) * (line.unitPrice || 0);
                    const lineAddedText = line.addedAt ? new Date(line.addedAt).toLocaleDateString('ar-EG') : '';

                    return (
                      <div key={line.id} style={activeLineRowStyle}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {line.description}
                          </div>
                          {lineAddedText && (
                            <div style={{ fontSize: '10px', color: '#64748b' }}>
                              أضيف: {lineAddedText}
                            </div>
                          )}
                        </div>

                        {/* Inline Quantity Edit */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity || 1}
                            onChange={e => handleUpdateLineQty(line, Number(e.target.value))}
                            style={inlineQtyInputStyle}
                          />
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>×</span>
                        </div>

                        {/* Inline Unit Price Edit */}
                        <div style={{ width: '70px' }}>
                          <input
                            type="number"
                            step="0.01"
                            value={line.unitPrice || 0}
                            onChange={e => handleUpdateLinePrice(line, Number(e.target.value))}
                            style={inlinePriceInputStyle}
                          />
                        </div>

                        {/* Line Total */}
                        <div style={{ width: '65px', textAlign: 'left', fontWeight: 800, fontSize: '12px', color: '#ffffff' }}>
                          <Money value={lineTotal} />
                        </div>

                        {/* Delete Line Icon */}
                        <button
                          type="button"
                          onClick={() => handleDeleteLine(line.id)}
                          style={deleteLineBtnStyle}
                          title="حذف البند"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Total & Summary Box (No VAT unless setting is ON) */}
              <div style={invoiceSummaryFooterStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#cbd5e1' }}>
                    الإجمالي النهائي:
                  </span>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff' }}>
                    <Money value={activeInvoiceTotal} />
                  </span>
                </div>

                {/* Primary Action Button: طباعة وحفظ الفاتورة */}
                <button
                  type="button"
                  onClick={handleSaveAndPrintInvoice}
                  style={saveAndPrintInvoiceBtnStyle}
                >
                  <Printer size={18} strokeWidth={2.5} />
                  <span>طباعة وحفظ الفاتورة</span>
                </button>

                {/* Secondary Action Row */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewTarget({ workOrderInvoicePreviewId: selectedOrder.id });
                      setPaymentModalOpen(true);
                    }}
                    style={secondaryActionBtnStyle}
                  >
                    <DollarSign size={14} /> تحصيل دفعة
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewTarget({ workOrderInvoicePreviewId: selectedOrder.id });
                      setCreditNoteModalOpen(true);
                    }}
                    style={secondaryActionBtnStyle}
                  >
                    <Receipt size={14} /> إشعار دائن
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchHistoryTarget({ customerId: selectedOrder.customerId });
                      setSearchHistoryModalOpen(true);
                    }}
                    style={secondaryActionBtnStyle}
                  >
                    <Clock size={14} /> سجل العميل
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <NewWorkOrderModal
        isOpen={newOrderModalOpen}
        onClose={() => setNewOrderModalOpen(false)}
        onSuccess={(newOrder) => {
          loadActiveOrders();
          if (newOrder?.id) {
            setSelectedOrderId(newOrder.id);
            setSelectedOrder(newOrder);
          }
        }}
      />

      <ExpensesModal
        isOpen={expensesModalOpen}
        onClose={() => setExpensesModalOpen(false)}
        onExpenseChanged={loadFinancial}
      />

      <CancelWorkOrderModal
        isOpen={cancelModalOpen}
        orderId={cancelTargetOrder?.id || null}
        orderNumber={cancelTargetOrder?.orderNumber}
        onClose={() => { setCancelModalOpen(false); setCancelTargetOrder(null); }}
        onSuccess={() => {
          loadActiveOrders();
          if (selectedOrderId === cancelTargetOrder?.id) {
            setSelectedOrderId(null);
            setSelectedOrder(null);
          }
        }}
      />

      <InvoicePaymentModal
        isOpen={paymentModalOpen}
        invoiceId={selectedOrder?.invoiceId || selectedOrder?.id || null}
        invoiceNumber={selectedOrder?.orderNumber}
        totalAmount={activeInvoiceTotal}
        remainingAmount={activeInvoiceTotal}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={() => {
          loadActiveOrders();
          loadFinancial();
        }}
      />

      <CreditNoteModal
        isOpen={creditNoteModalOpen}
        invoiceId={selectedOrder?.invoiceId || selectedOrder?.id || null}
        invoiceNumber={selectedOrder?.orderNumber}
        onClose={() => setCreditNoteModalOpen(false)}
        onSuccess={() => {
          loadActiveOrders();
          loadFinancial();
        }}
      />

      <CustomerSearchHistoryModal
        isOpen={searchHistoryModalOpen}
        onClose={() => { setSearchHistoryModalOpen(false); setSearchHistoryTarget(null); }}
        customerId={searchHistoryTarget?.customerId}
        carId={searchHistoryTarget?.carId}
        workOrderId={searchHistoryTarget?.workOrderId}
        invoiceId={searchHistoryTarget?.invoiceId}
      />

      <InvoicePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        invoiceId={previewTarget.invoiceId}
        workOrderInvoicePreviewId={previewTarget.workOrderInvoicePreviewId}
        inspectionId={previewTarget.inspectionId}
      />

      <CarServiceHistoryModal
        isOpen={carHistoryModalOpen}
        onClose={() => setCarHistoryModalOpen(false)}
        carId={carHistoryTarget.carId}
        carInfo={carHistoryTarget.carInfo}
      />
    </div>
  );
};

// Styles
const financeCardsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '14px'
};

const financeCardStyle: React.CSSProperties = {
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '14px',
  padding: '16px 20px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
};

const kpiIconBoxStyle: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const periodTabsContainerStyle: React.CSSProperties = {
  display: 'flex',
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '10px',
  padding: '3px',
  gap: '2px'
};

const periodTabBtnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: '8px',
  padding: '6px 14px',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

const panelContainerStyle: React.CSSProperties = {
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '14px',
  overflow: 'hidden',
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
  display: 'flex',
  flexDirection: 'column'
};

const panelHeaderStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid #212c3d',
  backgroundColor: '#131820',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const panelAddBtnStyle: React.CSSProperties = {
  backgroundColor: '#e52535',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '5px 10px',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontFamily: 'Cairo, sans-serif'
};

const panelSearchBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: '#0d1117',
  border: '1px solid #212c3d',
  borderRadius: '8px',
  padding: '6px 10px'
};

const panelSearchInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'none',
  border: 'none',
  color: '#ffffff',
  fontSize: '12px',
  outline: 'none',
  fontFamily: 'Cairo, sans-serif'
};

const carCardStyle: React.CSSProperties = {
  borderRadius: '10px',
  padding: '12px',
  marginBottom: '8px',
  cursor: 'pointer',
  transition: 'all 0.15s ease'
};

const carPlateBadgeStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#000000',
  padding: '4px 8px',
  borderRadius: '6px',
  fontWeight: 900,
  fontSize: '13px',
  letterSpacing: '1px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  border: '1px solid #000000'
};

const menuDotsBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px'
};

const cardPopupMenuStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: '24px',
  backgroundColor: '#1c2430',
  border: '1px solid #2a3749',
  borderRadius: '8px',
  width: '160px',
  zIndex: 100,
  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)',
  overflow: 'hidden'
};

const cardPopupItemStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 700,
  color: '#cbd5e1',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  borderBottom: '1px solid #212c3d'
};

const workmanshipBoxStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: '#11161d',
  borderBottom: '1px solid #212c3d'
};

const applyWorkmanshipBtnStyle: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

const partItemRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 10px',
  borderBottom: '1px solid #1c2430',
  gap: '10px'
};

const quickAddPartBtnStyle: React.CSSProperties = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3px',
  fontFamily: 'Cairo, sans-serif'
};

const activePlateBadgeStyle: React.CSSProperties = {
  backgroundColor: '#e52535',
  color: '#ffffff',
  padding: '2px 8px',
  borderRadius: '4px',
  fontWeight: 800,
  fontSize: '11px'
};

const activeLineRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 10px',
  borderBottom: '1px solid #1c2430',
  gap: '8px'
};

const inlineQtyInputStyle: React.CSSProperties = {
  width: '42px',
  padding: '3px 4px',
  textAlign: 'center',
  backgroundColor: '#0d1117',
  border: '1px solid #212c3d',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '11px',
  outline: 'none',
  fontFamily: 'Cairo, sans-serif'
};

const inlinePriceInputStyle: React.CSSProperties = {
  width: '65px',
  padding: '3px 6px',
  textAlign: 'left',
  backgroundColor: '#0d1117',
  border: '1px solid #212c3d',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '11px',
  outline: 'none',
  fontFamily: 'Cairo, sans-serif'
};

const deleteLineBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#ef4444',
  cursor: 'pointer',
  padding: '4px'
};

const invoiceSummaryFooterStyle: React.CSSProperties = {
  padding: '16px',
  backgroundColor: '#11161d',
  borderTop: '1px solid #212c3d'
};

const saveAndPrintInvoiceBtnStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#e52535',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  padding: '14px',
  fontSize: '15px',
  fontWeight: 900,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  boxShadow: '0 4px 14px rgba(229, 37, 53, 0.4)',
  fontFamily: 'Cairo, sans-serif',
  minHeight: '48px'
};

const secondaryActionBtnStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#1c2430',
  color: '#cbd5e1',
  border: '1px solid #2a3749',
  borderRadius: '8px',
  padding: '8px',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  fontFamily: 'Cairo, sans-serif',
  minHeight: '40px'
};

const concurrencyBannerStyle: React.CSSProperties = {
  backgroundColor: '#b45309',
  color: '#ffffff',
  padding: '8px 16px',
  borderRadius: '8px',
  marginBottom: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '13px',
  fontWeight: 700
};

const concurrencyReloadBtnStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#000000',
  border: 'none',
  borderRadius: '6px',
  padding: '4px 10px',
  fontSize: '11px',
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

export default AdminDashboardPage;
