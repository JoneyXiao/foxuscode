import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider } from '@/components/i18n-provider';
import { DynamicLayout } from '@/components/dynamic-layout';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Foxus Code (灵狐快码) - Digital Forms with QR Codes',
    description:
        'Create digital forms with QR codes for easy sharing. Submissions are routed via email with attachments.',
    keywords: 'forms, QR codes, digital forms, email submissions, form builder',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="zh-CN">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <I18nProvider>
                    <DynamicLayout>
                        {children}
                        <Toaster />
                    </DynamicLayout>
                </I18nProvider>
            </body>
        </html>
    );
}
