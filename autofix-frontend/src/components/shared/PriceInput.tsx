import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrencyLabel, toWesternDigits } from '../../i18n/formatters';

interface PriceInputProps {
  value: number | string;
  onChange: (val: number) => void;
  label?: string;
  placeholder?: string;
  allowNegative?: boolean;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  id?: string;
  style?: React.CSSProperties;
}

export const PriceInput: React.FC<PriceInputProps> = ({
  value,
  onChange,
  label,
  placeholder = '0.00',
  allowNegative = false,
  required = false,
  disabled = false,
  error,
  id,
  style
}) => {
  const { i18n } = useTranslation();
  const [currencyLabel, setCurrencyLabelState] = useState(getCurrencyLabel(i18n?.language));
  const [displayValue, setDisplayValue] = useState<string>(
    value === undefined || value === null || value === '' ? '' : String(value)
  );

  useEffect(() => {
    const handleUpdate = () => setCurrencyLabelState(getCurrencyLabel(i18n?.language));
    window.addEventListener('autofix-currency-settings-changed', handleUpdate);
    return () => window.removeEventListener('autofix-currency-settings-changed', handleUpdate);
  }, [i18n?.language]);

  useEffect(() => {
    if (value === undefined || value === null || value === '') {
      setDisplayValue('');
    } else {
      setDisplayValue(String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // 1. Convert Arabic-Indic / Persian digits to Western digits
    raw = toWesternDigits(raw);

    // 2. Handle negatives
    let isNeg = false;
    if (allowNegative && raw.startsWith('-')) {
      isNeg = true;
      raw = raw.slice(1);
    } else {
      raw = raw.replace(/-/g, '');
    }

    // 3. Keep only digits and decimal point
    raw = raw.replace(/[^0-9.]/g, '');

    // 4. Ensure at most one decimal point
    const parts = raw.split('.');
    if (parts.length > 2) {
      raw = parts[0] + '.' + parts.slice(1).join('');
    }

    // 5. Enforce at most 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      raw = parts[0] + '.' + parts[1].substring(0, 2);
    }

    const finalRaw = (isNeg ? '-' : '') + raw;
    setDisplayValue(finalRaw);

    const num = parseFloat(finalRaw);
    if (!isNaN(num)) {
      onChange(num);
    } else {
      onChange(0);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', ...style }}>
      {label && (
        <label style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {label}
        </label>
      )}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-secondary, #1e293b)',
        border: error ? '1px solid var(--danger, #ef4444)' : '1px solid var(--border, #334155)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '10px 14px',
            color: '#f8fafc',
            fontSize: '14px',
            fontWeight: 600,
            textAlign: 'start'
          }}
        />
        <div style={{
          padding: '0 12px',
          color: 'var(--text-muted, #94a3b8)',
          fontSize: '12px',
          fontWeight: 700,
          background: 'rgba(255, 255, 255, 0.05)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          borderInlineStart: '1px solid var(--border, #334155)',
          userSelect: 'none'
        }}>
          {currencyLabel}
        </div>
      </div>
      {error && (
        <span style={{ fontSize: '11px', color: '#ef4444' }}>{error}</span>
      )}
    </div>
  );
};

export default PriceInput;
