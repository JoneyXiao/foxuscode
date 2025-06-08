# Production Deployment Checklist

## Prerequisites ✅

### 1. Supabase Production Setup
- [ ] Create new Supabase project for production
- [ ] Run database migration (SQL from README.md)
- [ ] Configure RLS policies
- [ ] Note down production URL and anon key
- [ ] Enable domain restrictions (optional)

### 2. Resend Setup  
- [ ] Create Resend account
- [ ] Verify your domain
- [ ] Get production API key
- [ ] Test email delivery

### 3. Domain Setup
- [ ] Register domain (optional)
- [ ] Configure DNS
- [ ] Plan SSL certificate

## Environment Variables for Production

### Vercel Deployment
Set these in Vercel Dashboard → Project Settings → Environment Variables:

```bash
# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key

# Resend Production  
RESEND_API_KEY=re_your_production_api_key

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional: Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Netlify Deployment
Set these in Netlify Dashboard → Site Settings → Environment Variables:
(Same variables as above)

### Docker/Self-Hosted
Use environment injection or Docker secrets:

```dockerfile
# docker-compose.yml
environment:
  - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
  - RESEND_API_KEY=${RESEND_API_KEY}
  - NEXT_PUBLIC_APP_URL=${APP_URL}
```

## Security Checklist 🔒

- [ ] **Never** commit production secrets to Git
- [ ] Use platform-specific environment variable management
- [ ] Enable domain restrictions in Supabase
- [ ] Set up monitoring and alerts
- [ ] Configure rate limiting
- [ ] Enable SSL/HTTPS
- [ ] Review RLS policies

## Deployment Steps

### Option 1: Vercel (Recommended)
1. Push code to GitHub/GitLab
2. Connect repository to Vercel
3. Add environment variables in dashboard
4. Deploy

### Option 2: Netlify
1. Push code to GitHub/GitLab  
2. Connect repository to Netlify
3. Add environment variables in dashboard
4. Deploy

### Option 3: Docker
1. Build Docker image
2. Set environment variables
3. Deploy to your infrastructure

## Post-Deployment Verification ✅

- [ ] Application loads correctly
- [ ] Authentication works
- [ ] Form creation functions
- [ ] QR code generation works
- [ ] Email notifications sent
- [ ] Database connections stable
- [ ] SSL certificate active
- [ ] All routes accessible

## Environment File Structure

```
your-project/
├── .env.local          # ✅ Development (not committed)
├── .env.example        # ✅ Template (can commit)
├── .gitignore          # ✅ Must include .env*
└── README.md           # ✅ Setup instructions
```

## What NOT to do ❌

- ❌ Don't create `.env.production`
- ❌ Don't commit any `.env` files with real secrets
- ❌ Don't use development keys in production
- ❌ Don't hardcode secrets in code
- ❌ Don't skip domain verification for email

## Troubleshooting

### Build Failures
```bash
# Check environment variables are set
npm run build

# Verify all required variables exist
echo $NEXT_PUBLIC_SUPABASE_URL
```

### Database Connection Issues
- Verify Supabase URL and key
- Check RLS policies
- Confirm network access

### Email Issues  
- Verify Resend API key
- Check domain verification
- Test email delivery

## Support

For deployment issues:
1. Check platform-specific documentation
2. Verify environment variable setup
3. Review application logs
4. Test individual components

---

✅ **Remember**: Use your deployment platform's environment variable management instead of `.env.production` files!
