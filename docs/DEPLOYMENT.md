# Deployment Guide

This guide covers deploying RiskShield AI to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Vercel Deployment](#vercel-deployment)
- [Database Setup](#database-setup)
- [Post-Deployment Checklist](#post-deployment-checklist)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

Before deploying, ensure you have:

- [ ] Node.js 18.0.0 or higher
- [ ] npm 9.0.0 or higher
- [ ] A Supabase project (for production database)
- [ ] A Convex project (for real-time features)
- [ ] An OpenAI API key (for AI document verification)
- [ ] (Optional) SendGrid account for emails
- [ ] (Optional) Twilio account for SMS

---

## Deployment Options

### Recommended: Vercel

RiskShield AI is built with Next.js and deploys seamlessly to Vercel:

- Zero configuration needed
- Automatic HTTPS
- Edge functions support
- Built-in analytics
- Preview deployments for PRs

### Alternative Platforms

The application can also be deployed to:

- **Railway** - Simple deployment with database hosting
- **Render** - Full-stack platform with free tier
- **AWS Amplify** - Enterprise-grade with AWS integration
- **Self-hosted** - Any Node.js hosting with reverse proxy

---

## Vercel Deployment

### Step 1: Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Vercel auto-detects Next.js configuration

### Step 2: Configure Environment Variables

In Vercel Dashboard > Settings > Environment Variables, add:

**Required Variables:**

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | Generate: `openssl rand -hex 32` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `OPENAI_API_KEY` | OpenAI API key |

**Optional Variables:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | Your production domain (e.g., `https://app.riskshield.ai`) |
| `SENDGRID_API_KEY` | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | Verified sender email |
| `SENDGRID_FROM_NAME` | Sender display name |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth Client ID |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth Secret |

### Step 3: Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### Step 4: Deploy

Click "Deploy" and wait for the build to complete.

### Step 5: Configure Custom Domain (Optional)

1. Go to Settings > Domains
2. Add your custom domain
3. Configure DNS as instructed
4. Vercel handles SSL automatically

---

## Database Setup

### Development (SQLite)

The application uses SQLite for local development:

```bash
# Database file is created automatically
# Location: ./riskshield.db

# Run migrations
npm run db:migrate

# Check migration status
npm run db:status
```

### Production (Supabase)

For production, use Supabase PostgreSQL:

#### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for database to be provisioned

#### Step 2: Run Database Migrations

Option A: Using Supabase CLI:
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <project-id>

# Push migrations
supabase db push
```

Option B: Manual SQL execution:
1. Go to Supabase Dashboard > SQL Editor
2. Run the migration scripts from `lib/db/migrations/`

#### Step 3: Configure Storage Buckets

1. Go to Storage in Supabase Dashboard
2. Create bucket: `documents`
3. Set policies for authenticated access

#### Step 4: Enable Row Level Security

Ensure RLS is enabled on all tables:

```sql
-- Example: Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies as needed
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);
```

---

## Post-Deployment Checklist

### Security

- [ ] **JWT_SECRET is set** - Not using default development value
- [ ] **HTTPS enabled** - All traffic encrypted
- [ ] **CORS configured** - Only allow your domain
- [ ] **Rate limiting active** - API endpoints protected
- [ ] **Service role key secure** - Not exposed to client
- [ ] **Cookie security** - `secure: true`, `httpOnly: true` in production

### Functionality

- [ ] **Authentication works** - Test login/signup flow
- [ ] **Email sending works** - Verify SendGrid integration
- [ ] **Document upload works** - Test file upload to Supabase Storage
- [ ] **AI verification works** - Upload a test certificate
- [ ] **Real-time updates work** - Verify Convex connection

### Performance

- [ ] **Images optimized** - Using Next.js Image component
- [ ] **API routes fast** - < 200ms response time
- [ ] **Bundle size reasonable** - Check with `npm run build`

### Monitoring

- [ ] **Error tracking set up** - Consider Sentry integration
- [ ] **Analytics configured** - Vercel Analytics or similar
- [ ] **Uptime monitoring** - Use UptimeRobot or similar
- [ ] **Log aggregation** - Vercel logs or external service

---

## Production Verification

After deployment, verify the application is working:

### 1. Health Check

Visit your domain - you should see the login page.

### 2. Authentication Test

```bash
# Test login endpoint
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'
```

### 3. API Health

```bash
# Test API is responding
curl https://your-domain.com/api/health
```

### 4. Manual Testing

1. Sign up for a new account
2. Create a project
3. Add a subcontractor
4. Upload a test document
5. Verify AI processes it correctly

---

## Monitoring & Maintenance

### Log Monitoring

**Vercel Logs:**
- Access via Vercel Dashboard > Deployments > Logs
- Filter by function, time, or error status

**Database Monitoring:**
- Supabase Dashboard > Database > Reports
- Monitor query performance and connections

### Performance Monitoring

**Vercel Analytics:**
```javascript
// Already configured in _app.tsx
import { Analytics } from '@vercel/analytics/react';
```

**Custom Metrics:**
- Monitor API response times
- Track document processing times
- Alert on error spikes

### Database Maintenance

```sql
-- Check table sizes
SELECT
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Vacuum and analyze (run periodically)
VACUUM ANALYZE;
```

### Backup Strategy

**Automated Backups (Supabase):**
- Supabase provides daily backups on Pro plan
- Point-in-time recovery available

**Manual Backup:**
```bash
# Export database
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

---

## Rollback Procedures

### Vercel Rollback

1. Go to Vercel Dashboard > Deployments
2. Find the last working deployment
3. Click the three dots menu
4. Select "Promote to Production"

### Database Rollback

If migrations cause issues:

```bash
# Rollback last migration
npm run db:rollback

# Or manually in SQL
DELETE FROM _migrations WHERE version = 'latest_version';
-- Then run reverse migration SQL
```

### Emergency Procedures

**If the site is down:**

1. Check Vercel status page
2. Check Supabase status page
3. Review recent deployments for changes
4. Roll back to last known good deployment
5. Check error logs for root cause

**If data is corrupted:**

1. Stop all writes (enable maintenance mode)
2. Assess damage scope
3. Restore from backup
4. Re-enable application
5. Notify affected users

---

## Environment-Specific Configurations

### Staging Environment

Create a separate Vercel project for staging:

```bash
# Use different environment variables
JWT_SECRET=staging-secret-xxx
NEXT_PUBLIC_APP_URL=https://staging.riskshield.ai
# Point to staging Supabase project
NEXT_PUBLIC_SUPABASE_URL=https://staging.supabase.co
```

### Feature Flags

For gradual rollouts, use environment variables:

```env
# Enable beta features
NEXT_PUBLIC_ENABLE_NEW_DASHBOARD=true
NEXT_PUBLIC_ENABLE_BULK_UPLOAD=true
```

---

## Scaling Considerations

### Database

- **Connection pooling:** Enable in Supabase for high traffic
- **Read replicas:** Available on Supabase Pro for read-heavy workloads
- **Indexes:** Add indexes for frequently queried columns

### API

- **Edge functions:** Move latency-sensitive APIs to edge
- **Caching:** Implement caching for frequently accessed data
- **Rate limiting:** Already implemented - adjust limits as needed

### Storage

- **CDN:** Supabase Storage includes CDN
- **Image optimization:** Use Next.js Image for automatic optimization
- **Large files:** Consider chunked uploads for documents > 10MB

---

## Troubleshooting

### Build Failures

**Error: "Module not found"**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

**Error: "Type errors"**
```bash
# Run type check locally first
npm run typecheck
```

### Runtime Errors

**"Failed to connect to Supabase"**
- Verify environment variables are set correctly
- Check Supabase project status
- Verify IP restrictions (if configured)

**"JWT verification failed"**
- Ensure JWT_SECRET matches between environments
- Check token expiration
- Verify cookie settings for production

**"OpenAI API error"**
- Check API key is valid
- Verify billing is active
- Check usage limits

### Performance Issues

**Slow API responses:**
1. Check database query performance
2. Review API route complexity
3. Consider caching strategies

**High memory usage:**
1. Check for memory leaks in API routes
2. Review large data processing
3. Consider streaming for large responses

---

## Support

For deployment assistance:

- **Documentation:** See [ENVIRONMENT.md](./ENVIRONMENT.md) for variable reference
- **Issues:** File issues on GitHub repository
- **Vercel Support:** [vercel.com/support](https://vercel.com/support)
- **Supabase Support:** [supabase.com/support](https://supabase.com/support)
