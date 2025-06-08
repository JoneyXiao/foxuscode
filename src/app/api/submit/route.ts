import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { createServerComponentClient } from '@/lib/supabase';
import { EmailTemplate } from '@/components/email-template';
import { FormField } from '@/lib/validations';
import { z } from 'zod';
import React from 'react';
import { getServerTranslation } from '@/lib/server-i18n';

const resend = new Resend(process.env.RESEND_API_KEY);

// Validation schema for form submission
const submitFormSchema = z.object({
  formId: z.string().uuid(),
  data: z.record(z.unknown()),
  filePaths: z.array(z.string()).optional().default([]),
  fileMetadata: z.record(z.array(z.object({
    path: z.string(),
    originalFileName: z.string()
  }))).optional().default({}),
  language: z.string().optional().default('zh-CN'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = submitFormSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { formId, data: submissionData, filePaths, fileMetadata, language } = validation.data;
    const supabase = await createServerComponentClient();

    // Create admin client for storage operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch form details
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .eq('is_active', true)
      .single();

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found or inactive' },
        { status: 404 }
      );
    }

    // Validate required fields
    const fields = form.fields as FormField[];
    const missingRequiredFields: string[] = [];
    
    for (const field of fields) {
      if (field.required) {
        const value = submissionData[field.id];
        if (field.type === 'file') {
          // For file fields, check if files were uploaded
          if (!value || (Array.isArray(value) && value.length === 0)) {
            missingRequiredFields.push(field.label);
          }
        } else if (value === undefined || value === null || value === '') {
          missingRequiredFields.push(field.label);
        }
      }
    }

    if (missingRequiredFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          missingFields: missingRequiredFields 
        },
        { status: 400 }
      );
    }

    // Get client IP address for logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Save submission to database
    const { data: submission, error: submitError } = await supabase
      .from('submissions')
      .insert({
        form_id: formId,
        data: submissionData,
        files: filePaths,
        ip_address: clientIP,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (submitError) {
      console.error('Error saving submission:', submitError);
      return NextResponse.json(
        { error: 'Failed to save submission' },
        { status: 500 }
      );
    }

    // Prepare email attachments from uploaded files
    const attachments: Array<{
      filename: string;
      content: Buffer;
    }> = [];

    // Create a map of file paths to original filenames
    const pathToOriginalName: Record<string, string> = {};
    Object.values(fileMetadata).forEach(fieldFiles => {
      fieldFiles.forEach(file => {
        pathToOriginalName[file.path] = file.originalFileName;
      });
    });

    if (filePaths.length > 0) {
      for (const filePath of filePaths) {
        try {
          // Download file from Supabase Storage
          const { data: fileData, error: downloadError } = await supabaseAdmin.storage
            .from('form-files')
            .download(filePath);

          if (downloadError) {
            console.error('Error downloading file:', downloadError);
            continue; // Skip this file but continue with others
          }

          // Convert blob to buffer
          const buffer = Buffer.from(await fileData.arrayBuffer());
          
          // Use original filename if available, otherwise extract from path
          const fileName = pathToOriginalName[filePath] || filePath.split('/').pop() || 'attachment';
          
          attachments.push({
            filename: fileName,
            content: buffer
          });

        } catch (error) {
          console.error('Error processing file:', filePath, error);
          // Continue with other files
        }
      }
    }

    // Send email notification
    try {
      const emailSubject = form.email_subject || `New Form Submission: ${form.title}`;
      
      // Get localized app name using the server-side translation utility
      const t = getServerTranslation(language);
      const appName = t('app.name');
      
      const emailPayload: {
        from: string;
        to: string[];
        subject: string;
        react: React.ReactElement;
        attachments?: Array<{
          filename: string;
          content: Buffer;
        }>;
      } = {
        from: `${appName} <onboarding@resend.dev>`, // Localized sender name
        // For production, replace with your verified domain: `${appName} <noreply@yourdomain.com>`
        to: [form.email_recipient],
        subject: emailSubject,
        react: React.createElement(EmailTemplate, {
          formTitle: form.title,
          formDescription: form.description,
          submissionData,
          submittedAt: submission.created_at,
          language, // Pass the language to the email template
          fields: fields.map(field => ({
            id: field.id,
            label: field.label,
            type: field.type,
            required: field.required,
          })),
          fileMetadata, // Pass original filenames for display in email body
        }),
      };

      // Add attachments if any
      if (attachments.length > 0) {
        emailPayload.attachments = attachments;
      }

      const { error: emailError } = await resend.emails.send(emailPayload);

      if (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the request if email fails, just log it
        // The submission was already saved successfully
        
        return NextResponse.json({
          success: true,
          submissionId: submission.id,
          message: 'Form submitted successfully, but email notification failed',
          warning: 'Email notification could not be sent',
        });
      }

      // If email was sent successfully, delete files from storage to save space
      if (filePaths.length > 0) {
        try {
          const { error: deleteError } = await supabaseAdmin.storage
            .from('form-files')
            .remove(filePaths);

          if (deleteError) {
            console.error('Error deleting files from storage:', deleteError);
            // Don't fail the request, just log the error
          }
        } catch (error) {
          console.error('Error during file cleanup:', error);
          // Don't fail the request, just log the error
        }
      }

      return NextResponse.json({
        success: true,
        submissionId: submission.id,
        message: 'Form submitted successfully',
      });

    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json({
        success: true,
        submissionId: submission.id,
        message: 'Form submitted successfully, but email notification failed',
        warning: 'Email notification could not be sent',
      });
    }

  } catch (error) {
    console.error('Error processing form submission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
