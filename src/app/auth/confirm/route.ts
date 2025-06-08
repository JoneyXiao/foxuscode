import { createServerActionClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_ATTEMPTS = 10 // Max attempts per IP per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record) {
    rateLimitMap.set(ip, { count: 1, timestamp: now })
    return false
  }
  
  // Reset counter if window has passed
  if (now - record.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, timestamp: now })
    return false
  }
  
  // Increment counter
  record.count++
  
  // Check if rate limited
  if (record.count > RATE_LIMIT_MAX_ATTEMPTS) {
    return true
  }
  
  return false
}

function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for')
  const xRealIP = request.headers.get('x-real-ip')
  const xClientIP = request.headers.get('x-client-ip')
  
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  if (xRealIP) {
    return xRealIP
  }
  if (xClientIP) {
    return xClientIP
  }
  
  return 'unknown'
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  
  // Get client IP for rate limiting
  const clientIP = getClientIP(request)
  
  // Apply rate limiting
  if (isRateLimited(clientIP)) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin
    return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=rate_limited&lang=zh-CN`)
  }
  
  // Validate required parameters
  if (!token_hash || !type) {
    console.warn(`Missing required parameters - IP: ${clientIP}, token_hash: ${!!token_hash}, type: ${!!type}`)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin
    return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=missing_params&lang=zh-CN`)
  }
  
  // Validate token_hash format (basic validation)
  if (typeof token_hash !== 'string' || token_hash.length < 10 || token_hash.length > 200) {
    console.warn(`Invalid token_hash format - IP: ${clientIP}`)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin
    return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=invalid_token&lang=zh-CN`)
  }
  
  // Validate type parameter
  const validTypes: EmailOtpType[] = ['email', 'signup', 'invite', 'magiclink', 'recovery', 'email_change']
  if (!validTypes.includes(type as EmailOtpType)) {
    console.warn(`Invalid type parameter - IP: ${clientIP}, type: ${type}`)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin
    return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=invalid_type&lang=zh-CN`)
  }
  
  // Detect language from various sources
  const langParam = searchParams.get('lang') || searchParams.get('language')
  const acceptLanguage = request.headers.get('accept-language')
  
  // Determine the appropriate language
  let detectedLanguage = 'zh-CN' // Default to Chinese
  if (langParam && (langParam === 'zh-CN' || langParam === 'en-US')) {
    detectedLanguage = langParam
  } else if (acceptLanguage) {
    if (acceptLanguage.includes('en')) {
      detectedLanguage = 'en-US'
    } else if (acceptLanguage.includes('zh')) {
      detectedLanguage = 'zh-CN'
    }
  }

  try {
    const supabase = await createServerActionClient()
    
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    })
    
    if (!error) {
      console.log(`Successful OTP verification - IP: ${clientIP}`)
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      let redirectUrl
      if (isLocalEnv) {
        redirectUrl = `${origin}/auth/success?lang=${detectedLanguage}`
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}/auth/success?lang=${detectedLanguage}`
      } else {
        // Use NEXT_PUBLIC_APP_URL if available, fallback to origin
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin
        redirectUrl = `${baseUrl}/auth/success?lang=${detectedLanguage}`
      }
      
      return NextResponse.redirect(redirectUrl)
    } else {
      console.warn(`OTP verification failed - IP: ${clientIP}, error: ${error.message}`)
    }
  } catch (err) {
    console.error('Error during OTP verification:', err)
  }

  // Return the user to an error page with instructions
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin
  const errorUrl = `${baseUrl}/auth/auth-code-error?error=verification_failed&token_hash=${encodeURIComponent(token_hash)}&type=${type}&lang=${detectedLanguage}`
  return NextResponse.redirect(errorUrl)
}
