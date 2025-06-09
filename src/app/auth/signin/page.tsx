'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Loader2, Mail, ArrowLeft, Eye, EyeOff, User, Lock, QrCode } from 'lucide-react';
import { createClientComponentClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { LanguageSwitcher } from '@/components/language-switcher';
import Link from 'next/link';
import { FoxIcon } from '@/components/iconify-icons';

export default function SignInPage() {
    const router = useRouter();
    const { t, ready } = useTranslation();
    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState('signin');
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
                toast.success(t('auth.checkRegistrationEmail') || 'Please check your email and click the link to complete registration!');
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
                <div className="text-center">
                    <div className="relative">
                        <div className="h-12 w-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                            <QrCode className="h-6 w-6 text-primary" />
                        </div>
                        <Loader2 className="h-4 w-4 animate-spin absolute top-2 right-2 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-border/40">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <Link 
                        href="/" 
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
                    >
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-sm font-medium">{t('common.back')}</span>
                    </Link>
                    <LanguageSwitcher />
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
                <div className="w-full max-w-md">
                    {/* Logo/Brand Section */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg shadow-primary/25">
                            <FoxIcon className="h-10 w-10 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                            {t('auth.welcomeTo')} {t('app.name')}
                        </h1>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {t('auth.signInDescription') || 'Create and manage your digital forms with QR codes'}
                        </p>
                    </div>

                    {/* Auth Card */}
                    <Card className="border-0 shadow-xl shadow-black/5 bg-white/70 backdrop-blur-sm">
                        <CardHeader className="text-center pb-4">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                                    <TabsTrigger 
                                        value="signin" 
                                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                                    >
                                        {t('auth.login')}
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="signup"
                                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                                    >
                                        {t('auth.register')}
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <Tabs value={activeTab} className="w-full">
                                <TabsContent value="signin" className="space-y-4 mt-0">
                                    <form onSubmit={handleSignIn} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="signin-email" className="text-sm font-medium text-foreground">
                                                {t('auth.email')}
                                            </Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="signin-email"
                                                    type="email"
                                                    placeholder={t('auth.emailPlaceholder') || 'Enter your email'}
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="pl-10 h-11 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Label htmlFor="signin-password" className="text-sm font-medium text-foreground">
                                                {t('auth.password')}
                                            </Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="signin-password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder={t('auth.passwordPlaceholder') || 'Enter your password'}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="pl-10 pr-10 h-11 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all"
                                                    required
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/50"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Mail className="mr-2 h-4 w-4" />
                                            )}
                                            {isLoading ? t('common.loading') || 'Signing in...' : t('auth.signInWithEmail')}
                                        </Button>
                                    </form>
                                </TabsContent>

                                <TabsContent value="signup" className="space-y-4 mt-0">
                                    <form onSubmit={handleSignUp} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="signup-name" className="text-sm font-medium text-foreground">
                                                {t('profile.name')}
                                            </Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="signup-name"
                                                    type="text"
                                                    placeholder={t('auth.namePlaceholder') || 'Enter your name'}
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="pl-10 h-11 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">
                                                {t('auth.email')}
                                            </Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="signup-email"
                                                    type="email"
                                                    placeholder={t('auth.emailPlaceholder') || 'Enter your email'}
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="pl-10 h-11 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                                                {t('auth.password')}
                                            </Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="signup-password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder={t('auth.passwordPlaceholder') || 'Enter your password'}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="pl-10 pr-10 h-11 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all"
                                                    required
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/50"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="text-xs text-muted-foreground text-center px-2 py-2 bg-muted/30 rounded-lg">
                                            {t('auth.emailVerificationNote') || 'A verification email will be sent to confirm your account'}
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <User className="mr-2 h-4 w-4" />
                                            )}
                                            {isLoading ? t('common.loading') || 'Creating account...' : t('auth.signUpWithEmail')}
                                        </Button>
                                    </form>
                                </TabsContent>
                            </Tabs>

                            {/* <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                            </div> */}

                            {/* Footer Info */}
                            {/* <div className="text-center">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {t('auth.termsText') || 'By continuing, you agree to our terms of service and privacy policy'}
                                </p>
                            </div> */}
                        </CardContent>
                    </Card>

                    {/* Additional Help */}
                    <div className="text-center mt-6">
                        <p className="text-xs text-muted-foreground">
                            {/* {t('auth.needHelp') || 'Need help?'}{' '} */}
                            {t('common.poweredBy') || 'Powered by'}{' '}
                            <Link href="/" className="text-primary hover:underline font-medium">
                                {/* {t('common.contactSupport') || 'Contact Support'} */}
                                {t('app.name')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
