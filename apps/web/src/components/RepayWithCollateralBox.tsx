'use client';

import { useEffect, useState } from 'react';
import type { ProtocolSnapshot } from '@cronos-dash/shared';
import { simulateRepayWithCollateral } from '@cronos-dash/shared';
import type { SimulationData } from './ScenarioSimulator';

interface RepayWithCollateralBoxProps {
  snapshot: ProtocolSnapshot;
  prices: Record<string, number>;
  onSimulationResult?: (data: SimulationData | null) => void;
  collateralAsset?: string;
  borrowAsset?: string;
}

function formatNumber(n: number, decimals = 2): string {
  if (!isFinite(n)) return '∞';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function RepayWithCollateralBox({
  snapshot,
  prices,
  onSimulationResult,
  collateralAsset,
  borrowAsset,
}: RepayWithCollateralBoxProps) {
  const [repayAmount, setRepayAmount] = useState(0);
  const [slippagePct, setSlippagePct] = useState(0.5);

  const assetSymbol = collateralAsset || snapshot.collaterals[0]?.asset.symbol || 'CRO';
  const borrowSymbol = borrowAsset || snapshot.borrows[0]?.asset.symbol || 'USDC';
  const assetPrice = prices[assetSymbol] || 0.15;
  const borrowPrice = prices[borrowSymbol] || 1;
  const maxRepay = snapshot.totals.borrowUsd;

  const collateral = snapshot.collaterals.find((c) => c.asset.symbol === assetSymbol);
  const currentCollateralAmount = collateral?.amount || 0;
  const quoteRate = assetPrice > 0 ? borrowPrice / assetPrice : 0;

  const plan = repayAmount > 0
    ? simulateRepayWithCollateral({
        snapshot,
        prices,
        borrowSymbol,
        collateralSymbol: assetSymbol,
        repayAmount,
        quoteCollateralPerBorrowUnit: quoteRate,
        slippagePct,
      })
    : null;

  const quotedSold = plan?.collateralSoldAmount || 0;
  const quotedLeft = plan?.remainingCollateralAmount || currentCollateralAmount;
  const worstCaseRate = plan?.worstCase.effectiveCollateralPerBorrowUnit || 0;
  const worstCaseSold = plan?.worstCase.collateralSoldAmount || 0;
  const worstCaseLeft = plan?.worstCase.remainingCollateralAmount || currentCollateralAmount;

  useEffect(() => {
    if (!plan || repayAmount <= 0) {
      onSimulationResult?.(null);
      return;
    }

    onSimulationResult?.({
      result: plan.simulation,
      addedCollateral: {},
      withdrawnCollateral: quotedSold > 0 ? { [assetSymbol]: quotedSold } : {},
      addedBorrow: {},
      repaid: repayAmount > 0 ? { [borrowSymbol]: repayAmount } : {},
      priceShocks: {},
    });
  }, [assetSymbol, borrowSymbol, onSimulationResult, plan, quotedSold, repayAmount]);

  return (
    <div className="bg-cro-card rounded-xl border border-cro-border p-4">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h3 className="font-semibold text-cro-text">Repay with Collateral</h3>
          <p className="text-xs text-cro-muted mt-1">
            Main estimate matches the current quote. Slippage is shown separately as a worst-case execution scenario.
          </p>
        </div>
        <button
          onClick={() => {
            setRepayAmount(0);
            setSlippagePct(0.5);
            onSimulationResult?.(null);
          }}
          className="text-sm text-cro-cyan hover:underline"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 text-right text-xs text-cro-muted">
          <div />
          <div>
            <div>
              Quote: <span className="font-mono text-cro-text">{formatNumber(quoteRate, 8)} {assetSymbol}/{borrowSymbol}</span>
            </div>
            <div>
              Worst case @ {formatNumber(slippagePct, 2)}%: <span className="font-mono text-cro-warning">{formatNumber(worstCaseRate, 8)} {assetSymbol}/{borrowSymbol}</span>
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
                value={repayAmount || ''}
                onChange={(e) => setRepayAmount(Math.min(Math.max(0, parseFloat(e.target.value) || 0), maxRepay))}
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
                value={slippagePct}
                onChange={(e) => setSlippagePct(Math.max(0, Number(e.target.value) || 0))}
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
          value={repayAmount}
          onChange={(e) => setRepayAmount(Number(e.target.value))}
          className="w-full h-2 bg-cro-border rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-cro-muted">
          <span className="font-mono">$0</span>
          <span className="font-mono">${formatNumber(maxRepay)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-cro-border bg-cro-card px-3 py-2">
            <div className="text-cro-muted text-xs uppercase tracking-wide">Quoted {assetSymbol} Sold</div>
            <div className="mt-1 font-mono text-cro-text">{formatNumber(quotedSold, 4)} {assetSymbol}</div>
          </div>
          <div className="rounded-lg border border-cro-border bg-cro-card px-3 py-2">
            <div className="text-cro-muted text-xs uppercase tracking-wide">Quoted {assetSymbol} Left</div>
            <div className="mt-1 font-mono text-cro-text">{formatNumber(quotedLeft, 4)} {assetSymbol}</div>
          </div>
          <div className="rounded-lg border border-cro-warning/40 bg-cro-warning/5 px-3 py-2">
            <div className="text-cro-muted text-xs uppercase tracking-wide">Worst-case {assetSymbol} Sold</div>
            <div className="mt-1 font-mono text-cro-warning">{formatNumber(worstCaseSold, 4)} {assetSymbol}</div>
          </div>
          <div className="rounded-lg border border-cro-warning/40 bg-cro-warning/5 px-3 py-2">
            <div className="text-cro-muted text-xs uppercase tracking-wide">Worst-case {assetSymbol} Left</div>
            <div className="mt-1 font-mono text-cro-warning">{formatNumber(worstCaseLeft, 4)} {assetSymbol}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
