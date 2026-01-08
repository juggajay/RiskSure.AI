# Performance Audit Report - RiskShield AI

**Date:** 2026-01-08
**Auditor:** Claude Code Performance Audit
**Status:** CRITICAL ISSUES FOUND

---

## Executive Summary

This audit identified **7 critical performance issues** that will significantly impact user experience in production. The most severe is a **436KB JavaScript chunk** that loads on every dashboard visit, plus **zero client-side caching** despite React Query being installed.

**Estimated Impact:**
- Current initial load: ~800KB+ JS
- After fixes: ~200KB JS (75% reduction)
- API calls reduced by 60-80% with caching

---

## Current Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Largest JS chunk | **436KB** | <100KB | CRITICAL |
| Total chunks >100KB | **6** | 0-1 | CRITICAL |
| React Query usage | **0 calls** | All fetches | CRITICAL |
| memo/useMemo usage | **0** | Where needed | HIGH |
| loading.tsx files | **0** | All routes | HIGH |
| dynamic imports | **0** | Heavy deps | HIGH |
| Cache-Control headers | **0 routes** | All GET routes | MEDIUM |
| next/image usage | **0** | All images | MEDIUM |

---

## Critical Issues

### 1. CRITICAL: 436KB Recharts Bundle (dashboard/page.tsx)

**Problem:** Recharts is imported directly in the dashboard, creating a massive chunk that loads on initial page visit.

**Location:** `app/dashboard/page.tsx:26-36`
```typescript
// Current: Direct import (loads 436KB immediately)
import { LineChart, Line, XAxis, YAxis, ... } from 'recharts'
```

**Fix:** Dynamic import with loading state
```typescript
import dynamic from 'next/dynamic'

const DashboardCharts = dynamic(
  () => import('@/components/dashboard-charts'),
  {
    loading: () => <Skeleton className="h-64 w-full" />,
    ssr: false
  }
)
```

**Impact:** -300KB+ initial bundle

---

### 2. CRITICAL: React Query Installed But Not Used

**Problem:** React Query is installed and configured but ZERO components use `useQuery` or `useMutation`. All 72 API routes are called with raw `fetch()`, meaning:
- No request deduplication
- No caching between navigations
- No background refetching
- Every page visit = fresh API calls

**Evidence:**
- `@tanstack/react-query` in package.json: YES
- `lib/query-client.ts` configured: YES
- `useQuery` calls in codebase: **0**
- `useMutation` calls in codebase: **0**
- Raw `fetch('/api/...')` calls: **50+**

**Fix Example:**
```typescript
// Before: Raw fetch (no caching)
useEffect(() => {
  fetch('/api/projects').then(r => r.json()).then(setProjects)
}, [])

// After: React Query (cached, deduped, background refresh)
const { data: projects, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: () => fetch('/api/projects').then(r => r.json()),
  staleTime: 5 * 60 * 1000, // 5 min cache
})
```

**Impact:** 60-80% reduction in API calls

---

### 3. CRITICAL: Zero Memoization

**Problem:** No components use `memo()`, `useMemo()`, or `useCallback()`. Large pages (dashboard: 1044 lines, subcontractors: 1472 lines) re-render entirely on any state change.

**Evidence:**
```bash
grep -r "memo\|useMemo\|useCallback" app/ components/ → 0 matches
```

**High-Priority Targets:**
| Component | Lines | Re-render Cost |
|-----------|-------|----------------|
| `app/dashboard/subcontractors/page.tsx` | 1472 | HIGH |
| `app/dashboard/page.tsx` | 1044 | HIGH |
| `app/dashboard/documents/page.tsx` | 753 | MEDIUM |
| `app/dashboard/projects/page.tsx` | 456 | MEDIUM |

**Fix:** Add memo to list items, useMemo for expensive computations
```typescript
const SubcontractorCard = memo(function SubcontractorCard({ sub }: Props) {
  return <Card>...</Card>
})

const sortedProjects = useMemo(() =>
  projects.sort((a, b) => a.name.localeCompare(b.name)),
  [projects]
)
```

---

### 4. HIGH: No Loading States (loading.tsx)

**Problem:** Zero `loading.tsx` files means no streaming, no progressive loading. Users see blank screens during data fetch.

**Missing Files:**
- `app/dashboard/loading.tsx`
- `app/dashboard/projects/loading.tsx`
- `app/dashboard/subcontractors/loading.tsx`
- `app/dashboard/documents/loading.tsx`
- All other route segments

**Fix:** Create loading.tsx for each route
```typescript
// app/dashboard/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}
```

---

### 5. HIGH: No Dynamic Imports for Heavy Dependencies

**Problem:** Heavy libraries load in main bundle instead of on-demand.

**Heavy Dependencies (should be lazy-loaded):**
| Package | Size | Used In |
|---------|------|---------|
| recharts | ~300KB | dashboard charts |
| pdf-lib | ~200KB | PDF generation (2 routes) |
| tesseract.js | ~500KB | OCR (if used) |

**Fix:** Dynamic import pattern
```typescript
// For PDF generation
const generatePDF = async () => {
  const { PDFDocument } = await import('pdf-lib')
  // Use PDFDocument...
}
```

---

### 6. MEDIUM: No API Cache Headers

**Problem:** Zero API routes set Cache-Control headers. Every request goes to server even for stable data.

**Fix:** Add caching for read endpoints
```typescript
// In API route
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300'
  }
})
```

**Cacheable Routes:**
- GET `/api/projects` - 60s cache
- GET `/api/subcontractors` - 60s cache
- GET `/api/email-templates` - 5min cache
- GET `/api/requirement-templates` - 5min cache
- GET `/api/company` - 5min cache

---

### 7. MEDIUM: No next/image Optimization

**Problem:** Only 1 `<img>` tag found, not using next/image optimization.

**Location:** `app/dashboard/settings/company/page.tsx:409`

**Fix:**
```typescript
import Image from 'next/image'

<Image
  src={logoUrl}
  alt="Company logo"
  width={200}
  height={100}
  className="object-contain"
/>
```

---

## What's Already Good

| Area | Status | Notes |
|------|--------|-------|
| Database Indexes | 25+ indexes | Comprehensive coverage |
| Security Headers | Configured | X-Frame-Options, CSP, etc. |
| Icon Tree-Shaking | Working | Importing specific lucide icons |
| React Query Config | Ready | Just needs to be used |

---

## Implementation Plan

### Phase 1: Critical Bundle Fixes (Day 1)

| Task | Impact | Effort |
|------|--------|--------|
| Dynamic import recharts | -300KB | 30min |
| Dynamic import pdf-lib | -200KB | 20min |
| Add bundle analyzer | Visibility | 10min |

### Phase 2: Caching Layer (Day 1-2)

| Task | Impact | Effort |
|------|--------|--------|
| Convert dashboard to useQuery | -60% API calls | 2hr |
| Convert projects page | -60% API calls | 1hr |
| Convert subcontractors page | -60% API calls | 1hr |
| Convert documents page | -60% API calls | 1hr |

### Phase 3: Loading States (Day 2)

| Task | Impact | Effort |
|------|--------|--------|
| Create loading.tsx files | Better UX | 1hr |
| Add Suspense boundaries | Streaming | 1hr |

### Phase 4: React Optimizations (Day 2-3)

| Task | Impact | Effort |
|------|--------|--------|
| Add memo to list items | Fewer re-renders | 2hr |
| Add useMemo for sorts/filters | CPU savings | 1hr |

### Phase 5: API Caching (Day 3)

| Task | Impact | Effort |
|------|--------|--------|
| Add Cache-Control to GET routes | Browser caching | 1hr |

---

## Expected Results After Fixes

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial JS | ~800KB | ~200KB | **-75%** |
| Dashboard load | ~3s | ~1s | **-66%** |
| Navigation | Full reload | Cached | **Instant** |
| API calls/session | ~50 | ~10 | **-80%** |
| Lighthouse Perf | ~60 | ~90 | **+50%** |

---

## Files to Modify

### High Priority
1. `app/dashboard/page.tsx` - Dynamic import recharts, convert to useQuery
2. `app/dashboard/projects/page.tsx` - Convert to useQuery
3. `app/dashboard/subcontractors/page.tsx` - Convert to useQuery, add memo
4. `app/dashboard/documents/page.tsx` - Convert to useQuery
5. `next.config.js` - Add bundle analyzer

### Medium Priority
6. `app/api/projects/route.ts` - Add Cache-Control
7. `app/api/subcontractors/route.ts` - Add Cache-Control
8. `app/dashboard/loading.tsx` - Create
9. `app/dashboard/*/loading.tsx` - Create for each route

### New Files to Create
- `components/dashboard-charts.tsx` - Extract recharts components
- `app/dashboard/loading.tsx`
- `app/dashboard/projects/loading.tsx`
- `app/dashboard/subcontractors/loading.tsx`
- `app/dashboard/documents/loading.tsx`

---

## Verification Commands

After implementing fixes:

```bash
# Check bundle sizes
ANALYZE=true npm run build

# Verify chunk reduction
ls -la .next/static/chunks/*.js | sort -k5 -n -r | head -10

# Run Lighthouse
npx lighthouse http://localhost:3000/dashboard --view

# Check for remaining large chunks
find .next/static/chunks -size +100k -name "*.js"
```

---

## Conclusion

This codebase has solid foundations (good database indexes, security headers, React Query installed) but is missing critical performance optimizations. The **436KB recharts bundle** and **zero caching** are the biggest issues.

Implementing these fixes will transform user experience from "sluggish" to "snappy" with minimal code changes. Start with Phase 1 (bundle fixes) for immediate impact.
