'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, FileText, Mail, Shield } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useAuthRedirect } from '@/hooks/use-auth-redirect';
import Link from 'next/link';
import { FoxIcon } from '@/components/iconify-icons';

export default function Home() {
    const { t, ready } = useTranslation();
    const [isClient, setIsClient] = useState(false);
    
    // Handle authentication redirect
    useAuthRedirect();

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Show loading or fallback during hydration
    if (!isClient || !ready) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <FoxIcon className="h-12 w-12 mx-auto mb-4 animate-spin" />
                    <p className="text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <header className="container mx-auto px-4 py-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <FoxIcon size={24} />
                        <h1 className="text-xl font-bold text-slate-900">
                            {t('app.name')}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <Link href="/auth/signin">
                            <Button variant="outline">
                                {t('auth.login')}
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="container mx-auto px-4 py-16">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-slate-900 mb-6">
                        {t('landing.hero.title')}
                    </h2>
                    <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                        {t('landing.hero.subtitle')}
                    </p>
                    <Link href="/auth/signin">
                        <Button
                            size="lg"
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {t('landing.hero.getStarted')}
                        </Button>
                    </Link>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    <Card>
                        <CardHeader>
                            <FileText className="h-8 w-8 text-blue-600 mb-2" />
                            <CardTitle>{t('landing.features.dragDrop.title')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>
                                {t('landing.features.dragDrop.description')}
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <QrCode className="h-8 w-8 text-blue-600 mb-2" />
                            <CardTitle>{t('landing.features.qrCode.title')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>
                                {t('landing.features.qrCode.description')}
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <Mail className="h-8 w-8 text-blue-600 mb-2" />
                            <CardTitle>{t('landing.features.email.title')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>
                                {t('landing.features.email.description')}
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <Shield className="h-8 w-8 text-blue-600 mb-2" />
                            <CardTitle>{t('landing.features.secure.title')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>
                                {t('landing.features.secure.description')}
                            </CardDescription>
                        </CardContent>
                    </Card>
                </div>

                {/* CTA Section */}
                <div className="text-center">
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle className="text-2xl">
                                {t('landing.cta.title')}
                            </CardTitle>
                            <CardDescription>
                                {t('landing.cta.subtitle')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/auth/signin">
                                <Button
                                    size="lg"
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {t('landing.cta.button')}
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Footer */}
            <footer className="container mx-auto px-4 py-8 text-center text-slate-600">
                <p>&copy; 2025 - present &nbsp;|&nbsp; {t('app.name')}</p>
            </footer>
        </div>
    );
}
