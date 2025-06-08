'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { createClientComponentClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, QrCode, ExternalLink, FileText, Loader2, Edit, Calendar, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyFormLinkButton } from '@/components/copy-form-link-button';
import { Navbar } from '@/components/navbar';
import { User } from '@supabase/supabase-js';

interface Form {
    id: string;
    title: string;
    description?: string;
    created_at: string;
    submissions_count: number;
}

function FormsList({ userId }: { userId: string }) {
    const { t } = useTranslation();
    const [forms, setForms] = useState<Form[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchForms = async () => {
            try {
                // First, get the forms
                const { data: formsData, error: formsError } = await supabase
                    .from('forms')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                if (formsError) {
                    throw formsError;
                }

                if (!formsData || formsData.length === 0) {
                    setForms([]);
                    setLoading(false);
                    return;
                }

                // Get submission counts for each form
                const formsWithCounts = await Promise.all(
                    formsData.map(async (form) => {
                        const { count } = await supabase
                            .from('submissions')
                            .select('*', { count: 'exact', head: true })
                            .eq('form_id', form.id);

                        return {
                            ...form,
                            submissions_count: count || 0,
                        };
                    }),
                );

                setForms(formsWithCounts as Form[]);
            } catch (err: unknown) {
                console.error('Error fetching forms:', err);
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchForms();
    }, [userId, supabase]);

    if (loading) {
        return <FormsListSkeleton />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center max-w-md">
                    <p className="text-destructive font-medium mb-2">{t('errors.generic')}</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                </div>
            </div>
        );
    }

    if (forms.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                    <div className="rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 p-6 mb-6">
                        <FileText className="h-12 w-12 text-blue-600" />
                    </div>
                    <div className="absolute -top-1 -right-1 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 p-2">
                        <Plus className="h-4 w-4 text-purple-600" />
                    </div>
                </div>
                <div className="text-center space-y-4 max-w-md">
                    <h3 className="text-2xl font-semibold text-foreground">
                        {t('dashboard.noForms')}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                        {t('dashboard.createFirstForm')}
                    </p>
                    <div className="pt-4">
                        <Link href="/forms/create">
                            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/25">
                                <Plus className="mr-2 h-5 w-5" />
                                {t('forms.create')}
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
                <Card
                    key={form.id}
                    className="group relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/80 shadow-sm hover:shadow-xl hover:shadow-gray-200/40 transition-all duration-300 hover:-translate-y-1"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <CardHeader className="relative pb-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-2">
                                <CardTitle className="text-lg font-semibold leading-tight text-foreground group-hover:text-blue-700 transition-colors duration-200 truncate">
                                    {form.title}
                                </CardTitle>
                                <div className="min-h-[2.5rem]">
                                    <CardDescription className="leading-relaxed line-clamp-2">
                                        {form.description || t('dashboard.noDescription')}
                                    </CardDescription>
                                </div>
                            </div>
                            <Badge 
                                variant="secondary" 
                                className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200 flex items-center gap-1 font-medium shrink-0"
                            >
                                <TrendingUp className="h-3 w-3" />
                                {form.submissions_count}
                            </Badge>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="relative pt-0">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/80 font-medium">
                                <Calendar className="h-3 w-3" />
                                <span>{t('dashboard.created')} {new Date(form.created_at).toLocaleDateString()}</span>
                            </div>
                            
                            {/* Primary Action - Edit Form */}
                            <Button 
                                size="sm" 
                                variant="default"
                                asChild
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-sm font-medium transition-all duration-200 hover:shadow-md"
                            >
                                <Link href={`/forms/${form.id}/edit`}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t('forms.edit')}
                                </Link>
                            </Button>
                            
                            {/* Secondary Actions Grid */}
                            <div className="grid grid-cols-3 gap-1.5">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    asChild
                                    className="h-auto flex-col gap-1 py-2 bg-white/60 border-gray-200/80 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:shadow-sm"
                                >
                                    <Link href={`/forms/${form.id}/qr`}>
                                        <QrCode className="h-4 w-4" />
                                        <span className="text-xs font-medium">{t('forms.qrCode')}</span>
                                    </Link>
                                </Button>
                                
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    asChild
                                    className="h-auto flex-col gap-1 py-2 bg-white/60 border-gray-200/80 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:shadow-sm"
                                >
                                    <Link
                                        href={`/submit/${form.id}`}
                                        target="_blank"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        <span className="text-xs font-medium">{t('forms.preview')}</span>
                                    </Link>
                                </Button>
                                
                                <CopyFormLinkButton formId={form.id} variant="compact" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function FormsListSkeleton() {
    return (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/80 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-5 w-3/4" />
                                <div className="min-h-[2.5rem] flex items-start">
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            </div>
                            <Skeleton className="h-6 w-12 rounded-full" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-3">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-8 w-full" />
                            <div className="grid grid-cols-3 gap-1.5">
                                <Skeleton className="h-12" />
                                <Skeleton className="h-12" />
                                <Skeleton className="h-12" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function DashboardPage() {
    const { t, ready } = useTranslation();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const supabase = createClientComponentClient();

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (!user) {
                router.push('/auth/signin');
                return;
            }

            setLoading(false);
        };

        if (isClient && ready) {
            getUser();
        }
    }, [router, supabase.auth, isClient, ready]);

    // Show loading during hydration or while checking auth
    if (!isClient || !ready || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
                <div className="text-center space-y-4">
                    <div className="relative">
                        <div className="rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 p-4">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    </div>
                    <p className="text-muted-foreground font-medium">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
            <Navbar user={user} showCreateButton={false} />

            <main className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                {t('dashboard.title')}
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                {t('dashboard.subtitle')}
                            </p>
                        </div>
                        <Link href="/forms/create">
                            <Button 
                                size="lg" 
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/25 border-0"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                {t('forms.create')}
                            </Button>
                        </Link>
                    </div>
                </div>

                <FormsList userId={user.id} />
            </main>
        </div>
    );
}
