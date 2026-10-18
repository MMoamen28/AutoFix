import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, Download, ZoomIn, ZoomOut, RotateCcw, X, Edit3, Loader2 } from 'lucide-react';
import invoiceService from '../../services/invoiceService';
import api from '../../services/axiosClient';
import { sendInvoiceViaWhatsApp } from '../../utils/whatsappInvoiceSender';

const WhatsAppIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#25D366' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2M12.04 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.56 20.16 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.04 3.67M9.53 7.64C9.36 7.64 9.08 7.7 8.84 7.96C8.6 8.22 7.93 8.84 7.93 10.11C7.93 11.38 8.86 12.61 8.99 12.78C9.12 12.95 10.82 15.58 13.42 16.7C15.58 17.63 16.02 17.44 16.49 17.4C16.96 17.36 18.01 16.78 18.23 16.16C18.45 15.54 18.45 15.01 18.38 14.9C18.31 14.79 18.14 14.73 17.88 14.6C17.62 14.47 16.34 13.84 16.1 13.75C15.86 13.66 15.69 13.62 15.52 13.88C15.35 14.14 14.86 14.73 14.71 14.9C14.56 15.07 14.41 15.09 14.15 14.96C13.89 14.83 12.79 14.47 11.48 13.3C10.46 12.39 9.77 11.27 9.64 11.05C9.51 10.83 9.63 10.71 9.76 10.58C9.88 10.46 10.03 10.27 10.16 10.12C10.29 9.97 10.33 9.86 10.42 9.69C10.51 9.52 10.47 9.37 10.4 9.24C10.33 9.11 9.73 7.64 9.53 7.64Z" />
  </svg>
);

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: number;
  inspectionId?: number;
  workOrderId?: number;
  workOrderInvoicePreviewId?: number;
  title?: string;
  onEdit?: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  inspectionId,
  workOrderId,
  workOrderInvoicePreviewId,
  title,
  onEdit
}) => {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(true);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState<boolean>(false);
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setHtmlContent('');
      setInvoiceData(null);
      return;
    }

    setLoading(true);
    setZoom(100);

    const loadContent = async () => {
      try {
        if (invoiceId) {
          const res = await api.get<string>(`/invoices/${invoiceId}/preview`, { responseType: 'text' as any });
          setHtmlContent(res.data);
          try {
            const invRes = await api.get(`/invoices/${invoiceId}`);
            setInvoiceData(invRes.data);
          } catch {}
        } else if (workOrderInvoicePreviewId) {
          const res = await api.get<string>(`/invoices/by-work-order/${workOrderInvoicePreviewId}/preview`, { responseType: 'text' as any });
          setHtmlContent(res.data);
          try {
            const woRes = await api.get(`/workorders/${workOrderInvoicePreviewId}`);
            if (woRes.data?.invoiceId) {
              const invRes = await api.get(`/invoices/${woRes.data.invoiceId}`);
              setInvoiceData(invRes.data);
            }
          } catch {}
        } else if (inspectionId) {
          const res = await api.get<string>(`/inspections/${inspectionId}/print`, { responseType: 'text' as any });
          setHtmlContent(res.data);
        } else if (workOrderId) {
          const res = await api.get<string>(`/workorders/${workOrderId}/print`, { responseType: 'text' as any });
          setHtmlContent(res.data);
        }
      } catch (err) {
        console.error('Failed to load document preview:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [isOpen, invoiceId, inspectionId, workOrderId, workOrderInvoicePreviewId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (!printIframeRef.current) return;
    const iframeWindow = printIframeRef.current.contentWindow;
    const iframeDoc = printIframeRef.current.contentDocument;
    if (!iframeWindow) return;

    if (iframeDoc && iframeDoc.images) {
      const images = Array.from(iframeDoc.images);
      const uncompleted = images.filter(img => !img.complete);
      if (uncompleted.length > 0) {
        let loadedCount = 0;
        uncompleted.forEach(img => {
          img.onload = img.onerror = () => {
            loadedCount++;
            if (loadedCount === uncompleted.length) {
              iframeWindow.focus();
              iframeWindow.print();
            }
          };
        });
        setTimeout(() => {
          iframeWindow.focus();
          iframeWindow.print();
        }, 500);
        return;
      }
    }

    iframeWindow.focus();
    iframeWindow.print();
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 15, 60));
  const handleZoomReset = () => setZoom(100);

  const hasInvoice = !!invoiceData?.id;
  const hasPhone = !!invoiceData?.customerPhone && invoiceData.customerPhone.trim().length > 0;
  const canSendWhatsApp = hasInvoice && hasPhone;
  const whatsAppTooltip = !hasInvoice
    ? 'لا توجد فاتورة مصدرة بعد'
    : (!hasPhone ? 'لا يوجد رقم هاتف مسجل للعميل' : 'إرسال الفاتورة عبر واتساب');

  const handleSendWhatsApp = async () => {
    if (!invoiceData) return;
    setSendingWhatsApp(true);
    try {
      await sendInvoiceViaWhatsApp({
        invoiceId: invoiceData.id,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.issuedAt,
        customerName: invoiceData.customerName,
        customerPhone: invoiceData.customerPhone,
        carMake: invoiceData.carMakeModel?.split(' ')[0] || '',
        carModel: invoiceData.carMakeModel?.split(' ').slice(1).join(' ') || '',
        plate: invoiceData.carPlate,
        total: invoiceData.totalAmount || 0,
        paid: invoiceData.paidAmount || 0,
        remaining: invoiceData.remainingAmount || 0,
        notes: invoiceData.notes,
        iframeElement: printIframeRef.current,
        onSuccess: (ts) => {
          setInvoiceData((prev: any) => prev ? { ...prev, lastWhatsAppSentAt: ts } : prev);
        }
      });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      padding: '16px'
    }}>
      {/* Top Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-secondary, #1e293b)',
        border: '1px solid var(--border, #334155)',
        borderRadius: '10px 10px 0 0',
        padding: '12px 20px',
        color: '#f8fafc',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Printer size={20} style={{ color: 'var(--accent, #dc2626)' }} />
          <span style={{ fontWeight: 700, fontSize: '15px' }}>
            {title || t('invoices.previewTitle', 'Document Preview (A4) / معاينة المستند')}
          </span>
          {invoiceData?.lastWhatsAppSentAt && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '20px',
              padding: '2px 10px',
              fontSize: '11px',
              fontWeight: 700
            }}>
              <span>أُرسلت عبر واتساب</span>
              <span style={{ opacity: 0.85 }}>
                {new Date(invoiceData.lastWhatsAppSentAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: '6px' }}>
          <button 
            type="button" 
            onClick={handleZoomOut}
            title={t('common.zoomOut', 'Zoom Out')}
            style={iconBtnStyle}
          >
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '45px', textAlign: 'center' }}>
            {zoom}%
          </span>
          <button 
            type="button" 
            onClick={handleZoomIn}
            title={t('common.zoomIn', 'Zoom In')}
            style={iconBtnStyle}
          >
            <ZoomIn size={16} />
          </button>
          <button 
            type="button" 
            onClick={handleZoomReset}
            title={t('common.resetZoom', 'Reset 100%')}
            style={iconBtnStyle}
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              style={{ ...actionBtnStyle, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.3)' }}
            >
              <Edit3 size={15} />
              <span>{t('common.edit', 'Edit ID / تعديل الرقم')}</span>
            </button>
          )}

          <button
            type="button"
            disabled={!canSendWhatsApp || sendingWhatsApp}
            onClick={handleSendWhatsApp}
            title={whatsAppTooltip}
            style={{
              ...actionBtnStyle,
              background: canSendWhatsApp ? '#16a34a' : 'rgba(255,255,255,0.06)',
              color: canSendWhatsApp ? '#ffffff' : '#64748b',
              cursor: canSendWhatsApp ? 'pointer' : 'not-allowed',
              opacity: canSendWhatsApp ? 1 : 0.6
            }}
          >
            <WhatsAppIcon size={15} color={canSendWhatsApp ? '#ffffff' : '#64748b'} />
            <span>{sendingWhatsApp ? 'جاري الإرسال...' : 'إرسال واتساب'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{ ...actionBtnStyle, background: '#2563eb', color: '#ffffff' }}
          >
            <Printer size={15} />
            <span>{t('common.print', 'Print / طباعة')}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{ ...actionBtnStyle, background: '#059669', color: '#ffffff' }}
          >
            <Download size={15} />
            <span>{t('common.downloadPdf', 'Download PDF')}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{ ...iconBtnStyle, padding: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
            title={t('common.close', 'Close')}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Preview Container with Zoom */}
      <div style={{
        flex: 1,
        background: '#0b0f17',
        border: '1px solid var(--border, #334155)',
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        overflow: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: '30px 20px',
        position: 'relative'
      }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#94a3b8' }}>
            <Loader2 size={32} className="animate-spin" />
            <span>{t('common.loadingPreview', 'Rendering A4 Preview...')}</span>
          </div>
        ) : (
          <div style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out'
          }}>
            {/* A4 Document Paper Frame (210mm standard width) */}
            <div style={{
              width: '210mm',
              minHeight: '297mm',
              background: '#ffffff',
              boxShadow: '0 10px 35px rgba(0, 0, 0, 0.5), 0 2px 10px rgba(0, 0, 0, 0.3)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <iframe
                ref={printIframeRef}
                srcDoc={htmlContent}
                title="Document Print Preview"
                style={{
                  width: '100%',
                  height: '297mm',
                  minHeight: '297mm',
                  border: 'none',
                  display: 'block'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#cbd5e1',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s'
};

const actionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  border: '1px solid transparent',
  padding: '7px 14px',
  borderRadius: '6px',
  fontWeight: 700,
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.15s'
};

export default InvoicePreviewModal;
