import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateRepayWithCollateral } from '../dist/index.js';

const CRO_PRICE = 1 / 15.96492758;
const TOTAL_BORROW_USD = 97_632.26;
const CURRENT_LTV = 0.6740;
const TOTAL_COLLATERAL_USD = TOTAL_BORROW_USD / CURRENT_LTV;
const CRO_AMOUNT = TOTAL_COLLATERAL_USD / CRO_PRICE;
const LT = 0.7;

const snapshot = {
  protocol: 'tectonic',
  collaterals: [
    {
      asset: { symbol: 'CRO', address: '0xcro', decimals: 18 },
      amount: CRO_AMOUNT,
      valueUsd: TOTAL_COLLATERAL_USD,
      liquidationThreshold: LT,
      enabled: true,
    },
  ],
  borrows: [
    {
      asset: { symbol: 'USDC', address: '0xusdc', decimals: 6 },
      amount: TOTAL_BORROW_USD,
      valueUsd: TOTAL_BORROW_USD,
    },
  ],
  totals: {
    collateralUsd: TOTAL_COLLATERAL_USD,
    borrowUsd: TOTAL_BORROW_USD,
    weightedCollateralUsd: TOTAL_COLLATERAL_USD * LT,
  },
  risk: {
    healthFactor: (TOTAL_COLLATERAL_USD * LT) / TOTAL_BORROW_USD,
    totalCollateralUsd: TOTAL_COLLATERAL_USD,
    totalBorrowUsd: TOTAL_BORROW_USD,
    availableBorrowUsd: TOTAL_COLLATERAL_USD * LT - TOTAL_BORROW_USD,
    liquidationPrices: {
      CRO: TOTAL_BORROW_USD / (CRO_AMOUNT * LT),
    },
  },
};

function approx(actual, expected, epsilon = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`
  );
}

test('simulateRepayWithCollateral uses the quoted collateral amount for the main estimate', () => {
  const result = simulateRepayWithCollateral({
    snapshot,
    prices: { CRO: CRO_PRICE, USDC: 1 },
    borrowSymbol: 'USDC',
    collateralSymbol: 'CRO',
    repayAmount: 2500,
    quoteCollateralPerBorrowUnit: 15.96492758,
  });

  approx(result.quoteCollateralPerBorrowUnit, 15.96492758);
  approx(result.collateralSoldAmount, 39_912.31895);
  approx(result.remainingCollateralAmount, 2_272_687.0287825377);
  approx(result.simulation.simulated.totalBorrowUsd, 95_132.26);
  approx(result.simulation.simulated.liquidationPrices.CRO, 0.05979847944317743);
});

test('simulateRepayWithCollateral keeps the main estimate quote-based and exposes a worst-case slippage scenario separately', () => {
  const result = simulateRepayWithCollateral({
    snapshot,
    prices: { CRO: CRO_PRICE, USDC: 1 },
    borrowSymbol: 'USDC',
    collateralSymbol: 'CRO',
    repayAmount: 2500,
    quoteCollateralPerBorrowUnit: 15.96492758,
    slippagePct: 0.5,
  });

  approx(result.collateralSoldAmount, 39_912.31895);
  approx(result.simulation.simulated.liquidationPrices.CRO, 0.05979847944317743);
  approx(result.worstCase.effectiveCollateralPerBorrowUnit, 16.0447522179);
  approx(result.worstCase.collateralSoldAmount, 40_111.88054475);
  approx(result.worstCase.remainingCollateralAmount, 2_272_487.467187788);
  approx(result.worstCase.simulation.simulated.liquidationPrices.CRO, 0.059803730728429205);
  assert.ok(
    result.worstCase.simulation.simulated.liquidationPrices.CRO >
      result.simulation.simulated.liquidationPrices.CRO
  );
});

test('simulateRepayWithCollateral returns a safe no-op result when the target borrow asset is missing', () => {
  const result = simulateRepayWithCollateral({
    snapshot,
    prices: { CRO: CRO_PRICE, USDC: 1 },
    borrowSymbol: 'DAI',
    collateralSymbol: 'CRO',
    repayAmount: 2500,
    quoteCollateralPerBorrowUnit: 15.96492758,
    slippagePct: 0.5,
  });

  approx(result.collateralSoldAmount, 0);
  approx(result.remainingCollateralAmount, CRO_AMOUNT);
  approx(result.simulation.simulated.totalBorrowUsd, TOTAL_BORROW_USD);
  approx(result.worstCase.collateralSoldAmount, 0);
});
