import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, Plus, Printer, Search, FileText, 
  ExternalLink, Share2, Download, Trash2, Edit3, RotateCcw, AlertTriangle
} from 'lucide-react';
import { inspectionService, Inspection } from '../../services/inspectionService';
import { useAuth } from '../../context/AuthContext';

const InspectionsListPage: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);
  const [whatsAppModal, setWhatsAppModal] = useState<{ isOpen: boolean; url: string; reportNum: string; phone: string } | null>(null);

  const navigate = useNavigate();
  const { role } = useAuth();

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await inspectionService.getAll();
      setInspections(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load inspection reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, reportNum: string) => {
    if (!window.confirm(`Are you sure you want to delete inspection report ${reportNum}?`)) return;
    try {
      await inspectionService.delete(id);
      await loadInspections();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete inspection');
    }
  };

  const handleWhatsApp = async (insp: Inspection) => {
    try {
      const url = await inspectionService.getWhatsAppLink(insp.id);
      setWhatsAppModal({
        isOpen: true,
        url,
        reportNum: insp.reportNumber,
        phone: insp.customerPhone
      });
    } catch (err: any) {
      alert('Failed to generate WhatsApp link: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleDownloadPdf = async (insp: Inspection) => {
    try {
      const blob = await inspectionService.generatePdf(insp.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${insp.reportNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Failed to download PDF: ' + (err?.response?.data?.message || err.message));
    }
  };

  const filteredInspections = inspections.filter(i => {
    const term = search.toLowerCase();
    const matchesSearch = 
      i.reportNumber.toLowerCase().includes(term) ||
      i.customerName.toLowerCase().includes(term) ||
      i.customerPhone.toLowerCase().includes(term) ||
      i.carPlate.toLowerCase().includes(term) ||
      i.carMake.toLowerCase().includes(term) ||
      i.carModel.toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'ALL' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto', direction: 'ltr' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent), #b91c1c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <ClipboardCheck size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Comprehensive Inspections
              </h1>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'Cairo, sans-serif' }}>
                تقارير فحص السيارة الشامل المعتمدة (3 صفحات A4)
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/inspections/blank-form')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-glass-light)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <Printer size={16} />
            <span>Print Blank Form / طباعة نموذج فارغ</span>
          </button>

          <button
            onClick={() => navigate('/inspections/new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent), #b91c1c)',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)'
            }}
          >
            <Plus size={18} />
            <span>New Inspection / فحص جديد</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        background: 'var(--bg-card)',
        padding: '16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by Report #, Customer, Phone, Plate, or Car..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg-main)',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'Final', 'Draft'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                border: statusFilter === st ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: statusFilter === st ? 'var(--accent-dim)' : 'transparent',
                color: statusFilter === st ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {st === 'ALL' ? 'All Reports' : st === 'Final' ? 'Finalized (نهائي)' : 'Drafts (مسودة)'}
            </button>
          ))}
        </div>
      </div>

      {/* Content Table / List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading inspection reports...
        </div>
      ) : error ? (
        <div style={{
          padding: '16px',
          background: 'var(--danger-dim)',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger)',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      ) : filteredInspections.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)'
        }}>
          <ClipboardCheck size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>No inspection reports found</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
            {search ? 'Try adjusting your search criteria' : 'Click "New Inspection" to create your first report'}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Report #</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vehicle</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Client</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspections.map((insp) => (
                <tr key={insp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {insp.reportNumber}
                      </span>
                      {insp.revisionNumber > 1 && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          fontWeight: 700
                        }}>
                          Rev {insp.revisionNumber}
                        </span>
                      )}
                    </div>
                    {insp.workOrderNumber && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        WO: {insp.workOrderNumber}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {insp.carMake} {insp.carModel} {insp.carYear > 0 ? `(${insp.carYear})` : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      Plate: {insp.carPlate} | {insp.odometerKm > 0 ? `${insp.odometerKm.toLocaleString()} KM` : 'Odo: N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {insp.customerName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {insp.customerPhone}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {new Date(insp.inspectedAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: insp.status === 'Final' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                      color: insp.status === 'Final' ? '#4ade80' : '#facc15'
                    }}>
                      {insp.status === 'Final' ? 'Finalized' : 'Draft'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {/* Print / View Report */}
                      <button
                        title="View & Print 3-Page Report"
                        onClick={() => navigate(`/inspections/${insp.id}/print`)}
                        style={actionBtnStyle}
                      >
                        <Printer size={16} />
                      </button>

                      {/* PDF */}
                      <button
                        title="Download PDF"
                        onClick={() => handleDownloadPdf(insp)}
                        style={actionBtnStyle}
                      >
                        <Download size={16} />
                      </button>

                      {/* WhatsApp */}
                      <button
                        title="Send via WhatsApp (+20)"
                        onClick={() => handleWhatsApp(insp)}
                        style={{ ...actionBtnStyle, color: '#25D366' }}
                      >
                        <Share2 size={16} />
                      </button>

                      {/* Edit or Revise */}
                      {insp.status === 'Draft' ? (
                        <button
                          title="Edit Draft"
                          onClick={() => navigate(`/inspections/${insp.id}/edit`)}
                          style={{ ...actionBtnStyle, color: 'var(--accent)' }}
                        >
                          <Edit3 size={16} />
                        </button>
                      ) : (
                        <button
                          title="Create New Revision"
                          onClick={() => navigate(`/inspections/${insp.id}/edit?mode=revise`)}
                          style={{ ...actionBtnStyle, color: '#60a5fa' }}
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}

                      {/* Delete */}
                      {(role === 'Admin' || role === 'Owner') && (
                        <button
                          title="Delete"
                          onClick={() => handleDelete(insp.id, insp.reportNumber)}
                          style={{ ...actionBtnStyle, color: 'var(--danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* WhatsApp Modal */}
      {whatsAppModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Share2 size={20} color="#25D366" />
              <span>Share via WhatsApp (Egypt +20)</span>
            </h3>
            
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '16px' }}>
              A formatted link has been generated for customer <strong>{whatsAppModal.phone}</strong>.
            </p>

            <div style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#facc15'
            }}>
              <strong>Note:</strong> Free WhatsApp links open the chat with pre-written text. The PDF report should be downloaded and attached manually in WhatsApp unless Web Share API is available on your device.
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setWhatsAppModal(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              
              <a
                href={whatsAppModal.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWhatsAppModal(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: '#25D366',
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <ExternalLink size={16} />
                <span>Open WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const actionBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  transition: 'all 0.15s ease'
};

export default InspectionsListPage;
