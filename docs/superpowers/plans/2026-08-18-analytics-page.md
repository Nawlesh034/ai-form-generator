# Analytics Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/dashboard/analytics` page — currently a 404 despite `SideNav.jsx` linking to it — showing stat tiles and a per-form response breakdown for the signed-in user's own forms.

**Architecture:** A single client-side page component, matching the existing pattern used by `FormList.jsx`/`SideNav.jsx`/`responses/page.jsx`: two Drizzle queries run directly from the browser (this app already trusts client-side DB access for read-only, user-scoped display — no new API route needed), reduced in JS into per-form counts.

**Tech Stack:** Next.js 14 App Router, Drizzle ORM (`inArray`, `eq`), Clerk (`useUser`), existing `extractJson` helper from `lib/utils.js`.

Reference spec: `docs/superpowers/specs/2026-08-18-analytics-page-design.md`

---

### Task 1: Build the Analytics page

**Files:**
- Create: `app/dashboard/analytics/page.jsx`

This is a single self-contained page component — no separate hook, since (per the design) nothing else consumes this data-fetching logic. Splitting it out would be premature abstraction for a one-consumer query.

- [ ] **Step 1: Write the page**

```jsx
// app/dashboard/analytics/page.jsx
"use client"
import { db } from '@/config'
import { JsonForms, userResponse } from '@/config/schema'
import { extractJson } from '@/lib/utils'
import { useUser } from '@clerk/nextjs'
import { eq, inArray } from 'drizzle-orm'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

function Analytics() {
  const { user } = useUser()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const getAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const email = user?.primaryEmailAddress?.emailAddress
      const formRows = await db.select().from(JsonForms).where(eq(JsonForms.CreatedBy, email))

      const formIds = formRows.map((f) => f.id)
      const responseRows = formIds.length
        ? await db.select().from(userResponse).where(inArray(userResponse.refForm, formIds))
        : []

      const countByFormId = new Map()
      responseRows.forEach((r) => {
        countByFormId.set(r.refForm, (countByFormId.get(r.refForm) || 0) + 1)
      })

      const withCounts = formRows
        .map((f) => ({
          id: f.id,
          title: extractJson(f.jsonForm)?.formTitle || 'Untitled Form',
          responseCount: countByFormId.get(f.id) || 0,
        }))
        .sort((a, b) => b.responseCount - a.responseCount)

      setForms(withCounts)
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError('Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    user && getAnalytics()
  }, [user])

  const totalForms = forms.length
  const totalResponses = forms.reduce((sum, f) => sum + f.responseCount, 0)
  const avgResponses = totalForms > 0 ? (totalResponses / totalForms).toFixed(1) : 0

  if (loading) {
    return <div className='p-10'>Loading analytics...</div>
  }

  if (error) {
    return <div className='p-10 text-red-500'>{error}</div>
  }

  if (totalForms === 0) {
    return (
      <div className='p-10'>
        <h2 className='font-bold text-3xl mb-2'>Analytics</h2>
        <p className='text-gray-500'>Create your first form to see analytics.</p>
      </div>
    )
  }

  return (
    <div className='p-10'>
      <h2 className='font-bold text-3xl mb-6'>Analytics</h2>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
        <div className='border shadow-sm rounded-lg p-4'>
          <h3 className='text-sm text-gray-500'>Total Forms</h3>
          <p className='text-3xl font-bold'>{totalForms}</p>
        </div>
        <div className='border shadow-sm rounded-lg p-4'>
          <h3 className='text-sm text-gray-500'>Total Responses</h3>
          <p className='text-3xl font-bold'>{totalResponses}</p>
        </div>
        <div className='border shadow-sm rounded-lg p-4'>
          <h3 className='text-sm text-gray-500'>Avg Responses / Form</h3>
          <p className='text-3xl font-bold'>{avgResponses}</p>
        </div>
      </div>

      <h3 className='font-semibold text-lg mb-3'>Responses by Form</h3>
      <div className='space-y-2'>
        {forms.map((form) => (
          <Link
            key={form.id}
            href='/dashboard/responses'
            className='flex justify-between items-center border shadow-sm rounded-lg p-4 hover:bg-gray-50'
          >
            <span>{form.title}</span>
            <span className='font-semibold'>{form.responseCount} Response{form.responseCount !== 1 ? 's' : ''}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Analytics
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: build succeeds, and the route table includes `ƒ /dashboard/analytics`

- [ ] **Step 3: Manual verification**

This project has no test suite — verify by running the app (`npm run dev`) and signing in as a user with forms:

1. Navigate to `/dashboard/analytics` via the SideNav "Analytics" link — confirm it no longer 404s.
2. Confirm the three stat tiles show correct numbers: Total Forms matches your form count, Total Responses matches the sum of responses across all your forms, Avg Responses / Form is `Total Responses / Total Forms` to 1 decimal.
3. Confirm the per-form list is sorted by response count descending, and clicking a row navigates to `/dashboard/responses`.
4. If any of your forms have zero responses, confirm that row shows `0 Responses` (not blank, not an error).
5. If you can test with an account that has zero forms (or temporarily point at one), confirm the empty state ("Create your first form to see analytics.") renders instead of the tiles/list — no `NaN` or `Infinity` anywhere.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/analytics/page.jsx
git commit -m "Add /dashboard/analytics page with stat tiles and per-form response breakdown"
```

---

## Self-review notes

- Spec coverage: data flow (two queries + `inArray`, no N+1), stat tiles (3, existing card style), per-form list (sorted desc, links to `/dashboard/responses`), empty state, loading state, error handling (try/catch/finally, `console.error`, inline message) — all present in Step 1's code.
- No new dependency added, no new API route, no hook extracted for a single consumer — matches the spec's explicit scope boundaries.
- `extractJson` (from `lib/utils.js`) and the `db`/`JsonForms`/`userResponse` imports match their actual exported names in this codebase, verified against `config/schema.js` and `lib/utils.js`.
