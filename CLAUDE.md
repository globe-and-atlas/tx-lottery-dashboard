# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

TX Lottery Dashboard is a React 19 + TypeScript + Vite multi-variant dashboard for Texas lottery data visualization. It ships 13+ themed variants (Alpha, Alt, Bit, GenZ, Lux, Mass, Mom, Mystic, Neo, Sports, Tac, Vegas, Hub) each with their own `App*.tsx` + `main-*.tsx` entry point and CSS. Data is scraped/built via Node scripts and served through a lightweight Express API.

## Commands

```bash
# Development
npm run dev           # Vite dev server (main variant)
npm run api:dev       # Express API server (node api/server.mjs)

# Data
npm run refresh:data  # Rebuild lottery data (node scripts/build-lottery-data.mjs)

# Build & Deploy
npm run build         # tsc + vite build
npm run deploy        # bash scripts/deploy.sh
npm run lint          # ESLint
npm run preview       # Preview production build
```

## Key Files

| File/Dir | Purpose |
|----------|---------|
| `src/App*.tsx` | Themed variant root components |
| `src/main-*.tsx` | Entry points per variant |
| `src/Hub.tsx` | Dashboard hub for all variants |
| `src/data/` | Static lottery data assets |
| `api/server.mjs` | Express API server |
| `scripts/` | Data build/deploy scripts |
| `public/` | Static assets |
| `index-*.html` | Per-variant HTML entry points |
| `build-app-*.py` | Per-variant Python build helpers |

## Conventions

- React 19 + TypeScript + Vite (ESM)
- Each themed variant is self-contained: `App*.tsx` + `App*.css` + `main-*.tsx` + `index-*.html`
- Shared logic goes in `src/` with explicit imports — no barrel files
- Data fetched from `api/server.mjs` or pre-built JSON in `src/data/`
- Secrets in `.env` (never committed)
- Temp outputs in `.tmp/` (never committed)

## Conventions (TypeScript)

- Prefer `type` over `interface` for props
- Use `const` arrow functions for components
- Keep CSS co-located with component (e.g., `AppVegas.css` alongside `AppVegas.tsx`)

---

## Agent Instructions

You operate within a **3-layer architecture**.

**Layer 1 - Directives** (`directives/` if present): Markdown SOPs.
**Layer 2 - Orchestration** (you): Plan → delegate → verify.
**Layer 3 - Execution** (`scripts/`): Node/Python scripts for data and build ops.

Before acting:
1. Identify which variant(s) are in scope
2. Check if change should be isolated to one variant or propagated across all
3. Confirm safety: never commit `.env` or `.tmp/`

Log to `.tmp/runlog.md` for complex multi-step tasks.
