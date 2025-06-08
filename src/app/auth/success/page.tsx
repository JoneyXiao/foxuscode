'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { LanguageSwitcher } from '@/components/language-switcher'
import { createClientComponentClient } from '@/lib/supabase'

function AuthSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, ready, i18n } = useTranslation()
  const [isClient, setIsClient] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [autoRedirect, setAutoRedirect] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Error checking user:', error)
          setIsAuthenticated(false)
        } else if (user) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Error in auth check:', error)
        setIsAuthenticated(false)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    if (isClient) {
      checkAuth()
    }
  }, [isClient, supabase.auth])

  // Redirect unauthenticated users to sign in
  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated) {
      // Add current URL params to preserve language
      const langParam = searchParams.get('lang') || searchParams.get('language')
      const redirectUrl = langParam ? `/auth/signin?lang=${langParam}` : '/auth/signin'
      router.replace(redirectUrl)
    }
  }, [isCheckingAuth, isAuthenticated, router, searchParams])

  // Enhanced language detection
  useEffect(() => {
    if (!isClient || !ready || !isAuthenticated) return

    // Check if language is specified in URL parameters
    const langParam = searchParams.get('lang') || searchParams.get('language')
    if (langParam && (langParam === 'zh-CN' || langParam === 'en-US')) {
      if (i18n.language !== langParam) {
        i18n.changeLanguage(langParam)
      }
      return
    }

    // Check localStorage for previously saved language preference
    const savedLanguage = localStorage.getItem('i18nextLng')
    if (savedLanguage && (savedLanguage === 'zh-CN' || savedLanguage === 'en-US')) {
      if (i18n.language !== savedLanguage) {
        i18n.changeLanguage(savedLanguage)
      }
      return
    }

    // Default to browser language if supported
    const browserLang = navigator.language
    if (browserLang.startsWith('zh')) {
      if (i18n.language !== 'zh-CN') {
        i18n.changeLanguage('zh-CN')
      }
    } else if (browserLang.startsWith('en')) {
      if (i18n.language !== 'en-US') {
        i18n.changeLanguage('en-US')
      }
    }
  }, [isClient, ready, searchParams, i18n, isAuthenticated])

  useEffect(() => {
    if (!isClient || !ready || !isAuthenticated) return

    if (autoRedirect && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (autoRedirect && countdown === 0) {
      router.push('/dashboard')
    }
  }, [countdown, autoRedirect, router, isClient, ready, isAuthenticated])

  const handleContinue = () => {
    router.push('/dashboard')
  }

  const handleCancelAutoRedirect = () => {
    setAutoRedirect(false)
  }

  // Show loading during hydration or auth check
  if (!isClient || !ready || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Show loading while redirect is happening for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* Header with Language Switcher */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 animate-pulse" />
          <CardTitle className="text-2xl font-bold text-green-600">
            {t('auth.emailConfirmed')}
          </CardTitle>
          <CardDescription className="text-base">
            {t('auth.emailConfirmedDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium mb-2">
              {t('auth.accountActivated')}
            </p>
            <p className="text-green-700 text-sm">
              {t('auth.canStartCreating')}
            </p>
          </div>

          {autoRedirect && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm mb-2">
                {(() => {
                  try {
                    // Ensure countdown is a number and try the translation with interpolation
                    const countValue = Number(countdown) || 0
                    let translatedText = t('auth.autoRedirect', { count: countValue })
                    
                    // Check if interpolation failed (still contains {count} or {{count}})
                    if (translatedText.includes('{count}') || translatedText.includes('{{count}}')) {
                      // Manually replace the placeholder if i18next interpolation failed
                      translatedText = translatedText
                        .replace(/\{count\}/g, countValue.toString())
                        .replace(/\{\{count\}\}/g, countValue.toString())
                    }
                    
                    return translatedText
                  } catch (error) {
                    // Fallback to Chinese if there's any error
                    console.error('Error in autoRedirect translation:', error)
                    return `将在 ${countdown} 秒后自动跳转到控制台...`
                  }
                })()}
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancelAutoRedirect}
                className="text-blue-600 hover:text-blue-800"
              >
                {t('common.cancel')}
              </Button>
            </div>
          )}

          <div className="flex flex-col space-y-3">
            <Button onClick={handleContinue} className="w-full">
              <ArrowRight className="mr-2 h-4 w-4" />
              {t('auth.goToDashboard')}
            </Button>
            
            <Link href="/">
              <Button variant="outline" className="w-full">
                {t('common.backToHome')}
              </Button>
            </Link>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>{t('auth.nextSteps')}</p>
            <ul className="text-left space-y-1">
              <li>• {t('auth.createFirstForm')}</li>
              <li>• {t('auth.generateQRCode')}</li>
              <li>• {t('auth.manageSubmissions')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthSuccessContent />
    </Suspense>
  )
}
