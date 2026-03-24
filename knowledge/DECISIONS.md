# Architecture Decisions — tx-lottery-dashboard

## Multi-variant per-entry-point architecture

**Decision:** Each theme variant has its own `App*.tsx`, `main-*.tsx`, and `index-*.html` rather than a single app with theme switching.

**Why:** Allows each variant to have completely independent styling, layout, and component choices without cross-contamination. Also simplifies Vercel routing — each variant is a static HTML file at a predictable URL.

---

## Hub variant as landing page

**Decision:** `index.html` is the Hub — a grid of links to all variants — rather than defaulting to one variant.

**Why:** Easier to QA all variants at once and share specific variants by URL.
