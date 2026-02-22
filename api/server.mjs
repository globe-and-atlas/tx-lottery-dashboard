import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '..', 'src', 'data', 'lottery-data.json');

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  response.end(JSON.stringify(payload, null, 2));
};

const clampInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const loadDataset = async () => {
  const raw = await readFile(dataPath, 'utf-8');
  return JSON.parse(raw);
};

const fetchZipActivity = async (zipCode) => {
  if (!/^\d{5}$/.test(zipCode)) {
    return { zipCode, fromDate: null, byGame: {}, totalClaims: 0 };
  }

  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 1);
  const fromIso = fromDate.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    $select: 'instant_game_number,count(*) as claims,max(claim_paid_date) as last_paid',
    $where: `game_category='Scratch Tickets' AND location_zip='${zipCode}' AND claim_paid_date >= '${fromIso}T00:00:00'`,
    $group: 'instant_game_number',
    $order: 'claims DESC',
    $limit: '5000',
  });

  const response = await fetch(`https://data.texas.gov/resource/54pj-3dxy.json?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`ZIP activity request failed (${response.status})`);
  }

  const rows = await response.json();
  const byGame = {};
  let totalClaims = 0;

  for (const row of rows) {
    const gameNumber = String(row.instant_game_number ?? '').trim();
    const claims = Number.parseInt(String(row.claims ?? '0'), 10);

    if (!gameNumber || !Number.isFinite(claims) || claims <= 0) {
      continue;
    }

    byGame[gameNumber] = {
      claims,
      lastPaid: row.last_paid ?? null,
    };
    totalClaims += claims;
  }

  return {
    zipCode,
    fromDate: fromIso,
    byGame,
    totalClaims,
  };
};

const buildBudgetRecommendation = ({ dataset, zipActivity, budget, multiplier, ticketPrice, target }) => {
  const recommendationTarget = target === 'topPrize' ? 'topPrize' : 'highTier';

  const allGames = dataset.games
    .filter((game) => ticketPrice === null || game.ticketPrice === ticketPrice)
    .map((game) => {
      const threshold = game.ticketPrice * multiplier;
      const highTierRemaining = game.prizeLevels
        .filter((level) => level.amount >= threshold)
        .reduce((sum, level) => sum + level.remainingPrizes, 0);

      const highTierOddsOneIn =
        game.approxTicketsInGame && highTierRemaining > 0 ? game.approxTicketsInGame / highTierRemaining : null;

      return {
        ...game,
        highTierRemaining,
        highTierOddsOneIn,
        localClaims: zipActivity.byGame[game.gameNumber]?.claims ?? 0,
      };
    })
    .filter((game) => {
      if (game.ticketPrice > budget) return false;
      if (recommendationTarget === 'topPrize') {
        return game.topPrizeOddsOneIn !== null && game.topPrizesRemaining > 0;
      }
      return game.highTierOddsOneIn !== null && game.highTierRemaining > 0;
    });

  if (!allGames.length) {
    return null;
  }

  const localGamesInPool = allGames.filter((game) => game.localClaims > 0).length;
  const pool = allGames;

  const maxLocalClaims = Math.max(...pool.map((game) => game.localClaims), 0);
  const entries = pool
    .map((game) => {
      const highTierP = game.highTierOddsOneIn ? 1 / game.highTierOddsOneIn : 0;
      const topPrizeP = game.topPrizeOddsOneIn ? 1 / game.topPrizeOddsOneIn : 0;
      const p = recommendationTarget === 'topPrize' ? topPrizeP : highTierP;
      const normalized = maxLocalClaims > 0 ? game.localClaims / maxLocalClaims : 0;
      const adjusted = Math.min(p * (1 + normalized * 0.25), 0.95);
      const utility = -Math.log(Math.max(1 - adjusted, 1e-12));
      return { game, p, highTierP, topPrizeP, utility };
    })
    .filter((entry) => entry.utility > 0 && Number.isFinite(entry.utility));

  if (!entries.length) {
    return null;
  }

  const dp = Array.from({ length: budget + 1 }, () => null);
  dp[0] = { score: 0, picks: new Map() };

  for (let spend = 1; spend <= budget; spend += 1) {
    let best = null;

    entries.forEach((entry, index) => {
      const cost = entry.game.ticketPrice;
      if (cost > spend) return;

      const previous = dp[spend - cost];
      if (!previous) return;

      const score = previous.score + entry.utility;
      if (!best || score > best.score) {
        const picks = new Map(previous.picks);
        picks.set(index, (picks.get(index) ?? 0) + 1);
        best = { score, picks };
      }
    });

    dp[spend] = best;
  }

  let finalSpend = 0;
  let finalPlan = null;

  for (let spend = 0; spend < dp.length; spend += 1) {
    const candidate = dp[spend];
    if (!candidate || candidate.picks.size === 0) continue;
    if (!finalPlan || candidate.score > finalPlan.score) {
      finalPlan = candidate;
      finalSpend = spend;
    }
  }

  if (!finalPlan) return null;

  const lines = Array.from(finalPlan.picks.entries())
    .map(([entryIndex, count]) => {
      const entry = entries[entryIndex];
      return {
        gameNumber: entry.game.gameNumber,
        gameName: entry.game.gameName,
        ticketPrice: entry.game.ticketPrice,
        ticketCount: count,
        spend: count * entry.game.ticketPrice,
        localClaims: entry.game.localClaims,
        highTierOddsOneIn: entry.game.highTierOddsOneIn,
        topPrizeOddsOneIn: entry.game.topPrizeOddsOneIn,
        targetProbabilityPerTicket: entry.p,
      };
    })
    .sort((a, b) => b.spend - a.spend);

  const primaryHitProbability =
    1 -
    lines.reduce((failure, line) => {
      return failure * (1 - line.targetProbabilityPerTicket) ** line.ticketCount;
    }, 1);

  const highPrizeHitProbability =
    1 -
    lines.reduce((failure, line) => {
      const p = line.highTierOddsOneIn ? 1 / line.highTierOddsOneIn : 0;
      return failure * (1 - p) ** line.ticketCount;
    }, 1);

  const topPrizeHitProbability =
    1 -
    lines.reduce((failure, line) => {
      const p = line.topPrizeOddsOneIn ? 1 / line.topPrizeOddsOneIn : 0;
      return failure * (1 - p) ** line.ticketCount;
    }, 1);

  return {
    budget,
    spent: finalSpend,
    multiplier,
    target: recommendationTarget,
    targetLabel: recommendationTarget === 'topPrize' ? 'Top Prize' : `${multiplier}x+ Prize`,
    localGamesInPool,
    totalGamesInPool: pool.length,
    primaryHitProbability,
    highPrizeHitProbability,
    topPrizeHitProbability,
    lines,
  };
};

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', 'http://localhost');

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      response.end();
      return;
    }

    if (requestUrl.pathname === '/api/health') {
      sendJson(response, 200, { ok: true, timestamp: new Date().toISOString() });
      return;
    }

    if (requestUrl.pathname !== '/api/recommendations') {
      sendJson(response, 404, { error: 'Not found' });
      return;
    }

    const dataset = await loadDataset();

    const budget = clampInt(requestUrl.searchParams.get('budget'), 50, 1, 1000);
    const multiplier = clampInt(requestUrl.searchParams.get('multiplier'), 50, 5, 500);
    const target = (requestUrl.searchParams.get('target') ?? 'highTier').trim();
    const ticketPriceParam = requestUrl.searchParams.get('ticketPrice');
    const ticketPrice = ticketPriceParam && ticketPriceParam !== 'all' ? clampInt(ticketPriceParam, 0, 1, 1000) : null;
    const zipCode = (requestUrl.searchParams.get('zipCode') ?? '77379').trim();

    const zipActivity = await fetchZipActivity(zipCode);
    const recommendation = buildBudgetRecommendation({
      dataset,
      zipActivity,
      budget,
      multiplier,
      ticketPrice,
      target,
    });

    sendJson(response, 200, {
      generatedAt: dataset.generatedAt,
      csvAsOfDate: dataset.source.csvAsOfDate,
      zipCode,
      zipActivitySummary: {
        fromDate: zipActivity.fromDate,
        totalClaims: zipActivity.totalClaims,
        activeGames: Object.keys(zipActivity.byGame).length,
      },
      recommendation,
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

const port = Number.parseInt(process.env.PORT ?? '8787', 10);
server.listen(port, () => {
  console.log(`Texas lottery API listening on http://localhost:${port}`);
});
