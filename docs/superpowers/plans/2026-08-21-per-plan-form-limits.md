# Per-Plan Form Limits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the binary `paid`/`free` plan flag with numeric per-plan form limits — 100 for Monthly, 1000 for Yearly, 3 for free — enforced server-side and shown accurately in the sidebar.

**Architecture:** A single source of truth (`app/_data/PricingPlan.jsx`) defines each plan's `formLimit` and exports the free-tier constant. The webhook resolves which price was actually purchased and writes the matching `formLimit` onto the Clerk user. The enforcement route and sidebar both read that number (falling back to the free constant if unset), and the pure limit-check function is simplified to accept the resolved number directly instead of a plan string.

**Tech Stack:** Next.js 14 App Router, Clerk (`publicMetadata`), Stripe subscription webhooks — no new dependencies.

Reference spec: `docs/superpowers/specs/2026-08-21-per-plan-form-limits-design.md`

---

### Task 1: Add per-plan form limits to PricingPlan.jsx

**Files:**
- Modify: `app/_data/PricingPlan.jsx` (full rewrite)

- [ ] **Step 1: Rewrite the file**

```js
// app/_data/PricingPlan.jsx
export const FREE_FORM_LIMIT = 3;

export default[
    {
        price:150.00,
        priceId:"price_1PhanYRp7dn1RYDQSDtkCRmB",
        duration:'Monthly',
        formLimit:100
    },
    {
        price:1500.00,
        priceId:"price_1PhbBnRp7dn1RYDQJ48N07Bx",
        duration:'Yearly',
        formLimit:1000
    }
]
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: build succeeds (nothing consumes `formLimit` or `FREE_FORM_LIMIT` yet, so this just confirms no syntax errors)

- [ ] **Step 3: Commit**

```bash
git add app/_data/PricingPlan.jsx
git commit -m "Add per-plan form limits and free-tier constant to PricingPlan"
```

---

### Task 2: Simplify shouldBlockFormCreation to a plain numeric limit check

**Files:**
- Modify: `lib/planLimit.mjs` (full rewrite)

- [ ] **Step 1: Rewrite the file**

```js
// lib/planLimit.mjs
import assert from 'node:assert';
import { pathToFileURL } from 'node:url';

export function shouldBlockFormCreation(limit, formCount) {
  return formCount >= limit;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.strictEqual(shouldBlockFormCreation(3, 0), false);
  assert.strictEqual(shouldBlockFormCreation(3, 2), false);
  assert.strictEqual(shouldBlockFormCreation(3, 3), true);
  assert.strictEqual(shouldBlockFormCreation(3, 10), true);
  assert.strictEqual(shouldBlockFormCreation(100, 45), false);
  assert.strictEqual(shouldBlockFormCreation(100, 100), true);
  assert.strictEqual(shouldBlockFormCreation(1000, 999), false);
  console.log('planLimit self-check passed');
}
```

The function's contract changes from "is this plan string non-paid and at/over the hardcoded free cap" to "is formCount at/over whatever limit the caller resolved" — callers (Tasks 4) are now responsible for resolving the right number before calling it.

- [ ] **Step 2: Run the self-check**

Run: `node lib/planLimit.mjs`
Expected: `planLimit self-check passed`

- [ ] **Step 3: Commit**

```bash
git add lib/planLimit.mjs
git commit -m "Simplify shouldBlockFormCreation to a plain numeric limit check"
```

---

### Task 3: Webhook resolves and stores the purchased plan's form limit

**Files:**
- Modify: `app/api/stripe/webhook/route.js` (full rewrite)

- [ ] **Step 1: Rewrite the file**

```js
// app/api/stripe/webhook/route.js
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import PricingPlan, { FREE_FORM_LIMIT } from "@/app/_data/PricingPlan";

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
      const isActive = ["active", "trialing"].includes(subscription.status);
      const purchasedPriceId = subscription.items?.data?.[0]?.price?.id;
      const matchedPlan = PricingPlan.find((p) => p.priceId === purchasedPriceId);

      const plan = isActive && matchedPlan ? "paid" : "free";
      const formLimit = isActive && matchedPlan ? matchedPlan.formLimit : FREE_FORM_LIMIT;

      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(clerkUserId, {
          publicMetadata: { plan, formLimit },
        });
      } catch (err) {
        console.error(`Stripe webhook: failed to sync plan for clerkUserId=${clerkUserId}, subscription=${subscription.id}:`, err);
        return NextResponse.json({ error: "Clerk update failed" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
```

Two behavioral additions over the previous version: `purchasedPriceId` is read from the subscription's first line item, and `matchedPlan` looks it up against `PricingPlan`. An active subscription on a price that doesn't match any known plan (shouldn't happen in practice, but is possible if `PricingPlan` and the Stripe dashboard ever drift) falls back to `plan: 'free'` / `formLimit: FREE_FORM_LIMIT` rather than granting an undefined or unlimited cap.

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: build succeeds, `/api/stripe/webhook` still in the route table

- [ ] **Step 3: Commit**

```bash
git add app/api/stripe/webhook/route.js
git commit -m "Webhook resolves and stores the purchased plan's form limit"
```

---

### Task 4: Enforcement route reads the resolved limit

**Files:**
- Modify: `app/api/forms/create/route.js` (full rewrite)

- [ ] **Step 1: Rewrite the file**

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
import { FREE_FORM_LIMIT } from "@/app/_data/PricingPlan";

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

  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    const limit = user?.publicMetadata?.formLimit ?? FREE_FORM_LIMIT;

    if (!email) {
      return NextResponse.json({ error: "No verified email on account" }, { status: 400 });
    }

    const existing = await db.select().from(JsonForms).where(eq(JsonForms.CreatedBy, email));

    if (shouldBlockFormCreation(limit, existing.length)) {
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
  } catch (err) {
    console.error("Form creation error:", err);
    return NextResponse.json({ error: err?.message || "Could not create form" }, { status: 500 });
  }
}
```

Only two lines changed from the previous version: `const plan = user?.publicMetadata?.plan;` became `const limit = user?.publicMetadata?.formLimit ?? FREE_FORM_LIMIT;`, and `shouldBlockFormCreation(plan, existing.length)` became `shouldBlockFormCreation(limit, existing.length)`. Everything else (the prompt template, the try/catch structure from the earlier review fixes, the missing-email guard) is unchanged.

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/api/forms/create/route.js
git commit -m "Enforcement route reads the resolved per-plan form limit"
```

---

### Task 5: Sidebar shows real progress against the resolved limit

**Files:**
- Modify: `app/dashboard/_components/SideNav.jsx` (full rewrite)

- [ ] **Step 1: Rewrite the file**

```jsx
// app/dashboard/_components/SideNav.jsx
"use client"
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { db } from '@/config';
import { JsonForms } from '@/config/schema';
import { useUser } from '@clerk/nextjs';
import { desc, eq } from 'drizzle-orm';
import { BarChart2, LibraryBig, MessageSquareQuote, Plus } from 'lucide-react'
import Link from 'next/link';
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { extractJson } from '@/lib/utils'
import { FREE_FORM_LIMIT } from '@/app/_data/PricingPlan'

export default function SideNav({ onNavigate }) {
    const menuList=[
        {
            id:1,
            name:'My Forms',
            icon:LibraryBig,
            path:'/dashboard'
        },
        {
            id:1,
            name:'Responses',
            icon:MessageSquareQuote,
            path:'/dashboard/responses'
        },
        {
            id:1,
            name:'Analytics',
            icon:BarChart2,
            path:'/dashboard/analytics'
        },
        {
            id:1,
            name:'Upgrade',
            icon:Plus,
            path:'/dashboard/upgrade'
        },
       
    ]
    const {user}=useUser();
    const path =usePathname();
    const[formList,setFormList]=useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [Percentage,setPercentage]=useState(0)
    const limit = user?.publicMetadata?.formLimit ?? FREE_FORM_LIMIT;

    const getFormList = async () => {
        try {
            const result = await db.select().from(JsonForms)
                .where(eq(JsonForms.CreatedBy, user?.primaryEmailAddress?.emailAddress))
                .orderBy(desc(JsonForms.id));
                
            const perc=(result.length/limit)*100;
            setPercentage(perc)

            const cleanedForms = result.map(form => {
                const parsedJson = extractJson(form.jsonForm);
                return {
                    ...form,
                    jsonForm: parsedJson
                };
            }).filter(form => form.jsonForm !== null);

            setFormList(cleanedForms);
        } catch (error) {
            console.error("Error fetching forms:", error);
            setError("Failed to load forms.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(()=>{
       user&& getFormList();
    },[user])
  return (
    <div className='h-screen shadow-md border p-5 bg-white'><div>{menuList.map((menu,index)=>(<Link href={menu.path} key={index} onClick={onNavigate} className={`flex items-center gap-3 p-3 mb-3 hover:bg-primary hover:text-white rounded-lg cursor-pointer  ${path==menu.path?"bg-primary text-white":"text-gray-400"} `}><menu.icon/>
    {menu.name}</Link>))}</div>
    <div className='fixed  bottom-10 p-4 w-64'>
        <Button className="">+ Create Form</Button>
        <div className='my-4 mr-4 '>
        <Progress value={Percentage} />
        <h2 className='text-sm mt-2 text-gray-800'><strong className=''>{formList?.length}</strong> Out of <strong>{limit}</strong> File Created</h2>
        {user?.publicMetadata?.plan !== 'paid' && (
          <h2 className='text-sm mt-2 text-gray-800'>Upgrade your plan for unlimted AI form build</h2>
        )}
        </div>
    </div>
    </div>
  )
}
```

Two things beyond the direct spec worth calling out since this file is being fully rewritten anyway: the `onNavigate` prop and `bg-white` class (added by the earlier responsive-nav feature) are preserved unchanged, and the "Upgrade your plan..." promotional line is now only shown to non-paid users — leaving it visible to someone already on the Yearly plan would tell a paying customer to upgrade for something they've already bought, which the previous binary-flag version's dead "Unlimited plan" branch masked but this unified version would otherwise expose.

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/_components/SideNav.jsx
git commit -m "Sidebar shows real progress against the resolved per-plan limit"
```

---

## Self-review notes

- Spec coverage: `PricingPlan.jsx` limits + constant (Task 1) ✅, simplified `shouldBlockFormCreation` (Task 2) ✅, webhook price resolution + fail-safe fallback (Task 3) ✅, enforcement route reading the resolved limit (Task 4) ✅, unified sidebar progress bar (Task 5) ✅, migration note documented in the spec (no task needed — deliberately no backfill script, per spec's Migration section).
- Type/name consistency: `formLimit` (property name) and `FREE_FORM_LIMIT` (constant name) are spelled identically everywhere they're set or read — `PricingPlan.jsx` defines both; `webhook/route.js` writes `formLimit` and imports `FREE_FORM_LIMIT`; `forms/create/route.js` and `SideNav.jsx` both read `user?.publicMetadata?.formLimit ?? FREE_FORM_LIMIT`. `shouldBlockFormCreation(limit, formCount)`'s parameter order matches its one call site in both Task 4 and its own self-check in Task 2.
- Task order matters here (unlike the two prior plans in this session): Task 1 must land before Tasks 3/4/5 (they import from it), and Task 2 must land before Task 4 (which calls the new signature). Tasks are listed in dependency order; do not reorder execution.
