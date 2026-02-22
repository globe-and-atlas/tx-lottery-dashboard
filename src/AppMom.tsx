import { useEffect, useMemo, useState } from 'react';
import datasetJson from './data/lottery-data.json';
import historyJson from './data/lottery-history.json';
import './AppMom.css';

type PrizeLevel = {
  amount: number;
  totalPrizes: number;
  claimedPrizes: number;
  remainingPrizes: number;
};

type Game = {
  gameNumber: string;
  gameName: string;
  startDate: string | null;
  closeDate: string | null;
  detailsUrl: string | null;
  ticketPrice: number;
  approxTicketsInGame: number | null;
  overallOddsOneIn: number | null;
  detailsAsOfDate: string | null;
  estimatedTotalTicketsAtLaunch: number | null;
  topPrizeAmount: number;
  topPrizesPrinted: number;
  topPrizesClaimed: number;
  topPrizesRemaining: number;
  topPrizeOddsOneIn: number | null;
  totalWinningTicketsPrinted: number;
  totalWinningTicketsClaimed: number;
  totalWinningTicketsRemaining: number;
  anyPrizeOddsOneIn: number | null;
  topPrizeMultiplier: number | null;
  prizeLevels: PrizeLevel[];
};

type Dataset = {
  generatedAt: string;
  source: {
    csvAsOfDate: string | null;
    detailPagesWithFetchErrors: number;
  };
  summary: {
    totalGames: number;
    ticketPrices: number[];
  };
  games: Game[];
};

type HistoryByPrice = {
  ticketPrice: number;
  gameNumber: string;
  gameName: string;
  topPrizeAmount: number;
  topPrizesRemaining: number;
  topPrizeOddsOneIn: number;
};

type HistorySnapshot = {
  date: string;
  generatedAt: string;
  csvAsOfDate: string | null;
  totalGames: number;
  totalTopPrizesRemaining: number;
  bestOverall: {
    gameNumber: string;
    gameName: string;
    ticketPrice: number;
    topPrizeAmount: number;
    topPrizesRemaining: number;
    topPrizeOddsOneIn: number;
  } | null;
  bestByPrice: HistoryByPrice[];
};

type HistoryDataset = {
  updatedAt: string | null;
  snapshots: HistorySnapshot[];
};

type ZipGameActivity = {
  claims: number;
  hebClaims: number;
  gasClaims: number;
  otherClaims: number;
  lastPaid: string | null;
};

type ZipActivityState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  zipCode: string;
  fromDate: string;
  totalClaims: number;
  totalHebClaims: number;
  totalGasClaims: number;
  byGame: Record<string, ZipGameActivity>;
  updatedAt: string | null;
  errorMessage: string | null;
};

type ZipMonthlyClaimsState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  zipCode: string;
  fromDate: string;
  points: Array<{ month: string; claims: number }>;
  updatedAt: string | null;
  errorMessage: string | null;
};

type ObjectiveMode = 'probability10x' | 'jackpotTop' | 'bestReturn';
type RecommendationTarget = 'highTier' | 'topPrize' | 'expectedValue';
type WorkspaceView = 'buy' | 'rank' | 'detail';

type RankedGame = Game & {
  highTierThreshold: number;
  highTierRemaining: number;
  highTierOddsOneIn: number | null;
  highTierLowerBoundOddsOneIn: number | null;
  topPrizeLowerBoundOddsOneIn: number | null;
  anyPrizeLowerBoundOddsOneIn: number | null;
  highTierProbabilityPerTicket: number;
  topPrizeProbabilityPerTicket: number;
  confidenceAdjustedHighPrizeProbability: number;
  confidenceAdjustedTopPrizeProbability: number;
  rawExpectedValuePerTicket: number;
  rawReturnPerDollar: number;
  conservativeExpectedValuePerTicket: number;
  conservativeExpectedNetPerTicket: number;
  conservativeReturnPerDollar: number;
  objectiveLabel: string;
  objectiveBaseOddsOneIn: number | null;
  objectiveConservativeOddsOneIn: number | null;
  objectiveScore: number | null;
  localClaims: number;
  localHebClaims: number;
  localGasClaims: number;
  localOtherClaims: number;
  localSignalScore: number;
  localLastPaid: string | null;
  freshnessConfidence: number;
  evidenceConfidence: number;
  localConfidence: number;
  confidenceFactor: number;
  localBoostFactor: number;
  localWeightedObjectiveScore: number | null;
};

type BudgetPlanLine = {
  game: RankedGame;
  ticketCount: number;
  spend: number;
  targetProbabilityPerTicket: number;
  highPrizeProbabilityPerTicket: number;
  topPrizeProbabilityPerTicket: number;
  expectedPayoutPerTicket: number;
  expectedNetPerTicket: number;
};

type BudgetPlan = {
  budget: number;
  spent: number;
  remainingBudget: number;
  exactSpend: boolean;
  recommendationTarget: RecommendationTarget;
  targetLabel: string;
  estimatedPrimaryChance: number;
  estimatedHighPrizeChance: number;
  estimatedTopPrizeChance: number;
  expectedPrimaryWins: number;
  estimatedExpectedPayout: number;
  estimatedExpectedNet: number;
  estimatedReturnPerDollar: number;
  localBoostApplied: boolean;
  localGamesInPool: number;
  totalGamesInPool: number;
  lines: BudgetPlanLine[];
};

type BudgetPlanScenario = {
  budget: number;
  isCustom: boolean;
  strictPlan: BudgetPlan | null;
  strictUnderBudgetPlan: BudgetPlan | null;
  finalPlan: BudgetPlan | null;
  usesMixedDenominations: boolean;
  denominationFillOptions: string[];
};

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
const WILSON_Z_80 = 1.2815515655446004;

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

const wilsonLowerBoundProbability = (successes: number, totalTrials: number, z = WILSON_Z_80) => {
  if (!Number.isFinite(successes) || !Number.isFinite(totalTrials) || totalTrials <= 0 || successes <= 0) {
    return 0;
  }

  const boundedSuccesses = clampNumber(successes, 0, totalTrials);
  const pHat = boundedSuccesses / totalTrials;
  const z2 = z * z;
  const denominator = 1 + z2 / totalTrials;
  const center = pHat + z2 / (2 * totalTrials);
  const margin = z * Math.sqrt((pHat * (1 - pHat) + z2 / (4 * totalTrials)) / totalTrials);
  return clampNumber((center - margin) / denominator, 0, 1);
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

export default function AppMom() {
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
    const hebWeight = hebMixPercent / 100;
    const gasWeight = gasMixPercent / 100;
    const claimsValues = Object.values(zipActivity.byGame).map(
      (entry) => entry.hebClaims * hebWeight + entry.gasClaims * gasWeight,
    );
    const maxLocalClaims = claimsValues.length > 0 ? Math.max(...claimsValues) : 0;

    const mapped = dataset.games.map((game) => {
      const highTierThreshold = game.ticketPrice * targetPrizeMultiplier;
      const highTierRemaining = game.prizeLevels
        .filter((level) => level.amount >= highTierThreshold)
        .reduce((sum, level) => sum + level.remainingPrizes, 0);
      const approxTickets =
        game.approxTicketsInGame && Number.isFinite(game.approxTicketsInGame) && game.approxTicketsInGame > 0
          ? Math.round(game.approxTicketsInGame)
          : null;

      const highTierOddsOneIn =
        approxTickets && highTierRemaining > 0 ? approxTickets / highTierRemaining : null;
      const highTierProbabilityPerTicket = oddsToProbability(highTierOddsOneIn);
      const topPrizeProbabilityPerTicket = oddsToProbability(game.topPrizeOddsOneIn);

      const local = zipActivity.byGame[game.gameNumber] ?? null;
      const localClaims = local?.claims ?? 0;
      const localHebClaims = local?.hebClaims ?? 0;
      const localGasClaims = local?.gasClaims ?? 0;
      const localOtherClaims = local?.otherClaims ?? 0;
      const localSignalScore = localHebClaims * hebWeight + localGasClaims * gasWeight;
      const localNormalized = maxLocalClaims > 0 ? localSignalScore / maxLocalClaims : 0;
      const signalSampleConfidence = hasZipActivity ? 1 - Math.exp(-localSignalScore / 12) : 0;
      const localAgeDays = daysSinceTimestamp(local?.lastPaid ?? null);
      const localRecencyConfidence = localAgeDays === null ? 0.55 : clampNumber(Math.exp(-localAgeDays / 180), 0.45, 1);
      const localConfidence =
        localSort && hasZipActivity
          ? clampNumber(0.45 + signalSampleConfidence * localRecencyConfidence * 0.55, 0.45, 1)
          : 1;

      const dataAsOfDate = game.detailsAsOfDate ?? dataset.source.csvAsOfDate;
      const dataAgeDays = daysSinceDateString(dataAsOfDate);
      const freshnessConfidence =
        dataAgeDays === null ? 0.8 : clampNumber(Math.exp(-Math.max(dataAgeDays - 14, 0) / 180), 0.62, 1);
      const evidenceConfidence = approxTickets ? clampNumber(Math.log10(approxTickets + 10) / 6, 0.62, 1) : 0.62;
      const confidenceFactor = clampNumber(
        freshnessConfidence * evidenceConfidence * (localSort && hasZipActivity ? localConfidence : 1),
        0.2,
        1,
      );

      const highTierLowerBoundProbability = approxTickets
        ? wilsonLowerBoundProbability(highTierRemaining, approxTickets)
        : 0;
      const topPrizeLowerBoundProbability = approxTickets
        ? wilsonLowerBoundProbability(game.topPrizesRemaining, approxTickets)
        : 0;
      const anyPrizeLowerBoundProbability = approxTickets
        ? wilsonLowerBoundProbability(game.totalWinningTicketsRemaining, approxTickets)
        : 0;

      const confidenceAdjustedHighPrizeProbability = highTierLowerBoundProbability * confidenceFactor;
      const confidenceAdjustedTopPrizeProbability = topPrizeLowerBoundProbability * confidenceFactor;
      const confidenceAdjustedAnyPrizeProbability = anyPrizeLowerBoundProbability * confidenceFactor;

      const highTierLowerBoundOddsOneIn = probabilityToOdds(confidenceAdjustedHighPrizeProbability);
      const topPrizeLowerBoundOddsOneIn = probabilityToOdds(confidenceAdjustedTopPrizeProbability);
      const anyPrizeLowerBoundOddsOneIn = probabilityToOdds(confidenceAdjustedAnyPrizeProbability);

      const rawExpectedValuePerTicket =
        approxTickets && approxTickets > 0
          ? game.prizeLevels.reduce((sum, level) => sum + level.amount * (level.remainingPrizes / approxTickets), 0)
          : 0;
      const rawReturnPerDollar = game.ticketPrice > 0 ? rawExpectedValuePerTicket / game.ticketPrice : 0;
      const conservativeExpectedValuePerTicket =
        approxTickets && approxTickets > 0
          ? game.prizeLevels.reduce(
              (sum, level) => sum + level.amount * wilsonLowerBoundProbability(level.remainingPrizes, approxTickets),
              0,
            ) * confidenceFactor
          : 0;
      const conservativeExpectedNetPerTicket = conservativeExpectedValuePerTicket - game.ticketPrice;
      const conservativeReturnPerDollar =
        game.ticketPrice > 0 ? conservativeExpectedValuePerTicket / game.ticketPrice : 0;

      let objectiveLabel = `${targetPrizeMultiplier}x+ Prize Odds`;
      let objectiveBaseOddsOneIn: number | null = highTierOddsOneIn;
      let objectiveConservativeOddsOneIn: number | null = highTierLowerBoundOddsOneIn;
      let objectiveScore: number | null = confidenceAdjustedHighPrizeProbability;

      if (objectiveMode === 'jackpotTop') {
        objectiveLabel = 'Top Prize Odds';
        objectiveBaseOddsOneIn = game.topPrizeOddsOneIn;
        objectiveConservativeOddsOneIn = topPrizeLowerBoundOddsOneIn;
        objectiveScore = confidenceAdjustedTopPrizeProbability;
      } else if (objectiveMode === 'bestReturn') {
        objectiveLabel = 'Expected Return';
        objectiveBaseOddsOneIn = null;
        objectiveConservativeOddsOneIn = null;
        objectiveScore = conservativeReturnPerDollar > 0 ? conservativeReturnPerDollar : null;
      }

      const localBoostFactor = 1 + localNormalized * localConfidence * 0.22;
      const localWeightedObjectiveScore =
        objectiveScore !== null ? objectiveScore * (localSort && hasZipActivity ? localBoostFactor : 1) : null;

      return {
        ...game,
        highTierThreshold,
        highTierRemaining,
        highTierOddsOneIn,
        highTierLowerBoundOddsOneIn,
        topPrizeLowerBoundOddsOneIn,
        anyPrizeLowerBoundOddsOneIn,
        highTierProbabilityPerTicket,
        topPrizeProbabilityPerTicket,
        confidenceAdjustedHighPrizeProbability,
        confidenceAdjustedTopPrizeProbability,
        rawExpectedValuePerTicket,
        rawReturnPerDollar,
        conservativeExpectedValuePerTicket,
        conservativeExpectedNetPerTicket,
        conservativeReturnPerDollar,
        objectiveLabel,
        objectiveBaseOddsOneIn,
        objectiveConservativeOddsOneIn,
        objectiveScore,
        localClaims,
        localHebClaims,
        localGasClaims,
        localOtherClaims,
        localSignalScore,
        localLastPaid: local?.lastPaid ?? null,
        freshnessConfidence,
        evidenceConfidence,
        localConfidence,
        confidenceFactor,
        localBoostFactor,
        localWeightedObjectiveScore,
      };
    });

    mapped.sort((a, b) => {
      const aMetric = localSort && hasZipActivity ? a.localWeightedObjectiveScore : a.objectiveScore;
      const bMetric = localSort && hasZipActivity ? b.localWeightedObjectiveScore : b.objectiveScore;

      if (aMetric === null && bMetric !== null) return 1;
      if (aMetric !== null && bMetric === null) return -1;
      if (aMetric !== null && bMetric !== null && aMetric !== bMetric) return bMetric - aMetric;

      if (b.localSignalScore !== a.localSignalScore) return b.localSignalScore - a.localSignalScore;
      if (b.localClaims !== a.localClaims) return b.localClaims - a.localClaims;
      if (b.topPrizeAmount !== a.topPrizeAmount) return b.topPrizeAmount - a.topPrizeAmount;
      if (b.topPrizesRemaining !== a.topPrizesRemaining) return b.topPrizesRemaining - a.topPrizesRemaining;

      return a.gameNumber.localeCompare(b.gameNumber, undefined, { numeric: true });
    });

    return mapped;
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
    <div className="mom-shell">
      <header className="mom-header">
        <h1>Treat Yourself</h1>
        <p>A little guided luxury. Texas scratch-offs, decoded just for you.</p>
        
        <div className="mom-hero-stats">
          <div className="mom-stat">
            <span className="val">{number.format(dataset.summary.totalGames)}</span>
            <span className="label">Tickets Found</span>
          </div>
          <div className="mom-stat">
            <span className="val">{number.format(totalRemainingTopPrizes)}</span>
            <span className="label">Grand Prizes Left</span>
          </div>
          <div className="mom-stat">
            <span className="val">{formatDate(dataset.source.csvAsOfDate)}</span>
            <span className="label">Last Updated</span>
          </div>
        </div>
      </header>

      <div className="mom-panel">
        <h2>Your Preferences</h2>

        <div className="mom-control-group">
          <label>Where are you shopping today?</label>
          <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
            <input className="mom-input" type="text" value={zipCode} maxLength={5} style={{width: "140px", textAlign: "center"}}
              onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Zip Code" />
            <button 
              className={`mom-chip ${localSort ? 'active' : ''}`}
              onClick={() => setLocalSort(v => !v)}>
              {localSort ? 'Curating Locally' : 'Statewide Results'}
            </button>
          </div>
        </div>

        <div className="mom-control-group">
          <label>Ticket Price Point</label>
          <div className="mom-chips">
            <button className={`mom-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>Any Price</button>
            {dataset.summary.ticketPrices.map(p => (
              <button key={p} className={`mom-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>${p}</button>
            ))}
          </div>
        </div>

        <div className="mom-control-group">
          <label>What are we hoping for?</label>
          <div className="mom-chips" style={{marginBottom: "16px"}}>
            <button className={`mom-chip ${objectiveMode === 'probability10x' ? 'active' : ''}`} onClick={() => setObjectiveMode('probability10x')}>A Nice Bonus</button>
            <button className={`mom-chip ${objectiveMode === 'jackpotTop' ? 'active' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>The Grand Prize</button>
            <button className={`mom-chip ${objectiveMode === 'bestReturn' ? 'active' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>Best Mathematical Value</button>
          </div>
          {objectiveMode === 'probability10x' && (
            <div style={{background: "var(--mom-bg)", padding: "16px", borderRadius: "16px", border: "1px solid var(--mom-border)"}}>
              <label>Minimum Expected Payout</label>
              <div className="mom-chips">
                {[2, 3, 5, 10, 20, 50].map(multiplier => (
                  <button 
                    key={multiplier} 
                    className={`mom-chip ${targetPrizeMultiplier === multiplier ? 'active' : ''}`} 
                    onClick={() => setTargetPrizeMultiplier(multiplier)}>
                    {multiplier}x Ticket Cost
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {bestGame && (
          <div className="mom-alert">
            <div className="mom-alert-title">Top Recommendation</div>
            <div className="mom-alert-text">
              Treat yourself to the <strong>{bestGame.gameName}</strong>! Enjoy a current rating of <strong>{objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}</strong>.
            </div>
          </div>
        )}
      </div>

      <div className="mom-tabs">
        <button className={workspaceView === 'buy' ? 'active' : ''} onClick={() => setWorkspaceView('buy')}>Shopping List</button>
        <button className={workspaceView === 'rank' ? 'active' : ''} onClick={() => setWorkspaceView('rank')}>Browse All Games</button>
      </div>

      {workspaceView === 'buy' && (
        <div>
          <div className="mom-panel" style={{marginBottom: "24px", textAlign: "center"}}>
            <label style={{display: "block", marginBottom: "12px", fontStyle: "italic", fontFamily: "var(--mom-font-serif)", fontSize: "1.1rem"}}>Have a specific budget in mind?</label>
            <div style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "8px"}}>
              <span style={{color: "var(--mom-accent)", fontSize: "1.4rem", fontFamily: "var(--mom-font-serif)"}}>$</span>
              <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="0" className="mom-input" style={{width: "100px", textAlign: "center"}} />
            </div>
            {customBudgetValue && <div style={{color: "var(--mom-accent)", fontSize: "0.9rem", marginTop: "12px"}}>Your custom shopping list is ready below!</div>}
          </div>

          {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
            <div key={budget} className={`mom-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'highlight' : ''}`}>
              <div className="mom-card-title">If you're spending {currency.format(budget)}</div>
              <div className="mom-card-content">
                {plan ? (
                  <>
                    <div className="mom-picks-list">
                      {plan.lines.map((line) => `${line.ticketCount}x ${line.game.gameName}`).join(' ✨ ')}
                    </div>
                    
                    <div className="mom-metric-row"><span className="mom-metric-label">Total Cost</span><span className="mom-metric-value">{currency.format(plan.spent)}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="mom-metric-row"><span className="mom-metric-label">Estimated Payout</span><span className="mom-metric-value good">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="mom-metric-row"><span className="mom-metric-label">Likelihood to Win</span><span className="mom-metric-value good">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="mom-metric-row"><span className="mom-metric-label">Jackpot Chance</span><span className="mom-metric-value">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{textAlign: "center", color: "var(--mom-text-medium)", fontStyle: "italic"}}>Budget is too low for current filters.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {workspaceView === 'rank' && (
        <div className="mom-leaderboard">
          {rankedGames.map((game, i) => {
            const rScore = rankingScoreForGame(game);
            const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
            
            return (
              <div key={game.gameNumber} className="mom-rank-item">
                <div className="mom-rank-number">{i + 1}</div>
                <div className="mom-rank-details">
                  <div className="mom-rank-title">{game.gameName}</div>
                  <div className="mom-rank-meta">Grand Prize: {formatDollars(game.topPrizeAmount)}</div>
                </div>
                <div className="mom-rank-score">
                  <span className="mom-rank-score-val">{scoreStr}</span>
                  <span className="mom-rank-price">{currency.format(game.ticketPrice)} per ticket</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  );
}
