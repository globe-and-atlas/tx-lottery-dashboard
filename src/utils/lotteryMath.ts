export type PrizeLevel = {
  amount: number;
  totalPrizes: number;
  claimedPrizes: number;
  remainingPrizes: number;
};

export type Game = {
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

export type ObjectiveMode = 'probability10x' | 'jackpotTop' | 'bestReturn';
export type RecommendationTarget = 'highTier' | 'topPrize' | 'expectedValue';

export type ZipGameActivity = {
  claims: number;
  hebClaims: number;
  gasClaims: number;
  otherClaims: number;
  lastPaid: string | null;
};

export type RankedGame = Game & {
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

export type BudgetPlanLine = {
  game: RankedGame;
  ticketCount: number;
  spend: number;
  targetProbabilityPerTicket: number;
  highPrizeProbabilityPerTicket: number;
  topPrizeProbabilityPerTicket: number;
  expectedPayoutPerTicket: number;
  expectedNetPerTicket: number;
};

export type BudgetPlan = {
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

export type HistoryByPrice = {
  ticketPrice: number;
  gameNumber: string;
  gameName: string;
  topPrizeAmount: number;
  topPrizesRemaining: number;
  topPrizeOddsOneIn: number;
};

export type HistorySnapshot = {
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

export type HistoryDataset = {
  updatedAt: string | null;
  snapshots: HistorySnapshot[];
};

export type Dataset = {
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

export type WorkspaceView = 'buy' | 'rank' | 'detail';

export type ZipActivityState = {
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

export type ZipMonthlyClaimsState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  zipCode: string;
  fromDate: string;
  points: Array<{ month: string; claims: number }>;
  updatedAt: string | null;
  errorMessage: string | null;
};

export type BudgetPlanScenario = {
  budget: number;
  isCustom: boolean;
  strictPlan: BudgetPlan | null;
  strictUnderBudgetPlan: BudgetPlan | null;
  finalPlan: BudgetPlan | null;
  usesMixedDenominations: boolean;
  denominationFillOptions: string[];
};

export const WILSON_Z_80 = 1.2815515655446004;

export const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const daysSinceDateString = (isoDate: string | null) => {
  if (!isoDate) return null;
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const diff = now.getTime() - parsed.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

export const daysSinceTimestamp = (isoTimestamp: string | null) => {
  if (!isoTimestamp) return null;
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const diff = now.getTime() - parsed.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

export const probabilityToOdds = (probability: number) => {
  if (!Number.isFinite(probability) || probability <= 0) return null;
  return 1 / probability;
};

export const oddsToProbability = (odds: number | null) => {
  if (!odds || !Number.isFinite(odds) || odds <= 0) return 0;
  return 1 / odds;
};

export const wilsonLowerBoundProbability = (successes: number, totalTrials: number, z = WILSON_Z_80) => {
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

export const enumerateDenominationFillOptions = (remainder: number, ticketPrices: number[], limit = 3) => {
  if (remainder <= 0) return [] as string[];
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const usablePrices = [...new Set(ticketPrices.filter((price) => price > 0 && price <= remainder))].sort((a, b) => b - a);
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

export const isHebRetailer = (name: string) => /\bH[\s-]?E[\s-]?B\b|CENTRAL\s+MARKET/i.test(name);

export const isGasRetailer = (name: string) =>
  /SHELL|CHEVRON|EXXON|MOBIL|TEXACO|VALERO|CIRCLE\s*K|7-?ELEVEN|STRIPES|RACETRAC|RACEWAY|QT\b|QUICKTRIP|SUNOCO|ARCO|BP\b|CONOCO|PHILLIPS\s*66|MURPHY\s*(USA|EXPRESS)?|FOOD\s*MART|MINI\s*MART|CONVENIENCE|GAS/i.test(name);

export const objectiveModeTitle = (objectiveMode: ObjectiveMode, targetMultiplier: number) => {
  if (objectiveMode === 'jackpotTop') return 'Hit Top Prize (Jackpot Mode)';
  if (objectiveMode === 'bestReturn') return 'Best Return (EV Mode)';
  return `Hit ${targetMultiplier}x+ Prize (Probability Mode)`;
};

export const objectiveModeShortLabel = (objectiveMode: ObjectiveMode, targetMultiplier: number) => {
  if (objectiveMode === 'jackpotTop') return 'Top Prize';
  if (objectiveMode === 'bestReturn') return 'Best Return';
  return `${targetMultiplier}x+ Prize`;
};

export const recommendationTargetLabel = (target: RecommendationTarget, targetMultiplier: number) => {
  if (target === 'topPrize') return 'Top Prize';
  if (target === 'expectedValue') return 'Expected Return';
  return `${targetMultiplier}x+ Prize`;
};

export const rankGames = (params: {
  datasetGames: Game[];
  zipActivityByGame: Record<string, ZipGameActivity>;
  hebMixPercent: number;
  gasMixPercent: number;
  localSort: boolean;
  hasZipActivity: boolean;
  objectiveMode: ObjectiveMode;
  targetPrizeMultiplier: number;
  csvAsOfDate: string | null;
}): RankedGame[] => {
  const {
    datasetGames,
    zipActivityByGame,
    hebMixPercent,
    gasMixPercent,
    localSort,
    hasZipActivity,
    objectiveMode,
    targetPrizeMultiplier,
    csvAsOfDate,
  } = params;

  const hebWeight = hebMixPercent / 100;
  const gasWeight = gasMixPercent / 100;
  const claimsValues = Object.values(zipActivityByGame).map(
    (entry) => entry.hebClaims * hebWeight + entry.gasClaims * gasWeight,
  );
  const maxLocalClaims = claimsValues.length > 0 ? Math.max(...claimsValues) : 0;

  const mapped = datasetGames.map((game) => {
    const highTierThreshold = game.ticketPrice * targetPrizeMultiplier;
    const highTierRemaining = game.prizeLevels
      .filter((level) => level.amount >= highTierThreshold)
      .reduce((sum, level) => sum + level.remainingPrizes, 0);

    const approxTickets =
      game.approxTicketsInGame && Number.isFinite(game.approxTicketsInGame) && game.approxTicketsInGame > 0
        ? Math.round(game.approxTicketsInGame)
        : null;

    const estimatedTicketsRemaining = 
      game.overallOddsOneIn && game.totalWinningTicketsRemaining > 0 
        ? Math.round(game.totalWinningTicketsRemaining * game.overallOddsOneIn) 
        : (approxTickets && game.totalWinningTicketsPrinted > 0 ? Math.round(approxTickets * (game.totalWinningTicketsRemaining / game.totalWinningTicketsPrinted)) : null);

    const highTierOddsOneIn = estimatedTicketsRemaining !== null && highTierRemaining > 0 ? estimatedTicketsRemaining / highTierRemaining : null;
    const highTierProbabilityPerTicket = oddsToProbability(highTierOddsOneIn);
    const topPrizeProbabilityPerTicket = oddsToProbability(game.topPrizeOddsOneIn);

    const local = zipActivityByGame[game.gameNumber] ?? null;
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

    const dataAsOfDate = game.detailsAsOfDate ?? csvAsOfDate;
    const dataAgeDays = daysSinceDateString(dataAsOfDate);
    const freshnessConfidence =
      dataAgeDays === null ? 0.8 : clampNumber(Math.exp(-Math.max(dataAgeDays - 14, 0) / 180), 0.62, 1);
    const evidenceConfidence = approxTickets ? clampNumber(Math.log10(approxTickets + 10) / 6, 0.62, 1) : 0.62;
    const confidenceFactor = clampNumber(
      freshnessConfidence * evidenceConfidence * (localSort && hasZipActivity ? localConfidence : 1),
      0.2,
      1,
    );

    const highTierLowerBoundProbability = estimatedTicketsRemaining !== null && estimatedTicketsRemaining > 0
      ? wilsonLowerBoundProbability(highTierRemaining, estimatedTicketsRemaining)
      : 0;
    const topPrizeLowerBoundProbability = estimatedTicketsRemaining !== null && estimatedTicketsRemaining > 0
      ? wilsonLowerBoundProbability(game.topPrizesRemaining, estimatedTicketsRemaining)
      : 0;
    const anyPrizeLowerBoundProbability = estimatedTicketsRemaining !== null && estimatedTicketsRemaining > 0
      ? wilsonLowerBoundProbability(game.totalWinningTicketsRemaining, estimatedTicketsRemaining)
      : 0;

    const confidenceAdjustedHighPrizeProbability = highTierLowerBoundProbability * confidenceFactor;
    const confidenceAdjustedTopPrizeProbability = topPrizeLowerBoundProbability * confidenceFactor;
    const confidenceAdjustedAnyPrizeProbability = anyPrizeLowerBoundProbability * confidenceFactor;

    const highTierLowerBoundOddsOneIn = probabilityToOdds(confidenceAdjustedHighPrizeProbability);
    const topPrizeLowerBoundOddsOneIn = probabilityToOdds(confidenceAdjustedTopPrizeProbability);
    const anyPrizeLowerBoundOddsOneIn = probabilityToOdds(confidenceAdjustedAnyPrizeProbability);

    const rawExpectedValuePerTicket = estimatedTicketsRemaining !== null && estimatedTicketsRemaining > 0
      ? game.prizeLevels.reduce((sum, level) => sum + level.amount * (level.remainingPrizes / estimatedTicketsRemaining), 0)
      : 0;
    const rawReturnPerDollar = game.ticketPrice > 0 ? rawExpectedValuePerTicket / game.ticketPrice : 0;
    const conservativeExpectedValuePerTicket = estimatedTicketsRemaining !== null && estimatedTicketsRemaining > 0
      ? game.prizeLevels.reduce(
          (sum, level) => sum + level.amount * wilsonLowerBoundProbability(level.remainingPrizes, estimatedTicketsRemaining),
          0,
        ) * confidenceFactor
      : 0;
    const conservativeExpectedNetPerTicket = conservativeExpectedValuePerTicket - game.ticketPrice;
    const conservativeReturnPerDollar = game.ticketPrice > 0 ? conservativeExpectedValuePerTicket / game.ticketPrice : 0;

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
};

export const buildBudgetPlan = (params: {
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

      let utility = 0;
      if (recommendationTarget === 'expectedValue') {
        utility = game.conservativeReturnPerDollar * localMultiplier;
      } else {
        utility = -Math.log(Math.max(1 - targetProbabilityPerTicket, 1e-12));
      }

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

  const dp: Array<{ score: number; picks: Map<number, number> } | null> = Array.from({ length: budget + 1 }, () => null);
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

  const estimatedPrimaryChance = 1 - lines.reduce((failure, line) => failure * (1 - line.targetProbabilityPerTicket) ** line.ticketCount, 1);
  const estimatedHighPrizeChance = 1 - lines.reduce((failure, line) => failure * (1 - line.highPrizeProbabilityPerTicket) ** line.ticketCount, 1);
  const estimatedTopPrizeChance = 1 - lines.reduce((failure, line) => failure * (1 - line.topPrizeProbabilityPerTicket) ** line.ticketCount, 1);

  const expectedPrimaryWins = lines.reduce((sum, line) => sum + line.ticketCount * line.targetProbabilityPerTicket, 0);
  const estimatedExpectedPayout = lines.reduce((sum, line) => sum + line.ticketCount * line.expectedPayoutPerTicket, 0);
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
