'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface DynamicLayoutProps {
  children: React.ReactNode;
}

export function DynamicLayout({ children }: DynamicLayoutProps) {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Update the document language when i18n language changes
    if (typeof document !== 'undefined') {
      document.documentElement.lang = i18n.language;
    }
  }, [i18n.language]);

  return <>{children}</>;
}
