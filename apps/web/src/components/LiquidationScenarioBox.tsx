'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LiquidationScenarioOutcome, ProtocolSnapshot } from '@cronos-dash/shared';
import { simulateLiquidationScenario } from '@cronos-dash/shared';
import { InfoTooltip } from './InfoTooltip';

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

function OutcomeCard({
  title,
  subtitle,
  outcome,
  assetSymbol,
  emphasize,
}: {
  title: string;
  subtitle: string;
  outcome: LiquidationScenarioOutcome;
  assetSymbol: string;
  emphasize?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${emphasize ? 'border-cro-danger/50 bg-cro-danger/5' : 'border-cro-border bg-cro-dark/40'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-cro-text">{title}</div>
          <div className="text-xs text-cro-muted mt-0.5">{subtitle}</div>
        </div>
        <div className={`text-xs rounded px-2 py-1 ${outcome.mayNeedAdditionalLiquidation ? 'bg-cro-danger/10 text-cro-danger' : 'bg-cro-success/10 text-cro-success'}`}>
          {outcome.mayNeedAdditionalLiquidation ? 'Repeat risk' : 'HF > 1'}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-cro-muted text-xs uppercase tracking-wide">Debt Repaid</div>
          <div className="font-mono text-cro-text">${formatNumber(outcome.debtRepaidUsd)}</div>
        </div>
        <div>
          <div className="text-cro-muted text-xs uppercase tracking-wide">{assetSymbol} Seized</div>
          <div className="font-mono text-cro-danger">{formatNumber(outcome.collateralSeizedAmount, 4)}</div>
        </div>
        <div>
          <div className="text-cro-muted text-xs uppercase tracking-wide">Penalty Cost</div>
          <div className="font-mono text-cro-warning">{formatNumber(outcome.penaltyCollateralAmount, 4)} {assetSymbol}</div>
          <div className="text-xs text-cro-muted">${formatNumber(outcome.penaltyUsd)}</div>
        </div>
        <div>
          <div className="text-cro-muted text-xs uppercase tracking-wide">HF After</div>
          <div className="font-mono text-cro-text">{formatHF(outcome.healthFactorAfter)}</div>
        </div>
      </div>

      <div className="mt-2 text-xs text-cro-muted">
        {assetSymbol} left: <span className="font-mono text-cro-text">{formatNumber(outcome.remainingCollateralAmount, 4)}</span>
      </div>
    </div>
  );
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
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-cro-text">Liquidation Loss Scenario</h3>
            <InfoTooltip label="About liquidation loss estimates">
              Estimate only. Tectonic publishes close factor and liquidation penalty, but not a fixed post-liquidation health-factor target. Actual liquidation execution depends on oracle price, selected debt/collateral pair, on-chain params, and liquidator behavior.
            </InfoTooltip>
          </div>
          <p className="text-xs text-cro-muted mt-1">
            Estimate only. Tectonic exposes close factor and penalty; it does not publish a fixed post-liquidation HF target. Actual execution depends on oracle price, selected debt/collateral pair, on-chain params, and liquidator behavior.
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
              Liquidatable at this price. Showing the max close-factor estimate because it is the conservative case and matched observed Tectonic behavior.
            </span>
          ) : (
            <span className="text-cro-muted">
              Not liquidatable at this price. Move the slider toward the liquidation price to estimate loss if liquidation triggers.
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <OutcomeCard
            title="Max Close-Factor Estimate"
            subtitle="Repays the full selected-debt close factor, capped by available collateral. Use this as the planning estimate for a first liquidation event."
            outcome={scenario.maxCloseFactor}
            assetSymbol={assetSymbol}
            emphasize
          />
        </div>
      </div>
    </div>
  );
}
