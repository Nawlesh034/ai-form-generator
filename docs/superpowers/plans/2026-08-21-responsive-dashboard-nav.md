# Responsive Dashboard Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard usable on mobile — replace the currently-broken-below-`md` fixed sidebar with a hamburger/slide-in-drawer pattern, and fix two content grids that show 2 columns even on the narrowest screens.

**Architecture:** Drawer state (`isOpen`) lives in `dashboard/layout.jsx`, the common parent of the new mobile toggle bar, the backdrop, and `SideNav` (which gets one new optional `onNavigate` prop to close the drawer on link click). Desktop is untouched — `md:translate-x-0` unconditionally overrides the drawer's hidden state at that breakpoint. Two unrelated grid components get a mobile-first breakpoint added.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS (translate-based show/hide, no new JS animation library), `lucide-react` (already a dependency) for the `Menu` icon.

Reference spec: `docs/superpowers/specs/2026-08-21-responsive-dashboard-nav-design.md`

---

### Task 1: Hamburger + slide-in drawer for the dashboard sidebar

**Files:**
- Modify: `app/dashboard/layout.jsx` (full rewrite)
- Modify: `app/dashboard/_components/SideNav.jsx:14` and `:79` (accept and use a new `onNavigate` prop; also add an explicit background so the drawer renders as an opaque panel over content, not transparent)

- [ ] **Step 1: Rewrite the dashboard layout**

Replace the full contents of `app/dashboard/layout.jsx`:

```jsx
"use client"
import { SignedIn } from '@clerk/nextjs'
import { Menu } from 'lucide-react'
import React, { useState } from 'react'
import SideNav from './_components/SideNav'

function layout({children}) {
    const [isOpen, setIsOpen] = useState(false)

    return (
    <SignedIn>
        <div>
            <div className='md:hidden flex items-center p-4 border-b'>
                <button onClick={() => setIsOpen(true)} aria-label='Open menu'>
                    <Menu />
                </button>
            </div>

            {isOpen && (
                <div
                    className='fixed inset-0 bg-black/50 z-40 md:hidden'
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SideNav onNavigate={() => setIsOpen(false)} />
            </div>

            <div className='md:ml-64'>
                {children}
            </div>
        </div>

   </SignedIn> // once the user is signed in then show the children
  )
}

export default layout
```

Note: the original file imported `SignIn` from `@clerk/nextjs` but never used it — dropped here since this line is being rewritten anyway.

- [ ] **Step 2: Add the `onNavigate` prop to SideNav**

In `app/dashboard/_components/SideNav.jsx`, change line 14 from:

```jsx
export default function SideNav() {
```

to:

```jsx
export default function SideNav({ onNavigate }) {
```

Then change line 79 from:

```jsx
    <div className='h-screen shadow-md border p-5 '><div>{menuList.map((menu,index)=>(<Link href={menu.path} key={index} className={`flex items-center gap-3 p-3 mb-3 hover:bg-primary hover:text-white rounded-lg cursor-pointer  ${path==menu.path?"bg-primary text-white":"text-gray-400"} `}><menu.icon/>
```

to:

```jsx
    <div className='h-screen shadow-md border p-5 bg-white'><div>{menuList.map((menu,index)=>(<Link href={menu.path} key={index} onClick={onNavigate} className={`flex items-center gap-3 p-3 mb-3 hover:bg-primary hover:text-white rounded-lg cursor-pointer  ${path==menu.path?"bg-primary text-white":"text-gray-400"} `}><menu.icon/>
```

Two changes on that line: added `bg-white` to the root div's className (without it, the drawer panel has no opaque background and page content would show through it when open on mobile — the parent `layout.jsx` div has no background of its own), and added `onClick={onNavigate}` to the `Link` so clicking any nav item closes the mobile drawer (harmless no-op on desktop, where `onNavigate` still gets called but nothing visually depends on `isOpen` there).

- [ ] **Step 3: Verify the project builds**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 4: Manual verification**

This project has no test suite. Verify by reading the resulting code against this checklist (you won't have a browser in this environment — report what you confirmed by tracing the code, not by clicking):

1. Below `md` (768px): `isOpen` starts `false`, so the drawer div has `-translate-x-full` (off-screen) and `md:translate-x-0` doesn't apply yet — confirm no `md:` prefix ever overrides at this width.
2. At/above `md`: `md:translate-x-0` always applies regardless of `isOpen`, so the sidebar is always visible — confirm the class string produces this (i.e. `md:translate-x-0` is present unconditionally in the template literal, not inside the ternary).
3. The backdrop div only renders when `isOpen` is `true`, and has `md:hidden` so it can never appear at `md`+ even if `isOpen` were somehow true there.
4. `SideNav`'s `Link` `onClick={onNavigate}` — confirm `onNavigate` is the same function reference passed from `layout.jsx` (`() => setIsOpen(false)`), so clicking a nav link closes the drawer.
5. Confirm `md:ml-64` on the content div is unchanged from before — desktop content offset behavior is identical to pre-change.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/layout.jsx app/dashboard/_components/SideNav.jsx
git commit -m "Add mobile hamburger + slide-in drawer for dashboard sidebar"
```

---

### Task 2: Mobile-first grid breakpoints on My Forms and Responses

**Files:**
- Modify: `app/dashboard/_components/FormList.jsx:44`
- Modify: `app/dashboard/responses/page.jsx:44`

Both are single-line breakpoint changes, independent of Task 1 and of each other.

- [ ] **Step 1: Fix the FormList grid**

In `app/dashboard/_components/FormList.jsx`, change line 44 from:

```jsx
    <div className='mt-5 grid grid-cols-2 md:grid-cols-3 gap-2'>{formList.map((form,index)=>(<div key={index}>
```

to:

```jsx
    <div className='mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2'>{formList.map((form,index)=>(<div key={index}>
```

- [ ] **Step 2: Fix the Responses grid**

In `app/dashboard/responses/page.jsx`, change line 44 from:

```jsx
    <div className='grid grid-cols-2 lg:grid-cols-3'>
```

to:

```jsx
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
```

- [ ] **Step 3: Verify the project builds**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/_components/FormList.jsx app/dashboard/responses/page.jsx
git commit -m "Add mobile-first grid breakpoints to FormList and Responses"
```

---

## Self-review notes

- Spec coverage: drawer mechanism (translate-based, `md:translate-x-0` override) ✅ Task 1 Step 1; state ownership in `layout.jsx` ✅ Task 1 Step 1; `onNavigate` callback on `SideNav` ✅ Task 1 Step 2; backdrop with correct z-index/`md:hidden` ✅ Task 1 Step 1; mobile hamburger bar with no duplicated branding ✅ Task 1 Step 1; both grid fixes ✅ Task 2.
- The `bg-white` addition in Task 1 Step 2 isn't explicitly called out in the design doc's prose but is a direct, necessary consequence of the design's own drawer mechanism (an overlay panel needs an opaque background) — added here rather than left as a gap the implementer would have to improvise.
- Task 1 and Task 2 touch entirely disjoint files and can be done/reviewed in either order; Task 1 is listed first only because it's the larger, more central change.
