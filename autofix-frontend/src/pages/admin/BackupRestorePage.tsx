import React, { useState, useEffect } from 'react';
import axiosClient from '../../services/axiosClient';
import { 
  Database, ShieldCheck, Download, RefreshCw, 
  FileSpreadsheet, HardDrive, AlertTriangle, CheckCircle, 
  X, Check, Lock, AlertOctagon, HelpCircle, Copy, Folder, Clock
} from 'lucide-react';
import PinLockModal from '../../components/shared/PinLockModal';

interface BackupItem {
  fileName: string;
  fullPath: string;
  sizeBytes: number;
  createdAt: string;
  isVerified: boolean;
  reason?: string;
}

export const BackupRestorePage: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<string | null>(null);

  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [targetBackupFile, setTargetBackupFile] = useState<string>('');
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [secondConfirmText, setSecondConfirmText] = useState('');
  const [liveStats, setLiveStats] = useState<{ customersCount: number; workOrdersCount: number; invoicesCount: number; totalRecords: number } | null>(null);
  const [backupStats, setBackupStats] = useState<{ customersCount: number; workOrdersCount: number; invoicesCount: number; totalRecords: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string>('');
  const [restoreError, setRestoreError] = useState<string>('');
  const [restoreSuccess, setRestoreSuccess] = useState<string>('');

  // PIN security for restore and export
  const [hasPinSet, setHasPinSet] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pendingSensitiveAction, setPendingSensitiveAction] = useState<(() => void) | null>(null);

  // External copy & weekly reminder
  const [lastExternalCopyDate, setLastExternalCopyDate] = useState<string | null>(
    localStorage.getItem('autofix_last_external_copy')
  );
  const [externalPath, setExternalPath] = useState<string>(
    localStorage.getItem('autofix_external_backup_path') || 'E:\\AutoFixBackup'
  );
  const [copiedStatus, setCopiedStatus] = useState(false);

  // Filter
  const [filterDate, setFilterDate] = useState('');

  // Mobile state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, statusRes, settingsRes] = await Promise.allSettled([
        axiosClient.get('/backup/list'),
        axiosClient.get('/backup/status'),
        axiosClient.get('/settings')
      ]);

      if (listRes.status === 'fulfilled' && Array.isArray(listRes.value.data)) {
        setBackups(listRes.value.data);
      }
      if (statusRes.status === 'fulfilled' && statusRes.value.data) {
        setStatus(statusRes.value.data);
      }
      if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
        setHasPinSet(!!settingsRes.value.data.hasPinSet);
      }
    } catch (err) {
      console.error('Failed to load backup status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await axiosClient.post('/backup/create?reason=ManualAdmin');
      await loadData();
      alert('تم إنشاء النسخة الاحتياطية بنجاح والتحقق من سلامتها ✓');
    } catch {
      alert('فشل إنشاء النسخة الاحتياطية');
    } finally {
      setCreating(false);
    }
  };

  const handleIntegrityCheck = async () => {
    setVerifying(true);
    setIntegrityResult(null);
    try {
      const res = await axiosClient.get('/backup/integrity-check');
      if (res.data?.isOk) {
        setIntegrityResult('سليمة بنسبة 100% (PRAGMA integrity_check: ok) ✓');
      } else {
        setIntegrityResult('يوجد تنبيه أو مشكلة في سلامة السجلات! يرجى الاستعادة من نسخة سابقة.');
      }
    } catch {
      setIntegrityResult('تعذر إكمال فحص السلامة حالياً');
    } finally {
      setVerifying(false);
    }
  };

  const triggerSensitiveAction = (action: () => void) => {
    if (hasPinSet) {
      setPendingSensitiveAction(() => action);
      setPinModalOpen(true);
    } else {
      action();
    }
  };

  const handleExportAll = () => {
    triggerSensitiveAction(() => {
      window.open('/api/backup/export-csv', '_blank');
    });
  };

  const handleOpenRestore = (fileName: string) => {
    setTargetBackupFile(fileName);
    setRestoreConfirmText('');
    setSecondConfirmText('');
    setRestoreProgress('');
    setRestoreError('');
    setRestoreSuccess('');
    setLiveStats(null);
    setBackupStats(null);
    setLoadingStats(true);
    
    triggerSensitiveAction(() => {
      setRestoreModalOpen(true);
      Promise.all([
        axiosClient.get('/backup/stats'),
        axiosClient.get(`/backup/stats?fileName=${encodeURIComponent(fileName)}`)
      ]).then(([liveRes, backupRes]) => {
        setLiveStats(liveRes.data);
        setBackupStats(backupRes.data);
      }).catch(err => {
        console.error('Failed to load stats', err);
      }).finally(() => {
        setLoadingStats(false);
      });
    });
  };

  const handleConfirmRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || restoring) return;

    if (restoreConfirmText.trim() !== 'RESTORE') {
      setRestoreError('يرجى كتابة كلمة "RESTORE" بأحرف كبيرة للتأكيد');
      return;
    }

    const hasFewer = !!(backupStats && liveStats && backupStats.totalRecords < liveStats.totalRecords);
    if (hasFewer && secondConfirmText.trim() !== 'CONFIRM') {
      setRestoreError('النسخة الاحتياطية تحتوي على سجلات أقل من الحالي! اكتب "CONFIRM" للتأكيد الإضافي.');
      return;
    }

    setIsSubmitting(true);
    setRestoring(true);
    setRestoreProgress('جاري أخذ نسخة أمان احتياطية قبل الاستعادة...');
    setRestoreError('');

    try {
      setRestoreProgress('جاري استبدال البيانات والتحقق من السلامة...');
      await axiosClient.post('/backup/restore', { 
        fileName: targetBackupFile,
        confirmationText: 'RESTORE',
        confirmFewerRecords: hasFewer
      });
      setRestoreProgress('تمت الاستعادة بنجاح والتحقق من سلامة قاعدة البيانات ✓');
      setRestoreSuccess('تمت استعادة البيانات بنجاح! يُنصح بإعادة تشغيل البرنامج.');
      await loadData();
    } catch (err: any) {
      setRestoreError(err.response?.data?.message || 'فشلت الاستعادة. تم إيقاف العملية للحفاظ على البيانات الحالية.');
    } finally {
      setRestoring(false);
      setIsSubmitting(false);
    }
  };

  const handleDownloadBackup = (fileName: string) => {
    window.open(`/api/backup/download/${fileName}`, '_blank');
  };

  const handleRecordExternalCopy = () => {
    const now = new Date().toISOString();
    localStorage.setItem('autofix_last_external_copy', now);
    setLastExternalCopyDate(now);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2500);
  };

  // Weekly external copy reminder check (7 days)
  const daysSinceExternalCopy = lastExternalCopyDate
    ? Math.floor((Date.now() - new Date(lastExternalCopyDate).getTime()) / (1000 * 60 * 60 * 24))
    : 99;

  // Disk space warning: less than 2 GB
  const freeSpaceGB = status ? (status.freeDiskSpaceBytes / (1024 * 1024 * 1024)).toFixed(2) : '0';
  const isLowDiskSpace = status && status.freeDiskSpaceBytes < 2 * 1024 * 1024 * 1024;

  // Filtered backups
  const filteredBackups = backups.filter(b => {
    if (!filterDate) return true;
    return b.createdAt.startsWith(filterDate);
  });

  return (
    <div dir="rtl" style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: 'Cairo, sans-serif', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={26} color="#e52535" />
            النسخ الاحتياطي وحماية البيانات
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            نظام الحماية المتكامل: نسخ تلقائي، فحص سلامة فوري، تصدير آمن، واستعادة بدون فقدان بيانات
          </p>
        </div>

        {/* Top Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleIntegrityCheck}
            disabled={verifying}
            style={actionBtnStyle}
          >
            <ShieldCheck size={16} color="#10b981" />
            <span>{verifying ? 'جاري الفحص...' : 'فحص سلامة البيانات الآن'}</span>
          </button>

          <button
            onClick={handleExportAll}
            style={actionBtnStyle}
          >
            <FileSpreadsheet size={16} color="#3b82f6" />
            <span>تصدير كل البيانات (Excel/CSV)</span>
          </button>

          <button
            onClick={handleCreateBackup}
            disabled={creating}
            style={primaryActionBtnStyle}
          >
            <Database size={16} />
            <span>{creating ? 'جاري النسخ...' : 'نسخ احتياطي الآن'}</span>
          </button>
        </div>
      </div>

      {/* Integrity Check Result Banner */}
      {integrityResult && (
        <div style={{
          backgroundColor: integrityResult.includes('100%') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${integrityResult.includes('100%') ? '#10b981' : '#ef4444'}`,
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 700,
          color: integrityResult.includes('100%') ? '#10b981' : '#ef4444'
        }}>
          {integrityResult.includes('100%') ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>نتيجة فحص السلامة (PRAGMA integrity_check): {integrityResult}</span>
        </div>
      )}

      {/* Weekly USB / External Backup Reminder Banner */}
      {daysSinceExternalCopy >= 7 && (
        <div style={weeklyReminderBannerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, color: '#fcd34d', fontSize: '13px' }}>
                تذكير أمان الورشة الأسبوعي: انسخ مجلد البيانات على فلاشة USB أو جهاز آخر!
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                لم يتم تسجيل أي نسخ خارجي خارج هذا اللابتوب منذ أكثر من 7 أيام. الحفاظ على نسخة أسبوعية يحميك من أي عطل مفاجئ للجهاز.
              </div>
            </div>
          </div>
          <button
            onClick={handleRecordExternalCopy}
            style={recordCopyBtnStyle}
          >
            {copiedStatus ? 'تم التسجيل ✓' : 'تسجيل أنني نسخت البيانات'}
          </button>
        </div>
      )}

      {/* Section A: Status Cards */}
      <div style={statusGridStyle}>
        
        {/* Card 1: Database Health */}
        <div style={statusCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statusCardTitleStyle}>حالة قاعدة البيانات</span>
            <div style={{ ...statusIconBoxStyle, backgroundColor: status?.isDatabaseHealthy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}>
              <ShieldCheck size={20} color={status?.isDatabaseHealthy ? '#10b981' : '#ef4444'} />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: status?.isDatabaseHealthy ? '#10b981' : '#ef4444', marginTop: '8px' }}>
            {status?.isDatabaseHealthy ? 'سليمة ومتصلة ✓' : 'تتطلب فحص'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            SQLite WAL Mode (لا يوجد تعارض في القراءة والكتابة)
          </div>
        </div>

        {/* Card 2: Last Backup */}
        <div style={statusCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statusCardTitleStyle}>آخر نسخة احتياطية</span>
            <div style={{ ...statusIconBoxStyle, backgroundColor: 'rgba(59, 130, 246, 0.15)' }}>
              <Clock size={20} color="#3b82f6" />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginTop: '8px' }}>
            {status?.lastBackupTime ? new Date(status.lastBackupTime).toLocaleDateString('ar-EG') : 'غير متوفر'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {status?.lastBackupTime ? new Date(status.lastBackupTime).toLocaleTimeString('ar-EG') : 'يتم الحفظ التلقائي كل 6 ساعات'}
          </div>
        </div>

        {/* Card 3: Backups Count & Data Size */}
        <div style={statusCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statusCardTitleStyle}>عدد النسخ وحجم البيانات</span>
            <div style={{ ...statusIconBoxStyle, backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
              <HardDrive size={20} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '8px' }}>
            {status?.backupCount || backups.length} نسخة
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            حجم قاعدة البيانات: {status ? (status.dataSizeBytes / 1024).toFixed(1) : '0'} KB
          </div>
        </div>

        {/* Card 4: Data Folder Path & Disk Space */}
        <div style={statusCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statusCardTitleStyle}>المساحة ومجلد البيانات</span>
            <div style={{ ...statusIconBoxStyle, backgroundColor: isLowDiskSpace ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' }}>
              <Folder size={20} color={isLowDiskSpace ? '#ef4444' : '#10b981'} />
            </div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: isLowDiskSpace ? '#ef4444' : '#ffffff', marginTop: '8px', direction: 'ltr', textAlign: 'right' }}>
            {freeSpaceGB} GB حرة
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={status?.dataFolderPath}>
            المسار: <strong style={{ direction: 'ltr', display: 'inline-block' }}>{status?.dataFolderPath || 'C:\\AutoFixData'}</strong>
          </div>
          {status?.isFallback && (
            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, marginTop: '2px' }}>
              ⚠️ يعمل في وضع مجلد الطوارئ الاحتياطي
            </div>
          )}
        </div>
      </div>

      {/* Section C: Backups Table */}
      <div style={sectionBoxStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              سجل النسخ الاحتياطية المتوفرة ({filteredBackups.length})
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
              مرتبة من الأحدث إلى الأقدم مع سبب الإنشاء ونتيجة التحقق من السلامة
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              style={dateFilterInputStyle}
            />
            {filterDate && (
              <button onClick={() => setFilterDate('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px' }}>
                مسح الفلتر
              </button>
            )}
            <button onClick={loadData} style={refreshIconBtnStyle} title="تحديث">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Table / Cards for Mobile */}
        <div style={{ overflowX: 'auto', border: '1px solid #212c3d', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#11161d', color: '#94a3b8', borderBottom: '1px solid #212c3d', textAlign: 'right' }}>
                <th style={{ padding: '12px 14px' }}>اسم الملف والتاريخ</th>
                <th style={{ padding: '12px 14px' }}>السبب</th>
                <th style={{ padding: '12px 14px' }}>الحجم</th>
                <th style={{ padding: '12px 14px' }}>التحقق من السلامة</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredBackups.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    لا توجد نسخ احتياطية مسجلة حالياً
                  </td>
                </tr>
              ) : (
                filteredBackups.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1c2430', backgroundColor: idx % 2 === 0 ? '#161c24' : '#141920' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#ffffff', direction: 'ltr', textAlign: 'right' }}>
                        {item.fileName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {new Date(item.createdAt).toLocaleString('ar-EG')}
                      </div>
                    </td>

                    <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>
                      {item.fileName.includes('PreRestore') ? 'نسخة أمان قبل الاستعادة' :
                       item.fileName.includes('Auto') ? 'تلقائي دوري' :
                       item.fileName.includes('Shutdown') ? 'إغلاق النظام' :
                       item.fileName.includes('Startup') ? 'تشغيل النظام' : 'نسخ يدوي'}
                    </td>

                    <td style={{ padding: '10px 14px', color: '#94a3b8' }}>
                      {(item.sizeBytes / 1024).toFixed(1)} KB
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        backgroundColor: item.isVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: item.isVerified ? '#10b981' : '#ef4444',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        {item.isVerified ? 'تم التحقق ✓' : 'فشل التحقق ✗'}
                      </span>
                    </td>

                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleDownloadBackup(item.fileName)}
                          style={tableDownloadBtnStyle}
                          title="تنزيل إلى جهازك"
                        >
                          <Download size={13} />
                          <span>تنزيل</span>
                        </button>

                        <button
                          onClick={() => handleOpenRestore(item.fileName)}
                          style={tableRestoreBtnStyle}
                          title="استعادة هذه النسخة بأمان"
                        >
                          <HardDrive size={13} />
                          <span>استعادة</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section E & F: Retention Policy & External Folder Setup */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
        
        {/* Retention Info */}
        <div style={sectionBoxStyle}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="#10b981" />
            <span>سياسة الاحتفاظ والحماية من الحذف</span>
          </div>
          <ul style={{ margin: 0, paddingRight: '20px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.8 }}>
            <li>يتم الاحتفاظ بـ <strong>30 نسخة يومية</strong> + <strong>12 نسخة شهرية</strong> تلقائياً.</li>
            <li>النسخة الأحدث لا تُحذف أبداً تحت أي ظرف لضمان وجود نسخة صالحة دائماً.</li>
            <li>في حال فشل التحقق من أحدث نسخة، يتم إيقاف حذف أي نسخة قديمة تلقائياً.</li>
            <li>أي عملية استعادة تنشئ نسخة أمان فورية للبيانات الحالية قبل بدء التغيير.</li>
          </ul>
        </div>

        {/* Second Backup Folder (USB / OneDrive) */}
        <div style={sectionBoxStyle}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Folder size={16} color="#3b82f6" />
            <span>مسار المجلد الاحتياطي الثانوي (فلاشة USB / سحابي)</span>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 10px 0' }}>
            حدد مساراً على فلاشة خارجية أو مجلد Google Drive / OneDrive لحفظ نسخة إضافية:
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={externalPath}
              onChange={e => {
                setExternalPath(e.target.value);
                localStorage.setItem('autofix_external_backup_path', e.target.value);
              }}
              style={externalPathInputStyle}
            />
            <button
              onClick={handleRecordExternalCopy}
              style={savePathBtnStyle}
            >
              تسجيل النسخ
            </button>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            آخر نسخ مسجل: {lastExternalCopyDate ? new Date(lastExternalCopyDate).toLocaleString('ar-EG') : 'لم يتم تسجيل نسخ خارجي بعد'}
          </div>
        </div>
      </div>

      {/* Section G: Audit Log of Backup & Restore */}
      {status?.auditLogs && status.auditLogs.length > 0 && (
        <div style={sectionBoxStyle}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
            سجل العمليات الأخير للنسخ والاستعادة (سجل التدقيق للأجهزة)
          </div>
          <div style={{ border: '1px solid #212c3d', borderRadius: '8px', overflow: 'hidden' }}>
            {status.auditLogs.map((log: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #1c2430', backgroundColor: i % 2 === 0 ? '#161c24' : '#11161d' }}>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>{log.details || log.action}</span>
                <span style={{ color: '#38bdf8' }}>الجهاز: {log.userName || 'لابتوب الورشة'}</span>
                <span style={{ color: '#64748b' }}>{new Date(log.timestamp).toLocaleString('ar-EG')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section H: Plain Arabic Help Text */}
      <div style={{ ...sectionBoxStyle, backgroundColor: '#11161d' }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <HelpCircle size={16} color="#94a3b8" />
          <span>إرشادات وتعليمات أمان البيانات</span>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 6px 0' }}>
            • <strong>ماذا تحمي النسخ الاحتياطية؟</strong> تحمي جميع فواتير الورشة، أوامر الشغل، قطع الغيار، حسابات العملاء، وسجلات الفحص.
          </p>
          <p style={{ margin: '0 0 6px 0' }}>
            • <strong>أين يتم تخزين البيانات؟</strong> يتم حفظها على قرص اللابتوب داخل مجلد البيانات المخصص، مع نسخ تلقائي دوري كل 6 ساعات وأثناء إغلاق وفتح البرنامج.
          </p>
          <p style={{ margin: '0 0 6px 0' }}>
            • <strong>كيف تتم الاستعادة الآمنة؟</strong> يقوم النظام تلقائياً بإنشاء نسخة أمان فورية للبيانات الحالية قبل بدء الاستعادة، ثم يقوم باستبدال الملفات وفحص سلامتها، وتتوقف العملية فوراً إذا ظهر أي خطأ دون المساس بالبيانات العاملة.
          </p>
        </div>
      </div>

      {/* SAFE RESTORE CONFIRMATION MODAL */}
      {restoreModalOpen && (
        <div style={modalOverlayStyle} dir="rtl">
          <div style={modalCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertOctagon size={22} />
                <span>تأكيد استعادة قاعدة البيانات بأمان</span>
              </div>
              <button onClick={() => setRestoreModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#fca5a5', lineHeight: 1.6, marginBottom: '16px' }}>
              <strong>تنبيه هام جداً:</strong> أنت على وشك استعادة البيانات من النسخة: <strong style={{ direction: 'ltr', display: 'inline-block' }}>{targetBackupFile}</strong>.
            </div>

            {loadingStats ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                جاري قراءة إحصائيات السجلات ومقارنة النسخة بقاعدة البيانات الحالية...
              </div>
            ) : (
              <div style={{ marginBottom: '16px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
                  مقارنة السجلات الحية مع النسخة المراد استعادتها:
                </div>
                <table style={{ width: '100%', fontSize: '12px', textAlign: 'right', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '6px' }}>النوع</th>
                      <th style={{ padding: '6px', textAlign: 'center' }}>الحالي (Live)</th>
                      <th style={{ padding: '6px', textAlign: 'center' }}>النسخة (Backup)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)', color: '#f8fafc' }}>
                      <td style={{ padding: '6px' }}>العملاء (Customers)</td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700 }}>{liveStats?.customersCount ?? 0}</td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700 }}>{backupStats?.customersCount ?? 0}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)', color: '#f8fafc' }}>
                      <td style={{ padding: '6px' }}>أوامر الشغل (WorkOrders)</td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700 }}>{liveStats?.workOrdersCount ?? 0}</td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700 }}>{backupStats?.workOrdersCount ?? 0}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)', color: '#f8fafc' }}>
                      <td style={{ padding: '6px' }}>الفواتير (Invoices)</td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700 }}>{liveStats?.invoicesCount ?? 0}</td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700 }}>{backupStats?.invoicesCount ?? 0}</td>
                    </tr>
                    <tr style={{ color: '#38bdf8', fontWeight: 800 }}>
                      <td style={{ padding: '6px' }}>إجمالي السجلات الأساسية</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{liveStats?.totalRecords ?? 0}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{backupStats?.totalRecords ?? 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {backupStats && liveStats && backupStats.totalRecords < liveStats.totalRecords && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#fca5a5', marginBottom: '14px' }}>
                <strong style={{ color: '#ef4444' }}>⚠️ تحذير:</strong> النسخة الاحتياطية تحتوي على سجلات أقل ({backupStats.totalRecords}) مقارنة بالنظام الحالي ({liveStats.totalRecords}). الاستعادة ستؤدي إلى فقدان السجلات الأحدث!
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                    لتجاوز الحظر، اكتب كلمة "CONFIRM" بأحرف كبيرة:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="CONFIRM"
                    value={secondConfirmText}
                    onChange={e => setSecondConfirmText(e.target.value)}
                    style={restoreInputStyle}
                  />
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmRestore}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                  اكتب كلمة "RESTORE" بأحرف كبيرة في المربع لتأكيد الاستعادة:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="RESTORE"
                  value={restoreConfirmText}
                  onChange={e => setRestoreConfirmText(e.target.value)}
                  style={restoreInputStyle}
                />
              </div>

              {restoreProgress && (
                <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '10px', fontWeight: 700 }}>
                  {restoreProgress}
                </div>
              )}

              {restoreError && (
                <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '10px', fontWeight: 700 }}>
                  {restoreError}
                </div>
              )}

              {restoreSuccess && (
                <div style={{ fontSize: '12px', color: '#10b981', marginBottom: '10px', fontWeight: 700 }}>
                  {restoreSuccess}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRestoreModalOpen(false)}
                  style={modalCancelBtnStyle}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    restoring ||
                    loadingStats ||
                    restoreConfirmText.trim() !== 'RESTORE' ||
                    (!!(backupStats && liveStats && backupStats.totalRecords < liveStats.totalRecords) && secondConfirmText.trim() !== 'CONFIRM')
                  }
                  style={{
                    ...modalSubmitBtnStyle,
                    opacity: (
                      isSubmitting ||
                      restoring ||
                      loadingStats ||
                      restoreConfirmText.trim() !== 'RESTORE' ||
                      (!!(backupStats && liveStats && backupStats.totalRecords < liveStats.totalRecords) && secondConfirmText.trim() !== 'CONFIRM')
                    ) ? 0.5 : 1
                  }}
                >
                  {restoring ? 'جاري الاستعادة...' : 'تأكيد الاستعادة الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sensitive Action PIN Confirmation Modal */}
      <PinLockModal
        isOpen={pinModalOpen}
        allowCancel={true}
        onCancel={() => { setPinModalOpen(false); setPendingSensitiveAction(null); }}
        onSuccess={() => {
          setPinModalOpen(false);
          if (pendingSensitiveAction) {
            pendingSensitiveAction();
            setPendingSensitiveAction(null);
          }
        }}
      />
    </div>
  );
};

// Styles
const statusGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '14px'
};

const statusCardStyle: React.CSSProperties = {
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '12px',
  padding: '16px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
};

const statusCardTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#94a3b8'
};

const statusIconBoxStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
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

const primaryActionBtnStyle: React.CSSProperties = {
  backgroundColor: '#e52535',
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

const sectionBoxStyle: React.CSSProperties = {
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '12px',
  padding: '18px'
};

const dateFilterInputStyle: React.CSSProperties = {
  backgroundColor: '#0d1117',
  border: '1px solid #2a3749',
  borderRadius: '6px',
  color: '#ffffff',
  padding: '4px 8px',
  fontSize: '12px',
  outline: 'none',
  fontFamily: 'Cairo, sans-serif'
};

const refreshIconBtnStyle: React.CSSProperties = {
  background: '#1c2430',
  border: '1px solid #2a3749',
  color: '#cbd5e1',
  borderRadius: '6px',
  padding: '6px',
  cursor: 'pointer'
};

const tableDownloadBtnStyle: React.CSSProperties = {
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

const tableRestoreBtnStyle: React.CSSProperties = {
  backgroundColor: 'rgba(239, 68, 68, 0.12)',
  color: '#f87171',
  border: '1px solid rgba(239, 68, 68, 0.3)',
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

const weeklyReminderBannerStyle: React.CSSProperties = {
  backgroundColor: '#78350f',
  border: '1px solid #b45309',
  borderRadius: '10px',
  padding: '12px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '12px'
};

const recordCopyBtnStyle: React.CSSProperties = {
  backgroundColor: '#f59e0b',
  color: '#000000',
  border: 'none',
  borderRadius: '6px',
  padding: '6px 14px',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

const externalPathInputStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#0d1117',
  border: '1px solid #2a3749',
  borderRadius: '6px',
  color: '#ffffff',
  padding: '8px 10px',
  fontSize: '12px',
  direction: 'ltr',
  textAlign: 'right',
  outline: 'none',
  fontFamily: 'Cairo, sans-serif'
};

const savePathBtnStyle: React.CSSProperties = {
  backgroundColor: '#1c2430',
  border: '1px solid #2a3749',
  color: '#cbd5e1',
  borderRadius: '6px',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
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
  border: '1px solid #ef4444',
  borderRadius: '14px',
  padding: '24px',
  width: '100%',
  maxWidth: '460px',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)'
};

const restoreInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#0d1117',
  border: '1px solid #ef4444',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  textAlign: 'center',
  fontWeight: 800,
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

const modalSubmitBtnStyle: React.CSSProperties = {
  backgroundColor: '#ef4444',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 20px',
  fontSize: '13px',
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};

export default BackupRestorePage;
