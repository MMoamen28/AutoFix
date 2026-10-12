import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { setLanguage } from '../../i18n/i18n';

interface LanguageToggleProps {
  style?: React.CSSProperties;
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ style, className }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'ar';

  const toggleLanguage = () => {
    const nextLang = currentLang === 'ar' ? 'en' : 'ar';
    setLanguage(nextLang);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={className}
      id="language-toggle-btn"
      title={currentLang === 'ar' ? 'Switch to English' : 'التحويل إلى اللغة العربية'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border, #334155)',
        background: 'var(--card-bg, rgba(30, 41, 59, 0.7))',
        color: '#f8fafc',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 700,
        transition: 'all 0.2s ease',
        userSelect: 'none',
        ...style,
      }}
    >
      <Languages size={15} color="var(--primary, #3b82f6)" />
      <span>{currentLang === 'ar' ? 'EN' : 'عربي'}</span>
    </button>
  );
};

export default LanguageToggle;
