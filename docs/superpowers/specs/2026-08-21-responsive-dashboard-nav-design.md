# Responsive Dashboard Navigation — Design

Date: 2026-08-21

## Context

`app/dashboard/layout.jsx` renders `SideNav` inside `<div className='md:w-64 fixed'>` — `fixed` positioning applies at every screen size, but the width class (`w-64`) only applies at `md` and above. Below `md`, the sidebar has no defined width and the content area (`md:ml-64`, also only offset at `md`+) loses its margin too. The result: on a phone-width screen, the sidebar and page content can overlap instead of the layout gracefully collapsing. This spec fixes that with a standard hamburger/drawer pattern, and separately fixes two content grids that show 2 columns even on the narrowest screens.

## Scope

**In scope:**
1. A mobile-only hamburger toggle + slide-in drawer for `SideNav`, with no change to desktop behavior.
2. Grid breakpoint fixes on `FormList.jsx` (My Forms) and `responses/page.jsx` (Responses) so they're single-column on narrow phones, matching the mobile-first pattern already used by `Analytics` and `Upgrade`.

**Out of scope:** any other page's internal layout, the global `Header.jsx` (already renders correctly at all widths — logo + Dashboard/UserButton or SignIn), and the bottom-tab-bar alternative (explicitly not chosen).

## Design

### Drawer mechanism

`SideNav` is wrapped in a `fixed` panel using a Tailwind translate-based show/hide, not a `hidden`/`block` toggle — this keeps the slide transition working and avoids layout reflow:

- Default (mobile, closed): `-translate-x-full` — panel sits fully off-screen to the left.
- Open (mobile): `translate-x-0` — slides into view.
- `md:translate-x-0` — unconditionally applied at `md` and above, so desktop always shows the sidebar regardless of the open/closed state variable. Desktop keeps its existing `md:w-64` fixed-and-visible behavior untouched.

A semi-transparent backdrop (`fixed inset-0 bg-black/50`, `md:hidden` so it never renders on desktop) appears behind the drawer when open; clicking it closes the drawer. Clicking any nav link inside the open drawer also closes it (drawer state lives in `layout.jsx`; `SideNav` receives an `onNavigate` callback it calls from each `Link`'s `onClick`, so `SideNav` doesn't need to know about the toggle button or overlay itself — those live entirely in `layout.jsx`).

A new mobile-only bar (`md:hidden`) sits above the content, containing just a hamburger button (`Menu` icon from `lucide-react`, already a dependency). It doesn't duplicate branding — the global `Header.jsx` (rendered by the root layout above this one) already shows the logo and user button on every page, including dashboard pages, at every width.

### State ownership

`isOpen` (boolean) lives in `dashboard/layout.jsx`, since that's the common parent of the mobile bar (which sets it true), the backdrop (which sets it false on click), and `SideNav` (which needs `onNavigate` to set it false on link click). This avoids any prop-drilling through `SideNav`'s internals — it takes one new optional prop.

### Content grids

`FormList.jsx`'s form-card grid: `grid grid-cols-2 md:grid-cols-3 gap-2` → `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2`.

`responses/page.jsx`'s form-response grid: `grid grid-cols-2 lg:grid-cols-3` → `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

Both changes are breakpoint-only — no other change to either file.

## Error handling / edge cases

- No new async logic, no new data fetching — this is pure layout/CSS plus one new piece of local UI state (`isOpen`). Nothing here can throw.
- z-index: backdrop at `z-40`, drawer at `z-50`, so the drawer always renders above its own backdrop; both are `md:hidden`/inert-by-transform on desktop so they never interfere with the existing fixed sidebar there.

## Testing

Manual only — this project has no test suite (`npm run build` is the existing verification bar used throughout this project's other recent work). Manually verify, using the browser's device toolbar or by resizing the window below/above the `md` breakpoint (768px):
- Below 768px: sidebar is off-screen by default, hamburger button visible, tapping it slides the sidebar in with a backdrop, tapping the backdrop or a nav link closes it.
- At/above 768px: layout is pixel-identical to today — no hamburger bar, sidebar always visible, no backdrop ever renders.
- `FormList`/`responses` grids show 1 column below `sm` (640px), matching `Analytics`/`Upgrade`'s existing mobile-first behavior.
