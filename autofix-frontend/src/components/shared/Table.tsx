import React from 'react';
import { AlertCircle } from 'lucide-react';

interface Column {
  header: string;
  key: string;
  width?: string;
  render?: (item: any) => React.ReactNode;
}

interface TableProps {
  columns: Column[];
  data: any[];
  isLoading?: boolean;
  emptyMessage?: string;
}

const Table: React.FC<TableProps> = ({ columns, data, isLoading, emptyMessage = 'No items found' }) => {
  return (
    <div style={containerStyle}>
      <div style={{ overflowX: 'auto', minWidth: '900px' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={headerRowStyle}>
              {columns.map((col, idx) => (
                <th key={idx} style={{ 
                  ...headerCellStyle, 
                  width: col.width,
                  textAlign: 'left'
                }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!isLoading && data.map((item, rowIdx) => (
              <tr key={rowIdx} style={dataRowStyle} className="table-row">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} style={dataCellStyle}>
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {!isLoading && data.length === 0 && (
          <div style={emptyStateStyle}>
            <AlertCircle size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <p>{emptyMessage}</p>
          </div>
        )}

        {isLoading && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading data...
          </div>
        )}
      </div>

      <style>{`
        .table-row { transition: background 0.15s ease; }
        .table-row:hover { background-color: var(--bg-card-hover) !important; }
        .table-row:last-child { border-bottom: none !important; }
      `}</style>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  width: '100%',
  minWidth: '900px'
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse'
};

const headerRowStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border)'
};

const headerCellStyle: React.CSSProperties = {
  padding: '14px 20px',
  fontSize: '11px',
  fontWeight: 800,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

const dataRowStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--border)'
};

const dataCellStyle: React.CSSProperties = {
  padding: '14px 20px',
  fontSize: '14px',
  color: 'var(--text-primary)'
};

const emptyStateStyle: React.CSSProperties = {
  padding: '60px 0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  color: 'var(--text-muted)',
  fontSize: '15px',
  fontWeight: 500
};

export default Table;
