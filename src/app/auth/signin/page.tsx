'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { createClientComponentClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { LanguageSwitcher } from '@/components/language-switcher';
import Link from 'next/link';

export default function SignInPage() {
    const router = useRouter();
    const { t, ready } = useTranslation();
    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const supabase = createClientComponentClient();

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success(t('success.loginSuccess') || 'Successfully signed in!');
                router.push('/dashboard');
            }
        } catch {
            toast.error(t('errors.generic') || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Get the current origin, with fallback to the environment variable
            const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 
                                  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                    },
                    emailRedirectTo: `${currentOrigin}/auth/confirm?lang=${localStorage.getItem('i18nextLng') || 'zh-CN'}`,
                },
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success(t('auth.checkEmail') || 'Check your email for the confirmation link!');
            }
        } catch {
            toast.error(t('errors.generic') || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    // Show loading during hydration
    if (!isClient || !ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            {/* Header with language switcher */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4" />
                    {t('common.back')}
                </Link>
                <LanguageSwitcher />
            </div>

            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">
                        {t('auth.welcomeTo')} {t('app.name')}
                    </CardTitle>
                    <CardDescription>
                        {t('auth.signInDescription') || 'Sign in to create and manage your digital forms'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="signin" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="signin">
                                {t('auth.login')}
                            </TabsTrigger>
                            <TabsTrigger value="signup">
                                {t('auth.register')}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="signin">
                            <form onSubmit={handleSignIn} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">
                                        {t('auth.email')}
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={t('auth.emailPlaceholder') || 'Enter your email'}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">
                                        {t('auth.password')}
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder={t('auth.passwordPlaceholder') || 'Enter your password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2
                                            className="mr-2 h-4 w-4 animate-spin"
                                        />
                                    ) : (
                                        <Mail className="mr-2 h-4 w-4" />
                                    )}
                                    {t('auth.signInWithEmail')}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="signup">
                            <form onSubmit={handleSignUp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        {t('profile.name')}
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder={t('auth.namePlaceholder') || 'Enter your name'}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">
                                        {t('auth.email')}
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={t('auth.emailPlaceholder') || 'Enter your email'}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">
                                        {t('auth.password')}
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder={t('auth.passwordPlaceholder') || 'Enter your password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2
                                            className="mr-2 h-4 w-4 animate-spin"
                                        />
                                    ) : (
                                        <Mail className="mr-2 h-4 w-4" />
                                    )}
                                    {t('auth.signUpWithEmail')}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
