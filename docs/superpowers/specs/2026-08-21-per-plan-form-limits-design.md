# Per-Plan Form Limits — Design

Date: 2026-08-21

## Context

The Stripe plan-enforcement feature (see `docs/superpowers/specs/2026-08-13-stripe-plan-enforcement-design.md`) currently treats `publicMetadata.plan` as a binary `'paid' | 'free'` flag — paying at all removes the 3-form cap entirely, regardless of which plan (Monthly $150 vs Yearly $1500) was purchased. This spec replaces that with per-plan numeric caps: 100 forms for Monthly, 1000 for Yearly, 3 for free.

## Scope

**In scope:** storing and enforcing a numeric `formLimit` per subscriber, sourced from which Stripe price they purchased; updating the sidebar to show real progress against that limit instead of a flat "Unlimited plan" label.

**Out of scope:** a backfill/migration script for any account that already has `plan: 'paid'` from testing before this change — see Migration below.

## Design

### Source of truth for limits

`app/_data/PricingPlan.jsx` gains a `formLimit` field per entry and exports a new `FREE_FORM_LIMIT = 3` constant, so the free-tier number exists in exactly one place instead of being duplicated across the webhook, the enforcement route, and the sidebar:

```js
export const FREE_FORM_LIMIT = 3;

export default [
  { price: 150.00, priceId: "price_1PhanYRp7dn1RYDQSDtkCRmB", duration: 'Monthly', formLimit: 100 },
  { price: 1500.00, priceId: "price_1PhbBnRp7dn1RYDQJ48N07Bx", duration: 'Yearly', formLimit: 1000 },
]
```

### Enforcement logic simplifies to one numeric comparison

`lib/planLimit.mjs`'s `shouldBlockFormCreation` currently special-cases `plan === 'paid'` as an unconditional bypass. It becomes a plain limit check — the caller is responsible for resolving the right limit (3, 100, or 1000) before calling it:

```js
export function shouldBlockFormCreation(limit, formCount) {
  return formCount >= limit;
}
```

### Webhook resolves and stores the actual limit

`app/api/stripe/webhook/route.js` currently derives `plan` purely from `subscription.status`. It now also reads which price was purchased (`subscription.items.data[0]?.price?.id`) and looks it up against `PricingPlan` to find that plan's `formLimit`:

- If the subscription is active/trialing AND the price matches a known plan: `plan = 'paid'`, `formLimit` = that plan's limit (100 or 1000).
- Otherwise (canceled, past-due, unpaid, OR an active subscription on a price that doesn't match anything in `PricingPlan`): `plan = 'free'`, `formLimit = FREE_FORM_LIMIT`.

The unrecognized-price case is deliberately fail-safe — an unmatched price falls back to the free cap rather than granting an undefined or unlimited one.

### The enforcement boundary reads the resolved limit

`app/api/forms/create/route.js` currently reads `user?.publicMetadata?.plan` and passes it straight into `shouldBlockFormCreation`. It now reads `user?.publicMetadata?.formLimit`, falling back to `FREE_FORM_LIMIT` if unset:

```js
const limit = user?.publicMetadata?.formLimit ?? FREE_FORM_LIMIT;
if (shouldBlockFormCreation(limit, existing.length)) { ... }
```

This fallback is what makes the migration gap (see below) safe rather than broken — a missing `formLimit` degrades to the free cap, not to zero or to unlimited.

### Sidebar shows real progress for every tier

`app/dashboard/_components/SideNav.jsx` currently branches on `publicMetadata.plan === 'paid'` to show either a flat "Unlimited plan" label or the free-tier progress bar. That branch is removed. There is now one code path: `limit = user?.publicMetadata?.formLimit ?? FREE_FORM_LIMIT`, and the existing progress bar/text renders `{formList.length} Out of {limit} File Created` for every user, free or paid.

## Migration

Any account that already has `plan: 'paid'` set from testing before this change has no `formLimit` in its metadata yet. Per the enforcement route's fallback above, such an account reads as the free cap (3) until its next webhook event (a renewal, or a manually triggered `stripe trigger customer.subscription.updated`) re-syncs its metadata to include `formLimit`. This is test-mode Stripe data, not a production user base, so no backfill script is included — call this out if that assumption is wrong.

## Testing

Manual only — this project has no test suite (`npm run build` is the existing verification bar). Manually verify:
- A free user is blocked at 3 forms (existing behavior, must still hold).
- `lib/planLimit.mjs`'s self-check (`node lib/planLimit.mjs`) still passes with the simplified signature.
- A paid Monthly test subscription (via `stripe trigger customer.subscription.created` with the Monthly price, or a real test checkout) results in `formLimit: 100` in Clerk and the sidebar showing "X Out of 100".
- A paid Yearly test subscription results in `formLimit: 1000`.
- Canceling a subscription (`stripe trigger customer.subscription.deleted`) reverts `formLimit` to 3.
