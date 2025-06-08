# File Upload Setup Guide

This guide will help you set up Supabase Storage and the required environment variables for file upload functionality.

## 1. Supabase Storage Setup

### Create Storage Bucket

1. **Go to Supabase Dashboard**
   - Navigate to your project: https://supabase.com/dashboard/projects
   - Click on "Storage" in the left sidebar

2. **Create a new bucket**
   - Click "New bucket"
   - Bucket name: `form-files`
   - **Important**: Make sure this is **NOT** a public bucket for security
   - Click "Create bucket"

3. **Set up Storage Policies (RLS)**
   
   Go to the SQL Editor and run this SQL to set up proper security policies:

   ```sql
   -- Create storage policy for form file uploads
    CREATE POLICY "Allow public uploads to form-files bucket" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'form-files');

    -- Create policy to allow reading files for email processing
    CREATE POLICY "Allow service role to read form-files" ON storage.objects
    FOR SELECT USING (bucket_id = 'form-files');

    -- Create policy to allow service role to delete files after email sent
    CREATE POLICY "Allow service role to delete form-files" ON storage.objects
    FOR DELETE USING (bucket_id = 'form-files');
   ```

## 2. Environment Variables Setup

### Required Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Existing variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
RESEND_API_KEY=your_resend_api_key

# NEW: Required for file upload functionality
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Getting the Service Role Key

1. **Go to Supabase Dashboard**
   - Navigate to your project settings
   - Click on "API" in the left sidebar

2. **Copy the Service Role Key**
   - Find the "Service role" section
   - Copy the "service_role" key (NOT the anon key)
   - **Important**: This key has admin privileges, keep it secret!

3. **Add to Environment**
   - Add `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here` to your `.env.local`
   - **Never** commit this key to version control
   - **Never** use this key in client-side code

## 3. Production Deployment

### Vercel
Add the `SUPABASE_SERVICE_ROLE_KEY` environment variable in your Vercel dashboard:
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add `SUPABASE_SERVICE_ROLE_KEY` with your service role key

### Netlify
Add the environment variable in Netlify:
1. Go to your Netlify site settings
2. Navigate to Environment Variables
3. Add `SUPABASE_SERVICE_ROLE_KEY` with your service role key

### Other Platforms
Add the `SUPABASE_SERVICE_ROLE_KEY` environment variable using your platform's preferred method.

## 4. Security Considerations

### File Upload Security
- Files are uploaded to a private bucket
- Only temporary signed URLs are used for uploads
- Files are automatically deleted after email is sent
- File size and type restrictions are enforced

### Environment Security
- Service role key is kept server-side only
- Regular rotation of API keys is recommended
- Use different keys for development/staging/production

## 5. Testing the Setup

### Test File Upload
1. Create a form with a file field
2. Submit the form with an attachment
3. Check that the email is received with the attachment
4. Verify that files are deleted from storage after email is sent

### Troubleshooting

#### "Failed to create upload URL" Error
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Verify the bucket `form-files` exists
- Check storage policies are applied

#### "Storage error" in logs
- Verify bucket name is exactly `form-files`
- Check your service role key has storage permissions
- Ensure storage policies are correctly set up

#### Email attachments not working
- Check Resend API key is valid
- Verify files are being uploaded to storage
- Check server logs for download errors

## 6. File Constraints

### Default Constraints (customizable in form builder)
- Maximum file size: 30MB per file
- Supported file types: Configurable per field
- Multiple files: Supported

### Resend Limits
- Total attachment size per email: 40MB
- Individual file size: No specific limit (within total)

## 7. Cost Considerations

### Supabase Storage
- Free tier: 1GB storage, 2GB bandwidth
- Files are automatically deleted after email send to save space
- Monitor storage usage in Supabase dashboard

### Resend
- Free tier: 3,000 emails/month
- Attachments count toward size limits
- Monitor email usage in Resend dashboard

---

**Need Help?**
If you encounter issues, check the browser console and server logs for detailed error messages. Most issues are related to missing environment variables or incorrect bucket setup.
