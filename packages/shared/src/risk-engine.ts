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
