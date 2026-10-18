import React, { useState } from 'react';
import { FileSpreadsheet, Calendar, Download, X } from 'lucide-react';
import Modal from '../shared/Modal';
import axiosClient from '../../services/axiosClient';
import toast from 'react-hot-toast';

interface BusinessReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const monthsArabic = [
  { value: 1, label: 'يناير (01)' },
  { value: 2, label: 'فبراير (02)' },
  { value: 3, label: 'مارس (03)' },
  { value: 4, label: 'أبريل (04)' },
  { value: 5, label: 'مايو (05)' },
  { value: 6, label: 'يونيو (06)' },
  { value: 7, label: 'يوليو (07)' },
  { value: 8, label: 'أغسطس (08)' },
  { value: 9, label: 'سبتمبر (09)' },
  { value: 10, label: 'أكتوبر (10)' },
  { value: 11, label: 'نوفمبر (11)' },
  { value: 12, label: 'ديسمبر (12)' }
];

export const BusinessReportExportModal: React.FC<BusinessReportExportModalProps> = ({
  isOpen,
  onClose
}) => {
  const now = new Date();
  const [periodType, setPeriodType] = useState<'day' | 'month' | 'year'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(now.toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let query = `periodType=${periodType}`;
      let fallbackFileName = `AP_Report_${selectedYear}.xlsx`;

      if (periodType === 'day') {
        query += `&date=${selectedDate}`;
        fallbackFileName = `AP_Report_${selectedDate}.xlsx`;
      } else if (periodType === 'month') {
        query += `&year=${selectedYear}&month=${selectedMonth}`;
        const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mShort = monthShortNames[selectedMonth - 1] || 'Month';
        fallbackFileName = `AP_Report_${mShort}-${selectedYear}.xlsx`;
      } else {
        query += `&year=${selectedYear}`;
        fallbackFileName = `AP_Report_${selectedYear}.xlsx`;
      }

      const res = await axiosClient.get(`/reports/business?${query}`, {
        responseType: 'blob'
      });

      let fileName = fallbackFileName;
      const disposition = res.headers['content-disposition'];
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          fileName = match[1].replace(/['"]/g, '').trim();
        }
      }

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success('تم تصدير تقرير النشاط والأرباح بنجاح');
      onClose();
    } catch (err: any) {
      toast.error('فشل تصدير التقرير المالي');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تصدير تقرير نشاط وأرباح الورشة (Excel)"
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Cairo, sans-serif' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>
            نوع التقرير والفترة الزمنية
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {[
              { id: 'day', label: 'تقرير يوم محدد' },
              { id: 'month', label: 'تقرير شهر كامل' },
              { id: 'year', label: 'تقرير سنة كاملة' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriodType(tab.id as any)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: periodType === tab.id ? '2px solid #e52535' : '1px solid #334155',
                  backgroundColor: periodType === tab.id ? 'rgba(229, 37, 53, 0.15)' : '#1e293b',
                  color: periodType === tab.id ? '#ffffff' : '#94a3b8',
                  fontWeight: periodType === tab.id ? 800 : 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {periodType === 'day' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
              اختر اليوم المطلوب:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              سيتم استخراج كافة الفواتير، التحصيلات، بنود الأعمال، والمصروفات المسجلة في هذا اليوم بتوقيت القاهرة.
            </span>
          </div>
        )}

        {periodType === 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                الشهر:
              </label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {monthsArabic.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                السنة:
              </label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {periodType === 'year' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
              اختر السنة:
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{
          backgroundColor: '#0f172a',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #334155',
          fontSize: '12px',
          color: '#94a3b8',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileSpreadsheet size={15} color="#10b981" />
            <span>محتويات ملف التقرير الشامل (.xlsx):</span>
          </div>
          <ul style={{ margin: 0, paddingRight: '20px', lineHeight: '1.8' }}>
            <li>ملخص مؤشرات الأداء والأرباح الصافية مع جدول تفصيلي ومعادلات SUM في Excel.</li>
            <li>شيت الفواتير المصدرة والمدفوع والمتبقي لكل فاتورة.</li>
            <li>شيت المدفوعات والتحصيلات وإشعارات الدائن بدون بنود قطع الغيار.</li>
            <li>شيت بنود الأعمال والفلاتر التلقائية مع أرقام قطع الغيار وتكلفتها.</li>
            <li>شيت المصروفات والخزينة والأرصدة التراكمية.</li>
            <li>شيت العملاء الأكثر نشاطاً وإجمالي مسحوباتهم.</li>
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            style={{
              padding: '10px 18px',
              backgroundColor: 'transparent',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            style={{
              padding: '10px 22px',
              backgroundColor: '#e52535',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(229, 37, 53, 0.35)'
            }}
          >
            <Download size={16} />
            <span>{isExporting ? 'جاري إنشاء الملف...' : 'تصدير التقرير الشامل (Excel)'}</span>
          </button>
        </div>

      </div>
    </Modal>
  );
};
