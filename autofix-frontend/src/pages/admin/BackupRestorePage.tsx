import React, { useState, useEffect } from 'react';
import axiosClient from '../../services/axiosClient';
import { useToast } from '../../hooks/useToast';
import { 
  Database, ShieldCheck, Download, RefreshCw, 
  FileSpreadsheet, ArrowLeftRight, HardDrive
} from 'lucide-react';
import Button from '../../components/shared/Button';
import Table from '../../components/shared/Table';
import Badge from '../../components/shared/Badge';

interface BackupItem {
  fileName: string;
  fullPath: string;
  sizeBytes: number;
  createdAt: string;
  isVerified: boolean;
}

const BackupRestorePage: React.FC = () => {
  const { showToast } = useToast();
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [migrationReports, setMigrationReports] = useState<any[]>([]);
  const [runningMigrationCheck, setRunningMigrationCheck] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/backup/list');
      setBackups(res.data);
    } catch {
      showToast('Failed to load backup list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await axiosClient.post('/backup/create?reason=AdminManual');
      showToast('Backup created and verified successfully!', 'success');
      await fetchBackups();
    } catch {
      showToast('Failed to create backup', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (fileName: string) => {
    const confirmed = window.confirm(
      `CAUTION: Are you sure you want to restore from ${fileName}?\n\nA safety pre-restore backup will be created automatically before restoring.`
    );
    if (!confirmed) return;

    setRestoring(true);
    try {
      await axiosClient.post('/backup/restore', { fileName });
      showToast(`Database restored safely from ${fileName}!`, 'success');
      await fetchBackups();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to restore database';
      showToast(msg, 'error');
    } finally {
      setRestoring(false);
    }
  };

  const handleDownload = (fileName: string) => {
    window.open(`/api/backup/download/${fileName}`, '_blank');
  };

  const handleExportCsv = () => {
    window.open('/api/backup/export-csv', '_blank');
  };

  const handleCheckSqlServer = async () => {
    setRunningMigrationCheck(true);
    try {
      const res = await axiosClient.post('/backup/sqlserver-migration', {});
      if (res.data.tableReports) {
        setMigrationReports(res.data.tableReports);
        showToast(res.data.message || 'SQL Server inspection complete', 'success');
      } else {
        showToast(res.data.message || 'No reports returned', 'info');
      }
    } catch {
      showToast('Could not inspect SQL Server', 'error');
    } finally {
      setRunningMigrationCheck(false);
    }
  };

  const backupColumns = [
    { header: 'Backup File', key: 'fileName' },
    { 
      header: 'Created At (UTC)', 
      key: 'createdAt',
      render: (item: BackupItem) => new Date(item.createdAt).toLocaleString()
    },
    { 
      header: 'Size', 
      key: 'sizeBytes',
      render: (item: BackupItem) => `${(item.sizeBytes / 1024).toFixed(1)} KB`
    },
    { 
      header: 'Integrity', 
      key: 'isVerified',
      render: (item: BackupItem) => (
        <Badge variant={item.isVerified ? 'success' : 'danger'}>
          {item.isVerified ? 'Verified (OK)' : 'Unverified'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (item: BackupItem) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleDownload(item.fileName)}
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={() => handleRestore(item.fileName)}
            disabled={restoring}
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <HardDrive size={14} /> Restore
          </button>
        </div>
      )
    }
  ];

  const migrationColumns = [
    { header: 'Table Name', key: 'tableName' },
    { 
      header: 'SQL Server Rows', 
      key: 'sqlServerRowCount',
      render: (item: any) => <span style={{ color: '#f59e0b', fontWeight: 700 }}>{item.sqlServerRowCount}</span>
    },
    { 
      header: 'SQLite Rows', 
      key: 'sqliteRowCountBefore',
      render: (item: any) => <span style={{ color: '#10b981', fontWeight: 700 }}>{item.sqliteRowCountBefore}</span>
    },
    { 
      header: 'Status', 
      key: 'status',
      render: (item: any) => (
        <Badge variant={item.status === 'EmptySource' ? 'warning' : 'info'}>
          {item.status}
        </Badge>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Database size={28} color="var(--accent, #3b82f6)" />
            Data Safety & Backup Management
          </h1>
          <p style={{ color: 'var(--text-secondary, #94a3b8)' }}>
            Universal protection: Online backups, integrity verification, safe restoration, and CSV export
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" onClick={handleExportCsv} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={16} />
            Export All Data (CSV)
          </Button>
          <Button variant="primary" onClick={handleCreateBackup} disabled={creating} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} />
            {creating ? 'Creating...' : 'Backup Now'}
          </Button>
        </div>
      </header>

      {/* Backup list table */}
      <div style={{
        backgroundColor: 'var(--bg-card, #1e293b)',
        border: '1px solid var(--border, #334155)',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
            Available Backups ({backups.length})
          </h2>
          <Button variant="ghost" onClick={fetchBackups} disabled={loading} style={{ padding: '6px 12px', fontSize: '12px' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        </div>

        <Table
          columns={backupColumns}
          data={backups}
          isLoading={loading}
          emptyMessage="No backups found. Click 'Backup Now' to create your first backup."
        />
      </div>

      {/* SQL Server Manual Migration section (Condition 6) */}
      <div style={{
        backgroundColor: 'var(--bg-card, #1e293b)',
        border: '1px solid var(--border, #334155)',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeftRight size={20} color="#f59e0b" />
              SQL Server Migration Comparison Tool
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
              Inspect and compare row counts between your legacy SQL Server database and the active SQLite database. Source database is never modified.
            </p>
          </div>
          <Button variant="secondary" onClick={handleCheckSqlServer} disabled={runningMigrationCheck}>
            {runningMigrationCheck ? 'Inspecting...' : 'Compare Row Counts'}
          </Button>
        </div>

        {migrationReports.length > 0 && (
          <Table
            columns={migrationColumns}
            data={migrationReports}
            emptyMessage="No table reports available."
          />
        )}
      </div>
    </div>
  );
};

export default BackupRestorePage;
