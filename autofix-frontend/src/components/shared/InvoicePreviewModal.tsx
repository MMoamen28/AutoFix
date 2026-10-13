import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, Download, ZoomIn, ZoomOut, RotateCcw, X, Edit3, Loader2 } from 'lucide-react';
import invoiceService from '../../services/invoiceService';
import api from '../../services/axiosClient';

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
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setHtmlContent('');
      return;
    }

    setLoading(true);
    setZoom(100);

    const loadContent = async () => {
      try {
        if (invoiceId) {
          const res = await api.get<string>(`/invoices/${invoiceId}/preview`, { responseType: 'text' as any });
          setHtmlContent(res.data);
        } else if (workOrderInvoicePreviewId) {
          const res = await api.get<string>(`/invoices/by-work-order/${workOrderInvoicePreviewId}/preview`, { responseType: 'text' as any });
          setHtmlContent(res.data);
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
    if (iframeWindow) {
      iframeWindow.focus();
      iframeWindow.print();
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 15, 60));
  const handleZoomReset = () => setZoom(100);

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
