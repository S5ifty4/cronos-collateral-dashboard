'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  ProtocolSnapshot,
  ScenarioAction,
  ScenarioResult,
} from '@cronos-dash/shared';
import {
  simulateScenario as simulateLocal,
  simulateRepayWithCollateral,
} from '@cronos-dash/shared';

export interface SimulationData {
  result: ScenarioResult;
  addedCollateral: Record<string, number>; // symbol -> amount added
  withdrawnCollateral: Record<string, number>; // symbol -> amount withdrawn/sold
  addedBorrow: Record<string, number>; // symbol -> amount borrowed
  repaid: Record<string, number>; // symbol -> amount repaid
  priceShocks: Record<string, number>; // symbol -> pct change
}

interface ScenarioSimulatorProps {
  snapshot: ProtocolSnapshot;
  prices: Record<string, number>;
  onSimulationResult?: (data: SimulationData | null) => void;
  collateralAsset?: string; // Symbol of the collateral asset (defaults to first collateral or 'CRO')
  borrowAsset?: string; // Symbol of the borrow asset to target (defaults to first borrow or 'USDC')
}

function formatNumber(n: number, decimals = 2): string {
  if (!isFinite(n)) return '∞';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function ScenarioSimulator({
  snapshot,
  prices,
  onSimulationResult,
  collateralAsset,
  borrowAsset,
}: ScenarioSimulatorProps) {
  const [priceShock, setPriceShock] = useState(0);
  const [repayAmount, setRepayAmount] = useState(0);
  const [repayWithCollateralAmount, setRepayWithCollateralAmount] = useState(0);
  const [repayWithCollateralSlippage, setRepayWithCollateralSlippage] = useState(0.5);
  const [borrowAmount, setBorrowAmount] = useState(0);
  const [addCollateralAmount, setAddCollateralAmount] = useState(0);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  // Determine the collateral asset symbol - use prop, or first collateral, or default to 'CRO'
  const assetSymbol = collateralAsset || snapshot.collaterals[0]?.asset.symbol || 'CRO';
  const borrowSymbol = borrowAsset || snapshot.borrows[0]?.asset.symbol || 'USDC';
  const borrowPrice = prices[borrowSymbol] || 1;
  const assetPrice = prices[assetSymbol] || 0.15;
  const maxRepay = snapshot.totals.borrowUsd;
  const maxCollateral = 1000000;

  // Get collateral's liquidation threshold
  const collateral = snapshot.collaterals.find(c => c.asset.symbol === assetSymbol);
  const collateralLT = collateral?.liquidationThreshold || 0.75;
  const currentCollateralAmount = collateral?.amount || 0;

  // Calculate dynamic available borrow based on scenario inputs
  // Use safety factor to match Tectonic's conservative borrow limits
  const TECTONIC_SAFETY_FACTOR = 0.58;
  const priceMultiplier = 1 + priceShock / 100;
  const adjustedAssetPrice = assetPrice * priceMultiplier;
  const addedCollateralValue = addCollateralAmount * adjustedAssetPrice * collateralLT * TECTONIC_SAFETY_FACTOR;
  const baseAvailableBorrow = snapshot.risk.availableBorrowUsd;
  const repayWithCollateralBaseRate = adjustedAssetPrice > 0 ? borrowPrice / adjustedAssetPrice : 0;
  const repayWithCollateralPlan = repayWithCollateralAmount > 0
    ? simulateRepayWithCollateral({
        snapshot,
        prices,
        borrowSymbol,
        collateralSymbol: assetSymbol,
        repayAmount: repayWithCollateralAmount,
        quoteCollateralPerBorrowUnit: repayWithCollateralBaseRate,
        slippagePct: repayWithCollateralSlippage,
      })
    : null;
  const repayWithCollateralSoldAmount = repayWithCollateralPlan?.collateralSoldAmount || 0;
  const repayWithCollateralQuoteRate = repayWithCollateralPlan?.quoteCollateralPerBorrowUnit || 0;
  const repayWithCollateralWorstCaseRate = repayWithCollateralPlan?.worstCase.effectiveCollateralPerBorrowUnit || 0;
  const repayWithCollateralWorstCaseSoldAmount = repayWithCollateralPlan?.worstCase.collateralSoldAmount || 0;
  const repayWithCollateralWorstCaseRemaining = repayWithCollateralPlan?.worstCase.remainingCollateralAmount || currentCollateralAmount;
  const remainingCollateralAfterRepayWithCollateral = repayWithCollateralPlan?.remainingCollateralAmount || currentCollateralAmount;

  // Calculate change from base: price impact + added collateral - repay change - new borrow
  const priceImpact = (priceMultiplier - 1) * snapshot.totals.weightedCollateralUsd * TECTONIC_SAFETY_FACTOR;
  const repayBenefit = repayAmount + repayWithCollateralAmount; // Repaying frees up borrow capacity 1:1

  const dynamicAvailableBorrow = Math.max(0,
    baseAvailableBorrow + priceImpact + addedCollateralValue + repayBenefit - borrowAmount
  );

  const runSimulation = useCallback(() => {
    const actions: ScenarioAction[] = [];

    if (priceShock !== 0) {
      actions.push({ type: 'priceShock', symbol: assetSymbol, pctChange: priceShock });
    }
    if (repayAmount > 0) {
      actions.push({ type: 'repay', symbol: borrowSymbol, amount: repayAmount });
    }
    if (repayWithCollateralAmount > 0 && repayWithCollateralSoldAmount > 0) {
      actions.push({
        type: 'withdrawCollateral',
        symbol: assetSymbol,
        amount: repayWithCollateralSoldAmount,
      });
      actions.push({
        type: 'repay',
        symbol: borrowSymbol,
        amount: repayWithCollateralAmount,
      });
    }
    if (borrowAmount > 0) {
      actions.push({ type: 'borrow', symbol: borrowSymbol, amount: borrowAmount });
    }
    if (addCollateralAmount > 0) {
      actions.push({
        type: 'addCollateral',
        symbol: assetSymbol,
        amount: addCollateralAmount,
      });
    }

    if (actions.length === 0) {
      setResult(null);
      onSimulationResult?.(null);
      return;
    }

    // Run simulation locally for instant feedback
    const simResult = simulateLocal(snapshot, { actions }, prices);
    setResult(simResult);

    // Build simulation data with all adjustments
    const simData: SimulationData = {
      result: simResult,
      addedCollateral: addCollateralAmount > 0 ? { [assetSymbol]: addCollateralAmount } : {},
      withdrawnCollateral: repayWithCollateralSoldAmount > 0 ? { [assetSymbol]: repayWithCollateralSoldAmount } : {},
      addedBorrow: borrowAmount > 0 ? { [borrowSymbol]: borrowAmount } : {},
      repaid: (repayAmount + repayWithCollateralAmount) > 0 ? { [borrowSymbol]: repayAmount + repayWithCollateralAmount } : {},
      priceShocks: priceShock !== 0 ? { [assetSymbol]: priceShock } : {},
    };
    onSimulationResult?.(simData);
  }, [
    priceShock,
    repayAmount,
    repayWithCollateralAmount,
    repayWithCollateralSoldAmount,
    borrowAmount,
    addCollateralAmount,
    snapshot,
    prices,
    onSimulationResult,
    assetSymbol,
    borrowSymbol,
  ]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  const resetScenario = () => {
    setPriceShock(0);
    setRepayAmount(0);
    setRepayWithCollateralAmount(0);
    setRepayWithCollateralSlippage(0.5);
    setBorrowAmount(0);
    setAddCollateralAmount(0);
    setResult(null);
    onSimulationResult?.(null);
  };

  const handleRepayInputChange = (value: string) => {
    const num = parseFloat(value) || 0;
    setRepayAmount(Math.min(Math.max(0, num), maxRepay));
  };

  const handleRepayWithCollateralInputChange = (value: string) => {
    const num = parseFloat(value) || 0;
    setRepayWithCollateralAmount(Math.min(Math.max(0, num), maxRepay));
  };

  const handleBorrowInputChange = (value: string) => {
    const num = parseFloat(value) || 0;
    // Use base + dynamic capacity for max
    const maxBorrow = baseAvailableBorrow + addedCollateralValue + repayAmount + repayWithCollateralAmount;
    setBorrowAmount(Math.min(Math.max(0, num), maxBorrow));
  };

  const handleCollateralInputChange = (value: string) => {
    const num = parseFloat(value) || 0;
    setAddCollateralAmount(Math.min(Math.max(0, num), maxCollateral));
  };

  return (
    <div className="bg-cro-card rounded-xl border border-cro-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-cro-text">Scenario Simulator</h3>
        <button
          onClick={resetScenario}
          className="text-sm text-cro-cyan hover:underline"
        >
          Reset
        </button>
      </div>

      <div className="space-y-5">
        {/* Price Shock */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-cro-text">
              {assetSymbol} Price Change
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-cro-muted">
                Current: <span className="font-mono font-medium text-cro-text">${formatNumber(assetPrice, 4)}</span>
              </span>
              <span
                className={`text-sm font-mono ${
                  priceShock < 0 ? 'text-cro-danger' : priceShock > 0 ? 'text-cro-success' : 'text-cro-muted'
                }`}
              >
                {priceShock >= 0 ? '+' : ''}
                {priceShock}%
              </span>
            </div>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={priceShock}
            onChange={(e) => setPriceShock(Number(e.target.value))}
            className="w-full h-2 bg-cro-border rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-cro-muted mt-1">
            <span className="font-mono">-100%</span>
            <span className={`font-mono ${priceShock !== 0 ? 'text-cro-cyan font-medium' : 'text-cro-muted'}`}>
              Simulated: ${formatNumber(adjustedAssetPrice, 4)}
            </span>
            <span className="font-mono">+100%</span>
          </div>
        </div>

        {/* Repay USDC */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-cro-text">
              Repay USDC
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-cro-muted">$</span>
              <input
                type="number"
                min="0"
                max={maxRepay}
                step="100"
                value={repayAmount || ''}
                onChange={(e) => handleRepayInputChange(e.target.value)}
                placeholder="0"
                className="w-24 px-2 py-1 text-sm font-mono text-right border border-cro-border rounded bg-cro-dark text-cro-text focus:outline-none focus:ring-1 focus:ring-cro-cyan focus:border-cro-cyan"
              />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max={maxRepay}
            step="100"
            value={repayAmount}
            onChange={(e) => setRepayAmount(Number(e.target.value))}
            className="w-full h-2 bg-cro-border rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-cro-muted mt-1">
            <span className="font-mono">$0</span>
            <span className="font-mono">${formatNumber(maxRepay)}</span>
          </div>
        </div>

        {/* Repay with Collateral */}
        <div className="rounded-xl border border-cro-border/70 bg-cro-dark/40 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="text-sm font-medium text-cro-text">
                Repay with {assetSymbol} Collateral
              </label>
              <p className="text-xs text-cro-muted mt-1">
                Main estimate matches the current quote. Slippage is shown separately as a worst-case execution scenario.
              </p>
            </div>
            <div className="text-right text-xs text-cro-muted">
              <div>
                Quote: <span className="font-mono text-cro-text">{formatNumber(repayWithCollateralQuoteRate, 8)} {assetSymbol}/{borrowSymbol}</span>
              </div>
              <div>
                Worst case @ {formatNumber(repayWithCollateralSlippage, 2)}%: <span className="font-mono text-cro-warning">{formatNumber(repayWithCollateralWorstCaseRate, 8)} {assetSymbol}/{borrowSymbol}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wide text-cro-muted">Repay Amount</label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-cro-muted">$</span>
                <input
                  type="number"
                  min="0"
                  max={maxRepay}
                  step="100"
                  value={repayWithCollateralAmount || ''}
                  onChange={(e) => handleRepayWithCollateralInputChange(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm font-mono text-right border border-cro-border rounded bg-cro-dark text-cro-text focus:outline-none focus:ring-1 focus:ring-cro-cyan focus:border-cro-cyan"
                />
                <span className="text-sm text-cro-muted">{borrowSymbol}</span>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-cro-muted">Slippage %</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={repayWithCollateralSlippage}
                  onChange={(e) => setRepayWithCollateralSlippage(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-sm font-mono text-right border border-cro-border rounded bg-cro-dark text-cro-text focus:outline-none focus:ring-1 focus:ring-cro-cyan focus:border-cro-cyan"
                />
                <span className="text-sm text-cro-muted">%</span>
              </div>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={maxRepay}
            step="100"
            value={repayWithCollateralAmount}
            onChange={(e) => setRepayWithCollateralAmount(Number(e.target.value))}
            className="w-full h-2 bg-cro-border rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-cro-muted">
            <span className="font-mono">$0</span>
            <span className="font-mono">${formatNumber(maxRepay)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-cro-border bg-cro-card px-3 py-2">
              <div className="text-cro-muted text-xs uppercase tracking-wide">Quoted {assetSymbol} Sold</div>
              <div className="mt-1 font-mono text-cro-text">{formatNumber(repayWithCollateralSoldAmount, 4)} {assetSymbol}</div>
            </div>
            <div className="rounded-lg border border-cro-border bg-cro-card px-3 py-2">
              <div className="text-cro-muted text-xs uppercase tracking-wide">Quoted {assetSymbol} Left</div>
              <div className="mt-1 font-mono text-cro-text">{formatNumber(remainingCollateralAfterRepayWithCollateral, 4)} {assetSymbol}</div>
            </div>
            <div className="rounded-lg border border-cro-warning/40 bg-cro-warning/5 px-3 py-2">
              <div className="text-cro-muted text-xs uppercase tracking-wide">Worst-case {assetSymbol} Sold</div>
              <div className="mt-1 font-mono text-cro-warning">{formatNumber(repayWithCollateralWorstCaseSoldAmount, 4)} {assetSymbol}</div>
            </div>
            <div className="rounded-lg border border-cro-warning/40 bg-cro-warning/5 px-3 py-2">
              <div className="text-cro-muted text-xs uppercase tracking-wide">Worst-case {assetSymbol} Left</div>
              <div className="mt-1 font-mono text-cro-warning">{formatNumber(repayWithCollateralWorstCaseRemaining, 4)} {assetSymbol}</div>
            </div>
          </div>
        </div>

        {/* Borrow More USDC */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-cro-text">
              Borrow More USDC
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-cro-muted">$</span>
              <input
                type="number"
                min="0"
                max={dynamicAvailableBorrow + borrowAmount}
                step="100"
                value={borrowAmount || ''}
                onChange={(e) => handleBorrowInputChange(e.target.value)}
                placeholder="0"
                className="w-24 px-2 py-1 text-sm font-mono text-right border border-cro-border rounded bg-cro-dark text-cro-text focus:outline-none focus:ring-1 focus:ring-cro-cyan focus:border-cro-cyan"
              />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max={dynamicAvailableBorrow + borrowAmount}
            step="100"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(Number(e.target.value))}
            className="w-full h-2 bg-cro-border rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-cro-muted mt-1">
            <span className="font-mono">$0</span>
            <span className={dynamicAvailableBorrow > baseAvailableBorrow ? 'text-cro-success font-medium font-mono' : 'text-cro-success font-mono'}>
              Available: ${formatNumber(dynamicAvailableBorrow)}
              {dynamicAvailableBorrow > baseAvailableBorrow && (
                <span className="text-cro-success ml-1">(+${formatNumber(dynamicAvailableBorrow - baseAvailableBorrow)})</span>
              )}
            </span>
          </div>
        </div>

        {/* Add Collateral */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-cro-text">
              Add {assetSymbol} Collateral
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max={maxCollateral}
                step="100"
                value={addCollateralAmount || ''}
                onChange={(e) => handleCollateralInputChange(e.target.value)}
                placeholder="0"
                className="w-24 px-2 py-1 text-sm font-mono text-right border border-cro-border rounded bg-cro-dark text-cro-text focus:outline-none focus:ring-1 focus:ring-cro-cyan focus:border-cro-cyan"
              />
              <span className="text-sm text-cro-muted">{assetSymbol}</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max={maxCollateral}
            step="10000"
            value={addCollateralAmount}
            onChange={(e) => setAddCollateralAmount(Number(e.target.value))}
            className="w-full h-2 bg-cro-border rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-cro-muted mt-1">
            <span className="font-mono">0</span>
            <span className="font-mono">1M {assetSymbol}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
