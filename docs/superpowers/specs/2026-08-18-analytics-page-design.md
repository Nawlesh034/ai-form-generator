# Analytics Page — Design

Date: 2026-08-18

## Context

`SideNav.jsx` has always linked to `/dashboard/analytics`, but no page exists there — clicking it 404s. This spec covers building that page.

## Scope

Show the signed-in user an overview of their own forms and response activity: top-line totals, plus a per-form breakdown of response counts. No charts, no new dependency — the data's job here is magnitude at a glance (stat tiles), not trend visualization, so a chart isn't warranted (per the dataviz skill's "sometimes the answer is not a chart" guidance).

**Explicitly out of scope:**
- Charts / time-series visualization (nothing in the schema supports real timestamps anyway — `CreatedAt` is stored as a `DD/MM/yyyy` varchar, not a timestamp)
- Deep-linking from a per-form row to that form's specific responses on `/dashboard/responses` (that page doesn't support a form-scoped view today; rows link to the page generally)
- Plan-gating analytics behind paid — the sidebar link has never been gated, and this isn't part of the free/paid distinction

## Data flow

Client-side fetching, matching the existing pattern in `FormList.jsx`/`SideNav.jsx` (this app already reads Drizzle/Neon directly from `"use client"` components — no new API route is introduced for this read-only, user-scoped display):

1. `db.select().from(JsonForms).where(eq(JsonForms.CreatedBy, email))` — the signed-in user's forms
2. `db.select().from(userResponse).where(inArray(userResponse.refForm, formIds))` — all responses across those forms, in one query (avoids an N+1 query per form)
3. Reduce the response list into a `Map<formId, count>` in JS, join with the form list

## Layout

**Stat tiles row** (3 tiles), reusing the existing `border shadow-sm rounded-lg p-4` card style already used by `FormListItem.jsx`/`FormListResponse.jsx` — no new visual language introduced:
- Total Forms
- Total Responses
- Avg Responses / Form — `totalResponses / totalForms`, rounded to 1 decimal; renders `0` (not `NaN`/`Infinity`) when `totalForms === 0`

**Per-form breakdown list**, sorted by response count descending: each row shows form title + response count, and links to `/dashboard/responses` (general navigation to the existing responses page, not a form-specific deep link — see Scope).

**Empty state**: if the user has zero forms, render "Create your first form to see analytics" instead of the stat tiles/list.

**Loading state**: a simple "Loading analytics..." message while the two queries are in flight — proportionate to how lightly other dashboard pages handle loading today (no skeleton UI).

## Error handling

Both queries are wrapped in the same try/catch/finally pattern already used in `FormList.jsx` and `SideNav.jsx` — on failure, show an inline error message in place of the stat tiles, `console.error` the underlying error, and don't crash the page.

## Testing

Manual only — this app has no test suite (`npm run build` is the existing verification bar used throughout this project's other recent work). Manually verify: zero-forms empty state, a form with zero responses (tile/list still renders `0`, no `NaN`), and the sort order with multiple forms at different response counts.
