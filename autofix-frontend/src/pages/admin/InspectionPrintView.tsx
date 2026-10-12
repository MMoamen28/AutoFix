import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, Download, Share2, ArrowLeft, Edit3, CheckCircle } from 'lucide-react';
import { inspectionService, Inspection } from '../../services/inspectionService';

const InspectionPrintView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (id) {
      loadData(parseInt(id, 10));
    }
  }, [id]);

  const loadData = async (inspId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const [insp, response] = await Promise.all([
        inspectionService.getById(inspId),
        fetch(`/api/Inspections/${inspId}/html`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      setInspection(insp);
      if (response.ok) {
        const html = await response.text();
        setHtmlContent(html);
      } else {
        throw new Error('Failed to load report HTML');
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading report');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!inspection) return;
    try {
      const blob = await inspectionService.generatePdf(inspection.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inspection.reportNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Failed to generate PDF: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleWhatsApp = async () => {
    if (!inspection) return;
    try {
      const url = await inspectionService.getWhatsAppLink(inspection.id);
      window.open(url, '_blank');
    } catch (err: any) {
      alert('Failed to generate WhatsApp link: ' + (err?.response?.data?.message || err.message));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1e293b' }}>
      {/* Top Action Bar (hidden when printing) */}
      <div style={{
        padding: '12px 24px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/inspections')}
            style={{
              background: 'transparent',
              border: '1px solid #475569',
              borderRadius: '6px',
              padding: '6px 12px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div>
            <span style={{ color: 'white', fontWeight: 800, fontSize: '15px' }}>
              {inspection?.reportNumber || 'Inspection Report'}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '10px' }}>
              {inspection?.customerName} ({inspection?.carPlate})
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {inspection && inspection.status === 'Draft' && (
            <button
              onClick={() => navigate(`/inspections/${inspection.id}/edit`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #eab308',
                background: 'rgba(234, 179, 8, 0.1)',
                color: '#facc15',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              <Edit3 size={15} />
              <span>Edit Draft</span>
            </button>
          )}

          <button
            onClick={handleWhatsApp}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              background: '#25D366',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px'
            }}
          >
            <Share2 size={15} />
            <span>WhatsApp (+20)</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #475569',
              background: '#1e293b',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            <Download size={15} />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent), #b91c1c)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)'
            }}
          >
            <Printer size={16} />
            <span>Print 3-Page Report (A4)</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ color: '#94a3b8', margin: 'auto' }}>Loading printable report preview...</div>
        ) : error ? (
          <div style={{ color: '#f87171', margin: 'auto' }}>{error}</div>
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title="Inspection Report Print Preview"
            style={{
              width: '210mm',
              minHeight: '891mm', // 3 A4 pages height: 3 * 297mm = 891mm
              border: '1px solid #475569',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              backgroundColor: '#ffffff',
              borderRadius: '4px'
            }}
          />
        )}
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InspectionPrintView;
