'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProtocolSnapshot } from '@cronos-dash/shared';
import { simulateLiquidationScenario } from '@cronos-dash/shared';

interface LiquidationScenarioBoxProps {
  snapshot: ProtocolSnapshot;
  prices: Record<string, number>;
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

function formatHF(n: number): string {
  if (!isFinite(n)) return '∞';
  return n.toFixed(2);
}

export function LiquidationScenarioBox({
  snapshot,
  prices,
  collateralAsset,
  borrowAsset,
}: LiquidationScenarioBoxProps) {
  const assetSymbol = collateralAsset || snapshot.collaterals[0]?.asset.symbol || 'CRO';
  const borrowSymbol = borrowAsset || snapshot.borrows[0]?.asset.symbol || 'USDC';
  const assetPrice = prices[assetSymbol] || 0;
  const liquidationPrice = snapshot.risk.liquidationPrices[assetSymbol] || 0;
  const defaultTriggerShock = assetPrice > 0 && liquidationPrice > 0
    ? Math.max(-95, Math.min(0, ((liquidationPrice / assetPrice) - 1) * 100))
    : 0;

  const [priceShock, setPriceShock] = useState(defaultTriggerShock);
  const [closeFactorPct, setCloseFactorPct] = useState(50);
  const [penaltyPct, setPenaltyPct] = useState(10);

  useEffect(() => {
    setPriceShock(defaultTriggerShock);
  }, [defaultTriggerShock]);

  const scenario = useMemo(() => simulateLiquidationScenario({
    snapshot,
    prices,
    borrowSymbol,
    collateralSymbol: assetSymbol,
    collateralPriceChangePct: priceShock,
    closeFactorPct,
    liquidationPenaltyPct: penaltyPct,
  }), [assetSymbol, borrowSymbol, closeFactorPct, penaltyPct, priceShock, prices, snapshot]);

  const adjustedPrice = scenario.collateralPrice;
  const priceShockLabel = priceShock >= 0 ? `+${formatNumber(priceShock, 1)}%` : `${formatNumber(priceShock, 1)}%`;

  return (
    <div className="bg-cro-card rounded-xl border border-cro-border p-4">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h3 className="font-semibold text-cro-text">Liquidation Loss Scenario</h3>
          <p className="text-xs text-cro-muted mt-1">
            Estimates the first liquidation using Tectonic docs defaults: close factor caps debt repaid and a liquidation penalty is taken from collateral.
          </p>
        </div>
        <button
          onClick={() => {
            setPriceShock(defaultTriggerShock);
            setCloseFactorPct(50);
            setPenaltyPct(10);
          }}
          className="text-sm text-cro-cyan hover:underline"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-cro-text">
              Assume {assetSymbol} Price Change
            </label>
            <span className={`text-sm font-mono ${scenario.atRisk ? 'text-cro-danger' : 'text-cro-muted'}`}>
              {priceShockLabel} → ${formatNumber(adjustedPrice, 4)}
            </span>
          </div>
          <input
            type="range"
            min="-95"
            max="25"
            step="0.5"
            value={priceShock}
            onChange={(e) => setPriceShock(Number(e.target.value))}
            className="w-full h-2 bg-cro-border rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-cro-muted mt-2">
            <span>Current: <span className="font-mono text-cro-text">${formatNumber(assetPrice, 4)}</span></span>
            {liquidationPrice > 0 && (
              <button
                type="button"
                onClick={() => setPriceShock(defaultTriggerShock)}
                className="font-mono text-cro-cyan hover:underline"
              >
                Jump to liq price ${formatNumber(liquidationPrice, 4)}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-cro-muted">Close Factor</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={closeFactorPct}
                onChange={(e) => setCloseFactorPct(Math.min(100, Math.max(1, Number(e.target.value) || 50)))}
                className="w-full px-3 py-2 text-sm font-mono text-right border border-cro-border rounded bg-cro-dark text-cro-text focus:outline-none focus:ring-1 focus:ring-cro-cyan focus:border-cro-cyan"
              />
              <span className="text-sm text-cro-muted">%</span>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-cro-muted">Liquidation Penalty</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={penaltyPct}
                onChange={(e) => setPenaltyPct(Math.min(50, Math.max(0, Number(e.target.value) || 0)))}
                className="w-full px-3 py-2 text-sm font-mono text-right border border-cro-border rounded bg-cro-dark text-cro-text focus:outline-none focus:ring-1 focus:ring-cro-cyan focus:border-cro-cyan"
              />
              <span className="text-sm text-cro-muted">%</span>
            </div>
          </div>
        </div>

        <div className={`rounded-lg border px-3 py-2 text-sm ${scenario.atRisk ? 'border-cro-danger/50 bg-cro-danger/5' : 'border-cro-border bg-cro-dark/40'}`}>
          {scenario.atRisk ? (
            <span className="text-cro-danger font-medium">
              Liquidatable at this price. Estimated first liquidation below.
            </span>
          ) : (
            <span className="text-cro-muted">
              Not liquidatable at this price. Move the slider toward the liquidation price to estimate loss if liquidation triggers.
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-cro-border bg-cro-dark/40 px-3 py-2">
            <div className="text-cro-muted text-xs uppercase tracking-wide">Debt Repaid</div>
            <div className="mt-1 font-mono text-cro-text">${formatNumber(scenario.estimatedDebtRepaidUsd)}</div>
            <div className="text-xs text-cro-muted mt-1">Max close: ${formatNumber(scenario.maxDebtRepayUsd)}</div>
          </div>
          <div className="rounded-lg border border-cro-danger/40 bg-cro-danger/5 px-3 py-2">
            <div className="text-cro-muted text-xs uppercase tracking-wide">{assetSymbol} Seized</div>
            <div className="mt-1 font-mono text-cro-danger">{formatNumber(scenario.collateralSeizedAmount, 4)} {assetSymbol}</div>
            <div className="text-xs text-cro-muted mt-1">${formatNumber(scenario.collateralSeizedUsd)} value</div>
          </div>
          <div className="rounded-lg border border-cro-warning/40 bg-cro-warning/5 px-3 py-2">
            <div className="text-cro-muted text-xs uppercase tracking-wide">Penalty Cost</div>
            <div className="mt-1 font-mono text-cro-warning">{formatNumber(scenario.penaltyCollateralAmount, 4)} {assetSymbol}</div>
            <div className="text-xs text-cro-muted mt-1">${formatNumber(scenario.penaltyUsd)}</div>
          </div>
          <div className="rounded-lg border border-cro-border bg-cro-dark/40 px-3 py-2">
            <div className="text-cro-muted text-xs uppercase tracking-wide">{assetSymbol} Left</div>
            <div className="mt-1 font-mono text-cro-text">{formatNumber(scenario.remainingCollateralAmount, 4)} {assetSymbol}</div>
          </div>
          <div className="rounded-lg border border-cro-border bg-cro-dark/40 px-3 py-2">
            <div className="text-cro-muted text-xs uppercase tracking-wide">HF Before → After</div>
            <div className="mt-1 font-mono text-cro-text">{formatHF(scenario.healthFactorBefore)} → {formatHF(scenario.healthFactorAfter)}</div>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${scenario.mayNeedAdditionalLiquidation ? 'border-cro-danger/40 bg-cro-danger/5' : 'border-cro-border bg-cro-dark/40'}`}>
            <div className="text-cro-muted text-xs uppercase tracking-wide">Follow-up Risk</div>
            <div className={`mt-1 font-medium ${scenario.mayNeedAdditionalLiquidation ? 'text-cro-danger' : 'text-cro-success'}`}>
              {scenario.mayNeedAdditionalLiquidation ? 'May need another liquidation' : 'Likely restored above HF 1'}
            </div>
          </div>
        </div>

        <p className="text-xs text-cro-muted">
          Estimate only. Actual liquidation depends on live oracle prices, selected debt/collateral pair, on-chain parameters, and liquidator execution.
        </p>
      </div>
    </div>
  );
}
