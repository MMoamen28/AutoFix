import React, { useState, useEffect } from 'react';
import { 
  Receipt, Plus, Trash2, Calendar, DollarSign, Tag, FileText, 
  X, Check, AlertCircle, RefreshCw 
} from 'lucide-react';
import Modal from '../shared/Modal';
import axiosClient from '../../services/axiosClient';
import Money from '../shared/Money';

interface ExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseChanged?: () => void;
}

const expenseCategories = [
  'قطع غيار ومشتريات',
  'إيجار ومرافق',
  'رواتب وأجور فنيين',
  'عدد وأدوات ورشة',
  'ضيافة ونظافة',
  'صيانة دورية للمعدات',
  'تسويق وإعلانات',
  'أخرى'
];

export const ExpensesModal: React.FC<ExpensesModalProps> = ({ isOpen, onClose, onExpenseChanged }) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New expense form state
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>(expenseCategories[0]);
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [error, setError] = useState<string>('');

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/expenses?period=month');
      if (res.data) {
        setExpenses(res.data.expenses || []);
        setTotalExpenses(res.data.totalExpenses || 0);
        setCategoryTotals(res.data.categoryTotals || {});
      }
    } catch (err) {
      console.error('Failed to load expenses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadExpenses();
      setAmount('');
      setDescription('');
      setError('');
    }
  }, [isOpen]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await axiosClient.post('/expenses', {
        amount: parsedAmount,
        category,
        description: description.trim() || category,
        paymentMethod,
        referenceNumber
      });
      setAmount('');
      setDescription('');
      setReferenceNumber('');
      await loadExpenses();
      if (onExpenseChanged) onExpenseChanged();
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل حفظ المصروف');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    try {
      await axiosClient.delete(`/expenses/${id}`);
      await loadExpenses();
      if (onExpenseChanged) onExpenseChanged();
    } catch (err) {
      console.error('Failed to delete expense', err);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="سجل المصروفات ونفقات الورشة"
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Cairo, sans-serif' }}>
        
        {/* Fast Entry Form */}
        <div style={formCardStyle}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#f59e0b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            <span>تسجيل مصروف جديد</span>
          </div>

          <form onSubmit={handleAddExpense}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>المبلغ (ج.م) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={inputStyle}
                  autoFocus
                />
              </div>

              <div>
                <label style={labelStyle}>التصنيف *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={inputStyle}
                >
                  {expenseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>طريقة الدفع</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  style={inputStyle}
                >
                  <option value="Cash">نقدي (كاش)</option>
                  <option value="Card">فيزا / بطاقة</option>
                  <option value="BankTransfer">تحويل بنكي</option>
                  <option value="VodafoneCash">محفظة إلكترونية</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>رقم الإيصال / المرجع</label>
                <input
                  type="text"
                  placeholder="اختياري"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>البيان / ملاحظات</label>
              <input
                type="text"
                placeholder="تفاصيل المصروف..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={submitBtnStyle}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'إضافة المصروف الآن'}</span>
            </button>
          </form>
        </div>

        {/* Total Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#11161d', padding: '12px 16px', borderRadius: '10px', border: '1px solid #212c3d' }}>
          <div>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>إجمالي مصروفات هذا الشهر: </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b', marginInlineStart: '6px' }}>
              <Money value={totalExpenses} />
            </span>
          </div>
          <button onClick={loadExpenses} style={refreshBtnStyle} title="تحديث">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Expenses List */}
        <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #212c3d', borderRadius: '10px' }}>
          {expenses.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              لا توجد مصروفات مسجلة لهذا الشهر
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#161c24', color: '#94a3b8', borderBottom: '1px solid #212c3d', textAlign: 'right' }}>
                  <th style={{ padding: '10px 12px' }}>التاريخ</th>
                  <th style={{ padding: '10px 12px' }}>التصنيف</th>
                  <th style={{ padding: '10px 12px' }}>البيان</th>
                  <th style={{ padding: '10px 12px' }}>المبلغ</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #1c2430' }}>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>
                      {new Date(item.transactionDate).toLocaleDateString('ar-EG')}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#e2e8f0' }}>
                      {item.category}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#cbd5e1' }}>
                      {item.description}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 800, color: '#f59e0b' }}>
                      <Money value={item.amount} />
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteExpense(item.id)}
                        style={deleteBtnStyle}
                        title="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
};

const formCardStyle: React.CSSProperties = {
  backgroundColor: '#161c24',
  border: '1px solid #212c3d',
  borderRadius: '12px',
  padding: '16px'
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  display: 'block',
  marginBottom: '4px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  backgroundColor: '#0d1117',
  border: '1px solid #2a3749',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'Cairo, sans-serif'
};

const submitBtnStyle: React.CSSProperties = {
  backgroundColor: '#f59e0b',
  color: '#000000',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: 800,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontFamily: 'Cairo, sans-serif'
};

const deleteBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#ef4444',
  cursor: 'pointer',
  padding: '4px'
};

const refreshBtnStyle: React.CSSProperties = {
  background: '#1c2430',
  border: '1px solid #2a3749',
  color: '#cbd5e1',
  borderRadius: '6px',
  padding: '6px',
  cursor: 'pointer'
};

export default ExpensesModal;
