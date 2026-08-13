# Stripe Plan Enforcement — Design

Date: 2026-08-13

## Context

`SideNav.jsx` displays a "X of 3 forms created" progress bar, and `app/dashboard/upgrade/page.jsx` links out to static Stripe Payment Links (`buy.stripe.com/test_...`), sourced from `app/_data/PricingPlan.jsx`. Neither is wired to anything:

- Nothing blocks a free user from creating a 4th, 5th, or 14th form.
- Nothing tells the app when a Stripe payment succeeds — the payment link opens a checkout tab and nothing comes back.
- There is no concept of "paid" anywhere in the codebase.

This spec covers making that limit real: a user gets 3 forms free, then must pay (via Stripe subscription) to create more, and the app finds out when they've paid.

**Explicitly out of scope** (separate, independent pieces of work):
- The `/dashboard/analytics` page, which doesn't exist yet (404 today).
- Fixing the pre-existing issue where `config/index.js` exposes the full Postgres connection string to the browser via `NEXT_PUBLIC_DRIZZLE_DATABASE_URL` (every `"use client"` component that imports `db` ships that credential in its JS bundle). This predates this feature and affects the whole app, not just form creation. Flagged to the user; not addressed here.

## Architecture

```
User clicks "Upgrade" on a plan
        │
        ▼
POST /api/stripe/checkout  { priceId }
        │  creates a Stripe Checkout Session (mode: subscription)
        │  client_reference_id = clerk user id
        │  subscription_data.metadata.clerkUserId = clerk user id
        ▼
redirect to session.url (Stripe-hosted checkout)
        │
        ▼  user pays
Stripe fires: customer.subscription.created / .updated / .deleted
        │
        ▼
POST /api/stripe/webhook (signature-verified)
        │  reads subscription.metadata.clerkUserId + subscription.status
        │  sets Clerk publicMetadata.plan = 'paid' | 'free'
        ▼
Clerk user record updated — visible immediately via useUser() everywhere


User clicks "Create Form", types description
        │
        ▼
POST /api/forms/create  { description }
        │  reads publicMetadata.plan for the authed user
        │  if not 'paid': count existing JsonForms rows for this user;
        │                 if >= 3 → 403 { error: 'limit_reached' }
        │  else: call Gemini, insert JsonForms row
        ▼
{ id: newFormId }  →  CreateForm.jsx redirects to /edit-form/<id>
                       or shows the upgrade prompt inline
```

No new database tables. Plan status lives entirely on the Clerk user object (`publicMetadata.plan`), not in Postgres — it's already the source of truth for identity, and every page already has it via `useUser()`/server-side `auth()`.

## Components

### 1. `app/api/stripe/checkout/route.js` (new)

POST, requires an authenticated Clerk user (`auth()` from `@clerk/nextjs/server`). Body: `{ priceId }` — one of the existing `priceId` values in `PricingPlan.jsx`.

Creates a Stripe Checkout Session:
- `mode: 'subscription'`
- `line_items: [{ price: priceId, quantity: 1 }]`
- `client_reference_id`: Clerk user ID
- `subscription_data: { metadata: { clerkUserId } }` — stamps the ID onto the Subscription object itself, not just the session, so later lifecycle events (renewal, cancellation) carry it with no lookup needed
- `customer_email`: the user's Clerk email (prefills checkout)
- `success_url` / `cancel_url`: back to `/dashboard/upgrade`

Returns `{ url: session.url }`. If `STRIPE_SECRET_KEY` is missing, returns 500 (same pattern as the existing Gemini key check in the AI route).

### 2. `app/api/stripe/webhook/route.js` (new)

POST, no Clerk auth (this is Stripe calling us) — instead verifies the `stripe-signature` header against `STRIPE_WEBHOOK_SECRET` using the raw request body. Rejects with 400 on bad signature.

Handles three event types, all sharing one rule:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

For each: read `subscription.metadata.clerkUserId` and `subscription.status`. Call Clerk's backend `clerkClient.users.updateUserMetadata(clerkUserId, { publicMetadata: { plan } })` where `plan = ['active', 'trialing'].includes(status) ? 'paid' : 'free'`.

This single rule naturally covers: first payment (created, active), renewal (updated, active), payment failure (updated, past_due/unpaid → free), and cancellation (deleted → free). No separate `invoice.*` event handling needed.

Ignore all other event types (return 200 without action, per Stripe's recommendation to ack anything you don't handle).

### 3. `app/api/forms/create/route.js` (new)

POST, requires an authenticated Clerk user. Body: `{ description }` (the text from `CreateForm.jsx`'s textarea).

1. Reads `publicMetadata.plan` for the current user.
2. If `plan !== 'paid'`: `db.select().from(JsonForms).where(eq(CreatedBy, email))`, and if `result.length >= 3`, respond `403 { error: 'limit_reached' }`.
3. Otherwise: call `generateFormJson(description)` (new shared helper, see below), then `db.insert(JsonForms).values(...)`.
4. Respond `{ id: newFormId }`. On Gemini failure, respond 500 with the error message (existing pattern from `/api/ai/generate`).

This is the actual enforcement boundary — the count check and the insert happen server-side, in the same request, so there's no window for a client to skip the check and insert directly (beyond the pre-existing, out-of-scope issue of the DB credential being exposed at all — see Context).

Known small gap: the count-check and insert aren't wrapped in a DB transaction, so two simultaneous "create form" requests from the same free user at count 2 could both pass the check and both insert, landing them at 4. Given this app's traffic level, that race isn't worth a transaction today — note it here in case it ever needs revisiting.

### 4. `lib/gemini.js` (new — extracted, not duplicated)

`generateFormJson(prompt)` — the `GoogleGenerativeAI` call currently living in `app/api/ai/generate/route.js`, moved here so `/api/forms/create` can call it directly instead of doing an internal HTTP round-trip to another of our own routes.

**Consequence**: once `/api/forms/create` is the only thing that needs to talk to Gemini, `app/api/ai/generate/route.js` and `config/AiModal.js` (the client-side fetch wrapper) have no remaining callers — delete both.

### 5. `lib/utils.js` (add one pure function)

```js
export function shouldBlockFormCreation(plan, formCount) {
  return plan !== 'paid' && formCount >= 3;
}
```

Pulling this one-line decision out as a pure function makes it independently testable without mocking Clerk/Stripe/the DB — this is the "known ceiling" (0/1/N thresholds, non-obvious `>=`) worth a runnable check.

### 6. `CreateForm.jsx` changes

Replace the direct `AiChat.sendMessage(...)` + `db.insert(JsonForms)` calls with a single `fetch('/api/forms/create', { method: 'POST', body: JSON.stringify({ description: value }) })`.

- On success (`{ id }`): `route.push('/edit-form/' + id)`, same as today.
- On `403 { error: 'limit_reached' }`: swap the dialog's `<Textarea>` + Create button for a message ("You've reached the 3-form limit on the free plan") and a link to `/dashboard/upgrade`, replacing the Create button.
- On other errors: existing toast-free `console.error`-style handling stays as-is (out of scope to redesign general error UX here).

### 7. `PricingPlan.jsx` + `app/dashboard/upgrade/page.jsx` changes

Drop the `link` field (no longer used — static Payment Links are replaced). Keep `priceId`, `price`, `duration`.

The "Get Started" `<a href={item.link}>` becomes a button with an `onClick` that POSTs `{ priceId: item.priceId }` to `/api/stripe/checkout`, then `window.location.href = data.url`.

### 8. `SideNav.jsx` change

When `useUser()`'s `publicMetadata.plan === 'paid'`, show "Unlimited plan" instead of the `X/3` progress bar and count text — otherwise a paying user still sees a stuck-at-100%-or-over bar with no indication anything changed.

## Setup required (user action, not code)

- Add to `.env.local`: `STRIPE_SECRET_KEY` (test mode), `STRIPE_WEBHOOK_SECRET` (from `stripe listen` output during local dev, or the dashboard for deployed environments).
- Add `stripe` npm package (server-side SDK).
- Local webhook testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`, then `stripe trigger checkout.session.completed` / use a real test-mode checkout with card `4242 4242 4242 4242`.
- Existing `PricingPlan.jsx` `priceId` values are assumed to already exist in the connected Stripe account (they look like real test-mode price IDs already) — if they don't resolve, checkout session creation will fail with a clear Stripe error.

## Error handling summary

| Failure | Response |
|---|---|
| No Clerk session on `/api/stripe/checkout` or `/api/forms/create` | 401 |
| Missing `STRIPE_SECRET_KEY` | 500, logged server-side |
| Bad/missing webhook signature | 400, request rejected before any DB/Clerk write |
| Unrecognized webhook event type | 200, no-op (Stripe requirement) |
| Free user at limit | 403 `{ error: 'limit_reached' }` — not a 500, this is an expected, handled state |
| Gemini call fails | 500 `{ error: message }`, no DB insert happens (existing behavior preserved) |

## Testing

- `lib/utils.js`: extend with a `test_shouldBlockFormCreation` (or equivalent minimal assert-based check) covering: free user at 0/2/3 forms, paid user at 10 forms.
- Manual end-to-end: Stripe CLI webhook forwarding + test-mode checkout with the standard test card, confirming `publicMetadata.plan` flips after payment and reverts after `stripe trigger customer.subscription.deleted`.
- Manual: free account hits limit at form #4, sees the upgrade message; paid account is unaffected past 3.
