# Texas Lottery Scratch Dashboard

A React dashboard that ranks Texas scratch-off games by estimated high-prize odds.

## What it answers

- Which active games currently have the best estimated odds for top prizes.
- Which games are strongest within a specific ticket price (for example `$1` or `$5`).
- What to buy with fixed budgets (`$50`, `$20`, `$10`) for better `high-prize` hit probability.
- ZIP-aware signals (default `77379`) using recent scratch claim activity by retailer ZIP.
- How prize-level remaining counts compare per game.
- How best-odds snapshots change over time.

## Data sources

- Texas Lottery scratch prize CSV: `https://www.txbingo.org/export/sites/lottery/Games/Scratch_Offs/scratchoff.csv`
- Texas Lottery current games list: `https://www.txbingo.org/export/sites/lottery/Games/Scratch_Offs/all.html`
- Per-game detail pages (for approximate tickets in game + overall odds)
- Texas Open Data winners list (ZIP activity): `https://data.texas.gov/resource/54pj-3dxy.json`

## Local development

```bash
npm install
npm run refresh:data
npm run dev
```

Open `http://localhost:5173`.

## Scripts

- `npm run refresh:data`: Fetches and normalizes live lottery data into `src/data/lottery-data.json`.
- `npm run refresh:data`: Appends a new historical snapshot in `src/data/lottery-history.json`.
- `npm run api:dev`: Starts local API (`http://localhost:8787`) for budget recommendations.
- `npm run dev`: Starts the Vite dev server.
- `npm run lint`: Runs ESLint.
- `npm run build`: Builds production bundle.

## API

Start:

```bash
npm run api:dev
```

Endpoint:

- `GET /api/recommendations?budget=50&zipCode=77379&multiplier=50&ticketPrice=all`
- `GET /api/recommendations?budget=50&zipCode=77379&multiplier=50&ticketPrice=all&target=highTier`
- `GET /api/recommendations?budget=50&zipCode=77379&multiplier=50&ticketPrice=all&target=topPrize`

## Ranking logic

- `Top Prize Odds`: `approx tickets in game / top prizes remaining`
- `High Prize Odds`: `approx tickets in game / remaining prizes >= (multiplier x ticket price)`
- `Any Prize Odds`: `approx tickets in game / all remaining winning tickets`

Lower `1 in N` is better.

## Notes

- Metrics are estimates based on official published counts.
- Budget recommendations optimize estimated probability of at least one high-prize hit.
- ZIP activity is a proximity/availability signal, not a guarantee of exact store inventory.
- ZIP activity is used as a weighting signal; games are not hard-excluded for lacking local claims.
- Missing source values are shown as `N/A`.

## Fork: what to change

### Default ZIP code

The ZIP code used for local retailer activity is hardcoded in two places. Change both if you're adapting this for a different area:

| File | Location | Default |
|---|---|---|
| `src/AppAlpha.tsx` | line 197 — `defaultZip` or ZIP state initializer | `77379` |
| `api/server.mjs` | line 313 — fallback ZIP in the recommendations handler | `77379` |

### API query parameters

The budget recommendations endpoint accepts these parameters:

| Parameter | Type | Description |
|---|---|---|
| `budget` | number | Total dollars to spend (e.g. `50`) |
| `zipCode` | string | ZIP code for nearby retailer weighting |
| `multiplier` | number | Prize multiplier threshold — used for high-prize odds calculation |
| `ticketPrice` | string | Filter by ticket price (`1`, `2`, `5`, `10`, `20`, `all`) |
| `target` | string | Optimization target: omit for default (high-prize), `highTier`, or `topPrize` |

Example:
```
GET /api/recommendations?budget=50&zipCode=77379&multiplier=50&ticketPrice=5&target=highTier
```

### Data source URLs

Live data is fetched from Texas Lottery public endpoints in `scripts/build-lottery-data.mjs`. If Texas Lottery changes its URL structure, update these constants:

- Scratch prize CSV: `https://www.txbingo.org/export/sites/lottery/Games/Scratch_Offs/scratchoff.csv`
- Current games list: `https://www.txbingo.org/export/sites/lottery/Games/Scratch_Offs/all.html`
- ZIP winners activity: `https://data.texas.gov/resource/54pj-3dxy.json`

### Themed variants

The dashboard ships 13+ visual themes (Alpha, Alt, Bit, GenZ, Lux, Mass, Mom, Mystic, Neo, Sports, Tac, Vegas, Hub). Each variant is self-contained:

```
src/AppAlpha.tsx + src/AppAlpha.css + src/main-alpha.tsx + index-alpha.html
```

To add a new variant: copy an existing set, rename consistently, and add the new entry point to `vite.config.ts` under `build.rollupOptions.input`.

The Hub variant (`src/Hub.tsx`) renders a landing page linking all variants — update it when adding a new theme.

---

## Wishlist

- Add phone geolocation support to detect nearby retailers and refine recommendations to likely available games at the current location.
- Integrate Texas Lottery Scratch Ticket Locator results (`zip/city + game`) to create a "nearby carries this game" filter.
- Add a "machine/store availability confidence" indicator because public sources do not expose real-time bin inventory by store.
