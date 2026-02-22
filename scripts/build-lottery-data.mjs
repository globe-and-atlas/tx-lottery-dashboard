import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.txbingo.org';
const SCRATCH_CSV_URL = `${BASE_URL}/export/sites/lottery/Games/Scratch_Offs/scratchoff.csv`;
const CURRENT_GAMES_URL = `${BASE_URL}/export/sites/lottery/Games/Scratch_Offs/all.html`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'src', 'data', 'lottery-data.json');
const historyPath = path.join(repoRoot, 'src', 'data', 'lottery-history.json');

const toInt = (value) => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const toFloat = (value) => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseUSDate = (raw) => {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;

  const fullYear = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fullYear) {
    const [, mm, dd, yyyy] = fullYear;
    return `${yyyy}-${mm}-${dd}`;
  }

  const shortYear = value.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (shortYear) {
    const [, mm, dd, yy] = shortYear;
    const year = Number.parseInt(yy, 10);
    const yyyy = year >= 90 ? 1900 + year : 2000 + year;
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
};

const formatDateToIso = (raw) => {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'tx-lottery-dashboard/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.text();
};

const parseScratchCsv = (csvText) => {
  const csvAsOfMatch = csvText.match(/Scratch-Off Prizes as of\s+(\d{2}\/\d{2}\/\d{4})/i);
  const csvAsOf = csvAsOfMatch ? parseUSDate(csvAsOfMatch[1]) : null;

  const rows = parse(csvText, {
    columns: true,
    from_line: 2,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  });

  const gamesByNumber = new Map();

  for (const row of rows) {
    const gameNumber = String(row['Game Number'] ?? '').trim();
    if (!gameNumber) continue;

    const gameName = String(row['Game Name'] ?? '').trim();
    const ticketPrice = toInt(row['Ticket Price']);
    const closeDate = parseUSDate(row['Game Close Date']);
    const prizeLevelRaw = String(row['Prize Level'] ?? '').trim();
    const totalPrizesInLevel = toInt(row['Total Prizes in Level']);
    const prizesClaimed = toInt(row['Prizes Claimed']);

    if (!gamesByNumber.has(gameNumber)) {
      gamesByNumber.set(gameNumber, {
        gameNumber,
        gameName,
        ticketPrice,
        closeDate,
        prizeLevels: [],
        totalPrizesPrinted: null,
        totalPrizesClaimed: null,
      });
    }

    const game = gamesByNumber.get(gameNumber);

    if (closeDate && !game.closeDate) {
      game.closeDate = closeDate;
    }

    if (prizeLevelRaw.toUpperCase() === 'TOTAL') {
      game.totalPrizesPrinted = totalPrizesInLevel;
      game.totalPrizesClaimed = prizesClaimed;
      continue;
    }

    const prizeAmount = toInt(prizeLevelRaw);
    if (!prizeAmount || !totalPrizesInLevel || prizesClaimed === null) {
      continue;
    }

    game.prizeLevels.push({
      amount: prizeAmount,
      totalPrizes: totalPrizesInLevel,
      claimedPrizes: prizesClaimed,
    });
  }

  return {
    csvAsOf,
    gamesByNumber,
  };
};

const parseCurrentGamesPage = (htmlText) => {
  const $ = cheerio.load(htmlText);
  const games = new Map();

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (!cells.length) return;

    const gameAnchor = $(cells[0]).find('a[href*="details.html"]');
    if (!gameAnchor.length) return;

    const gameNumber = gameAnchor.text().trim();
    const href = gameAnchor.attr('href');
    const startDate = $(cells[1]).text().trim();

    if (!gameNumber || !href) return;

    games.set(gameNumber, {
      gameNumber,
      detailsUrl: new URL(href, BASE_URL).toString(),
      startDate: parseUSDate(startDate),
    });
  });

  return games;
};

const parseGameDetailsPage = (htmlText) => {
  const $ = cheerio.load(htmlText);
  const sections = $('div.large-4.cell');
  const featuresText = sections.eq(1).text().replace(/\s+/g, ' ').trim();
  const fallbackText = $('body').text().replace(/\s+/g, ' ').trim();
  const text = featuresText || fallbackText;

  const approxTicketsMatch = text.match(/There are approximately\s+([\d,]+)\*?\s+tickets in/i);
  const overallOddsMatch = text.match(/Overall odds of winning any prize[^.]*?1 in\s+([\d.]+)/i);
  const asOfMatch = text.match(/Prizes Claimed as of\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);

  return {
    approxTicketsInGame: approxTicketsMatch ? toInt(approxTicketsMatch[1]) : null,
    overallOddsOneIn: overallOddsMatch ? toFloat(overallOddsMatch[1]) : null,
    detailsAsOfDate: asOfMatch ? formatDateToIso(asOfMatch[1]) : null,
  };
};

const withConcurrency = async (items, limit, worker) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  };

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return results;
};

const computeGameMetrics = (game, currentMeta, detailsMeta) => {
  const prizeLevels = [...game.prizeLevels]
    .map((level) => ({
      amount: level.amount,
      totalPrizes: level.totalPrizes,
      claimedPrizes: level.claimedPrizes,
      remainingPrizes: Math.max(level.totalPrizes - level.claimedPrizes, 0),
    }))
    .sort((a, b) => b.amount - a.amount);

  if (!prizeLevels.length) return null;

  const totalWinningTicketsPrinted =
    game.totalPrizesPrinted ?? prizeLevels.reduce((sum, level) => sum + level.totalPrizes, 0);
  const totalWinningTicketsClaimed =
    game.totalPrizesClaimed ?? prizeLevels.reduce((sum, level) => sum + level.claimedPrizes, 0);
  const totalWinningTicketsRemaining = Math.max(totalWinningTicketsPrinted - totalWinningTicketsClaimed, 0);

  const topPrize = prizeLevels[0];
  const topPrizesRemaining = topPrize.remainingPrizes;
  const approxTicketsInGame = detailsMeta?.approxTicketsInGame ?? null;

  const topPrizeOddsOneIn =
    approxTicketsInGame && topPrizesRemaining > 0 ? approxTicketsInGame / topPrizesRemaining : null;

  const anyPrizeOddsOneIn =
    approxTicketsInGame && totalWinningTicketsRemaining > 0
      ? approxTicketsInGame / totalWinningTicketsRemaining
      : null;

  const estimatedTotalTicketsAtLaunch =
    detailsMeta?.overallOddsOneIn && totalWinningTicketsPrinted > 0
      ? Math.round(detailsMeta.overallOddsOneIn * totalWinningTicketsPrinted)
      : null;

  return {
    gameNumber: game.gameNumber,
    gameName: game.gameName,
    startDate: currentMeta?.startDate ?? null,
    closeDate: game.closeDate,
    detailsUrl: currentMeta?.detailsUrl ?? null,
    ticketPrice: game.ticketPrice,
    approxTicketsInGame,
    overallOddsOneIn: detailsMeta?.overallOddsOneIn ?? null,
    detailsAsOfDate: detailsMeta?.detailsAsOfDate ?? null,
    estimatedTotalTicketsAtLaunch,
    topPrizeAmount: topPrize.amount,
    topPrizesPrinted: topPrize.totalPrizes,
    topPrizesClaimed: topPrize.claimedPrizes,
    topPrizesRemaining,
    topPrizeOddsOneIn,
    totalWinningTicketsPrinted,
    totalWinningTicketsClaimed,
    totalWinningTicketsRemaining,
    anyPrizeOddsOneIn,
    topPrizeMultiplier: game.ticketPrice ? Number((topPrize.amount / game.ticketPrice).toFixed(1)) : null,
    prizeLevels,
  };
};

const buildDataset = async () => {
  const [csvText, currentGamesHtml] = await Promise.all([
    fetchText(SCRATCH_CSV_URL),
    fetchText(CURRENT_GAMES_URL),
  ]);

  const { csvAsOf, gamesByNumber } = parseScratchCsv(csvText);
  const currentGamesByNumber = parseCurrentGamesPage(currentGamesHtml);

  const currentEntries = Array.from(currentGamesByNumber.values());

  const detailsResults = await withConcurrency(currentEntries, 8, async (entry) => {
    try {
      const html = await fetchText(entry.detailsUrl);
      const details = parseGameDetailsPage(html);
      return {
        gameNumber: entry.gameNumber,
        ...details,
        detailsUrl: entry.detailsUrl,
        startDate: entry.startDate,
        fetchError: null,
      };
    } catch (error) {
      return {
        gameNumber: entry.gameNumber,
        detailsUrl: entry.detailsUrl,
        startDate: entry.startDate,
        approxTicketsInGame: null,
        overallOddsOneIn: null,
        detailsAsOfDate: null,
        fetchError: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const detailsByGameNumber = new Map(detailsResults.map((entry) => [entry.gameNumber, entry]));

  const games = [];
  for (const game of gamesByNumber.values()) {
    const currentMeta = currentGamesByNumber.get(game.gameNumber) ?? null;
    const detailsMeta = detailsByGameNumber.get(game.gameNumber) ?? null;
    const normalized = computeGameMetrics(game, currentMeta, detailsMeta);
    if (normalized) {
      games.push(normalized);
    }
  }

  games.sort((a, b) => a.gameNumber.localeCompare(b.gameNumber, undefined, { numeric: true }));

  const uniquePrices = [...new Set(games.map((game) => game.ticketPrice).filter(Boolean))].sort((a, b) => a - b);
  const missingDetailsCount = detailsResults.filter((entry) => entry.fetchError).length;

  return {
    generatedAt: new Date().toISOString(),
    source: {
      scratchCsvUrl: SCRATCH_CSV_URL,
      currentGamesUrl: CURRENT_GAMES_URL,
      csvAsOfDate: csvAsOf,
      detailPagesDiscovered: currentEntries.length,
      detailPagesWithFetchErrors: missingDetailsCount,
    },
    summary: {
      totalGames: games.length,
      ticketPrices: uniquePrices,
    },
    games,
  };
};

const safeReadJson = async (filePath, fallbackValue) => {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
};

const createSnapshot = (dataset) => {
  const gamesWithTopOdds = dataset.games
    .filter((game) => game.topPrizeOddsOneIn !== null && game.topPrizesRemaining > 0)
    .sort((a, b) => a.topPrizeOddsOneIn - b.topPrizeOddsOneIn);

  const bestByPrice = dataset.summary.ticketPrices
    .map((price) => {
      const best = dataset.games
        .filter(
          (game) =>
            game.ticketPrice === price &&
            game.topPrizeOddsOneIn !== null &&
            game.topPrizesRemaining > 0,
        )
        .sort((a, b) => a.topPrizeOddsOneIn - b.topPrizeOddsOneIn)[0];

      if (!best) return null;

      return {
        ticketPrice: price,
        gameNumber: best.gameNumber,
        gameName: best.gameName,
        topPrizeAmount: best.topPrizeAmount,
        topPrizesRemaining: best.topPrizesRemaining,
        topPrizeOddsOneIn: best.topPrizeOddsOneIn,
      };
    })
    .filter(Boolean);

  const totalTopPrizesRemaining = dataset.games.reduce(
    (sum, game) => sum + game.topPrizesRemaining,
    0,
  );

  return {
    date: dataset.generatedAt.slice(0, 10),
    generatedAt: dataset.generatedAt,
    csvAsOfDate: dataset.source.csvAsOfDate,
    totalGames: dataset.summary.totalGames,
    totalTopPrizesRemaining,
    bestOverall:
      gamesWithTopOdds[0] === undefined
        ? null
        : {
            gameNumber: gamesWithTopOdds[0].gameNumber,
            gameName: gamesWithTopOdds[0].gameName,
            ticketPrice: gamesWithTopOdds[0].ticketPrice,
            topPrizeAmount: gamesWithTopOdds[0].topPrizeAmount,
            topPrizesRemaining: gamesWithTopOdds[0].topPrizesRemaining,
            topPrizeOddsOneIn: gamesWithTopOdds[0].topPrizeOddsOneIn,
          },
    bestByPrice,
  };
};

const updateHistory = async (dataset) => {
  const existing = await safeReadJson(historyPath, { updatedAt: null, snapshots: [] });
  const snapshots = Array.isArray(existing.snapshots) ? existing.snapshots : [];
  const nextSnapshots = [...snapshots, createSnapshot(dataset)].slice(-240);

  const history = {
    updatedAt: dataset.generatedAt,
    snapshots: nextSnapshots,
  };

  await mkdir(path.dirname(historyPath), { recursive: true });
  await writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');
  return history;
};

const main = async () => {
  const dataset = await buildDataset();
  const history = await updateHistory(dataset);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(dataset, null, 2), 'utf-8');

  console.log(`Wrote ${dataset.games.length} games to ${outputPath}`);
  console.log(`Wrote ${history.snapshots.length} snapshots to ${historyPath}`);
  console.log(`Data generated at ${dataset.generatedAt}`);
  console.log(`Detail fetch errors: ${dataset.source.detailPagesWithFetchErrors}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
