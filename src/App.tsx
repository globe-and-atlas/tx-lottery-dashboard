import { useEffect, useMemo, useState } from 'react';
import datasetJson from './data/lottery-data.json';
import historyJson from './data/lottery-history.json';
import './App.css';

import {
  PrizeLevel,
  Game,
  Dataset,
  HistoryByPrice,
  HistorySnapshot,
  HistoryDataset,
  ZipGameActivity,
  ZipActivityState,
  ZipMonthlyClaimsState,
  ObjectiveMode,
  RecommendationTarget,
  WorkspaceView,
  RankedGame,
  BudgetPlanLine,
  BudgetPlan,
  BudgetPlanScenario,
  WILSON_Z_80,
  clampNumber,
  daysSinceDateString,
  daysSinceTimestamp,
  probabilityToOdds,
  oddsToProbability,
  wilsonLowerBoundProbability,
  enumerateDenominationFillOptions,
  isHebRetailer,
  isGasRetailer,
  objectiveModeTitle,
  objectiveModeShortLabel,
  recommendationTargetLabel,
  rankGames,
  buildBudgetPlan
} from './utils/lotteryMath';

const dataset = datasetJson as Dataset;
const history = historyJson as HistoryDataset;

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const percentage = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BUDGET_SCENARIOS = [5, 10, 20, 40, 50];
const DEFAULT_PROBABILITY_TARGET_MULTIPLIER = 10;
const PROBABILITY_TARGET_OPTIONS = [2, 3, 5, 10, 20, 50];
const formatOdds = (odds: number | null) => {
  if (!odds || !Number.isFinite(odds)) {
    return 'N/A';
  }

  return `1 in ${number.format(Math.round(odds))}`;
};

const formatDollars = (amount: number) => currency.format(Math.round(amount));

const formatPerDollar = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  return `${value.toFixed(3)}x`;
};

const formatDate = (iso: string | null) => {
  if (!iso) return 'N/A';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return 'N/A';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const monthKey = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (monthIso: string) => {
  const date = new Date(monthIso);
  if (Number.isNaN(date.getTime())) return monthIso;
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const daysSinceDateString = (isoDate: string | null) => {
  if (!isoDate) return null;
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const diff = now.getTime() - parsed.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const daysSinceTimestamp = (isoTimestamp: string | null) => {
  if (!isoTimestamp) return null;
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const diff = now.getTime() - parsed.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const probabilityToOdds = (probability: number) => {
  if (!Number.isFinite(probability) || probability <= 0) return null;
  return 1 / probability;
};

const oddsToProbability = (odds: number | null) => {
  if (!odds || !Number.isFinite(odds) || odds <= 0) return 0;
  return 1 / odds;
};

const enumerateDenominationFillOptions = (remainder: number, ticketPrices: number[], limit = 3) => {
  if (remainder <= 0) return [] as string[];

  const usablePrices = [...new Set(ticketPrices.filter((price) => price > 0 && price <= remainder))].sort(
    (a, b) => b - a,
  );
  const solutions: string[] = [];

  const dfs = (startIndex: number, remaining: number, picks: number[]) => {
    if (solutions.length >= limit) return;
    if (remaining === 0) {
      const counts = new Map<number, number>();
      picks.forEach((price) => counts.set(price, (counts.get(price) ?? 0) + 1));
      const label = [...counts.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([price, count]) => `${count}x ${currency.format(price)}`)
        .join(' + ');
      solutions.push(label);
      return;
    }

    for (let index = startIndex; index < usablePrices.length; index += 1) {
      const price = usablePrices[index];
      if (price > remaining) continue;
      picks.push(price);
      dfs(index, remaining - price, picks);
      picks.pop();
      if (solutions.length >= limit) return;
    }
  };

  dfs(0, remainder, []);
  return solutions;
};

const isHebRetailer = (name: string) => /\bH[\s-]?E[\s-]?B\b|CENTRAL\s+MARKET/i.test(name);

const isGasRetailer = (name: string) =>
  /SHELL|CHEVRON|EXXON|MOBIL|TEXACO|VALERO|CIRCLE\s*K|7-?ELEVEN|STRIPES|RACETRAC|RACEWAY|QT\b|QUICKTRIP|SUNOCO|ARCO|BP\b|CONOCO|PHILLIPS\s*66|FOOD\s*MART|MINI\s*MART|CONVENIENCE|GAS/i.test(
    name,
  );

const objectiveModeTitle = (objectiveMode: ObjectiveMode, targetMultiplier: number) => {
  if (objectiveMode === 'jackpotTop') return 'Hit Top Prize (Jackpot Mode)';
  if (objectiveMode === 'bestReturn') return 'Best Return (EV Mode)';
  return `Hit ${targetMultiplier}x+ Prize (Probability Mode)`;
};

const objectiveModeShortLabel = (objectiveMode: ObjectiveMode, targetMultiplier: number) => {
  if (objectiveMode === 'jackpotTop') return 'Top Prize';
  if (objectiveMode === 'bestReturn') return 'Best Return';
  return `${targetMultiplier}x+ Prize`;
};

const recommendationTargetLabel = (target: RecommendationTarget, targetMultiplier: number) => {
  if (target === 'topPrize') return 'Top Prize';
  if (target === 'expectedValue') return 'Expected Return';
  return `${targetMultiplier}x+ Prize`;
};

const buildBudgetPlan = (params: {
  budget: number;
  games: RankedGame[];
  recommendationTarget: RecommendationTarget;
  targetMultiplier: number;
  applyLocalBoost: boolean;
  requireExactSpend?: boolean;
}) => {
  const { budget, games, recommendationTarget, targetMultiplier, applyLocalBoost, requireExactSpend = false } = params;

  const validGames = games.filter((game) => {
    if (game.ticketPrice > budget) return false;
    if (recommendationTarget === 'topPrize') {
      return game.confidenceAdjustedTopPrizeProbability > 0;
    }
    if (recommendationTarget === 'expectedValue') {
      return game.conservativeExpectedValuePerTicket > 0;
    }

    return game.confidenceAdjustedHighPrizeProbability > 0;
  });

  if (!validGames.length) return null;

  const localGamesInPool = validGames.filter((game) => game.localSignalScore > 0).length;
  const pool = validGames;

  const maxClaims = Math.max(...pool.map((game) => game.localSignalScore), 0);

  const entries = pool
    .map((game) => {
      const localNormalized = applyLocalBoost && maxClaims > 0 ? game.localSignalScore / maxClaims : 0;
      const localMultiplier = 1 + localNormalized * game.localConfidence * 0.2;

      const highPrizeProbabilityPerTicket = Math.min(game.confidenceAdjustedHighPrizeProbability * localMultiplier, 0.95);
      const topPrizeProbabilityPerTicket = Math.min(game.confidenceAdjustedTopPrizeProbability * localMultiplier, 0.95);
      const targetProbabilityPerTicket =
        recommendationTarget === 'topPrize' ? topPrizeProbabilityPerTicket : highPrizeProbabilityPerTicket;
      const expectedPayoutPerTicket = game.conservativeExpectedValuePerTicket;
      const expectedNetPerTicket = game.conservativeExpectedNetPerTicket;

      const utility =
        recommendationTarget === 'expectedValue'
          ? expectedPayoutPerTicket * localMultiplier
          : -Math.log(Math.max(1 - targetProbabilityPerTicket, 1e-12));

      return {
        game,
        targetProbabilityPerTicket,
        highPrizeProbabilityPerTicket,
        topPrizeProbabilityPerTicket,
        expectedPayoutPerTicket,
        expectedNetPerTicket,
        utility,
      };
    })
    .filter((entry) => Number.isFinite(entry.utility) && entry.utility > 0);

  if (!entries.length) return null;

  const dp: Array<{ score: number; picks: Map<number, number> } | null> = Array.from(
    { length: budget + 1 },
    () => null,
  );
  dp[0] = { score: 0, picks: new Map() };

  for (let spend = 1; spend <= budget; spend += 1) {
    let best: { score: number; picks: Map<number, number> } | null = null;

    entries.forEach((entry, index) => {
      const cost = entry.game.ticketPrice;
      if (cost > spend) return;

      const previous = dp[spend - cost];
      if (!previous) return;

      const nextScore = previous.score + entry.utility;
      if (!best || nextScore > best.score) {
        const picks = new Map(previous.picks);
        picks.set(index, (picks.get(index) ?? 0) + 1);
        best = { score: nextScore, picks };
      }
    });

    dp[spend] = best;
  }

  let finalSpend = 0;
  let finalPlan: { score: number; picks: Map<number, number> } | null = null;

  const exactCandidate = dp[budget];
  if (exactCandidate && exactCandidate.picks.size > 0) {
    finalPlan = exactCandidate;
    finalSpend = budget;
  } else if (!requireExactSpend) {
    for (let spend = 0; spend < dp.length; spend += 1) {
      const candidate = dp[spend];
      if (!candidate || candidate.picks.size === 0) continue;
      if (!finalPlan || candidate.score > finalPlan.score) {
        finalPlan = candidate;
        finalSpend = spend;
      }
    }
  }

  if (!finalPlan) return null;

  const lines = Array.from(finalPlan.picks.entries())
    .map(([entryIndex, ticketCount]) => {
      const entry = entries[entryIndex];
      return {
        game: entry.game,
        ticketCount,
        spend: entry.game.ticketPrice * ticketCount,
        targetProbabilityPerTicket: entry.targetProbabilityPerTicket,
        highPrizeProbabilityPerTicket: entry.highPrizeProbabilityPerTicket,
        topPrizeProbabilityPerTicket: entry.topPrizeProbabilityPerTicket,
        expectedPayoutPerTicket: entry.expectedPayoutPerTicket,
        expectedNetPerTicket: entry.expectedNetPerTicket,
      };
    })
    .sort((a, b) => b.spend - a.spend);

  const estimatedPrimaryChance =
    1 -
    lines.reduce((failure, line) => failure * (1 - line.targetProbabilityPerTicket) ** line.ticketCount, 1);

  const estimatedHighPrizeChance =
    1 -
    lines.reduce(
      (failure, line) => failure * (1 - line.highPrizeProbabilityPerTicket) ** line.ticketCount,
      1,
    );

  const estimatedTopPrizeChance =
    1 -
    lines.reduce(
      (failure, line) => failure * (1 - line.topPrizeProbabilityPerTicket) ** line.ticketCount,
      1,
    );

  const expectedPrimaryWins = lines.reduce(
    (sum, line) => sum + line.ticketCount * line.targetProbabilityPerTicket,
    0,
  );
  const estimatedExpectedPayout = lines.reduce(
    (sum, line) => sum + line.ticketCount * line.expectedPayoutPerTicket,
    0,
  );
  const estimatedExpectedNet = estimatedExpectedPayout - finalSpend;
  const estimatedReturnPerDollar = finalSpend > 0 ? estimatedExpectedPayout / finalSpend : 0;

  return {
    budget,
    spent: finalSpend,
    remainingBudget: Math.max(0, budget - finalSpend),
    exactSpend: finalSpend === budget,
    recommendationTarget,
    targetLabel: recommendationTargetLabel(recommendationTarget, targetMultiplier),
    estimatedPrimaryChance,
    estimatedHighPrizeChance,
    estimatedTopPrizeChance,
    expectedPrimaryWins,
    estimatedExpectedPayout,
    estimatedExpectedNet,
    estimatedReturnPerDollar,
    localBoostApplied: applyLocalBoost,
    localGamesInPool,
    totalGamesInPool: pool.length,
    lines,
  } as BudgetPlan;
};

function TrendChart({
  title,
  points,
  color,
}: {
  title: string;
  points: Array<{ label: string; value: number | null }>;
  color: string;
}) {
  const validPoints = points.filter((point): point is { label: string; value: number } => point.value !== null);

  if (validPoints.length === 0) {
    return (
      <div className="trend-card">
        <h3>{title}</h3>
        <p className="empty">Not enough history yet.</p>
      </div>
    );
  }

  const width = 320;
  const height = 116;
  const padding = 14;
  const values = validPoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  const coordinates = validPoints.map((point, index) => {
    const x =
      validPoints.length === 1
        ? width / 2
        : padding + (index * (width - padding * 2)) / (validPoints.length - 1);
    const y = height - padding - ((point.value - min) / span) * (height - padding * 2);
    return { ...point, x, y };
  });

  const polylinePoints = coordinates.map((point) => `${point.x},${point.y}`).join(' ');
  const latest = validPoints[validPoints.length - 1];

  return (
    <div className="trend-card">
      <h3>{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <rect x={0} y={0} width={width} height={height} rx={10} fill="rgba(255,255,255,0.6)" />
        <polyline fill="none" stroke={color} strokeWidth={3} points={polylinePoints} />
        {coordinates.map((point) => (
          <circle key={`${title}-${point.label}`} cx={point.x} cy={point.y} r={3.6} fill={color} />
        ))}
      </svg>
      <p className="meta">
        Latest: {number.format(Math.round(latest.value))} ({latest.label})
      </p>
    </div>
  );
}

function HeaderHelp({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="header-help">
      <span>{label}</span>
      <span className="info-dot" title={tip} aria-label={tip} tabIndex={0}>
        ?
      </span>
    </span>
  );
}

function App() {
  const [query, setQuery] = useState('');
  const [selectedPrice, setSelectedPrice] = useState<number | 'all'>('all');
  const [objectiveMode, setObjectiveMode] = useState<ObjectiveMode>('probability10x');
  const [targetPrizeMultiplier, setTargetPrizeMultiplier] = useState<number>(DEFAULT_PROBABILITY_TARGET_MULTIPLIER);
  const [evPreviewBudget, setEvPreviewBudget] = useState<number>(20);
  const [customBudgetInput, setCustomBudgetInput] = useState('');
  const [machineMode, setMachineMode] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [visibleGamesOnly, setVisibleGamesOnly] = useState(true);
  const [showVisibleGamePicker, setShowVisibleGamePicker] = useState(false);
  const [visibleGameNumbers, setVisibleGameNumbers] = useState<string[]>([]);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('buy');
  const [activeGameNumber, setActiveGameNumber] = useState('');
  const [zipCode, setZipCode] = useState('77379');
  const [localSort, setLocalSort] = useState(true);
  const [hebMixPercent, setHebMixPercent] = useState(70);
  const gasMixPercent = 100 - hebMixPercent;

  const [zipActivity, setZipActivity] = useState<ZipActivityState>({
    status: 'idle',
    zipCode: '77379',
    fromDate: '',
    totalClaims: 0,
    totalHebClaims: 0,
    totalGasClaims: 0,
    byGame: {},
    updatedAt: null,
    errorMessage: null,
  });
  const [zipMonthlyClaims, setZipMonthlyClaims] = useState<ZipMonthlyClaimsState>({
    status: 'idle',
    zipCode: '77379',
    fromDate: '',
    points: [],
    updatedAt: null,
    errorMessage: null,
  });

  useEffect(() => {
    const normalizedZip = zipCode.trim();
    if (!/^\d{5}$/.test(normalizedZip)) {
      setZipActivity((previous) => ({
        ...previous,
        status: 'idle',
        zipCode: normalizedZip,
        fromDate: '',
        totalClaims: 0,
        totalHebClaims: 0,
        totalGasClaims: 0,
        byGame: {},
        updatedAt: null,
        errorMessage: null,
      }));
      return;
    }

    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 1);
    const fromIso = fromDate.toISOString().slice(0, 10);

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setZipActivity((previous) => ({
        ...previous,
        status: 'loading',
        zipCode: normalizedZip,
        fromDate: fromIso,
      }));

      const params = new URLSearchParams({
        $select: 'instant_game_number,location_name,count(*) as claims,max(claim_paid_date) as last_paid',
        $where: `game_category='Scratch Tickets' AND location_zip='${normalizedZip}' AND claim_paid_date >= '${fromIso}T00:00:00'`,
        $group: 'instant_game_number,location_name',
        $order: 'claims DESC',
        $limit: '5000',
      });

      try {
        const response = await fetch(`https://data.texas.gov/resource/54pj-3dxy.json?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`ZIP activity request failed (${response.status})`);
        }

        const rows = (await response.json()) as Array<{
          instant_game_number?: string;
          location_name?: string;
          claims?: string;
          last_paid?: string;
        }>;

        const byGame: Record<string, ZipGameActivity> = {};
        let totalClaims = 0;
        let totalHebClaims = 0;
        let totalGasClaims = 0;

        rows.forEach((row) => {
          const gameNumber = String(row.instant_game_number ?? '').trim();
          if (!gameNumber) return;
          const locationName = String(row.location_name ?? '').trim();

          const claims = Number.parseInt(String(row.claims ?? '0'), 10);
          if (!Number.isFinite(claims) || claims <= 0) return;

          const heb = isHebRetailer(locationName);
          const gas = !heb && isGasRetailer(locationName);

          if (!byGame[gameNumber]) {
            byGame[gameNumber] = {
              claims: 0,
              hebClaims: 0,
              gasClaims: 0,
              otherClaims: 0,
              lastPaid: null,
            };
          }

          byGame[gameNumber].claims += claims;
          if (heb) {
            byGame[gameNumber].hebClaims += claims;
            totalHebClaims += claims;
          } else if (gas) {
            byGame[gameNumber].gasClaims += claims;
            totalGasClaims += claims;
          } else {
            byGame[gameNumber].otherClaims += claims;
          }

          const lastPaid = row.last_paid ?? null;
          if (lastPaid && (!byGame[gameNumber].lastPaid || lastPaid > byGame[gameNumber].lastPaid)) {
            byGame[gameNumber].lastPaid = lastPaid;
          }
          totalClaims += claims;
        });

        setZipActivity({
          status: 'ready',
          zipCode: normalizedZip,
          fromDate: fromIso,
          totalClaims,
          totalHebClaims,
          totalGasClaims,
          byGame,
          updatedAt: new Date().toISOString(),
          errorMessage: null,
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setZipActivity({
          status: 'error',
          zipCode: normalizedZip,
          fromDate: fromIso,
          totalClaims: 0,
          totalHebClaims: 0,
          totalGasClaims: 0,
          byGame: {},
          updatedAt: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [zipCode]);

  useEffect(() => {
    const normalizedZip = zipCode.trim();
    if (!/^\d{5}$/.test(normalizedZip)) {
      setZipMonthlyClaims({
        status: 'idle',
        zipCode: normalizedZip,
        fromDate: '',
        points: [],
        updatedAt: null,
        errorMessage: null,
      });
      return;
    }

    const start = new Date();
    start.setMonth(start.getMonth() - 11, 1);
    start.setHours(0, 0, 0, 0);
    const fromIso = start.toISOString().slice(0, 10);

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setZipMonthlyClaims((previous) => ({
        ...previous,
        status: 'loading',
        zipCode: normalizedZip,
        fromDate: fromIso,
      }));

      const params = new URLSearchParams({
        $select: 'date_trunc_ym(claim_paid_date) as month,count(*) as claims',
        $where: `game_category='Scratch Tickets' AND location_zip='${normalizedZip}' AND claim_paid_date >= '${fromIso}T00:00:00'`,
        $group: 'month',
        $order: 'month',
        $limit: '5000',
      });

      try {
        const response = await fetch(`https://data.texas.gov/resource/54pj-3dxy.json?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`ZIP monthly trend request failed (${response.status})`);
        }

        const rows = (await response.json()) as Array<{ month?: string; claims?: string }>;
        const claimsByMonth = new Map<string, number>();
        rows.forEach((row) => {
          const month = String(row.month ?? '').trim();
          if (!month) return;
          const key = month.slice(0, 7);
          const claims = Number.parseInt(String(row.claims ?? '0'), 10);
          claimsByMonth.set(key, Number.isFinite(claims) && claims > 0 ? claims : 0);
        });

        const points: Array<{ month: string; claims: number }> = [];
        for (let offset = 0; offset < 12; offset += 1) {
          const d = new Date(start);
          d.setMonth(start.getMonth() + offset);
          const key = monthKey(d);
          points.push({
            month: key,
            claims: claimsByMonth.get(key) ?? 0,
          });
        }

        setZipMonthlyClaims({
          status: 'ready',
          zipCode: normalizedZip,
          fromDate: fromIso,
          points,
          updatedAt: new Date().toISOString(),
          errorMessage: null,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setZipMonthlyClaims({
          status: 'error',
          zipCode: normalizedZip,
          fromDate: fromIso,
          points: [],
          updatedAt: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [zipCode]);

  const hasZipActivity = zipActivity.status === 'ready' && Object.keys(zipActivity.byGame).length > 0;
  const recommendationTarget: RecommendationTarget =
    objectiveMode === 'jackpotTop' ? 'topPrize' : objectiveMode === 'bestReturn' ? 'expectedValue' : 'highTier';

  const allRankedGames = useMemo<RankedGame[]>(() => {
    return rankGames({
      datasetGames: dataset.games,
      zipActivityByGame: zipActivity.byGame,
      hebMixPercent,
      gasMixPercent,
      localSort,
      hasZipActivity,
      objectiveMode,
      targetPrizeMultiplier,
      csvAsOfDate: dataset.source.csvAsOfDate
    });
  }, [
    gasMixPercent,
    hasZipActivity,
    hebMixPercent,
    localSort,
    objectiveMode,
    targetPrizeMultiplier,
    zipActivity.byGame,
  ]);

  const queryMatchedAllPricesRaw = useMemo<RankedGame[]>(() => {
    const searchText = query.trim().toLowerCase();
    return allRankedGames.filter((game) => {
      if (!searchText) return true;
      return (
        game.gameName.toLowerCase().includes(searchText) ||
        game.gameNumber.includes(searchText) ||
        String(game.ticketPrice).includes(searchText)
      );
    });
  }, [allRankedGames, query]);
  const visibleGameSet = useMemo(() => new Set(visibleGameNumbers), [visibleGameNumbers]);
  const applyVisibleGameFilter = visibleGamesOnly && visibleGameSet.size > 0;
  const visibleFilteredAllGames = useMemo(
    () => (applyVisibleGameFilter ? allRankedGames.filter((game) => visibleGameSet.has(game.gameNumber)) : allRankedGames),
    [allRankedGames, applyVisibleGameFilter, visibleGameSet],
  );
  const inventoryPickerCandidates = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    return allRankedGames
      .filter((game) => {
        if (!searchText) return true;
        return game.gameName.toLowerCase().includes(searchText) || game.gameNumber.includes(searchText);
      })
      .slice(0, 60);
  }, [allRankedGames, query]);
  const inventoryPickerGroups = useMemo(() => {
    const groups = new Map<number, RankedGame[]>();
    inventoryPickerCandidates.forEach((game) => {
      const list = groups.get(game.ticketPrice) ?? [];
      list.push(game);
      groups.set(game.ticketPrice, list);
    });
    return [...groups.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ticketPrice, games]) => ({ ticketPrice, games }));
  }, [inventoryPickerCandidates]);
  const queryMatchedAllPrices = useMemo(
    () =>
      applyVisibleGameFilter
        ? queryMatchedAllPricesRaw.filter((game) => visibleGameSet.has(game.gameNumber))
        : queryMatchedAllPricesRaw,
    [applyVisibleGameFilter, queryMatchedAllPricesRaw, visibleGameSet],
  );
  const rankedGames = useMemo<RankedGame[]>(() => {
    const searchText = query.trim().toLowerCase();
    return visibleFilteredAllGames.filter((game) => {
      if (selectedPrice !== 'all' && game.ticketPrice !== selectedPrice) return false;
      if (!searchText) return true;
      return (
        game.gameName.toLowerCase().includes(searchText) ||
        game.gameNumber.includes(searchText) ||
        String(game.ticketPrice).includes(searchText)
      );
    });
  }, [query, selectedPrice, visibleFilteredAllGames]);
  const customBudgetValue = (() => {
    const normalized = customBudgetInput.trim();
    if (!normalized) return null;
    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.min(parsed, 500);
  })();

  const resolvedActiveGameNumber = rankedGames.some((game) => game.gameNumber === activeGameNumber)
    ? activeGameNumber
    : (rankedGames[0]?.gameNumber ?? '');

  const activeGame = rankedGames.find((game) => game.gameNumber === resolvedActiveGameNumber) ?? null;
  const rankingScoreForGame = (game: RankedGame) =>
    localSort && hasZipActivity ? game.localWeightedObjectiveScore : game.objectiveScore;
  const rankingOddsForGame = (game: RankedGame) =>
    objectiveMode === 'bestReturn' ? null : probabilityToOdds(rankingScoreForGame(game) ?? 0);
  const rankingReturnForGame = (game: RankedGame) =>
    objectiveMode === 'bestReturn' ? rankingScoreForGame(game) : null;
  const rankingModeLabel =
    objectiveMode === 'bestReturn'
      ? `${localSort && hasZipActivity ? 'Retailer-mix weighted ' : ''}confidence-adjusted expected return per $1`
      : `${localSort && hasZipActivity ? 'Retailer-mix weighted ' : ''}confidence-adjusted lower-bound ${objectiveMode === 'jackpotTop' ? 'top prize odds' : `${targetPrizeMultiplier}x+ odds`}`;
  const bestGame = rankedGames.find((game) => rankingScoreForGame(game) !== null) ?? null;

  const budgetPlans = useMemo<BudgetPlanScenario[]>(
    () =>
      [
        ...BUDGET_SCENARIOS.map((budget) => ({ budget, isCustom: false })),
        ...(!BUDGET_SCENARIOS.includes(evPreviewBudget)
          ? [{ budget: evPreviewBudget, isCustom: customBudgetValue === evPreviewBudget }]
          : []),
        ...(customBudgetValue !== null && !BUDGET_SCENARIOS.includes(customBudgetValue)
          && customBudgetValue !== evPreviewBudget
          ? [{ budget: customBudgetValue, isCustom: true }]
          : []),
      ]
        .sort((a, b) => a.budget - b.budget)
        .map(({ budget, isCustom }) => {
        const strictExactPlan = buildBudgetPlan({
          budget,
          games: rankedGames,
          recommendationTarget,
          targetMultiplier: targetPrizeMultiplier,
          applyLocalBoost: localSort && hasZipActivity,
          requireExactSpend: true,
        });

        const strictUnderBudgetPlan =
          selectedPrice !== 'all' && !strictExactPlan
            ? buildBudgetPlan({
                budget,
                games: rankedGames,
                recommendationTarget,
                targetMultiplier: targetPrizeMultiplier,
                applyLocalBoost: localSort && hasZipActivity,
                requireExactSpend: false,
              })
            : null;

        const fallbackMixedExactPlan =
          selectedPrice !== 'all' && !strictExactPlan
            ? buildBudgetPlan({
                budget,
                games: queryMatchedAllPrices,
                recommendationTarget,
                targetMultiplier: targetPrizeMultiplier,
                applyLocalBoost: localSort && hasZipActivity,
                requireExactSpend: true,
              })
            : null;

        const fallbackUnderBudgetPlan =
          strictExactPlan || fallbackMixedExactPlan
            ? null
            : buildBudgetPlan({
                budget,
                games: rankedGames,
                recommendationTarget,
                targetMultiplier: targetPrizeMultiplier,
                applyLocalBoost: localSort && hasZipActivity,
                requireExactSpend: false,
              });

        const finalPlan = strictExactPlan ?? fallbackMixedExactPlan ?? fallbackUnderBudgetPlan;
        const usesMixedDenominations = Boolean(!strictExactPlan && fallbackMixedExactPlan && selectedPrice !== 'all');
        const remainderHintSource = usesMixedDenominations && strictUnderBudgetPlan ? strictUnderBudgetPlan : finalPlan;
        const remainder = remainderHintSource?.remainingBudget ?? 0;
        const denominationFillOptions =
          remainderHintSource && remainder > 0
            ? enumerateDenominationFillOptions(remainder, dataset.summary.ticketPrices, 4)
            : [];

        return {
          budget,
          isCustom,
          strictPlan: strictExactPlan,
          strictUnderBudgetPlan,
          finalPlan,
          usesMixedDenominations,
          denominationFillOptions,
        };
      }),
    [
      customBudgetValue,
      evPreviewBudget,
      hasZipActivity,
      localSort,
      queryMatchedAllPrices,
      rankedGames,
      recommendationTarget,
      selectedPrice,
      targetPrizeMultiplier,
    ],
  );

  const activeGameRank = activeGame
    ? rankedGames.findIndex((game) => game.gameNumber === activeGame.gameNumber) + 1
    : null;
  const activeGameRankingOdds = activeGame ? rankingOddsForGame(activeGame) : null;
  const activeGameRankingReturn = activeGame ? rankingReturnForGame(activeGame) : null;
  const evPreviewScenario = budgetPlans.find((scenario) => scenario.budget === evPreviewBudget) ?? null;
  const evPreviewPlan = evPreviewScenario?.finalPlan ?? null;
  const displayedBudgetPlans = machineMode
    ? budgetPlans.filter((scenario) => scenario.budget === evPreviewBudget)
    : budgetPlans;
  const effectiveWorkspaceView: WorkspaceView = machineMode ? 'buy' : workspaceView;
  const topTwoComparison = (() => {
    const scoredGames = rankedGames
      .map((game) => ({
        game,
        score: rankingScoreForGame(game),
      }))
      .filter((entry): entry is { game: RankedGame; score: number } => entry.score !== null)
      .slice(0, 2);

    if (scoredGames.length < 2) return null;

    const [leader, challenger] = scoredGames;
    const scoreDelta = leader.score - challenger.score;
    const relativeEdge = challenger.score > 0 ? scoreDelta / challenger.score : null;
    const leaderOdds = objectiveMode === 'bestReturn' ? null : probabilityToOdds(leader.score);
    const challengerOdds = objectiveMode === 'bestReturn' ? null : probabilityToOdds(challenger.score);

    return {
      leader: leader.game,
      challenger: challenger.game,
      scoreDelta,
      relativeEdge,
      leaderOdds,
      challengerOdds,
      leaderScore: leader.score,
      challengerScore: challenger.score,
    };
  })();

  const topLocalGames = useMemo(() => {
    return rankedGames
      .filter((game) => game.localSignalScore > 0)
      .sort((a, b) => b.localSignalScore - a.localSignalScore)
      .slice(0, 3);
  }, [rankedGames]);

  const historySnapshots = useMemo(() => {
    return [...history.snapshots].sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  const trendTotalTopPrizes = historySnapshots.map((snapshot) => ({
    label: snapshot.date,
    value: snapshot.totalTopPrizesRemaining,
  }));

  const selectedPriceTrend = historySnapshots.map((snapshot) => {
    if (selectedPrice === 'all') {
      return {
        label: snapshot.date,
        value: snapshot.bestOverall?.topPrizeOddsOneIn ?? null,
      };
    }

    const byPrice = snapshot.bestByPrice.find((entry) => entry.ticketPrice === selectedPrice);
    return {
      label: snapshot.date,
      value: byPrice?.topPrizeOddsOneIn ?? null,
    };
  });
  const zipMonthlyClaimTrend = zipMonthlyClaims.points.map((point) => ({
    label: monthLabel(`${point.month}-01`),
    value: point.claims,
  }));

  const coverageWithApprox = rankedGames.filter((game) => game.approxTicketsInGame !== null).length;
  const totalRemainingTopPrizes = rankedGames.reduce((sum, game) => sum + game.topPrizesRemaining, 0);
  const selectedPriceLabel = typeof selectedPrice === 'number' ? currency.format(selectedPrice) : null;

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">Texas Scratch Ticket Intelligence</p>
        <h1>Best high-prize shot, ranked by game, price, budget, and ZIP.</h1>
        <p className="subtitle">
          Data source: Texas Lottery scratch prize files + game detail pages. Local signal: recent claims near your ZIP.
        </p>

        <div className="stats-grid">
          <article>
            <p className="stat-label">Games tracked</p>
            <p className="stat-value">{number.format(dataset.summary.totalGames)}</p>
          </article>
          <article>
            <p className="stat-label">Top prizes left</p>
            <p className="stat-value">{number.format(totalRemainingTopPrizes)}</p>
          </article>
          <article>
            <p className="stat-label">Odds coverage</p>
            <p className="stat-value">
              {coverageWithApprox}/{rankedGames.length || dataset.summary.totalGames}
            </p>
          </article>
          <article>
            <p className="stat-label">Prize file date</p>
            <p className="stat-value">{formatDate(dataset.source.csvAsOfDate)}</p>
          </article>
        </div>
      </header>

      <section className="panel controls">
        <div className="control-row">
          <label htmlFor="search">Search game</label>
          <input
            id="search"
            placeholder="Game name or number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="control-row">
          <span>Mode</span>
          <div className="metric-toggle">
            <button
              type="button"
              className={machineMode ? 'chip active' : 'chip'}
              onClick={() => setMachineMode(true)}
            >
              Machine Mode
            </button>
            <button
              type="button"
              className={!machineMode ? 'chip active' : 'chip'}
              onClick={() => setMachineMode(false)}
            >
              Full Dashboard
            </button>
            <button
              type="button"
              className={showAdvancedControls ? 'chip active' : 'chip'}
              onClick={() => setShowAdvancedControls((value) => !value)}
            >
              {showAdvancedControls ? 'Advanced: ON' : 'Advanced'}
            </button>
          </div>
          <p className="tiny-note">
            Machine Mode focuses on budget, objective, visible games, and a single buy-now recommendation.
          </p>
        </div>

        <div className="control-row">
          <span>Decision budget</span>
          <div className="chips">
            {[
              ...BUDGET_SCENARIOS,
              ...(customBudgetValue !== null && !BUDGET_SCENARIOS.includes(customBudgetValue) ? [customBudgetValue] : []),
            ]
              .sort((a, b) => a - b)
              .map((budget) => (
                <button
                  key={`decision-budget-${budget}`}
                  type="button"
                  className={evPreviewBudget === budget ? 'chip active' : 'chip'}
                  onClick={() => setEvPreviewBudget(budget)}
                >
                  {currency.format(budget)}
                </button>
              ))}
          </div>
          <div className="zip-row">
            <label htmlFor="custom-budget-top" className="inline-mini-label">
              Custom
            </label>
            <input
              id="custom-budget-top"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="17"
              value={customBudgetInput}
              onChange={(event) => {
                const next = event.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) {
                  setEvPreviewBudget(Math.min(parsed, 500));
                }
              }}
            />
            <p className="tiny-note">
              {customBudgetValue !== null
                ? `Using ${currency.format(evPreviewBudget)} as your decision budget.`
                : 'Enter any whole-dollar amount (max $500).'}
            </p>
          </div>
        </div>

        {showAdvancedControls ? (
          <div className="control-row">
            <label htmlFor="zip">Purchase ZIP</label>
            <div className="zip-row">
              <input
                id="zip"
                value={zipCode}
                maxLength={5}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(event) => setZipCode(event.target.value.replace(/\D/g, '').slice(0, 5))}
              />
              <button
                type="button"
                className={localSort ? 'chip active' : 'chip'}
                onClick={() => setLocalSort((value) => !value)}
              >
                {localSort ? 'Retailer mix sort: ON' : 'Retailer mix sort: OFF'}
              </button>
            </div>
            <p className="tiny-note">
              {zipActivity.status === 'loading' && `Loading local claim activity for ${zipCode}...`}
              {zipActivity.status === 'ready' &&
                `${number.format(zipActivity.totalClaims)} claims since ${formatDate(zipActivity.fromDate)} (HEB ${number.format(zipActivity.totalHebClaims)}, gas/convenience ${number.format(zipActivity.totalGasClaims)}).`}
              {zipActivity.status === 'error' && `ZIP lookup failed: ${zipActivity.errorMessage}`}
              {zipActivity.status === 'idle' && 'Enter a 5-digit ZIP to use retailer mix weighting.'}
            </p>
          </div>
        ) : (
          <p className="tiny-note">
            Advanced weighting: ZIP {zipCode}, retailer mix {localSort ? 'ON' : 'OFF'}, HEB/Gas {hebMixPercent}/
            {gasMixPercent}.
          </p>
        )}
        {showAdvancedControls && (
          <>
            <div className="control-row">
              <label htmlFor="heb-mix">Purchase mix: HEB {hebMixPercent}% / Gas {gasMixPercent}%</label>
              <input
                id="heb-mix"
                type="range"
                min={0}
                max={100}
                step={5}
                value={hebMixPercent}
                onChange={(event) => setHebMixPercent(Number(event.target.value))}
              />
              <p className="tiny-note">
                Local signal score = (HEB claims x {hebMixPercent}%) + (gas claims x {gasMixPercent}%).
              </p>
            </div>
          </>
        )}

        <div className="control-row">
          <span>Ticket price query</span>
          <div className="chips">
            <button
              type="button"
              className={selectedPrice === 'all' ? 'chip active' : 'chip'}
              onClick={() => setSelectedPrice('all')}
            >
              All
            </button>
            {dataset.summary.ticketPrices.map((price) => (
              <button
                key={price}
                type="button"
                className={selectedPrice === price ? 'chip active' : 'chip'}
                onClick={() => setSelectedPrice(price)}
              >
                {currency.format(price)}
              </button>
            ))}
          </div>
        </div>

        <div className="control-row">
          <span>Objective mode</span>
          <div className="metric-toggle">
            <button
              type="button"
              className={objectiveMode === 'probability10x' ? 'chip active' : 'chip'}
              onClick={() => setObjectiveMode('probability10x')}
            >
              Hit {targetPrizeMultiplier}x+ Prize
            </button>
            <button
              type="button"
              className={objectiveMode === 'jackpotTop' ? 'chip active' : 'chip'}
              onClick={() => setObjectiveMode('jackpotTop')}
            >
              Hit Top Prize
            </button>
            <button
              type="button"
              className={objectiveMode === 'bestReturn' ? 'chip active' : 'chip'}
              onClick={() => setObjectiveMode('bestReturn')}
            >
              Best Return (EV)
            </button>
          </div>
          <p className="tiny-note">
            One objective drives both ranking and buy-plan optimization, so “Best now” and budget picks stay aligned.
          </p>
        </div>

        {objectiveMode === 'probability10x' && (
          <div className="control-row">
            <span>Probability target (for “Hit x+ Prize” mode)</span>
            <div className="chips">
              {PROBABILITY_TARGET_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={targetPrizeMultiplier === option ? 'chip active' : 'chip'}
                  onClick={() => setTargetPrizeMultiplier(option)}
                >
                  {option}x+
                </button>
              ))}
            </div>
            <p className="tiny-note">
              `2x+` means a prize at least double the ticket price (win your money back plus at least the same amount
              again).
            </p>
          </div>
        )}

        <div className="control-row">
          <span>Visible games (machine inventory proxy)</span>
          <div className="metric-toggle">
            <button
              type="button"
              className={visibleGamesOnly ? 'chip active' : 'chip'}
              onClick={() => setVisibleGamesOnly((value) => !value)}
            >
              {visibleGamesOnly ? 'Visible Games Only: ON' : 'Visible Games Only: OFF'}
            </button>
            {!machineMode && (
              <button
                type="button"
                className={showVisibleGamePicker ? 'chip active' : 'chip'}
                onClick={() => setShowVisibleGamePicker((value) => !value)}
              >
                {showVisibleGamePicker ? 'Hide Checklist' : 'Show Checklist'}
              </button>
            )}
            <button type="button" className="chip" onClick={() => setVisibleGameNumbers([])}>
              Clear
            </button>
            <button
              type="button"
              className="chip"
              onClick={() =>
                setVisibleGameNumbers((previous) => {
                  const merged = new Set(previous);
                  inventoryPickerCandidates.forEach((game) => merged.add(game.gameNumber));
                  return [...merged];
                })
              }
            >
              Select Listed
            </button>
          </div>
          <p className="tiny-note">
            {visibleGameNumbers.length > 0
              ? `${visibleGameNumbers.length} games selected. ${applyVisibleGameFilter ? 'Rankings and plans are restricted to selected visible games.' : 'Visible filter is off, so selections are stored but not applied.'}`
              : 'Select the games you can see in the machine to tighten recommendations.'}
          </p>
          {(machineMode || showVisibleGamePicker) && (
            <div className="inventory-group-list">
              {inventoryPickerGroups.map(({ ticketPrice, games }) => {
                const selectedCount = games.filter((game) => visibleGameSet.has(game.gameNumber)).length;
                const allInGroupSelected = selectedCount === games.length && games.length > 0;
                return (
                  <section key={`inv-group-${ticketPrice}`} className="inventory-group">
                    <div className="inventory-group-head">
                      <div>
                        <strong>{currency.format(ticketPrice)} Tickets</strong>
                        <span>
                          {selectedCount}/{games.length} selected
                        </span>
                      </div>
                      <div className="metric-toggle">
                        <button
                          type="button"
                          className={allInGroupSelected ? 'chip active' : 'chip'}
                          onClick={() =>
                            setVisibleGameNumbers((previous) => {
                              const merged = new Set(previous);
                              games.forEach((game) => merged.add(game.gameNumber));
                              return [...merged];
                            })
                          }
                        >
                          Select all {currency.format(ticketPrice)}
                        </button>
                        <button
                          type="button"
                          className="chip"
                          onClick={() =>
                            setVisibleGameNumbers((previous) =>
                              previous.filter((value) => !games.some((game) => game.gameNumber === value)),
                            )
                          }
                        >
                          Clear {currency.format(ticketPrice)}
                        </button>
                      </div>
                    </div>
                    <div className="inventory-chip-grid">
                      {games.map((game) => {
                        const selected = visibleGameSet.has(game.gameNumber);
                        return (
                          <button
                            key={`visible-${game.gameNumber}`}
                            type="button"
                            className={selected ? 'inventory-chip active' : 'inventory-chip'}
                            onClick={() =>
                              setVisibleGameNumbers((previous) =>
                                previous.includes(game.gameNumber)
                                  ? previous.filter((value) => value !== game.gameNumber)
                                  : [...previous, game.gameNumber],
                              )
                            }
                          >
                            <span>{currency.format(game.ticketPrice)}</span> {game.gameName} #{game.gameNumber}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {bestGame ? (
          <p className="best-note">
            Best now ({rankingModeLabel}): <strong>{bestGame.gameName}</strong> #{bestGame.gameNumber}{' '}
            {objectiveMode === 'bestReturn' ? (
              <>
                at <strong>{formatPerDollar(rankingReturnForGame(bestGame))} per $1</strong> (conservative EV)
              </>
            ) : (
              <>
                at <strong>{formatOdds(rankingOddsForGame(bestGame))}</strong>
              </>
            )}
            {bestGame.localSignalScore > 0
              ? ` • mix signal score: ${number.format(bestGame.localSignalScore)} (HEB ${bestGame.localHebClaims}, gas ${bestGame.localGasClaims})`
              : ''}
          </p>
        ) : (
          <p className="best-note">No games matched your current filters.</p>
        )}
        {evPreviewPlan && (
          <div className="best-note-budget">
            <p className="tiny-note">
              For your budget {currency.format(evPreviewBudget)}:{' '}
              <strong>
                {evPreviewPlan.lines
                  .map((line) => `${line.ticketCount}x ${currency.format(line.game.ticketPrice)} ${line.game.gameName}`)
                  .join(' + ')}
              </strong>{' '}
              (spend {currency.format(evPreviewPlan.spent)}
              {evPreviewPlan.exactSpend ? ', exact' : ''}).
            </p>
          </div>
        )}
        {objectiveMode === 'bestReturn' && (
          <div className="best-note-ev">
            <div className="best-note-ev-head">
              <span>EV quick-look for your budget ({currency.format(evPreviewBudget)})</span>
            </div>
            {evPreviewPlan ? (
              <p className="tiny-note">
                Conservative EV at {currency.format(evPreviewBudget)}:{' '}
                <strong>{formatDollars(evPreviewPlan.estimatedExpectedPayout)}</strong> expected payout (
                <strong>{formatDollars(evPreviewPlan.estimatedExpectedNet)}</strong> net,{' '}
                <strong>{formatPerDollar(evPreviewPlan.estimatedReturnPerDollar)} per $1</strong>)
                {evPreviewPlan.spent !== evPreviewBudget
                  ? ` using ${currency.format(evPreviewPlan.spent)} of ${currency.format(evPreviewBudget)}.`
                  : '.'}
              </p>
            ) : (
              <p className="tiny-note">
                No EV plan available for {currency.format(evPreviewBudget)} under current filters.
              </p>
            )}
          </div>
        )}
      </section>

      {!machineMode && (
        <section className="panel workspace-nav">
          <div className="metric-toggle">
            <button
              type="button"
              className={workspaceView === 'buy' ? 'chip active' : 'chip'}
              onClick={() => setWorkspaceView('buy')}
            >
              Buy Plan
            </button>
            <button
              type="button"
              className={workspaceView === 'rank' ? 'chip active' : 'chip'}
              onClick={() => setWorkspaceView('rank')}
            >
              Rankings
            </button>
            <button
              type="button"
              className={workspaceView === 'detail' ? 'chip active' : 'chip'}
              onClick={() => setWorkspaceView('detail')}
            >
              Game Detail
            </button>
          </div>
          <p className="tiny-note">
            {workspaceView === 'buy' && 'Focused playbook for what to buy at each budget.'}
            {workspaceView === 'rank' && 'See exactly why some games rank above others.'}
            {workspaceView === 'detail' && 'Deep-dive on the selected game.'}
          </p>
        </section>
      )}

      {effectiveWorkspaceView === 'buy' && (
        <>
          <section className="panel recommendations">
            <div className="section-header">
              <h2>{machineMode ? 'Machine Mode: Buy Now' : 'Budget Recommendations'}</h2>
              <p>
                Suggestions optimize this objective:{' '}
                <strong>{objectiveModeTitle(objectiveMode, targetPrizeMultiplier)}</strong>.
              </p>
            </div>
            <p className="tiny-note">
              Best now = best single-ticket score under this objective. Buy plan = best combined outcome under budget.
            </p>
            <p className="tiny-note">
              {selectedPrice === 'all'
                ? 'Price scope: all ticket prices are eligible and the optimizer will try to spend the full budget exactly.'
                : `Price scope preference: try an exact plan using only ${selectedPriceLabel ?? 'selected-price'} tickets first. If impossible, fall back to one exact mixed-denomination plan.`}
            </p>

            <div className="recommendation-grid">
              {displayedBudgetPlans.map(
                ({
                  budget,
                  isCustom,
                  strictPlan,
                  strictUnderBudgetPlan,
                  finalPlan,
                  usesMixedDenominations,
                  denominationFillOptions,
                }) => (
                <article key={budget} className="recommendation-card">
                  <h3>
                    If you have {currency.format(budget)}
                    {selectedPrice !== 'all' ? ` in ${selectedPriceLabel ?? 'selected-price'} tickets` : ''}
                    {isCustom ? ' (Custom)' : ''}
                  </h3>
                  {finalPlan ? (
                    <>
                      <p className="rec-main">
                        Buy{' '}
                        {finalPlan.lines
                          .map((line) => `${line.ticketCount}x ${currency.format(line.game.ticketPrice)} ${line.game.gameName}`)
                          .join(' + ')}
                        .
                      </p>
                      <p>
                        Spend: {currency.format(finalPlan.spent)}
                        {finalPlan.exactSpend ? ' (exact)' : ''}
                      </p>
                      {usesMixedDenominations && selectedPrice !== 'all' && (
                        <p className="tiny-note">
                          No exact plan using only {selectedPriceLabel ?? 'selected-price'} tickets. Switched to a single exact
                          mixed-denomination plan for the full {currency.format(budget)}.
                        </p>
                      )}
                      {!finalPlan.exactSpend && (
                        <p>
                          Unspent remainder: <strong>{currency.format(finalPlan.remainingBudget)}</strong>
                        </p>
                      )}
                      {finalPlan.recommendationTarget === 'expectedValue' ? (
                        <>
                          <p>
                            Conservative expected payout: {formatDollars(finalPlan.estimatedExpectedPayout)} (
                            {formatPerDollar(finalPlan.estimatedReturnPerDollar)} per $1 spent)
                          </p>
                          <p>Conservative expected net: {formatDollars(finalPlan.estimatedExpectedNet)}</p>
                        </>
                      ) : (
                        <>
                          <p>
                            Estimated chance of at least one {finalPlan.targetLabel}:{' '}
                            {percentage.format(finalPlan.estimatedPrimaryChance)}
                          </p>
                          <p>
                            Expected {finalPlan.targetLabel} wins: {finalPlan.expectedPrimaryWins.toFixed(3)}
                          </p>
                        </>
                      )}
                      {finalPlan.recommendationTarget === 'topPrize' && (
                        <p>
                          Estimated chance of at least one {targetPrizeMultiplier}x+ prize:{' '}
                          {percentage.format(finalPlan.estimatedHighPrizeChance)}
                        </p>
                      )}
                      <p>
                        Estimated chance of at least one top prize: {percentage.format(finalPlan.estimatedTopPrizeChance)}
                      </p>
                      {usesMixedDenominations &&
                        strictUnderBudgetPlan &&
                        strictUnderBudgetPlan.remainingBudget > 0 &&
                        denominationFillOptions.length > 0 && (
                          <p className="tiny-note">
                            If you stick to {selectedPriceLabel ?? 'selected-price'} tickets first, you would spend{' '}
                            {currency.format(strictUnderBudgetPlan.spent)} and have{' '}
                            {currency.format(strictUnderBudgetPlan.remainingBudget)} left. Fill examples:{' '}
                            {denominationFillOptions.join(' or ')}.
                          </p>
                        )}
                      {!usesMixedDenominations && !finalPlan.exactSpend && denominationFillOptions.length > 0 && (
                        <p className="tiny-note">
                          Remainder denomination options ({currency.format(finalPlan.remainingBudget)}):{' '}
                          {denominationFillOptions.join(' or ')}.
                        </p>
                      )}
                      <p className="tiny-note">
                        {finalPlan.localBoostApplied
                          ? `Mix boost applied (HEB/Gas ${hebMixPercent}/${gasMixPercent}) for ${finalPlan.localGamesInPool} of ${finalPlan.totalGamesInPool} eligible games in ZIP ${zipCode}.`
                          : `Mix boost not applied (Retailer mix sort is OFF). ${finalPlan.localGamesInPool} of ${finalPlan.totalGamesInPool} eligible games have mix signal in ZIP ${zipCode}.`}
                      </p>
                      {selectedPrice !== 'all' && strictPlan && strictPlan.exactSpend && (
                        <p className="tiny-note">Exact plan found using only {selectedPriceLabel ?? 'selected-price'} tickets.</p>
                      )}
                      {bestGame && budget >= bestGame.ticketPrice && (
                        <p className="tiny-note">
                          If you want to stick with “Best now” ticket ({bestGame.gameName}), buy{' '}
                          {Math.floor(budget / bestGame.ticketPrice)}x and spend{' '}
                          {currency.format(Math.floor(budget / bestGame.ticketPrice) * bestGame.ticketPrice)}.
                          {budget % bestGame.ticketPrice > 0
                            ? ` Remainder: ${currency.format(budget % bestGame.ticketPrice)}.`
                            : ''}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="tiny-note">No eligible game mix for this budget under current filters and strategy.</p>
                  )}
                </article>
              ),
            )}
            </div>
          </section>

          {!machineMode && (
            <section className="panel ranking-logic">
            <div className="section-header">
              <h2>How Ranking Works</h2>
              <p>Why one game ranks above another.</p>
            </div>
            <div className="logic-grid">
              <article>
                <h3>Primary score</h3>
                <p>
                  Ranked by <strong>{rankingModeLabel}</strong>.
                  {objectiveMode === 'bestReturn' ? ' Higher is better.' : ' Lower “1 in N” is better.'}
                </p>
              </article>
              <article>
                <h3>Confidence penalty</h3>
                <p>
                  Score uses lower-bound probabilities, then applies freshness + sample-size confidence. Games with
                  thin data are down-ranked.
                </p>
              </article>
              <article>
                <h3>Local weighting</h3>
                <p>
                  {localSort && hasZipActivity
                    ? `Applied. Boost is scaled by local confidence (signal strength + recency) using ${hebMixPercent}% HEB and ${gasMixPercent}% gas/convenience claims in ZIP ${zipCode}.`
                    : 'Not applied. Local boost is disabled.'}
                </p>
              </article>
              <article>
                <h3>Tie-breakers</h3>
                <p>If scores tie: higher retailer-mix signal, then more raw claims, then larger top prize.</p>
              </article>
            </div>
            </section>
          )}

          {!machineMode && (
            <section className="panel insights">
            <div className="section-header">
              <h2>ZIP {zipCode} Insights</h2>
              <p>Recent claim activity used as a practical “likely available nearby” signal.</p>
            </div>

            {topLocalGames.length > 0 ? (
              <div className="local-grid">
                {topLocalGames.map((game) => (
                  <article key={game.gameNumber}>
                    <h3>
                      {game.gameName} <span>#{game.gameNumber}</span>
                    </h3>
                    <p>
                      Local claims: <strong>{number.format(game.localClaims)}</strong>
                    </p>
                    <p>Last local paid claim: {formatDate(game.localLastPaid ? game.localLastPaid.slice(0, 10) : null)}</p>
                    <p>
                      {rankingModeLabel}:{' '}
                      {objectiveMode === 'bestReturn'
                        ? `${formatPerDollar(rankingReturnForGame(game))} per $1`
                        : formatOdds(rankingOddsForGame(game))}
                    </p>
                    <p>HEB/Gas signal: {number.format(game.localSignalScore)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="tiny-note">No local claim history available for this ZIP/time window yet.</p>
            )}
            </section>
          )}
        </>
      )}

      {effectiveWorkspaceView === 'rank' && (
        <>
          <section className="panel trend-panel">
            <div className="section-header">
              <h2>Snapshot Trends</h2>
              <p>
                Run <code>npm run refresh:data</code> periodically to build historical trends.
              </p>
            </div>

            <div className="trend-grid">
              <TrendChart title="Total Top Prizes Remaining" points={trendTotalTopPrizes} color="#0f766e" />
              <TrendChart
                title={
                  selectedPrice === 'all'
                    ? 'Best Overall Top-Prize Odds'
                    : `Best ${currency.format(selectedPrice)} Top-Prize Odds`
                }
                points={selectedPriceTrend}
                color="#ef6b3c"
              />
              <TrendChart title={`ZIP ${zipCode} Monthly Claims`} points={zipMonthlyClaimTrend} color="#8a5a1e" />
            </div>

            <p className="tiny-note">Snapshot count: {historySnapshots.length}</p>
            <p className="tiny-note">
              {zipMonthlyClaims.status === 'loading' && `Loading monthly ZIP trend for ${zipCode}...`}
              {zipMonthlyClaims.status === 'ready' &&
                `ZIP trend window: ${formatDate(zipMonthlyClaims.fromDate)} to now.`}
              {zipMonthlyClaims.status === 'error' && `ZIP trend error: ${zipMonthlyClaims.errorMessage}`}
            </p>
          </section>

          {topTwoComparison && (
            <section className="panel comparison-panel">
              <div className="section-header">
                <h2>Why #1 Beats #2</h2>
                <p>{objectiveModeTitle(objectiveMode, targetPrizeMultiplier)}</p>
              </div>

              <div className="comparison-grid">
                <article className="comparison-card winner">
                  <p className="comparison-rank">#1 Winner</p>
                  <h3>
                    {topTwoComparison.leader.gameName} <span>#{topTwoComparison.leader.gameNumber}</span>
                  </h3>
                  <p>
                    Final metric:{' '}
                    <strong>
                      {objectiveMode === 'bestReturn'
                        ? `${formatPerDollar(topTwoComparison.leaderScore)} per $1`
                        : formatOdds(topTwoComparison.leaderOdds)}
                    </strong>
                  </p>
                  <p>Confidence: {percentage.format(topTwoComparison.leader.confidenceFactor)}</p>
                  <p>
                    Mix signal: {number.format(topTwoComparison.leader.localSignalScore)} (HEB{' '}
                    {number.format(topTwoComparison.leader.localHebClaims)} / Gas{' '}
                    {number.format(topTwoComparison.leader.localGasClaims)})
                  </p>
                </article>

                <article className="comparison-card runner-up">
                  <p className="comparison-rank">#2 Runner-up</p>
                  <h3>
                    {topTwoComparison.challenger.gameName} <span>#{topTwoComparison.challenger.gameNumber}</span>
                  </h3>
                  <p>
                    Final metric:{' '}
                    <strong>
                      {objectiveMode === 'bestReturn'
                        ? `${formatPerDollar(topTwoComparison.challengerScore)} per $1`
                        : formatOdds(topTwoComparison.challengerOdds)}
                    </strong>
                  </p>
                  <p>Confidence: {percentage.format(topTwoComparison.challenger.confidenceFactor)}</p>
                  <p>
                    Mix signal: {number.format(topTwoComparison.challenger.localSignalScore)} (HEB{' '}
                    {number.format(topTwoComparison.challenger.localHebClaims)} / Gas{' '}
                    {number.format(topTwoComparison.challenger.localGasClaims)})
                  </p>
                </article>
              </div>

              <div className="comparison-reasons">
                <p>
                  <strong>Objective edge:</strong>{' '}
                  {objectiveMode === 'bestReturn'
                    ? `#1 shows ${formatPerDollar(topTwoComparison.scoreDelta)} higher expected return per $1 (${topTwoComparison.relativeEdge !== null ? percentage.format(topTwoComparison.relativeEdge) : 'N/A'} better).`
                    : `#1 has ${topTwoComparison.relativeEdge !== null ? percentage.format(topTwoComparison.relativeEdge) : 'N/A'} higher conservative hit probability for this objective.`}
                </p>
                <p>
                  <strong>Confidence edge:</strong> {percentage.format(topTwoComparison.leader.confidenceFactor)} vs{' '}
                  {percentage.format(topTwoComparison.challenger.confidenceFactor)} after freshness, sample-size, and
                  local-signal penalties.
                </p>
                <p>
                  <strong>Local edge:</strong> weighted signal{' '}
                  {number.format(topTwoComparison.leader.localSignalScore)} vs{' '}
                  {number.format(topTwoComparison.challenger.localSignalScore)} in ZIP {zipCode}.
                </p>
                {evPreviewPlan && (
                  <p>
                    <strong>Budget context ({currency.format(evPreviewBudget)}):</strong> current optimizer plan spends{' '}
                    {currency.format(evPreviewPlan.spent)} and includes{' '}
                    {evPreviewPlan.lines.map((line) => `${line.ticketCount}x ${line.game.gameName}`).join(' + ')}.
                  </p>
                )}
              </div>
            </section>
          )}

          <section className="panel table-panel">
            <div className="table-header">
              <h2>Leaderboard</h2>
              <p>{rankingModeLabel} with scoring breakdown</p>
            </div>
            <div className="table-actions">
              <button type="button" className="chip" onClick={() => setWorkspaceView('detail')}>
                Open Selected In Detail
              </button>
            </div>

            <div className="table-wrap leaderboard">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Game</th>
                    <th>Price</th>
                    <th>Top Prize</th>
                    <th>
                      <HeaderHelp
                        label="Top Left"
                        tip="How many top-prize tickets are still unclaimed for this game."
                      />
                    </th>
                    <th>
                      <HeaderHelp
                        label="Base Metric"
                        tip="Raw metric before confidence penalties. In EV mode, EV (expected value) means the average payout you would expect per $1 over many tickets."
                      />
                    </th>
                    <th>
                      <HeaderHelp
                        label="Conservative Metric"
                        tip="Lower-bound version of the base metric after risk adjustment to avoid over-rating thin/stale data. Uses the same units as Base Metric."
                      />
                    </th>
                    <th>
                      <HeaderHelp
                        label="Confidence"
                        tip="Combined confidence score from data freshness, sample size, and local signal quality."
                      />
                    </th>
                    <th>
                      <HeaderHelp
                        label="Mix Boost"
                        tip="Local store-mix adjustment from your HEB/Gas weighting and recent local claims."
                      />
                    </th>
                    <th>
                      <HeaderHelp
                        label="Final Rank Metric"
                        tip="The actual metric used for ordering. In odds modes, lower is better; in EV mode, higher is better."
                      />
                    </th>
                    <th>
                      <HeaderHelp
                        label="Mix Signal"
                        tip="Weighted local activity score for the game based on your HEB/Gas purchase mix."
                      />
                    </th>
                    <th>
                      <HeaderHelp
                        label={`Raw Claims (${zipCode})`}
                        tip="Total recent claim count for this game in the selected ZIP before mix weighting."
                      />
                    </th>
                    <th>
                      <HeaderHelp
                        label="Why"
                        tip="Quick explanation of the confidence math and local factors behind this game's rank."
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rankedGames.map((game, index) => (
                    <tr
                      key={game.gameNumber}
                      className={game.gameNumber === resolvedActiveGameNumber ? 'active-row' : ''}
                      onClick={() => setActiveGameNumber(game.gameNumber)}
                    >
                      <td>{rankingScoreForGame(game) !== null ? index + 1 : '-'}</td>
                      <td>
                        <div className="game-name">{game.gameName}</div>
                        <div className="game-meta">#{game.gameNumber}</div>
                      </td>
                      <td>{currency.format(game.ticketPrice)}</td>
                      <td>{currency.format(game.topPrizeAmount)}</td>
                      <td>{number.format(game.topPrizesRemaining)}</td>
                      <td>
                        {objectiveMode === 'bestReturn'
                          ? `${formatPerDollar(game.rawReturnPerDollar)} per $1`
                          : formatOdds(game.objectiveBaseOddsOneIn)}
                      </td>
                      <td>
                        {objectiveMode === 'bestReturn'
                          ? `${formatPerDollar(game.conservativeReturnPerDollar)} per $1`
                          : formatOdds(game.objectiveConservativeOddsOneIn)}
                      </td>
                      <td>{percentage.format(game.confidenceFactor)}</td>
                      <td>{`x${game.localBoostFactor.toFixed(2)}`}</td>
                      <td>
                        {objectiveMode === 'bestReturn'
                          ? `${formatPerDollar(rankingReturnForGame(game))} per $1`
                          : formatOdds(rankingOddsForGame(game))}
                      </td>
                      <td>{number.format(game.localSignalScore)}</td>
                      <td>{number.format(game.localClaims)}</td>
                      <td className="why-cell">
                        {game.objectiveScore === null
                          ? 'Missing odds inputs'
                          : localSort && hasZipActivity
                            ? `Conf ${percentage.format(game.confidenceFactor)} = Fresh ${percentage.format(game.freshnessConfidence)} x Sample ${percentage.format(game.evidenceConfidence)} x Local ${percentage.format(game.localConfidence)}`
                            : `Conf ${percentage.format(game.confidenceFactor)} = Fresh ${percentage.format(game.freshnessConfidence)} x Sample ${percentage.format(game.evidenceConfidence)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {effectiveWorkspaceView === 'detail' && (
        <section className="detail-grid">
          <article className="panel detail-main">
            <h2>Game Detail</h2>

            {activeGame ? (
              <>
                <h3>
                  {activeGame.gameName} <span>#{activeGame.gameNumber}</span>
                </h3>
                <div className="detail-kpis">
                  <p>
                    <span>Ticket price</span>
                    <strong>{currency.format(activeGame.ticketPrice)}</strong>
                  </p>
                  <p>
                    <span>Top-prize odds now</span>
                    <strong>{formatOdds(activeGame.topPrizeOddsOneIn)}</strong>
                  </p>
                  <p>
                    <span>High-prize odds ({targetPrizeMultiplier}x+)</span>
                    <strong>{formatOdds(activeGame.highTierOddsOneIn)}</strong>
                  </p>
                  <p>
                    <span>High-prize count ({currency.format(activeGame.highTierThreshold)}+)</span>
                    <strong>{number.format(activeGame.highTierRemaining)}</strong>
                  </p>
                  <p>
                    <span>Approx tickets in game</span>
                    <strong>{activeGame.approxTicketsInGame ? number.format(activeGame.approxTicketsInGame) : 'N/A'}</strong>
                  </p>
                  <p>
                    <span>Retailer-mix signal</span>
                    <strong>{number.format(activeGame.localSignalScore)}</strong>
                  </p>
                  <p>
                    <span>Raw claims in {zipCode}</span>
                    <strong>{number.format(activeGame.localClaims)}</strong>
                  </p>
                </div>

                <div className="detail-dates">
                  <p>Start date: {formatDate(activeGame.startDate)}</p>
                  <p>Close date: {formatDate(activeGame.closeDate)}</p>
                  <p>Prize data as of: {formatDate(activeGame.detailsAsOfDate ?? dataset.source.csvAsOfDate)}</p>
                </div>

                <div className="ranking-breakdown">
                  <p>
                    <span>Current rank</span>
                    <strong>{activeGameRank ? `#${activeGameRank} of ${rankedGames.length}` : 'N/A'}</strong>
                  </p>
                  <p>
                    <span>Base metric used</span>
                    <strong>
                      {objectiveMode === 'bestReturn'
                        ? `${formatPerDollar(activeGame.rawReturnPerDollar)} per $1`
                        : formatOdds(activeGame.objectiveBaseOddsOneIn)}
                    </strong>
                  </p>
                  <p>
                    <span>Mix boost factor</span>
                    <strong>{`x${activeGame.localBoostFactor.toFixed(2)} (HEB ${activeGame.localHebClaims}, Gas ${activeGame.localGasClaims})`}</strong>
                  </p>
                  <p>
                    <span>Final ranked metric</span>
                    <strong>
                      {objectiveMode === 'bestReturn'
                        ? `${formatPerDollar(activeGameRankingReturn)} per $1`
                        : formatOdds(activeGameRankingOdds)}
                    </strong>
                  </p>
                  <p>
                    <span>Confidence factor</span>
                    <strong>{percentage.format(activeGame.confidenceFactor)}</strong>
                  </p>
                </div>

                <div className="table-wrap compact">
                  <table>
                    <thead>
                      <tr>
                        <th>Prize</th>
                        <th>Printed</th>
                        <th>Claimed</th>
                        <th>Remaining</th>
                        <th>Remaining %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeGame.prizeLevels.map((level) => {
                        const remainingRatio = level.totalPrizes > 0 ? level.remainingPrizes / level.totalPrizes : 0;

                        return (
                          <tr key={`${activeGame.gameNumber}-${level.amount}`}>
                            <td>{currency.format(level.amount)}</td>
                            <td>{number.format(level.totalPrizes)}</td>
                            <td>{number.format(level.claimedPrizes)}</td>
                            <td>{number.format(level.remainingPrizes)}</td>
                            <td>{percentage.format(remainingRatio)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {activeGame.detailsUrl && (
                  <a href={activeGame.detailsUrl} target="_blank" rel="noreferrer" className="source-link">
                    Open official Texas Lottery game page
                  </a>
                )}
              </>
            ) : (
              <p>Select a game from the leaderboard.</p>
            )}
          </article>

          <aside className="panel notes">
            <h2>Method Notes</h2>
            <ul>
              <li>
                {objectiveMode === 'bestReturn'
                  ? 'Higher expected return per $1 is better.'
                  : 'Lower odds values are better (`1 in N`).'}
              </li>
              <li>EV = expected value: the average payout you would expect over many similar tickets (not a guarantee).</li>
              <li>
                {targetPrizeMultiplier}x+ mode uses prizes at or above {targetPrizeMultiplier}x the ticket price.
              </li>
              <li>Rankings use Wilson lower-bound probabilities with freshness/sample-size confidence penalties.</li>
              <li>
                Budget plans follow one objective mode at a time:{' '}
                {objectiveModeShortLabel(objectiveMode, targetPrizeMultiplier)}.
              </li>
              <li>Retailer-mix boost is a custom heuristic from ZIP claim history, not an official lottery odds rule.</li>
            </ul>
            <p className="meta">Dataset generated: {formatDateTime(dataset.generatedAt)}</p>
            <p className="meta">ZIP activity updated: {formatDateTime(zipActivity.updatedAt)}</p>
            <p className="meta">History updated: {formatDateTime(history.updatedAt)}</p>
          </aside>
        </section>
      )}
    </div>
  );
}

export default App;
