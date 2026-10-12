import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';

interface MoneyProps {
  value: number | null | undefined;
  lang?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Money: React.FC<MoneyProps> = ({ value, lang, className = '', style }) => {
  const { i18n } = useTranslation();
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    window.addEventListener('autofix-currency-settings-changed', handleUpdate);
    window.addEventListener('autofix-digit-mode-changed', handleUpdate);
    return () => {
      window.removeEventListener('autofix-currency-settings-changed', handleUpdate);
      window.removeEventListener('autofix-digit-mode-changed', handleUpdate);
    };
  }, []);

  const currentLang = lang || i18n?.language || 'ar';
  const text = formatCurrency(value, currentLang);

  return (
    <span
      className={`money-amount ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        direction: 'ltr',
        unicodeBidi: 'isolate',
        ...style
      }}
    >
      <bdi>{text}</bdi>
    </span>
  );
};

export default Money;
