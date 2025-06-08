'use client';

import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface CopyFormLinkButtonProps {
    formId: string;
    baseUrl?: string;
    variant?: 'default' | 'compact';
}

export function CopyFormLinkButton({ formId, baseUrl = 'http://localhost:3000', variant = 'default' }: CopyFormLinkButtonProps) {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    
    const formUrl = `${process.env.NEXT_PUBLIC_APP_URL || baseUrl}/submit/${formId}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(formUrl);
            setCopied(true);
            toast.success(t('success.linkCopied'));
            
            // Reset the check mark after 2 seconds
            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (error) {
            console.error('Failed to copy text:', error);
            toast.error(t('errors.copyLinkFailed'));
        }
    };

    return (
        <Button 
            size="sm" 
            variant="outline" 
            onClick={handleCopy}
            className={variant === 'compact' 
                ? "h-auto flex-col gap-1 py-2 bg-white/60 border-gray-200/80 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:shadow-sm" 
                : ""
            }
        >
            {copied ? (
                <Check className={`${variant === 'compact' ? 'h-4 w-4' : 'h-4 w-4 mr-1'} text-green-600`} />
            ) : (
                <Copy className={variant === 'compact' ? 'h-4 w-4' : 'h-4 w-4 mr-1'} />
            )}
            {variant === 'default' && (
                <span className={copied ? 'sr-only' : ''}>{t('forms.sharing.copyLink')}</span>
            )}
            {variant === 'compact' && (
                <span className="text-xs font-medium">{t('common.copy')}</span>
            )}
        </Button>
    );
}
