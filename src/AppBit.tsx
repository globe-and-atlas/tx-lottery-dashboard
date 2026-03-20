import { useEffect, useMemo, useState } from 'react';
import datasetJson from './data/lottery-data.json';
import historyJson from './data/lottery-history.json';
import './AppBit.css';

import type {
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
} from './utils/lotteryMath';
import {
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
  buildBudgetPlan,
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

export default function AppBit() {
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
    <div className="bit-shell">
      <header className="bit-header">
        <h1>SCRATCH QUEST</h1>
        <p>PRESS START TO WIN <span className="bit-blink">_</span></p>
      </header>

      <div className="bit-panel">
        <div className="bit-panel-title">OPTIONS</div>
        
        <div className="bit-control-group">
          <label>&gt; ENTER ZONE (ZIP CODE)</label>
          <div style={{display: "flex", gap: "16px", alignItems: "center"}}>
            <input className="bit-input" type="text" value={zipCode} maxLength={5} style={{width: "140px", textAlign: "center"}}
              onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="00000" />
            <button 
              className={`bit-chip ${localSort ? 'active' : ''}`}
              onClick={() => setLocalSort(v => !v)}>
              {localSort ? '[ LOCAL ]' : '[ WORLD ]'}
            </button>
          </div>
        </div>

        <div className="bit-control-group">
          <label>&gt; SELECT GOLD SPENT (TICKET PRICE)</label>
          <div className="bit-chips">
            <button className={`bit-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>ALL</button>
            {dataset.summary.ticketPrices.map(p => (
              <button key={p} className={`bit-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>G{p}</button>
            ))}
          </div>
        </div>

        <div className="bit-control-group">
          <label>&gt; CHOOSE CAMPAIGN MODE</label>
          <div className="bit-chips" style={{marginBottom: "24px"}}>
            <button className={`bit-chip ${objectiveMode === 'probability10x' ? 'active' : ''}`} onClick={() => setObjectiveMode('probability10x')}>LOOT DROP</button>
            <button className={`bit-chip ${objectiveMode === 'jackpotTop' ? 'active' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>BOSS FIGHT(JKPT)</button>
            <button className={`bit-chip ${objectiveMode === 'bestReturn' ? 'active' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>EXP GRIND(EV)</button>
          </div>
          {objectiveMode === 'probability10x' && (
            <div style={{border: "4px dashed var(--bit-accent-cyan)", padding: "16px", marginTop: "16px"}}>
              <label style={{color: "var(--bit-accent-cyan)"}}>&gt; TARGET MULTIPLIER</label>
              <div className="bit-chips">
                {[2, 3, 5, 10, 20, 50].map(multiplier => (
                  <button 
                    key={multiplier} 
                    className={`bit-chip ${targetPrizeMultiplier === multiplier ? 'active' : ''}`} 
                    onClick={() => setTargetPrizeMultiplier(multiplier)}>
                    {multiplier}X
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {bestGame && (
          <div className="bit-alert">
            <div className="bit-alert-title">*** ITEM DISCOVERED ***</div>
            <div className="bit-alert-text">
              EQUIP: <span className="bit-highlight-text">{bestGame.gameName}</span><br/><br/>
              STATS: {objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}
            </div>
          </div>
        )}
      </div>

      <div className="bit-tabs">
        <button className={workspaceView === 'buy' ? 'active' : ''} onClick={() => setWorkspaceView('buy')}>INVENTORY (BUDGET)</button>
        <button className={workspaceView === 'rank' ? 'active' : ''} onClick={() => setWorkspaceView('rank')}>HIGH SCORES (ALL)</button>
      </div>

      {workspaceView === 'buy' && (
        <div>
          <div className="bit-panel" style={{marginBottom: "32px", textAlign: "center"}}>
            <label style={{display: "block", marginBottom: "16px", color: "var(--bit-accent-yellow)"}}>INSERT COIN (CUSTOM BUDGET)</label>
            <div style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "16px"}}>
              <span style={{fontSize: "2em", color: "var(--bit-accent-green)"}}>G</span>
              <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="0" className="bit-input" style={{width: "120px", textAlign: "center", fontSize: "1.5em"}} />
            </div>
          </div>

          {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
            <div key={budget} className={`bit-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'highlight' : ''}`}>
              <div className="bit-card-header">MAX GOLD: {budget}</div>
              <div>
                {plan ? (
                  <>
                    <div className="bit-picks-list">
                      {plan.lines.map((line) => `${line.ticketCount}x ${line.game.gameName}`).join(' + ')}
                    </div>
                    
                    <div className="bit-metric-row"><span className="bit-metric-label">GOLD SPENT</span><span className="bit-metric-val">{plan.spent}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="bit-metric-row"><span className="bit-metric-label">EST VALUE</span><span className="bit-metric-val good">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="bit-metric-row"><span className="bit-metric-label">WIN PROB</span><span className="bit-metric-val good">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="bit-metric-row"><span className="bit-metric-label">BOSS PROB</span><span className="bit-metric-val">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{textAlign: "center", color: "var(--bit-accent-red)"}}>NOT ENOUGH GOLD TO EQUIP</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {workspaceView === 'rank' && (
        <div className="bit-rank-list">
          {rankedGames.slice(0, 50).map((game, i) => {
            const rScore = rankingScoreForGame(game);
            const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
            
            return (
              <div key={game.gameNumber} className="bit-rank-item">
                <div className="bit-rank-number">
                  {i === 0 ? '1P' : i === 1 ? '2P' : i === 2 ? '3P' : `${i+1}.`}
                </div>
                <div style={{flex: 1}}>
                  <div className="bit-rank-title">{game.gameName}</div>
                  <div className="bit-rank-meta">PRIZE: {formatDollars(game.topPrizeAmount)} | GOLD: {game.ticketPrice}</div>
                </div>
                <div className="bit-rank-score">{scoreStr}</div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  );
}
