/** @jsxImportSource preact */
import { FunctionComponent } from 'preact';
import { useTranslate } from '@/shared/i18n/i18n';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export const Spinner: FunctionComponent<SpinnerProps> = ({ size = 'md' }) => {
  const { t } = useTranslate('common');
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div class={`sb-spinner ${sizeClasses[size]}`} role="status">
      <span className="sr-only">{t('loading')}</span>
    </div>
  );
};

