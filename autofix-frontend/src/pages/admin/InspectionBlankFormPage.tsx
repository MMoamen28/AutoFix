import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';

const InspectionBlankFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    loadBlankForm();
  }, []);

  const loadBlankForm = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/Inspections/blank-form-html', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const text = await res.text();
        setHtmlContent(text);
      } else {
        throw new Error('Failed to load blank form template');
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading blank form');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1e293b' }}>
      {/* Top Action Bar */}
      <div style={{
        padding: '12px 24px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
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
              Blank Inspection Form (نموذج فحص فارغ للتدوين اليدوي)
            </span>
          </div>
        </div>

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
            fontSize: '13px'
          }}
        >
          <Printer size={16} />
          <span>Print Blank Form (3 Pages A4)</span>
        </button>
      </div>

      {/* Main Preview Container */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ color: '#94a3b8', margin: 'auto' }}>Loading blank form template...</div>
        ) : error ? (
          <div style={{ color: '#f87171', margin: 'auto' }}>{error}</div>
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title="Blank Inspection Form Print Preview"
            style={{
              width: '210mm',
              minHeight: '891mm',
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

export default InspectionBlankFormPage;
