# Foxus Code (灵狐快码) - Digital Forms with QR Codes

Foxus Code is a modern web application that allows users to create digital forms with QR codes for easy sharing. Form submissions are automatically routed via email with attachments.

## Features

- 🔐 **Authentication**: Supabase Auth with email/password authentication
- 📝 **Form Builder**: Drag-and-drop form creation with multiple field types
- 📱 **QR Code Generation**: Instant QR code generation for easy form sharing
- 📧 **Email Notifications**: Automatic email delivery of form submissions with file attachments
- 📎 **File Uploads**: Secure file upload with Supabase Storage and email attachments
- 🔒 **Secure**: Enterprise-grade security with Supabase
- 🎨 **Modern UI**: Beautiful interface built with Shadcn UI and Tailwind CSS
- 🌐 **Internationalization**: Support for Chinese (default) and English languages

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: Shadcn UI + Tailwind CSS
- **Database**: Supabase
- **Authentication**: Supabase Auth
- **Email**: Resend API
- **Validation**: Zod
- **Internationalization**: react-i18next
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Resend account for email delivery

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd foxus-code
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.local` and fill in your credentials:
   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Resend API
   RESEND_API_KEY=your_resend_api_key

   # Supabase Service Role (for file uploads)
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # App Configuration (for local development)
   # Comment out this line as we are using the default localhost:3000
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   > **Note**: The `NEXT_PUBLIC_APP_URL` should be set to `http://localhost:3000` for local development. For production deployment, change this to your actual domain URL (e.g., `https://yourdomain.com`). See the [Deployment Guide](#deployment-guide) section for production environment setup.

   > **Important**: For file upload functionality, you need to set up Supabase Storage. See the [Storage Setup Guide](STORAGE_SETUP.md) for detailed instructions.

4. **Set up Supabase Database**
   
   Run the following SQL in your Supabase SQL editor:
   ```sql
   -- Create users table (if not exists from auth)
   CREATE TABLE IF NOT EXISTS users (
     id UUID PRIMARY KEY,
     email TEXT UNIQUE NOT NULL,
     name TEXT,
     avatar_url TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create forms table
   CREATE TABLE forms (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     description TEXT,
     fields JSONB NOT NULL,
     email_recipient TEXT NOT NULL,
     email_subject TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     is_active BOOLEAN DEFAULT true
   );

   -- Create submissions table
   CREATE TABLE submissions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
     data JSONB NOT NULL,
     files TEXT[] DEFAULT '{}',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     ip_address TEXT
   );

   -- Create indexes for better performance
   CREATE INDEX idx_forms_user_id ON forms(user_id);
   CREATE INDEX idx_forms_created_at ON forms(created_at);
   CREATE INDEX idx_submissions_form_id ON submissions(form_id);
   CREATE INDEX idx_submissions_created_at ON submissions(created_at);

   -- Enable Row Level Security
   ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
   ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

   -- Create RLS policies
   CREATE POLICY "Users can view their own forms" ON forms
     FOR SELECT USING (auth.uid() = user_id);

   CREATE POLICY "Users can create their own forms" ON forms
     FOR INSERT WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can update their own forms" ON forms
     FOR UPDATE USING (auth.uid() = user_id);

   CREATE POLICY "Users can delete their own forms" ON forms
     FOR DELETE USING (auth.uid() = user_id);

   CREATE POLICY "Anyone can submit to active forms" ON submissions
     FOR INSERT WITH CHECK (
       EXISTS (
         SELECT 1 FROM forms 
         WHERE forms.id = form_id AND forms.is_active = true
       )
     );

   CREATE POLICY "Form owners can view submissions" ON submissions
     FOR SELECT USING (
       EXISTS (
         SELECT 1 FROM forms 
         WHERE forms.id = form_id AND forms.user_id = auth.uid()
       )
     );
   ```

5. **Set up Supabase Authentication**
   
   Configure Supabase for proper email confirmation:
   
   **A. Set up Redirect URLs:**
   1. Go to your Supabase Dashboard → Authentication → URL Configuration
   2. Set **Site URL** to:
      - Development: `http://localhost:3000`
      - Production: `https://your-domain.com`
   3. Add **Redirect URLs**:
      - `http://localhost:3000/auth/confirm` (for development)
      - `https://your-domain.com/auth/confirm` (for production)
   
   **B. Update Email Templates:**
   1. Go to Authentication → Email Templates
   2. Select **Confirm signup** template
   3. Replace `{{ .ConfirmationURL }}` with:
      ```
      {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
      ```
   4. Save the template

6. **Set up Resend**
   - Sign up at [Resend](https://resend.com/)
   - Get your API key from the dashboard
   - Verify your domain for production use

7. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard page
│   ├── forms/             # Form management pages
│   └── submit/            # Public form submission pages
├── components/            # React components
│   └── ui/               # Shadcn UI components
├── lib/                  # Utility libraries
│   ├── auth.ts           # Supabase Auth utilities
│   ├── supabase.ts       # Supabase client setup
│   ├── database.types.ts # TypeScript database types
│   └── validations.ts    # Zod validation schemas
└── types/                # TypeScript type definitions
```

## Core Features Implementation Status

- ✅ Authentication (Supabase Auth)
- ✅ Landing Page
- ✅ Dashboard with form list
- ✅ Form Creation (Basic)
- ✅ Form Submission Page
- ✅ Email Notifications with File Attachments
- ✅ File Upload Support (Supabase Storage)
- ⏳ QR Code Generation
- ⏳ Form Analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@foxuscode.com or create an issue in the repository.

## Internationalization (i18n)

Foxus Code supports multiple languages with react-i18next:

### Supported Languages
- **Chinese (zh-CN)** - Default language
- **English (en-US)**

### Language Features
- Automatic language detection from browser settings
- Language preference stored in localStorage
- Dynamic language switching without page reload
- Language switcher component in header
- Fallback to Chinese if translation is missing

### Adding New Languages

1. Create a new translation file in `src/locales/[language-code].json`
2. Add the language to the resources in `src/lib/i18n.ts`
3. Add the language option to the `LanguageSwitcher` component

### Translation Structure
```json
{
  "common": { /* Common UI elements */ },
  "auth": { /* Authentication pages */ },
  "navigation": { /* Navigation items */ },
  "landing": { /* Landing page content */ },
  "dashboard": { /* Dashboard content */ },
  "forms": { /* Form builder and management */ },
  "submissions": { /* Form submissions */ },
  "profile": { /* User profile */ },
  "errors": { /* Error messages */ },
  "success": { /* Success messages */ }
}
```

## Deployment Guide

This guide covers deploying Foxus Code to production environments. We'll cover multiple deployment options and all necessary production configurations.

### Prerequisites for Production

Before deploying, ensure you have:
- ✅ Supabase project configured for production
- ✅ Resend account with verified domain
- ✅ Custom domain (optional but recommended)
- ✅ Environment variables ready
- ✅ Database schema deployed

### Option 1: Deploy to Vercel (Recommended)

Vercel is the easiest option for Next.js applications and offers excellent performance.

#### Step 1: Prepare Your Repository
```bash
# Ensure your code is pushed to GitHub/GitLab/Bitbucket
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

#### Step 2: Deploy to Vercel
1. **Sign up/Login to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Connect your GitHub/GitLab/Bitbucket account

2. **Import Your Project**
   - Click "New Project"
   - Select your repository
   - Vercel will auto-detect it's a Next.js project

3. **Configure Environment Variables**
   Add these in Vercel dashboard under "Environment Variables":
   ```bash
   # Supabase Production
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
   
   # Resend Production
   RESEND_API_KEY=your_production_resend_key
   
   # Supabase Service Role (for file uploads)
   SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
   
   # App Configuration
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application
   - You'll get a `.vercel.app` domain immediately

#### Step 3: Custom Domain (Optional)
1. In Vercel dashboard, go to "Domains"
2. Add your custom domain
3. Configure DNS records as instructed by Vercel
4. SSL certificate will be automatically provisioned

### Option 2: Deploy to Netlify

#### Step 1: Build Configuration
Create `netlify.toml` in your project root:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Step 2: Deploy to Netlify
1. **Sign up/Login to Netlify**
   - Visit [netlify.com](https://netlify.com)
   - Connect your Git provider

2. **Import Your Project**
   - Click "New site from Git"
   - Select your repository
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `.next`

3. **Environment Variables**
   Add in Netlify dashboard under "Environment variables":
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
   RESEND_API_KEY=your_production_resend_key
   NEXT_PUBLIC_APP_URL=https://your-domain.netlify.app
   ```

### Option 3: Self-Hosted with Docker

#### Step 1: Create Dockerfile
Create `Dockerfile` in project root:
```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### Step 2: Create docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
```

#### Step 3: Nginx Configuration
Create `nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Production Environment Setup

#### 1. Supabase Production Configuration

**Create Production Project:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project for production
3. Run the database schema from the README
4. Configure authentication providers
5. Set up Row Level Security policies

**Configure Authentication for Production:**
1. **URL Configuration:**
   - Go to Authentication → URL Configuration
   - Set **Site URL** to: `https://your-production-domain.com`
   - Add **Redirect URLs**:
     - `https://your-production-domain.com/auth/confirm`
     - `https://your-production-domain.com/auth/callback`

2. **Email Templates:**
   - Go to Authentication → Email Templates
   - Update **Confirm signup** template:
     - Replace `{{ .ConfirmationURL }}` with:
       ```
       {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
       ```
   - Save all template changes

**Production Settings:**
```sql
-- Enable additional security
ALTER DATABASE postgres SET log_statement = 'all';

-- Set up connection pooling
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Configure for production performance
ALTER SYSTEM SET work_mem = '256MB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
```

#### 2. Resend Production Setup

**Domain Verification:**
1. Add your domain in Resend dashboard
2. Add DNS records for domain verification
3. Set up DKIM, SPF, and DMARC records
4. Test email delivery

**Production Email Templates:**
```bash
# Create production-ready email templates
# Customize subject lines and content for your brand
```

#### 3. Environment Variables Checklist

Create `.env.production`:
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key_here

# Email Service
RESEND_API_KEY=re_your_production_api_key_here

# Supabase Service Role (for file uploads)
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Optional: Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Optional: Error Tracking
SENTRY_DSN=https://your-sentry-dsn-here
```

### Performance Optimizations

#### 1. Next.js Configuration
Update `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['@/components/ui'],
  },
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  // Enable standalone output for Docker
  output: 'standalone',
}

module.exports = nextConfig
```

#### 2. Database Optimization
```sql
-- Add database indexes for better performance
CREATE INDEX CONCURRENTLY idx_forms_user_id_active ON forms(user_id, is_active);
CREATE INDEX CONCURRENTLY idx_submissions_form_created ON submissions(form_id, created_at);

-- Enable query performance insights
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### Monitoring and Logging

#### 1. Application Monitoring
- **Vercel**: Built-in analytics and monitoring
- **Self-hosted**: Consider Grafana + Prometheus
- **Error tracking**: Sentry integration

#### 2. Database Monitoring
- Monitor Supabase dashboard for:
  - Query performance
  - Connection usage
  - Storage usage
  - API usage limits

#### 3. Email Delivery Monitoring
- Monitor Resend dashboard for:
  - Delivery rates
  - Bounce rates
  - Spam complaints

### Security Considerations

#### 1. Environment Security
```bash
# Rotate API keys regularly
# Use different keys for staging/production
# Enable API key restrictions where possible
```

#### 2. Database Security
```sql
-- Regular security updates
-- Monitor for suspicious queries
-- Set up connection limits
-- Enable audit logging
```

#### 3. Application Security
- Enable CSRF protection
- Implement rate limiting
- Regular dependency updates
- Security headers configuration

### CI/CD Pipeline Setup

#### GitHub Actions Example
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Post-Deployment Checklist

After deployment, verify:
- ✅ Application loads correctly
- ✅ Authentication works
- ✅ Email confirmation links work correctly (not redirecting to localhost)
- ✅ Form creation functions
- ✅ QR code generation works
- ✅ Email notifications are sent
- ✅ Database connections are stable
- ✅ SSL certificate is active
- ✅ Domain redirects work
- ✅ Error tracking is functional
- ✅ Performance monitoring is active

### Backup and Recovery

#### 1. Database Backups
```bash
# Supabase provides automatic backups
# Set up additional manual backup routine if needed
# Test restore procedures regularly
```

#### 2. Application Code
```bash
# Maintain Git repository backups
# Tag production releases
# Document rollback procedures
```

### Scaling Considerations

As your application grows:
1. **Database**: Upgrade Supabase plan or consider read replicas
2. **CDN**: Implement CDN for static assets
3. **Caching**: Add Redis for session/data caching
4. **Load Balancing**: Multiple application instances
5. **File Storage**: Consider cloud storage for file uploads

### Troubleshooting Common Issues

#### Authentication Issues

**Email confirmation redirecting to localhost:**
1. Check Supabase Dashboard → Authentication → URL Configuration
2. Ensure **Site URL** is set to your production domain
3. Verify **Redirect URLs** include your production domain
4. Update email templates to use the correct confirmation URL format
5. Redeploy your application with the correct `NEXT_PUBLIC_APP_URL`

**Email confirmations not working:**
1. Verify email template configuration in Supabase
2. Check that redirect URLs are properly configured
3. Ensure the `/auth/confirm` route is deployed
4. Test with a new signup to verify the flow

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

#### Database Connection Issues
```bash
# Check Supabase connection limits
# Verify environment variables
# Test connection from deployment environment
```

#### Email Delivery Issues
```bash
# Verify Resend API key
# Check domain verification status
# Review email templates and recipients
```

For additional support during deployment, refer to the platform-specific documentation or create an issue in the repository.
