import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Function to sanitize filename for Supabase Storage
function sanitizeFileName(fileName: string): string {
  // Extract file extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
  
  // Convert to ASCII-safe characters only
  const sanitizedName = name
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\-_]/g, '_') // Replace any non-word characters with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single underscore
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 50); // Limit length
  
  // Sanitize extension
  const sanitizedExtension = extension
    .replace(/[^\w.]/g, '') // Keep only word characters and dots
    .toLowerCase();
  
  // Ensure we have a valid filename
  const finalName = sanitizedName || 'file';
  
  return `${finalName}${sanitizedExtension}`;
}

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType } = await request.json();
    
    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    // Check for environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create admin client for storage operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Sanitize the filename to be ASCII-safe
    const sanitizedFileName = sanitizeFileName(fileName);
    
    // Generate unique file path with sanitized filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2);
    const filePath = `form-attachments/${timestamp}_${randomString}_${sanitizedFileName}`;

    // console.log('Upload request details:');
    // console.log('- Original filename:', fileName);
    // console.log('- Sanitized filename:', sanitizedFileName);
    // console.log('- Full file path:', filePath);
    // console.log('- File type:', fileType);

    // Validate the file path format
    if (filePath.length > 1024) {
      return NextResponse.json(
        { error: 'File path too long' },
        { status: 400 }
      );
    }

    // Create signed upload URL
    const { data, error } = await supabaseAdmin.storage
      .from('form-files')
      .createSignedUploadUrl(filePath, {
        upsert: false
      });

    if (error) {
      console.error('Storage error details:');
      console.error('- Error message:', error.message);
      console.error('- Full error:', JSON.stringify(error, null, 2));
      
      return NextResponse.json(
        { 
          error: 'Failed to create upload URL', 
          details: error.message
        },
        { status: 500 }
      );
    }

    console.log('Upload URL created successfully');
    
    return NextResponse.json({
      uploadUrl: data.signedUrl,
      path: data.path,
      token: data.token,
      originalFileName: fileName,
      sanitizedFileName: sanitizedFileName
    });

  } catch (error) {
    console.error('Upload URL error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
