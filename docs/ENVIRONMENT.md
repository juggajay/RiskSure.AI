# Environment Variables Guide

This document describes all environment variables used by RiskShield AI.

## Quick Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the required variables (see sections below)

3. Start the development server:
   ```bash
   npm run dev
   ```

## Variable Reference

### Core Application

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | No | Base URL for the application. Used for generating links in emails and redirects. Defaults to `http://localhost:3000` in development. |

**Example:**
```env
# Development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production
NEXT_PUBLIC_APP_URL=https://app.riskshield.ai
```

---

### Authentication

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes (production)** | Secret key for signing JWT tokens. Must be at least 32 characters. |

**Security Requirements:**
- Minimum 32 characters
- Use cryptographically random value in production
- Never share or commit this value

**Generate a secure secret:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Max 256) }))
```

**Development behavior:**
- In development mode (`NODE_ENV !== 'production'`), a fallback secret is used if not set
- In production, the application will fail to start without a valid `JWT_SECRET`

---

### Supabase (Database & Auth)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase service role key (server-side only) |

**Getting these values:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to Settings > API
4. Copy the URL and keys

**Example:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Security notes:**
- `NEXT_PUBLIC_*` variables are exposed to the browser
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security - keep it secret!

---

### Convex (Real-time Backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | **Yes** | Your Convex deployment URL |

**Getting this value:**
1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Copy the deployment URL

**Example:**
```env
NEXT_PUBLIC_CONVEX_URL=https://your-project-123.convex.cloud
```

---

### OpenAI (AI Document Verification)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | **Yes** | OpenAI API key for GPT-4 Vision document analysis |

**Getting this value:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (you can only see it once!)

**Example:**
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Cost considerations:**
- Document verification uses GPT-4 Vision
- Each document analysis costs approximately $0.01-0.05
- Set up usage limits in your OpenAI dashboard

---

### SendGrid (Email)

| Variable | Required | Description |
|----------|----------|-------------|
| `SENDGRID_API_KEY` | No | SendGrid API key for sending emails |
| `SENDGRID_FROM_EMAIL` | No | Sender email address. Default: `noreply@riskshield.ai` |
| `SENDGRID_FROM_NAME` | No | Sender display name. Default: `RiskShield AI` |
| `SENDGRID_WEBHOOK_VERIFICATION_KEY` | No | Key for verifying webhook callbacks |

**Getting these values:**
1. Go to [SendGrid Settings](https://app.sendgrid.com/settings/api_keys)
2. Create a new API key with "Mail Send" permission
3. Verify your sender domain/email

**Example:**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=compliance@yourcompany.com
SENDGRID_FROM_NAME=YourCompany Compliance
```

**Development behavior:**
- If not configured, emails are logged to console instead of sent
- Set `SENDGRID_API_KEY=test` or `SENDGRID_API_KEY=dev` to use mock mode

---

### Twilio (SMS)

| Variable | Required | Description |
|----------|----------|-------------|
| `TWILIO_ACCOUNT_SID` | No | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | No | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | No | Twilio phone number for sending SMS |

**Getting these values:**
1. Go to [Twilio Console](https://www.twilio.com/console)
2. Find your Account SID and Auth Token on the dashboard
3. Get a phone number from Phone Numbers > Manage > Buy a number

**Example:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15551234567
```

**Development behavior:**
- If not configured, SMS are logged to console instead of sent
- Set `TWILIO_ACCOUNT_SID=test` or prefix with `AC_TEST` for mock mode

---

### Google OAuth (Gmail Integration)

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | No | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth 2.0 Client Secret |
| `GOOGLE_REDIRECT_URI` | No | OAuth callback URL. Auto-generated if not set. |

**Setting up Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Set authorized redirect URIs to include your callback URL

**Example:**
```env
GOOGLE_CLIENT_ID=123456789-xxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://app.riskshield.ai/api/integrations/google/callback
```

---

### Microsoft OAuth (Outlook/M365 Integration)

| Variable | Required | Description |
|----------|----------|-------------|
| `MICROSOFT_CLIENT_ID` | No | Microsoft Azure AD Application ID |
| `MICROSOFT_CLIENT_SECRET` | No | Microsoft Azure AD Client Secret |
| `MICROSOFT_REDIRECT_URI` | No | OAuth callback URL. Auto-generated if not set. |

**Setting up Microsoft OAuth:**
1. Go to [Azure Portal - App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps)
2. Register a new application
3. Add redirect URI and generate client secret

**Example:**
```env
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MICROSOFT_REDIRECT_URI=https://app.riskshield.ai/api/integrations/microsoft/callback
```

---

## Environment-Specific Configuration

### Development

For local development, create `.env.local`:

```env
# Minimal development setup
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=development-only-secret-do-not-use-in-production-32chars

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Convex (required)
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud

# OpenAI (required for AI features)
OPENAI_API_KEY=sk-proj-xxx

# Email/SMS mocked - set to 'test' for mock mode
SENDGRID_API_KEY=test
TWILIO_ACCOUNT_SID=test
```

### Production

For production deployments:

```env
# Production configuration
NEXT_PUBLIC_APP_URL=https://app.riskshield.ai
JWT_SECRET=<64-char-cryptographically-random-string>

# Supabase production project
NEXT_PUBLIC_SUPABASE_URL=https://production.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Convex production deployment
NEXT_PUBLIC_CONVEX_URL=https://production.convex.cloud

# OpenAI
OPENAI_API_KEY=sk-proj-xxx

# SendGrid (real sending)
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=compliance@yourcompany.com
SENDGRID_FROM_NAME=YourCompany Compliance

# Twilio (real sending)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+15551234567

# OAuth (if using email integrations)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
```

---

## Security Best Practices

1. **Never commit secrets** - Add `.env.local` to `.gitignore` (already configured)

2. **Use different values per environment** - Development, staging, and production should have separate credentials

3. **Rotate secrets regularly** - Especially `JWT_SECRET` if you suspect compromise

4. **Limit API key permissions** - Create keys with minimum required permissions

5. **Monitor usage** - Set up alerts in OpenAI, SendGrid, and Twilio dashboards

6. **Use secret managers in production** - Consider using Vercel's environment variable encryption or similar

---

## Troubleshooting

### "JWT_SECRET is required in production"

The application refuses to start without a valid JWT secret in production mode.

**Solution:** Set `JWT_SECRET` environment variable with at least 32 characters.

### "Failed to initialize Supabase client"

Supabase credentials are missing or invalid.

**Solution:** Verify all three Supabase variables are set correctly.

### Emails not sending in development

This is expected behavior - emails are logged to console in development.

**Solution:** To test real email sending, use a valid `SENDGRID_API_KEY`.

### OAuth redirects failing

The redirect URI doesn't match what's configured in the OAuth provider.

**Solution:** Ensure `GOOGLE_REDIRECT_URI` or `MICROSOFT_REDIRECT_URI` matches exactly what's configured in the respective developer console.

---

## See Also

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [Supabase Documentation](https://supabase.com/docs)
- [Convex Documentation](https://docs.convex.dev)
- [SendGrid Documentation](https://docs.sendgrid.com)
- [Twilio Documentation](https://www.twilio.com/docs)
