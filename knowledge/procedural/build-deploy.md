# Procedural — Build & Deploy

## Rebuild lottery data

```bash
npm run refresh:data
```

## Dev

```bash
npm run dev        # main variant on Vite
npm run api:dev    # Express API in parallel
```

## Build & deploy

```bash
npm run build
npm run deploy
# or: vercel deploy --prebuilt (run from repo root)
```

## Adding a new variant

1. Create `src/AppFoo.tsx` and `src/main-foo.tsx`
2. Add `index-foo.html` (copy existing, update script src)
3. Add entry to `vite.config.ts` build inputs
4. Add link to `src/Hub.tsx`
5. Create `build-app-foo.py` if needed
