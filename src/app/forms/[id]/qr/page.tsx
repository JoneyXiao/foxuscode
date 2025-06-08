'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { createClientComponentClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { CopyFormLinkButton } from '@/components/copy-form-link-button';
import { Navbar } from '@/components/navbar';
import { User } from '@supabase/supabase-js';

interface Props {
    params: Promise<{
        id: string;
    }>;
}

interface Form {
    id: string;
    title: string;
    description?: string;
    fields: Record<string, unknown>[];
    email_recipient: string;
    created_at: string;
}

export default function FormQRPage({ params }: Props) {
    const { t, ready } = useTranslation();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [form, setForm] = useState<Form | null>(null);
    const [loading, setLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const [formId, setFormId] = useState<string>('');
    const supabase = createClientComponentClient();
    const qrCodeRef = useRef<HTMLDivElement>(null);

    const fetchForm = useCallback(async (formId: string, userId: string) => {
        try {
            const { data: form, error } = await supabase
                .from('forms')
                .select('*')
                .eq('id', formId)
                .eq('user_id', userId)
                .single();

            if (error) {
                console.error('Error fetching form:', error);
                router.push('/dashboard');
                return;
            }

            setForm(form);
        } catch (error) {
            console.error('Error fetching form:', error);
            router.push('/dashboard');
        }
    }, [supabase, router]);

    useEffect(() => {
        setIsClient(true);
        params.then(({ id }) => setFormId(id));
    }, [params]);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (!user) {
                router.push('/auth/signin');
                return;
            }

            if (formId) {
                await fetchForm(formId, user.id);
            }
            setLoading(false);
        };

        if (isClient && formId) {
            getUser();
        }
    }, [router, supabase.auth, isClient, formId, fetchForm]);

    const downloadQRCode = useCallback(() => {
        if (!qrCodeRef.current || !form) return;

        const svg = qrCodeRef.current.querySelector('svg');
        if (!svg) return;

        // Create a canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size (add padding)
        const padding = 40;
        const svgSize = 256;
        canvas.width = svgSize + padding * 2;
        canvas.height = svgSize + padding * 2;

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Convert SVG to image
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        const img = new Image();
        img.onload = () => {
            // Draw the QR code centered with padding
            ctx.drawImage(img, padding, padding, svgSize, svgSize);

            // Add form title as text below QR code
            ctx.fillStyle = '#000000';
            ctx.font = '16px Arial, sans-serif';
            ctx.textAlign = 'center';
            const titleText = form.title;
            const maxWidth = canvas.width - padding * 2;
            
            // Simple text wrapping
            const words = titleText.split(' ');
            let line = '';
            let y = svgSize + padding + 30;
            
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(line, canvas.width / 2, y);
                    line = words[n] + ' ';
                    y += 20;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, canvas.width / 2, y);

            // Create download link
            canvas.toBlob((blob) => {
                if (!blob) return;
                
                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `${form.title.replace(/[^a-zA-Z0-9]/g, '_')}_QR_Code.png`;
                link.href = downloadUrl;
                link.click();
                
                // Cleanup
                URL.revokeObjectURL(downloadUrl);
            }, 'image/png');
            
            URL.revokeObjectURL(url);
        };
        
        img.src = url;
    }, [form]);

    // Show loading during hydration or while checking auth
    if (!isClient || !ready || loading || !form) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const formUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/submit/${form.id}`;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar user={user} showCreateButton={false} />

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t('common.back')}
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {t('forms.qrCode')} - &quot;{form.title}&quot;
                    </h1>
                </div>

                <div className="max-w-2xl mx-auto">
                    <div className="grid gap-8">
                        {/* QR Code Display */}
                        <Card>
                            <CardHeader className="text-center">
                                <CardTitle className='text-xl'>{form.title}</CardTitle>
                                {/* <CardDescription>
                                    {t('forms.sharing.qrCode')}
                                </CardDescription> */}
                            </CardHeader>
                            <CardContent className="flex flex-col items-center space-y-6">
                                <div className="bg-white p-4 rounded-lg border" ref={qrCodeRef}>
                                    <QRCode
                                        value={formUrl}
                                        size={256}
                                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                    />
                                </div>

                                <div className="w-full space-y-4">
                                    <div className="text-center">
                                        {/* <p className="text-sm text-gray-600 mb-2">
                                            {t('forms.sharing.link')}:
                                        </p> */}
                                        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded border">
                                            <code className="flex-1 text-sm text-gray-800 break-all">
                                                {formUrl}
                                            </code>
                                            <CopyFormLinkButton formId={form.id} />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('common.actions')}</CardTitle>
                                <CardDescription>
                                    {t('forms.sharing.title')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-4">
                                    <Button asChild>
                                        <Link href={formUrl} target="_blank">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            {t('forms.preview')}
                                        </Link>
                                    </Button>

                                    <Button variant="outline" onClick={downloadQRCode}>
                                        <Download className="h-4 w-4 mr-2" />
                                        {t('forms.sharing.downloadQR')}
                                    </Button>

                                    <Button variant="outline" asChild>
                                        <Link href={`/forms/${form.id}/edit`}>
                                            {t('forms.edit')}
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Form Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('forms.fields.overview')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div>
                                        <span className="font-medium">
                                            {t('forms.fields.title')}:
                                        </span>{' '}
                                        {form.title}
                                    </div>
                                    {form.description && (
                                        <div>
                                            <span className="font-medium">
                                                {t('forms.fields.description')}:
                                            </span>{' '}
                                            {form.description}
                                        </div>
                                    )}
                                    <div>
                                        <span className="font-medium">
                                            {t('forms.fields.emailRecipient')}:
                                        </span>{' '}
                                        {form.email_recipient}
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            {t('forms.fieldCount')}:
                                        </span>{' '}
                                        {form.fields.length}
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            {t('dashboard.created')}:
                                        </span>{' '}
                                        {new Date(form.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
