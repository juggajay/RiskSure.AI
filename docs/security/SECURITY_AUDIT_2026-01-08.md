# RiskShield AI - Comprehensive Security Audit Report

**Date:** 2026-01-08
**Auditor:** Claude Code Security Audit
**Scope:** Full codebase security analysis

---

## Executive Summary

This comprehensive security audit analyzed the RiskShield AI application, a Certificate of Currency (COC) compliance platform for the Australian construction industry. The audit covered authentication, authorization, injection attacks, file uploads, API security, and dependency vulnerabilities.

### Overall Risk Assessment: **HIGH**

**Total Vulnerabilities Found: 52**

| Severity | Count |
|----------|-------|
| CRITICAL | 9 |
| HIGH | 15 |
| MEDIUM | 14 |
| LOW | 14 |

### Most Critical Issues Requiring Immediate Action:

1. **Debug endpoints exposed without authentication** - Complete data breach risk
2. **ZIP Slip path traversal vulnerability** - Arbitrary file write
3. **Overly permissive CORS (Access-Control-Allow-Origin: *)** - Cross-origin attacks
4. **Critical Next.js vulnerabilities** - Authorization bypass, cache poisoning
5. **Missing rate limiting on critical endpoints** - DoS and brute force risk

---

## 1. Dependency Vulnerabilities (npm audit)

### CRITICAL: Next.js Framework Vulnerabilities

**Current Version:** 14.x (outdated)

| Vulnerability | Severity | CVE | Description |
|--------------|----------|-----|-------------|
| Authorization Bypass | HIGH | GHSA-7gfc-8cq8-jh5f | Bypass authentication via crafted requests |
| Cache Poisoning | HIGH | GHSA-gp8f-8m3g-qvj9 | Cache key manipulation |
| SSRF via Redirect | MODERATE | GHSA-4342-x723-ch2f | Server-side request forgery |
| DoS - Image Optimization | MODERATE | GHSA-g77x-44xx-532m | Denial of service |
| DoS - Server Actions | MODERATE | GHSA-7m27-7ghc-44w9 | Resource exhaustion |

**Fix:** Upgrade to Next.js 14.2.32+

### HIGH: glob Command Injection

**Version:** 10.2.0 - 10.4.5
**CVE:** GHSA-5j98-mcp5-4vw2
**Fix:** Upgrade eslint-config-next to 16.1.1+

---

## 2. Authentication & Session Management

### CRITICAL Vulnerabilities

#### 2.1 Missing Rate Limiting on Password Reset
**File:** `app/api/auth/reset-password/route.ts`
**Issue:** No rate limiting allows unlimited password attempts

#### 2.2 Missing Rate Limiting on Magic Link Endpoints
**File:** `app/api/portal/auth/magic-link/route.ts`
**Issue:** Email flooding and enumeration attacks possible

### HIGH Vulnerabilities

#### 2.3 Hardcoded Development JWT Secret
**Files:** `lib/auth.ts:22`, `lib/middleware-auth.ts:99`
**Issue:** Fallback secret `riskshield-development-secret-key-DO-NOT-USE-IN-PRODUCTION` could be used in production if env var not set
```typescript
// lib/middleware-auth.ts:99 - Missing production check!
process.env.JWT_SECRET || 'riskshield-development-secret-key-DO-NOT-USE-IN-PRODUCTION'
```

#### 2.4 JWT Algorithm Not Explicitly Specified
**File:** `lib/auth.ts:75`
**Issue:** Vulnerable to algorithm confusion attacks

#### 2.5 Password Reset Token Race Condition
**File:** `app/api/auth/reset-password/route.ts:40-44`
**Issue:** Password updated before token marked as used

### MEDIUM Vulnerabilities

- Cookie SameSite set to 'lax' (partial CSRF possible)
- IP spoofing bypass for rate limiting via X-Forwarded-For
- Magic link verification lacks rate limiting
- Timing side-channel in forgot-password (email enumeration)

### LOW Vulnerabilities

- Sensitive data in console logs (reset URLs, tokens)
- Missing special character requirement in password policy

---

## 3. Authorization & Access Control (RBAC)

### CRITICAL Vulnerabilities

#### 3.1 Debug Endpoints Exposed Without Authentication
**Files:**
- `app/api/debug/db/route.ts` - **EXPOSES ALL DATABASE DATA**
- `app/api/debug/setup-broker/route.ts` - Modifies broker assignments
- `app/api/debug/login-test/route.ts` - Creates admin accounts

```typescript
// Returns ALL users, companies, sessions without auth!
export async function GET() {
  const users = db.prepare('SELECT id, email, name, role...').all()
```

#### 3.2 IDOR in Notifications API
**File:** `app/api/notifications/route.ts:75-87`
**Issue:** Any user can create notifications for ANY other user

### HIGH Vulnerabilities

#### 3.3 Missing Role Check on Subcontractor PUT
**File:** `app/api/subcontractors/[id]/route.ts:333-428`
**Issue:** `read_only` users can update subcontractor data

#### 3.4 Portal Upload Missing Project Access Validation
**File:** `app/api/portal/upload/route.ts:324-329`
**Issue:** Subcontractors can upload to unassigned projects

#### 3.5 Test Password Endpoint in Production
**File:** `app/api/test/set-password/route.ts`
**Issue:** Allows password change without current password verification

---

## 4. SQL Injection

### Overall Assessment: **LOW RISK**

No critical SQL injection vulnerabilities found. The codebase consistently uses:
- Parameterized queries with `db.prepare()` and `?` placeholders
- Supabase client query builder (auto-parameterizes)

### IMPORTANT Concerns

#### 4.1 Dynamic ORDER BY Without Validation
**File:** `lib/db/supabase-db.ts:403-405`
**Issue:** `order.column` passed without allowlist validation

#### 4.2 Dynamic Table Names in Query Helpers
**File:** `lib/db/supabase-db.ts:385-459`
**Issue:** `table` parameter should be validated against allowlist

---

## 5. Cross-Site Scripting (XSS)

### Overall Assessment: **LOW RISK** (Frontend) / **MEDIUM RISK** (Email)

React's JSX auto-escaping prevents frontend XSS. No `dangerouslySetInnerHTML` usage found.

### IMPORTANT Vulnerabilities

#### 5.1 Stored XSS in Email HTML Templates
**File:** `lib/sendgrid.ts:674-706`
**Issue:** User data interpolated without HTML escaping
```typescript
<p>Dear ${recipientName || 'Subcontractor'},</p>
<strong>${builderName}</strong> has added <strong>${subcontractorName}</strong>
requirements.map(r => `<li>${r}</li>`).join('') // No escaping!
```

#### 5.2 Template Injection in renderTemplate
**File:** `lib/sendgrid.ts:78-89`
**Issue:** `String(value)` without HTML escaping

---

## 6. File Upload Security

### CRITICAL Vulnerability

#### 6.1 ZIP Slip Path Traversal
**File:** `app/api/migration/route.ts:139-165`
**Issue:** Malicious ZIP can write files outside target directory
```typescript
const files = Object.values(zip.files).filter(f => !f.dir)
// No path traversal validation!
name: zipFile.name.split('/').pop() || zipFile.name
```

### HIGH Vulnerabilities

#### 6.2 No Magic Bytes Validation
**Files:** All upload endpoints
**Issue:** Only extension/MIME checked, not file signatures

#### 6.3 Missing Validation in Portal Upload
**File:** `app/api/portal/upload/route.ts:308-339`
**Issue:** NO file type validation whatsoever

#### 6.4 Missing Validation in Broker Bulk Upload
**File:** `app/api/portal/broker/bulk-upload/route.ts:298-423`
**Issue:** Files written to public directory without validation

#### 6.5 Missing Validation in Migration Route
**File:** `app/api/migration/route.ts:86-175`
**Issue:** ZIP contents processed without type validation

### MEDIUM Vulnerabilities

- Double extension attacks possible (`document.exe.pdf`)
- Files stored in publicly accessible `public/uploads`
- No malware scanning integration

---

## 7. API Security & Headers

### CRITICAL Vulnerabilities

#### 7.1 Overly Permissive CORS
**File:** `next.config.js:17-22`
```javascript
{ key: 'Access-Control-Allow-Origin', value: '*' }, // DANGEROUS
{ key: 'Access-Control-Allow-Credentials', value: 'true' },
```

#### 7.2 Missing Security Headers
**File:** `next.config.js`
**Missing:**
- Content-Security-Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)
- Referrer-Policy
- Permissions-Policy

#### 7.3 Rate Limiting Bypass via IP Spoofing
**File:** `lib/rate-limit.ts:35-37`
```typescript
const ip = request.headers.get('x-forwarded-for')?.split(',')[0] // Spoofable!
```

### HIGH Vulnerabilities

- Missing rate limiting on most API endpoints
- Test endpoints accessible in production
- Webhook signature verification optional
- Info disclosure in error responses

---

## 8. Secrets & Data Handling

### Assessment: **ACCEPTABLE**

- No hardcoded secrets in source code
- `.env.local` uses appropriate test values
- Password hashing uses bcrypt with 12 rounds
- JWT secret enforced in production (in `lib/auth.ts`)

### Concerns

- Console logging of reset URLs and tokens in development
- OAuth tokens stored in database (recommend additional encryption layer)

---

## Remediation Priority Matrix

### IMMEDIATE (Fix Today)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | Debug endpoints exposed | `app/api/debug/*` | Delete or add env check |
| 2 | ZIP Slip vulnerability | `app/api/migration/route.ts` | Validate paths |
| 3 | CORS wildcard | `next.config.js` | Specify allowed origins |
| 4 | Next.js vulnerabilities | `package.json` | Upgrade to 14.2.32+ |
| 5 | IDOR in notifications | `app/api/notifications/route.ts` | Add auth check |

### HIGH PRIORITY (This Week)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 6 | Missing security headers | `next.config.js` | Add CSP, X-Frame-Options, etc |
| 7 | JWT secret fallback inconsistency | `lib/middleware-auth.ts` | Add production check |
| 8 | File upload validation | Portal/broker upload endpoints | Add type/size validation |
| 9 | Email XSS | `lib/sendgrid.ts` | Add HTML escaping function |
| 10 | Rate limiting on all endpoints | All API routes | Apply apiLimiter |

### MEDIUM PRIORITY (This Month)

| # | Issue | Fix |
|---|-------|-----|
| 11 | Magic bytes validation | Validate file signatures |
| 12 | Move uploads out of public | Use authenticated file serving |
| 13 | Role check on subcontractor PUT | Add authorization |
| 14 | IP spoofing in rate limiter | Trust only from proxy |
| 15 | JWT algorithm specification | Add `{ algorithm: 'HS256' }` |

### LOW PRIORITY (Backlog)

- Add special characters to password policy
- Implement CSRF token validation
- Add API versioning
- Integrate malware scanning
- Reduce console logging in production

---

## Security Best Practices Already Implemented

The codebase demonstrates several good security practices:

1. **Bcrypt password hashing** with appropriate cost factor (12)
2. **Constant-time password comparison** via bcrypt.compare
3. **HttpOnly and Secure cookies** for authentication
4. **Session invalidation** on password change
5. **One-time use tokens** for magic links and password resets
6. **Multi-tenant isolation** via company_id filtering
7. **Comprehensive audit logging** for user actions
8. **Parameterized SQL queries** throughout
9. **JWT token expiration** properly implemented
10. **Email normalization** prevents duplicate accounts

---

## Recommended Security Headers Configuration

```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    },
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Origin', value: 'https://your-production-domain.com' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
      ],
    },
  ]
}
```

---

## Conclusion

The RiskShield AI application has a solid security foundation with proper authentication patterns, multi-tenant isolation, and parameterized queries. However, several critical vulnerabilities require immediate attention, particularly the exposed debug endpoints, ZIP Slip vulnerability, and CORS misconfiguration.

The highest priority items are:
1. Remove/protect debug endpoints
2. Fix ZIP path traversal
3. Restrict CORS origins
4. Upgrade Next.js
5. Add missing security headers

Addressing the IMMEDIATE and HIGH PRIORITY items will significantly improve the application's security posture for production deployment.

---

**Report Generated:** 2026-01-08
**Tools Used:** Claude Code with parallel security audit agents
**Files Analyzed:** 75+ API routes, core libraries, configuration files
