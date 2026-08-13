# Stripe Plan Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "3 free forms, then upgrade" limit real — a Stripe subscription payment flips a Clerk `publicMetadata.plan` flag, and form creation is blocked server-side once a free user has 3 forms.

**Architecture:** Two new Stripe-facing API routes (`/api/stripe/checkout` creates a Checkout Session, `/api/stripe/webhook` reacts to subscription lifecycle events by writing `publicMetadata.plan` via Clerk's backend SDK), plus one new API route (`/api/forms/create`) that becomes the sole, server-side path for creating a form — it's the actual enforcement boundary, replacing the client-side `db.insert` currently in `CreateForm.jsx`.

**Tech Stack:** Next.js 14 App Router route handlers, `stripe` Node SDK, `@clerk/nextjs/server` (`auth`, `currentUser`, `clerkClient`), existing Drizzle/Neon `db`.

Reference spec: `docs/superpowers/specs/2026-08-13-stripe-plan-enforcement-design.md`

---

### Task 1: Add the Stripe SDK dependency

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm)

- [ ] **Step 1: Install the package**

Run: `npm install stripe`

- [ ] **Step 2: Verify it landed in package.json**

Run: `grep '"stripe"' package.json`
Expected: a line like `"stripe": "^..."` under `dependencies`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add stripe SDK dependency"
```

---

### Task 2: Add the plan-limit decision as a pure, self-checking function

**Files:**
- Create: `lib/planLimit.mjs`

This is the one piece of actual decision logic in the whole feature (free vs. blocked), so it gets an isolated, runnable check — no test framework needed, just Node's built-in `assert`. It's a standalone `.mjs` file (not folded into `lib/utils.js`) specifically so it can be executed directly with plain `node` for the check below; `lib/utils.js` uses ESM `export` syntax but this project's `package.json` has no `"type": "module"`, so plain Node can't run it standalone (and adding `"type": "module"` would break `tailwind.config.js`, which uses `module.exports`). Next's bundler resolves `.mjs` fine via the existing `@/*` path alias.

- [ ] **Step 1: Write the function with its self-check**

```js
// lib/planLimit.mjs
import assert from 'node:assert';
import { pathToFileURL } from 'node:url';

export function shouldBlockFormCreation(plan, formCount) {
  return plan !== 'paid' && formCount >= 3;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.strictEqual(shouldBlockFormCreation('free', 0), false);
  assert.strictEqual(shouldBlockFormCreation('free', 2), false);
  assert.strictEqual(shouldBlockFormCreation('free', 3), true);
  assert.strictEqual(shouldBlockFormCreation('free', 10), true);
  assert.strictEqual(shouldBlockFormCreation(undefined, 3), true);
  assert.strictEqual(shouldBlockFormCreation('paid', 10), false);
  console.log('planLimit self-check passed');
}
```

- [ ] **Step 2: Run it**

Run: `node lib/planLimit.mjs`
Expected: `planLimit self-check passed`

- [ ] **Step 3: Commit**

```bash
git add lib/planLimit.mjs
git commit -m "Add shouldBlockFormCreation with a runnable self-check"
```

---

### Task 3: Extract the Gemini call into a shared helper

**Files:**
- Create: `lib/gemini.js`

This lifts the model-call logic currently in `app/api/ai/generate/route.js` so the new `/api/forms/create` route (Task 6) can call it directly, without an internal HTTP round-trip to another of our own routes. The old route and its client wrapper (`config/AiModal.js`) get deleted once nothing calls them (Task 8).

- [ ] **Step 1: Write the helper**

```js
// lib/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "gemini-2.5-flash";

export async function generateFormJson(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is missing in process.env");
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

- [ ] **Step 2: Verify the project still builds**

Run: `npm run build`
Expected: build succeeds (this file isn't wired up to anything yet, so this just confirms no syntax errors)

- [ ] **Step 3: Commit**

```bash
git add lib/gemini.js
git commit -m "Extract Gemini call into a shared helper"
```

---

### Task 4: Stripe Checkout Session route

**Files:**
- Create: `app/api/stripe/checkout/route.js`

- [ ] **Step 1: Write the route**

```js
// app/api/stripe/checkout/route.js
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";

export async function POST(req) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is missing in process.env");
    return NextResponse.json({ error: "Server config error: STRIPE_SECRET_KEY missing" }, { status: 500 });
  }

  const body = await req.json();
  const priceId = body?.priceId;
  if (!priceId) {
    return NextResponse.json({ error: "No priceId provided" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const user = await currentUser();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      customer_email: user?.primaryEmailAddress?.emailAddress,
      subscription_data: {
        metadata: { clerkUserId: userId },
      },
      success_url: `${baseUrl}dashboard/upgrade?success=true`,
      cancel_url: `${baseUrl}dashboard/upgrade?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session error:", err);
    return NextResponse.json({ error: err?.message || "Could not start checkout" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/api/stripe/checkout/route.js
git commit -m "Add Stripe Checkout Session route"
```

---

### Task 5: Stripe webhook route

**Files:**
- Create: `app/api/stripe/webhook/route.js`

- [ ] **Step 1: Write the route**

```js
// app/api/stripe/webhook/route.js
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

const SUBSCRIPTION_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing in process.env");
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (SUBSCRIPTION_EVENTS.includes(event.type)) {
    const subscription = event.data.object;
    const clerkUserId = subscription.metadata?.clerkUserId;

    if (!clerkUserId) {
      console.warn(`Stripe subscription ${subscription.id} has no clerkUserId metadata`);
    } else {
      const plan = ["active", "trialing"].includes(subscription.status) ? "paid" : "free";
      const client = await clerkClient();
      await client.users.updateUserMetadata(clerkUserId, {
        publicMetadata: { plan },
      });
    }
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/api/stripe/webhook/route.js
git commit -m "Add Stripe webhook route syncing plan status to Clerk metadata"
```

---

### Task 6: Form-creation route (the enforcement boundary)

**Files:**
- Create: `app/api/forms/create/route.js`

- [ ] **Step 1: Write the route**

```js
// app/api/forms/create/route.js
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import moment from "moment";
import { db } from "@/config";
import { JsonForms } from "@/config/schema";
import { generateFormJson } from "@/lib/gemini";
import { shouldBlockFormCreation } from "@/lib/planLimit.mjs";

const PROMPT_TEMPLATE = `Please provide a form in JSON format based on the following structure:
- **formTitle**: The title of the form (e.g., "User Registration")
- **formSubheading**: A short description or instruction for the form (e.g., "Please fill out the form to register.")
- **formFields**: An array of fields for the form, each field should include the following attributes:
  - **fieldName**: The unique identifier for the field (e.g., "firstName", "email", "gender").
  - **fieldLabel**: The label text to display above or beside the field (e.g., "First Name", "Email Address", "Gender").
  - **placeholder**: The placeholder text for the input field (e.g., "Enter your first name", "Enter your email address").
  - **fieldType**: The type of input field (e.g., "text", "email", "date", "select").
  - **required**: Whether the field is mandatory (true or false).
  - **options**: (Optional) Only for fields of type "select". This should be an array of options for the user to choose from (e.g., ["Male", "Female", "Other"]).

### Example Format:
- Field Name: \`"firstName"\`, Field Label: \`"First Name"\`, Placeholder: \`"Enter your first name"\`, Field Type: \`"text"\`, Required: \`true\`
- Field Name: \`"email"\`, Field Label: \`"Email Address"\`, Placeholder: \`"Enter your email address"\`, Field Type: \`"email"\`, Required: \`true\`
- Field Name: \`"gender"\`, Field Label: \`"Gender"\`, Placeholder: \`"Select your gender"\`, Field Type: \`"select"\`, Options: \`["Male", "Female", "Other"]\`, Required: \`true\`

### Example JSON Output:
{
  "formTitle": "User Registration",
  "formSubheading": "Please fill out the form to register.",
  "formFields": [
    {
      "fieldName": "firstName",
      "fieldLabel": "First Name",
      "placeholder": "Enter your first name",
      "fieldType": "text",
      "required": true
    },
    {
      "fieldName": "email",
      "fieldLabel": "Email Address",
      "placeholder": "Enter your email address",
      "fieldType": "email",
      "required": true
    },
    {
      "fieldName": "gender",
      "fieldLabel": "Gender",
      "placeholder": "Select your gender",
      "fieldType": "select",
      "options": ["Male", "Female", "Other"],
      "required": true
    }
  ]
}

Please ensure the output follows the above structure exactly to maintain consistency in the form fields.`;

export async function POST(req) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const plan = user?.publicMetadata?.plan;

  const existing = await db.select().from(JsonForms).where(eq(JsonForms.CreatedBy, email));

  if (shouldBlockFormCreation(plan, existing.length)) {
    return NextResponse.json({ error: "limit_reached" }, { status: 403 });
  }

  const body = await req.json();
  const description = body?.description;
  if (!description) {
    return NextResponse.json({ error: "No description provided" }, { status: 400 });
  }

  let jsonForm;
  try {
    jsonForm = await generateFormJson("Description:" + description + PROMPT_TEMPLATE);
  } catch (err) {
    console.error("Form generation error:", err);
    return NextResponse.json({ error: err?.message || "AI generation failed" }, { status: 500 });
  }

  const inserted = await db.insert(JsonForms).values({
    jsonForm,
    CreatedBy: email,
    CreatedAt: moment().format('DD/MM/yyyy'),
  }).returning({ id: JsonForms.id });

  return NextResponse.json({ id: inserted[0].id });
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/api/forms/create/route.js
git commit -m "Add server-side form-creation route enforcing the free-plan limit"
```

---

### Task 7: Wire CreateForm.jsx to the new route

**Files:**
- Modify: `app/_components/CreateForm.jsx` (full rewrite — the prompt template and the direct `AiChat`/`db` calls move out)

- [ ] **Step 1: Replace the file contents**

```jsx
"use client"
import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog"
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function CreateForm() {
    const[isOpen,setOpen]=useState(false)
    const[value ,setvalue]=useState();
    const[loading, setloading]=useState(false)
    const[limitReached, setLimitReached]=useState(false)
    const route=useRouter();

    const getValue=async()=>{
        setloading(true);
        const res = await fetch('/api/forms/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: value }),
        });
        const data = await res.json();
        if (res.status === 403 && data?.error === 'limit_reached') {
          setLimitReached(true);
        } else if (data?.id) {
          route.push('/edit-form/'+data.id)
        }
        setloading(false);
    }

  return (
    <>
    <Button onClick={()=>{setOpen(true); setLimitReached(false);}}>+Create Form</Button>
    <Dialog open={isOpen} >

  <DialogContent>
    <DialogHeader>
      <DialogTitle>Write To Create Form?</DialogTitle>
      <DialogDescription>
        <div>
      {limitReached ? (
        <div>
          <p>You've reached the 3-form limit on the free plan.</p>
          <Link href='/dashboard/upgrade' className='text-primary underline'>Upgrade to create more forms</Link>
        </div>
      ) : (
        <Textarea onChange={(e)=>setvalue(e.target.value)}  placeholder='write description of your form'/>
      )}
        <div className='py-2  gap-2 flex'>
        <Button variant="destructive" onClick={()=>setOpen(false)}>Cancel</Button>
        {!limitReached &&
        <Button disabled={loading} onClick={getValue}>{loading ? <Loader2 className='animate-spin' /> : 'Create'}</Button>
        }
        </div>
      </div>
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
</>
  )
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/_components/CreateForm.jsx
git commit -m "CreateForm: use server-side /api/forms/create instead of direct DB/AI calls"
```

---

### Task 8: Delete the now-unused AI proxy route and client wrapper

**Files:**
- Delete: `app/api/ai/generate/route.js`
- Delete: `config/AiModal.js`

After Task 7, nothing imports `config/AiModal.js`, and nothing calls `app/api/ai/generate`. Confirm before deleting.

- [ ] **Step 1: Confirm no remaining references**

Run: `grep -rn "AiModal\|api/ai/generate" app components lib config --include='*.js' --include='*.jsx'`
Expected: no output (only the two files being deleted contain these strings, and grep excludes them by not existing after deletion — for now expect zero *callers*, i.e. no `import` lines)

- [ ] **Step 2: Delete both files**

```bash
git rm app/api/ai/generate/route.js config/AiModal.js
```

- [ ] **Step 3: Verify the project builds**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git commit -m "Remove unused AI proxy route now that form creation calls Gemini server-side"
```

---

### Task 9: Dynamic Stripe checkout on the Upgrade page

**Files:**
- Modify: `app/_data/PricingPlan.jsx`
- Modify: `app/dashboard/upgrade/page.jsx`

- [ ] **Step 1: Drop the unused `link` field and dead `moment` import from PricingPlan.jsx**

```js
// app/_data/PricingPlan.jsx
export default[
    {
        price:150.00,
        priceId:"price_1PhanYRp7dn1RYDQSDtkCRmB",
        duration:'Monthly'
    },
    {
        price:1500.00,
        priceId:"price_1PhbBnRp7dn1RYDQJ48N07Bx",
        duration:'Yearly'
    }
]
```

- [ ] **Step 2: Replace the static payment link with a dynamic checkout button, and refresh Clerk session on return from a successful payment**

Replace the full contents of `app/dashboard/upgrade/page.jsx`:

```jsx
"use client"
import PricingPlan from '@/app/_data/PricingPlan'
import { useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'

function Upgrade() {
    const { user } = useUser();
    const searchParams = useSearchParams();
    const [loadingPriceId, setLoadingPriceId] = useState(null);

    useEffect(() => {
      if (searchParams.get('success') === 'true') {
        user?.reload();
      }
    }, [searchParams, user]);

    const startCheckout = async (priceId) => {
      setLoadingPriceId(priceId);
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setLoadingPriceId(null);
      }
    };

  return (
    <div className='px-4'>
     <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center md:gap-8">
   {PricingPlan.map((item)=>(<div key={item.priceId} className="rounded-2xl border border-gray-200 p-6 shadow-sm sm:px-8 lg:p-12">
      <div className="text-center">
        <h2 className="text-lg font-medium text-gray-900">
          {item.duration}
          <span className="sr-only">Plan</span>
        </h2>

        <p className="mt-2 sm:mt-4">
          <strong className="text-3xl font-bold text-gray-900 sm:text-4xl"> {item.price} </strong>

          <span className="text-sm font-medium text-gray-700">{item.duration}</span>
        </p>
      </div>

      <ul className="mt-6 space-y-2">
        <li className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-5 text-indigo-700"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>

          <span className="text-gray-700"> 10 users included </span>
        </li>

        <li className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-5 text-indigo-700"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>

          <span className="text-gray-700"> 2GB of storage </span>
        </li>

        <li className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-5 text-indigo-700"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>

          <span className="text-gray-700"> Email support </span>
        </li>

        <li className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-5 text-indigo-700"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>

          <span className="text-gray-700"> Help center access </span>
        </li>
      </ul>

      <button
        onClick={() => startCheckout(item.priceId)}
        disabled={loadingPriceId === item.priceId}
        className="mt-8 block w-full rounded-full border border-indigo-600 bg-white px-12 py-3 text-center text-sm font-medium text-indigo-600 hover:ring-1 hover:ring-indigo-600 focus:outline-none focus:ring active:text-indigo-500 disabled:opacity-50"
      >
        {loadingPriceId === item.priceId ? 'Redirecting…' : 'Get Started'}
      </button>
    </div>))}


  </div>
</div>
    </div>
  )
}

export default Upgrade
```

- [ ] **Step 3: Verify the project builds**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add app/_data/PricingPlan.jsx app/dashboard/upgrade/page.jsx
git commit -m "Upgrade page: dynamic Stripe Checkout Session instead of static payment links"
```

---

### Task 10: Show "Unlimited plan" for paid users in SideNav

**Files:**
- Modify: `app/dashboard/_components/SideNav.jsx:81-88`

- [ ] **Step 1: Replace the progress-bar block**

Find this block (currently lines 81-88):

```jsx
    <div className='fixed  bottom-10 p-4 w-64'>
        <Button className="">+ Create Form</Button>
        <div className='my-4 mr-4 '> 
        <Progress value={Percentage} />
        <h2 className='text-sm mt-2 text-gray-800'><strong className=''>{formList?.length}</strong> Out of <strong>3</strong> File Created</h2>
        <h2 className='text-sm mt-2 text-gray-800'>Upgrade your plan for unlimted AI form build</h2>
        </div>
    </div>
```

Replace with:

```jsx
    <div className='fixed  bottom-10 p-4 w-64'>
        <Button className="">+ Create Form</Button>
        <div className='my-4 mr-4 '>
        {user?.publicMetadata?.plan === 'paid' ? (
          <h2 className='text-sm mt-2 text-gray-800 font-semibold'>Unlimited plan</h2>
        ) : (
          <>
          <Progress value={Percentage} />
          <h2 className='text-sm mt-2 text-gray-800'><strong className=''>{formList?.length}</strong> Out of <strong>3</strong> File Created</h2>
          <h2 className='text-sm mt-2 text-gray-800'>Upgrade your plan for unlimted AI form build</h2>
          </>
        )}
        </div>
    </div>
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/_components/SideNav.jsx
git commit -m "SideNav: show Unlimited plan instead of the form-count bar for paid users"
```

---

### Task 11: Environment setup and manual end-to-end verification

This is manual — Stripe keys are secrets only you can obtain, and webhook delivery can't be exercised by a unit test.

**Files:**
- Modify: `.env.local` (add two new lines — do not commit this file, it's already gitignored)

- [ ] **Step 1: Get your Stripe test-mode secret key**

From the Stripe Dashboard (test mode) → Developers → API keys → copy the "Secret key" (starts `sk_test_...`). Add to `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
```

- [ ] **Step 2: Install the Stripe CLI and start webhook forwarding**

If not already installed: https://stripe.com/docs/stripe-cli

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This prints a webhook signing secret (`whsec_...`). Add to `.env.local`:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

Leave `stripe listen` running in its own terminal for the rest of this task.

- [ ] **Step 3: Start the app**

```bash
npm run dev
```

- [ ] **Step 4: Walk through the free-limit block**

Sign in, create 3 forms via "+Create Form" on `/dashboard`. On the 4th attempt, expect the dialog to show "You've reached the 3-form limit on the free plan" with a link to Upgrade, instead of the textarea.

- [ ] **Step 5: Walk through payment**

Go to `/dashboard/upgrade`, click "Get Started" on either plan, complete checkout with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC. Expect a redirect back to `/dashboard/upgrade?success=true`.

In the `stripe listen` terminal, confirm a `customer.subscription.created` event was forwarded and returned `200`.

- [ ] **Step 6: Confirm the unlock**

Back on `/dashboard`, the SideNav should now read "Unlimited plan". Create a 4th form — expect it to succeed (no limit message).

- [ ] **Step 7: Walk through cancellation reverting access**

```bash
stripe trigger customer.subscription.deleted
```

(Or cancel the subscription from the Stripe Dashboard.) Confirm the webhook terminal shows the event forwarded successfully, then reload `/dashboard` and confirm SideNav reverts to showing the `X/3` counter.

- [ ] **Step 8: Commit nothing (env values are secrets)**

Nothing to commit for this task — `.env.local` is gitignored. If everything in Steps 4–7 worked, the feature is done.

---

## Self-review notes

- Every spec requirement (checkout session, webhook lifecycle sync, server-side enforcement, UI states for blocked/paid, cleanup of now-dead AI proxy route) maps to a task above.
- `clerkUserId` (metadata key) and `plan` (`'paid'`/`'free'`) are spelled identically everywhere they're set or read: `checkout/route.js` sets `subscription_data.metadata.clerkUserId`; `webhook/route.js` reads `subscription.metadata.clerkUserId` and writes `publicMetadata.plan`; `forms/create/route.js` and `SideNav.jsx` both read `publicMetadata.plan`.
- `shouldBlockFormCreation(plan, formCount)` signature matches its one call site in `forms/create/route.js`.
