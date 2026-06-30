import type {
  CollateralPosition,
  BorrowPosition,
  RiskMetrics,
  ProtocolSnapshot,
  ScenarioAction,
  ScenarioInput,
  ScenarioResult,
  TargetHFInput,
  TargetHFResult,
  RepayWithCollateralInput,
  RepayWithCollateralResult,
  RepayWithCollateralWorstCase,
  LiquidationScenarioInput,
  LiquidationScenarioResult,
} from './types.js';

/**
 * Calculate Health Factor
 * HF = sum(collateral_usd * LT) / sum(borrow_usd)
 */
export function calculateHealthFactor(
  collaterals: CollateralPosition[],
  borrows: BorrowPosition[]
): number {
  const weightedCollateral = collaterals
    .filter((c) => c.enabled)
    .reduce((sum, c) => sum + c.valueUsd * c.liquidationThreshold, 0);

  const totalBorrow = borrows.reduce((sum, b) => sum + b.valueUsd, 0);

  if (totalBorrow === 0) return Infinity;
  return weightedCollateral / totalBorrow;
}

/**
 * Calculate liquidation price for a single collateral asset
 * P_liq = (B - C_other) / (amt * LT)
 * Where:
 *   B = total borrow USD
 *   C_other = sum of (other collaterals USD * their LT)
 *   amt = amount of this collateral
 *   LT = liquidation threshold of this collateral
 */
export function calculateLiquidationPrice(
  targetSymbol: string,
  collaterals: CollateralPosition[],
  borrows: BorrowPosition[],
  currentPrices: Record<string, number>
): number {
  const totalBorrow = borrows.reduce((sum, b) => sum + b.valueUsd, 0);
  if (totalBorrow === 0) return 0;

  const targetCollateral = collaterals.find(
    (c) => c.asset.symbol === targetSymbol && c.enabled
  );
  if (!targetCollateral || targetCollateral.amount === 0) return 0;

  // Sum of other collaterals' weighted value
  const otherWeightedValue = collaterals
    .filter((c) => c.enabled && c.asset.symbol !== targetSymbol)
    .reduce((sum, c) => sum + c.valueUsd * c.liquidationThreshold, 0);

  const liquidationPrice =
    (totalBorrow - otherWeightedValue) /
    (targetCollateral.amount * targetCollateral.liquidationThreshold);

  return Math.max(0, liquidationPrice);
}

/**
 * Calculate all risk metrics for a position
 */
export function calculateRiskMetrics(
  collaterals: CollateralPosition[],
  borrows: BorrowPosition[],
  prices: Record<string, number>
): RiskMetrics {
  const totalCollateralUsd = collaterals
    .filter((c) => c.enabled)
    .reduce((sum, c) => sum + c.valueUsd, 0);

  const totalBorrowUsd = borrows.reduce((sum, b) => sum + b.valueUsd, 0);

  const healthFactor = calculateHealthFactor(collaterals, borrows);

  // Calculate liquidation prices for all collateral assets
  const liquidationPrices: Record<string, number> = {};
  for (const collateral of collaterals.filter((c) => c.enabled)) {
    liquidationPrices[collateral.asset.symbol] = calculateLiquidationPrice(
      collateral.asset.symbol,
      collaterals,
      borrows,
      prices
    );
  }

  // Available borrow = weighted collateral - current borrow
  const weightedCollateral = collaterals
    .filter((c) => c.enabled)
    .reduce((sum, c) => sum + c.valueUsd * c.liquidationThreshold, 0);

  const availableBorrowUsd = Math.max(0, weightedCollateral - totalBorrowUsd);

  return {
    healthFactor,
    totalCollateralUsd,
    totalBorrowUsd,
    availableBorrowUsd,
    liquidationPrices,
  };
}

/**
 * Apply a scenario action to positions and prices
 */
function applyAction(
  collaterals: CollateralPosition[],
  borrows: BorrowPosition[],
  prices: Record<string, number>,
  action: ScenarioAction
): {
  collaterals: CollateralPosition[];
  borrows: BorrowPosition[];
  prices: Record<string, number>;
} {
  const newPrices = { ...prices };
  let newCollaterals = collaterals.map((c) => ({ ...c, asset: { ...c.asset } }));
  let newBorrows = borrows.map((b) => ({ ...b, asset: { ...b.asset } }));

  switch (action.type) {
    case 'priceShock': {
      const multiplier = 1 + action.pctChange / 100;
      newPrices[action.symbol] = (prices[action.symbol] || 0) * multiplier;
      // Update collateral values
      newCollaterals = newCollaterals.map((c) => {
        if (c.asset.symbol === action.symbol) {
          return { ...c, valueUsd: c.amount * newPrices[action.symbol] };
        }
        return c;
      });
      // Update borrow values (for non-stablecoin borrows)
      newBorrows = newBorrows.map((b) => {
        if (b.asset.symbol === action.symbol) {
          return { ...b, valueUsd: b.amount * newPrices[action.symbol] };
        }
        return b;
      });
      break;
    }

    case 'repay': {
      const borrowIdx = newBorrows.findIndex(
        (b) => b.asset.symbol === action.symbol
      );
      if (borrowIdx !== -1) {
        const currentBorrow = newBorrows[borrowIdx];
        const repayUsd = action.amount * (prices[action.symbol] || 1);
        const newValueUsd = Math.max(0, currentBorrow.valueUsd - repayUsd);
        const newAmount =
          prices[action.symbol] > 0 ? newValueUsd / prices[action.symbol] : 0;
        newBorrows[borrowIdx] = {
          ...currentBorrow,
          amount: newAmount,
          valueUsd: newValueUsd,
        };
      }
      break;
    }

    case 'borrow': {
      const borrowIdx = newBorrows.findIndex(
        (b) => b.asset.symbol === action.symbol
      );
      if (borrowIdx !== -1) {
        const currentBorrow = newBorrows[borrowIdx];
        const borrowUsd = action.amount * (prices[action.symbol] || 1);
        newBorrows[borrowIdx] = {
          ...currentBorrow,
          amount: currentBorrow.amount + action.amount,
          valueUsd: currentBorrow.valueUsd + borrowUsd,
        };
      }
      break;
    }

    case 'addCollateral': {
      const colIdx = newCollaterals.findIndex(
        (c) => c.asset.symbol === action.symbol
      );
      if (colIdx !== -1) {
        const current = newCollaterals[colIdx];
        const addUsd = action.amount * (prices[action.symbol] || 0);
        newCollaterals[colIdx] = {
          ...current,
          amount: current.amount + action.amount,
          valueUsd: current.valueUsd + addUsd,
        };
      }
      break;
    }

    case 'withdrawCollateral': {
      const colIdx = newCollaterals.findIndex(
        (c) => c.asset.symbol === action.symbol
      );
      if (colIdx !== -1) {
        const current = newCollaterals[colIdx];
        const withdrawUsd = action.amount * (prices[action.symbol] || 0);
        newCollaterals[colIdx] = {
          ...current,
          amount: Math.max(0, current.amount - action.amount),
          valueUsd: Math.max(0, current.valueUsd - withdrawUsd),
        };
      }
      break;
    }
  }

  return { collaterals: newCollaterals, borrows: newBorrows, prices: newPrices };
}

/**
 * Simulate a scenario and return the result
 */
export function simulateScenario(
  snapshot: ProtocolSnapshot,
  scenario: ScenarioInput,
  prices: Record<string, number>
): ScenarioResult {
  const original = calculateRiskMetrics(
    snapshot.collaterals,
    snapshot.borrows,
    prices
  );

  let currentCollaterals = snapshot.collaterals;
  let currentBorrows = snapshot.borrows;
  let currentPrices = prices;

  // Apply all actions in sequence
  for (const action of scenario.actions) {
    const result = applyAction(
      currentCollaterals,
      currentBorrows,
      currentPrices,
      action
    );
    currentCollaterals = result.collaterals;
    currentBorrows = result.borrows;
    currentPrices = result.prices;
  }

  const simulated = calculateRiskMetrics(
    currentCollaterals,
    currentBorrows,
    currentPrices
  );

  return {
    original,
    simulated,
    delta: {
      healthFactor: simulated.healthFactor - original.healthFactor,
      totalCollateralUsd:
        simulated.totalCollateralUsd - original.totalCollateralUsd,
      totalBorrowUsd: simulated.totalBorrowUsd - original.totalBorrowUsd,
    },
  };
}

export function simulateRepayWithCollateral(
  input: RepayWithCollateralInput
): RepayWithCollateralResult {
  const {
    snapshot,
    prices,
    borrowSymbol,
    collateralSymbol,
    repayAmount,
    quoteCollateralPerBorrowUnit,
    slippagePct = 0,
  } = input;

  const originalSimulation = simulateScenario(snapshot, { actions: [] }, prices);
  const borrowPrice = prices[borrowSymbol] || 1;
  const collateralPrice = prices[collateralSymbol] || 0;
  const baseRate = quoteCollateralPerBorrowUnit
    ?? (collateralPrice > 0 ? borrowPrice / collateralPrice : 0);
  const worstCaseRate = baseRate * (1 + slippagePct / 100);

  const collateral = snapshot.collaterals.find(
    (position) => position.asset.symbol === collateralSymbol
  );
  const borrow = snapshot.borrows.find(
    (position) => position.asset.symbol === borrowSymbol
  );
  const currentCollateralAmount = collateral?.amount || 0;

  const emptyResult: RepayWithCollateralResult = {
    quoteCollateralPerBorrowUnit: 0,
    effectiveCollateralPerBorrowUnit: 0,
    collateralSoldAmount: 0,
    remainingCollateralAmount: currentCollateralAmount,
    simulation: originalSimulation,
    worstCase: {
      effectiveCollateralPerBorrowUnit: 0,
      collateralSoldAmount: 0,
      remainingCollateralAmount: currentCollateralAmount,
      simulation: originalSimulation,
    },
  };

  if (!borrow || !collateral || repayAmount <= 0 || baseRate <= 0 || !isFinite(baseRate)) {
    return emptyResult;
  }

  const buildScenario = (
    rate: number
  ): RepayWithCollateralWorstCase => {
    const collateralSoldAmount = repayAmount * rate;
    const remainingCollateralAmount = Math.max(
      0,
      currentCollateralAmount - collateralSoldAmount
    );

    const simulation = simulateScenario(
      snapshot,
      {
        actions: [
          { type: 'withdrawCollateral', symbol: collateralSymbol, amount: collateralSoldAmount },
          { type: 'repay', symbol: borrowSymbol, amount: repayAmount },
        ],
      },
      prices
    );

    return {
      effectiveCollateralPerBorrowUnit: rate,
      collateralSoldAmount,
      remainingCollateralAmount,
      simulation,
    };
  };

  const quoteScenario = buildScenario(baseRate);
  const worstCase = buildScenario(worstCaseRate);

  return {
    quoteCollateralPerBorrowUnit: baseRate,
    effectiveCollateralPerBorrowUnit: baseRate,
    collateralSoldAmount: quoteScenario.collateralSoldAmount,
    remainingCollateralAmount: quoteScenario.remainingCollateralAmount,
    simulation: quoteScenario.simulation,
    worstCase,
  };
}

export function simulateLiquidationScenario(
  input: LiquidationScenarioInput
): LiquidationScenarioResult {
  const {
    snapshot,
    prices,
    borrowSymbol,
    collateralSymbol,
    collateralPriceChangePct = 0,
    liquidationPenaltyPct = 10,
    closeFactorPct = 50,
    targetHealthFactor = 1.01,
  } = input;

  const priceShockAction: ScenarioAction = {
    type: 'priceShock',
    symbol: collateralSymbol,
    pctChange: collateralPriceChangePct,
  };
  const shockedSimulation = collateralPriceChangePct !== 0
    ? simulateScenario(snapshot, { actions: [priceShockAction] }, prices)
    : simulateScenario(snapshot, { actions: [] }, prices);

  const baseCollateralPrice = prices[collateralSymbol] || 0;
  const collateralPrice = baseCollateralPrice * (1 + collateralPriceChangePct / 100);
  const borrowPrice = prices[borrowSymbol] || 1;
  const collateral = snapshot.collaterals.find(
    (position) => position.asset.symbol === collateralSymbol && position.enabled
  );
  const borrow = snapshot.borrows.find(
    (position) => position.asset.symbol === borrowSymbol
  );
  const totalBorrowUsd = shockedSimulation.simulated.totalBorrowUsd;
  const weightedCollateralUsd = shockedSimulation.simulated.healthFactor * totalBorrowUsd;
  const healthFactorBefore = shockedSimulation.simulated.healthFactor;
  const atRisk = healthFactorBefore <= 1;
  const currentCollateralAmount = collateral?.amount || 0;

  const buildEmptyOutcome = (mode: 'minimumToRestore' | 'maxCloseFactor', label: string) => ({
    mode,
    label,
    debtRepaidUsd: 0,
    collateralSeizedAmount: 0,
    collateralSeizedUsd: 0,
    penaltyCollateralAmount: 0,
    penaltyUsd: 0,
    remainingCollateralAmount: currentCollateralAmount,
    healthFactorAfter: healthFactorBefore,
    cappedByCloseFactor: false,
    mayNeedAdditionalLiquidation: atRisk,
    simulation: shockedSimulation,
  });

  const emptyMinimum = buildEmptyOutcome('minimumToRestore', 'Minimum restore-to-healthy');
  const emptyMax = buildEmptyOutcome('maxCloseFactor', 'Max close-factor');

  const emptyResult: LiquidationScenarioResult = {
    atRisk,
    healthFactorBefore,
    collateralPrice,
    collateralPriceChangePct,
    closeFactorPct,
    liquidationPenaltyPct,
    maxDebtRepayUsd: 0,
    repayToTargetUsd: 0,
    minimumToRestore: emptyMinimum,
    maxCloseFactor: emptyMax,
    estimatedDebtRepaidUsd: 0,
    collateralSeizedAmount: 0,
    collateralSeizedUsd: 0,
    penaltyCollateralAmount: 0,
    penaltyUsd: 0,
    remainingCollateralAmount: currentCollateralAmount,
    healthFactorAfter: healthFactorBefore,
    cappedByCloseFactor: false,
    mayNeedAdditionalLiquidation: atRisk,
    simulation: shockedSimulation,
  };

  if (!collateral || !borrow || collateralPrice <= 0 || totalBorrowUsd <= 0 || !isFinite(healthFactorBefore)) {
    return emptyResult;
  }

  const penaltyRate = liquidationPenaltyPct / 100;
  const penaltyMultiplier = 1 + penaltyRate;
  const closeFactor = closeFactorPct / 100;
  const maxDebtRepayUsd = Math.max(0, borrow.valueUsd * closeFactor);
  const maxRepayByCollateralUsd = Math.max(0, (currentCollateralAmount * collateralPrice) / penaltyMultiplier);
  const denominator = targetHealthFactor - penaltyMultiplier * collateral.liquidationThreshold;
  const repayToTargetUsd = atRisk && denominator > 0
    ? Math.max(0, (targetHealthFactor * totalBorrowUsd - weightedCollateralUsd) / denominator)
    : 0;

  const buildOutcome = (
    mode: 'minimumToRestore' | 'maxCloseFactor',
    label: string,
    desiredDebtRepayUsd: number
  ) => {
    const debtRepaidUsd = atRisk
      ? Math.min(maxDebtRepayUsd, maxRepayByCollateralUsd, Math.max(0, desiredDebtRepayUsd))
      : 0;
    const collateralSeizedUsd = debtRepaidUsd * penaltyMultiplier;
    const collateralSeizedAmount = collateralSeizedUsd / collateralPrice;
    const penaltyUsd = debtRepaidUsd * penaltyRate;
    const penaltyCollateralAmount = penaltyUsd / collateralPrice;
    const remainingCollateralAmount = Math.max(0, currentCollateralAmount - collateralSeizedAmount);
    const repayAmount = borrowPrice > 0 ? debtRepaidUsd / borrowPrice : 0;
    const actions: ScenarioAction[] = collateralPriceChangePct !== 0 ? [priceShockAction] : [];

    if (debtRepaidUsd > 0) {
      actions.push(
        { type: 'withdrawCollateral', symbol: collateralSymbol, amount: collateralSeizedAmount },
        { type: 'repay', symbol: borrowSymbol, amount: repayAmount }
      );
    }

    const simulation = simulateScenario(snapshot, { actions }, prices);
    const healthFactorAfter = simulation.simulated.healthFactor;

    return {
      mode,
      label,
      debtRepaidUsd,
      collateralSeizedAmount,
      collateralSeizedUsd,
      penaltyCollateralAmount,
      penaltyUsd,
      remainingCollateralAmount,
      healthFactorAfter,
      cappedByCloseFactor: atRisk && desiredDebtRepayUsd > maxDebtRepayUsd,
      mayNeedAdditionalLiquidation: atRisk && healthFactorAfter <= 1,
      simulation,
    };
  };

  const minimumToRestore = buildOutcome(
    'minimumToRestore',
    `Minimum restore-to-HF ${targetHealthFactor.toFixed(2)}`,
    repayToTargetUsd
  );
  const maxCloseFactor = buildOutcome(
    'maxCloseFactor',
    'Max close-factor liquidation',
    maxDebtRepayUsd
  );

  // Backward-compatible top-level fields keep the older minimum-restore estimate.
  return {
    atRisk,
    healthFactorBefore,
    collateralPrice,
    collateralPriceChangePct,
    closeFactorPct,
    liquidationPenaltyPct,
    maxDebtRepayUsd,
    repayToTargetUsd,
    minimumToRestore,
    maxCloseFactor,
    estimatedDebtRepaidUsd: minimumToRestore.debtRepaidUsd,
    collateralSeizedAmount: minimumToRestore.collateralSeizedAmount,
    collateralSeizedUsd: minimumToRestore.collateralSeizedUsd,
    penaltyCollateralAmount: minimumToRestore.penaltyCollateralAmount,
    penaltyUsd: minimumToRestore.penaltyUsd,
    remainingCollateralAmount: minimumToRestore.remainingCollateralAmount,
    healthFactorAfter: minimumToRestore.healthFactorAfter,
    cappedByCloseFactor: minimumToRestore.cappedByCloseFactor,
    mayNeedAdditionalLiquidation: minimumToRestore.mayNeedAdditionalLiquidation,
    simulation: minimumToRestore.simulation,
  };
}

/**
 * Calculate how much to repay or add as collateral to reach a target HF
 *
 * For repay: targetHF = weightedCollateral / (currentBorrow - repayAmount)
 * => repayAmount = currentBorrow - (weightedCollateral / targetHF)
 *
 * For add collateral: targetHF = (weightedCollateral + addAmount * LT) / currentBorrow
 * => addAmount = (targetHF * currentBorrow - weightedCollateral) / LT
 */
export function calculateTargetHF(input: TargetHFInput): TargetHFResult {
  const { targetHF, snapshot, prices } = input;

  const weightedCollateral = snapshot.collaterals
    .filter((c) => c.enabled)
    .reduce((sum, c) => sum + c.valueUsd * c.liquidationThreshold, 0);

  const currentBorrow = snapshot.borrows.reduce((sum, b) => sum + b.valueUsd, 0);

  if (currentBorrow === 0) {
    return {};
  }

  const currentHF = weightedCollateral / currentBorrow;

  if (targetHF <= currentHF) {
    return {}; // Already at or above target
  }

  // Option 1: Repay debt (assume USDC at $1)
  const requiredWeightedForTarget = targetHF * currentBorrow;
  const repayAmountUsd = currentBorrow - weightedCollateral / targetHF;

  // Option 2: Add collateral (assume CRO)
  const croCollateral = snapshot.collaterals.find(
    (c) => c.asset.symbol === 'CRO'
  );
  const croPrice = prices['CRO'] || 0;
  const croLT = croCollateral?.liquidationThreshold || 0.75;

  let addCollateralAmountCRO = 0;
  if (croPrice > 0 && croLT > 0) {
    const additionalWeightedNeeded = requiredWeightedForTarget - weightedCollateral;
    const additionalValueNeeded = additionalWeightedNeeded / croLT;
    addCollateralAmountCRO = additionalValueNeeded / croPrice;
  }

  return {
    repayAmount:
      repayAmountUsd > 0
        ? { symbol: 'USDC', amount: repayAmountUsd }
        : undefined,
    addCollateralAmount:
      addCollateralAmountCRO > 0
        ? { symbol: 'CRO', amount: addCollateralAmountCRO }
        : undefined,
  };
}

/**
 * Calculate buffer percentage (how far from liquidation)
 * Buffer = (HF - 1) / 1 * 100
 */
export function calculateBufferPercentage(healthFactor: number): number {
  if (!isFinite(healthFactor)) return 100;
  return Math.max(0, (healthFactor - 1) * 100);
}
