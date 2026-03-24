# Project Domain — tx-lottery-dashboard

## Overview

React 19 + TypeScript + Vite multi-variant dashboard for Texas lottery data visualization. Ships 13+ themed variants (Alpha, Alt, Bit, GenZ, Lux, Mass, Mom, Mystic, Neo, Sports, Tac, Vegas, Hub) each with their own `App*.tsx` + `main-*.tsx` entry point and CSS.

## Stack

- React 19 + TypeScript + Vite
- Express API server (`api/server.mjs`) for lottery data
- Node scripts for data build (`scripts/build-lottery-data.mjs`)
- Vercel deployment

## Key Commands

```bash
npm run dev           # Vite dev server
npm run api:dev       # Express API server
npm run refresh:data  # Rebuild lottery data
npm run build         # tsc + vite build
npm run deploy        # bash scripts/deploy.sh
```

## Variant Architecture

Each variant is a separate entry point:
- `src/App*.tsx` + `src/main-*.tsx` — component + entry
- `index-*.html` — HTML entry per variant
- `build-app-*.py` — Python build helper per variant

Hub variant (`src/Hub.tsx`, `index.html`) links all variants.

## Data

Lottery data built by `scripts/build-lottery-data.mjs` → `src/data/`. Served via Express API at runtime.
