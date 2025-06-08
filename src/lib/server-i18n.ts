// Server-side translation utility for use in API routes and email templates
import enUS from '../locales/en-US.json';
import zhCN from '../locales/zh-CN.json';

const translations = {
  'en-US': enUS,
  'zh-CN': zhCN,
};

export function getServerTranslation(language: string = 'zh-CN') {
  const locale = translations[language as keyof typeof translations] || translations['zh-CN'];
  
  return function t(key: string, defaultValue?: string): string {
    const keys = key.split('.');
    let value: unknown = locale;
    
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
      if (value === undefined) break;
    }
    
    return (value as string) || defaultValue || key;
  };
}

export { translations };
