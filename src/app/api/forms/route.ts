import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createFormSchema } from '@/lib/validations'

// Server-side validation error messages
const validationMessages = {
  titleRequired: 'Form title is required',
  titleTooLong: 'Title must be less than 100 characters', 
  fieldsRequired: 'At least one field is required to create a form',
  fieldLabelRequired: 'All fields must have a label',
  emailInvalid: 'Please enter a valid email address',
  emailRequired: 'Email recipient is required'
}

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with request cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // We can't set cookies in API routes, but this is required by the interface
          },
          remove() {
            // We can't remove cookies in API routes, but this is required by the interface
          },
        },
      }
    )
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate the form data
    const validatedData = createFormSchema.parse(body)
    
    // Insert the form into the database
    const { data: form, error } = await supabase
      .from('forms')
      .insert({
        user_id: user.id,
        title: validatedData.title,
        description: validatedData.description || null,
        fields: validatedData.fields,
        email_recipient: validatedData.emailRecipient,
        email_subject: validatedData.emailSubject || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create form', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: form.id, message: 'Form created successfully' })
  } catch (error) {
    console.error('API error:', error)
    
    // Handle Zod validation errors with specific messages
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ path: string[]; code: string; message: string }> }
      const firstIssue = zodError.issues[0]
      
      // Provide specific error messages for common validation failures
      if (firstIssue?.path?.includes('fields') && firstIssue?.code === 'too_small') {
        return NextResponse.json({ 
          error: validationMessages.fieldsRequired,
          code: 'FIELDS_REQUIRED',
          translationKey: 'validation.fieldsRequired'
        }, { status: 400 })
      }
      
      if (firstIssue?.path?.includes('title') && firstIssue?.code === 'too_small') {
        return NextResponse.json({ 
          error: validationMessages.titleRequired,
          code: 'TITLE_REQUIRED',
          translationKey: 'validation.titleRequired'
        }, { status: 400 })
      }
      
      if (firstIssue?.path?.includes('title') && firstIssue?.code === 'too_big') {
        return NextResponse.json({ 
          error: validationMessages.titleTooLong,
          code: 'TITLE_TOO_LONG',
          translationKey: 'validation.titleTooLong'
        }, { status: 400 })
      }
      
      if (firstIssue?.path?.includes('emailRecipient')) {
        return NextResponse.json({ 
          error: validationMessages.emailInvalid,
          code: 'EMAIL_INVALID',
          translationKey: 'validation.emailInvalid'
        }, { status: 400 })
      }
      
      if (firstIssue?.path?.includes('label')) {
        return NextResponse.json({ 
          error: validationMessages.fieldLabelRequired,
          code: 'FIELD_LABEL_REQUIRED',
          translationKey: 'validation.fieldLabelRequired'
        }, { status: 400 })
      }
      
      // Generic validation error with the actual message
      return NextResponse.json({ 
        error: firstIssue?.message || 'Invalid form data',
        code: 'VALIDATION_ERROR',
        translationKey: 'validation.generic'
      }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
