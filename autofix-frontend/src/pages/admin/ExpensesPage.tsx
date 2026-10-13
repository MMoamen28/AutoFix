import React from 'react';
import { Receipt, Plus, DollarSign, Calendar, Tag, FileText } from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  return (
    <div dir="rtl" style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'Cairo, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: 0 }}>المصروفات وسجل النفقات</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>إدارة وتتبع مصروفات الورشة ونفقات التشغيل</p>
        </div>
      </div>

      <div style={{
        backgroundColor: '#161c24',
        border: '1px solid #212c3d',
        borderRadius: '16px',
        padding: '32px',
        textAlign: 'center'
      }}>
        <Receipt size={48} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>نظام تسجيل المصروفات</h3>
        <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '480px', margin: '0 auto' }}>
          يتم ربط المصروفات مباشرة مع بطاقات الأداء المالي والأرباح في الصفحة الرئيسية.
        </p>
      </div>
    </div>
  );
};

export default ExpensesPage;
