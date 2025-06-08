'use client';

import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { CNIcon, ENIcon, LanguageIcon } from './iconify-icons';

const languages = [
  { code: 'zh-CN', name: '中文', icon: CNIcon },
  { code: 'en-US', name: 'En', icon: ENIcon },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleValueChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language);

  return (
    <Select value={i18n.language} onValueChange={handleValueChange}>
      <SelectTrigger className="w-auto">
        <div className="flex items-center gap-2">
          <LanguageIcon size={16} />
          <span>{currentLanguage?.name || t('common.language')}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => {
          const IconComponent = lang.icon;
          return (
            <SelectItem key={lang.code} value={lang.code}>
              <div className="flex items-center gap-2">
                <IconComponent size={16} />
                <span>{lang.name}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
