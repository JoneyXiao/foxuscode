import { createServerActionClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createServerActionClient()
  await supabase.auth.signOut()
  
  return NextResponse.json({ success: true })
}
