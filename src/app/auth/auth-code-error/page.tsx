'use client'

import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { LanguageSwitcher } from '@/components/language-switcher'

function ErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t, ready, i18n } = useTranslation()
  const [isClient, setIsClient] = useState(false)
  const [isValidError, setIsValidError] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const error = searchParams.get('error')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Validate that this is a legitimate error page access
  useEffect(() => {
    if (!isClient) return

    // Check if there are legitimate error parameters
    const hasErrorParams = error || token_hash || type
    const hasRefererFromAuth = typeof window !== 'undefined' && 
      (document.referrer.includes('/auth/') || document.referrer.includes('/confirm'))
    
    // Allow access if:
    // 1. There are error parameters (came from auth flow)
    // 2. Referred from auth pages
    // 3. Direct access with specific error types
    const legitimateAccess = hasErrorParams || hasRefererFromAuth || 
      (error && ['invalid_token', 'expired_token', 'signup_disabled'].includes(error))

    setIsValidError(!!legitimateAccess)
    setIsValidating(false)

    // If not a legitimate error access, redirect to home immediately
    if (!legitimateAccess) {
      router.replace('/')
    }
  }, [isClient, error, token_hash, type, router])

  // Enhanced language detection
  useEffect(() => {
    if (!isClient || !ready) return

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
  }, [isClient, ready, searchParams, i18n])

  // Show loading during hydration or validation
  if (!isClient || !ready || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Show unauthorized access message
  if (!isValidError) {
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
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-red-600">
            {t('auth.emailConfirmationFailed')}
          </CardTitle>
          <CardDescription>
            {t('auth.emailConfirmationError')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-medium">{t('auth.possibleReasons')}</p>
            <ul className="text-left space-y-1">
              <li>• {t('auth.linkExpired')}</li>
              <li>• {t('auth.linkAlreadyUsed')}</li>
              <li>• {t('auth.emailTemplateError')}</li>
              <li>• {t('auth.networkIssues')}</li>
            </ul>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 p-3 rounded text-xs text-left">
              <p className="font-medium mb-1">{t('auth.debugInfo')}</p>
              <p>{t('auth.tokenHash')}: {token_hash ? t('auth.present') : t('auth.missing')}</p>
              <p>{t('auth.type')}: {type || t('auth.missing')}</p>
              <p>{t('auth.error')}: {error || t('auth.unknown')}</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-gray-600">
              {t('auth.tryAgainMessage')}
            </p>
            
            <div className="flex flex-col space-y-2">
              <Link href="/auth/signin">
                <Button className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('auth.signInRequestNew')}
                </Button>
              </Link>
              
              <Link href="/">
                <Button variant="outline" className="w-full">
                  {t('common.backToHome')}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
