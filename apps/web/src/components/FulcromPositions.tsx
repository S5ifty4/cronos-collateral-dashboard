'use client';

import { useState } from 'react';

interface FulcromPosition {
  platform: string;
  pair: string;
  side: 'Long' | 'Short';
  leverage: number;
  netValueUsd: number;
  pnlUsd: number;
  pnlPct: number;
  sizeUsd: number;
  collateralUsd: number;
  netCollateralUsd: number;
  markPrice: number;
  entryPrice: number;
  liquidationPrice: number;
  openOrders: number;
}

const REFERENCE_POSITION: FulcromPosition = {
  platform: 'Fulcrom Finance',
  pair: 'CRO/USD',
  side: 'Long',
  leverage: 29.9,
  netValueUsd: 98.20,
  pnlUsd: -0.31,
  pnlPct: -0.31,
  sizeUsd: 2945.95,
  collateralUsd: 98.51,
  netCollateralUsd: 95.26,
  markPrice: 0.05634,
  entryPrice: 0.05634,
  liquidationPrice: 0.05468,
  openOrders: 0,
};

function formatUsd(value: number, decimals = 2): string {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatSignedNumber(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${formatNumber(value, decimals)}`;
}

function formatPrice(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  })}`;
}

function MetricCard({
  label,
  value,
  subtext,
  tone = 'default',
}: {
  label: string;
  value: string;
  subtext?: string;
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'cyan';
}) {
  const toneClass = {
    default: 'text-cro-text border-cro-border bg-cro-card',
    success: 'text-cro-success border-cro-success/40 bg-cro-success/5',
    danger: 'text-cro-danger border-cro-danger/40 bg-cro-danger/5',
    warning: 'text-cro-warning border-cro-warning/40 bg-cro-warning/5',
    cyan: 'text-cro-cyan border-cro-cyan/40 bg-cro-cyan/5',
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide text-cro-muted">{label}</div>
      <div className="mt-2 font-mono text-xl font-bold tabular-nums sm:text-2xl">{value}</div>
      {subtext && <div className="mt-1 text-xs text-cro-muted">{subtext}</div>}
    </div>
  );
}

function FulcromHexIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cro-cyan/40 bg-cro-cyan/10">
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" aria-hidden="true">
        <path d="M16 2.5 27.7 9.2v13.6L16 29.5 4.3 22.8V9.2L16 2.5Z" stroke="#4CDBFF" strokeWidth="2" />
        <path d="M16 8.5 22.5 12.2v7.6L16 23.5 9.5 19.8v-7.6L16 8.5Z" stroke="#C7F2FF" strokeWidth="2" />
        <path d="M19.8 13.5 16 11.3l-3.8 2.2v5l3.8 2.2 3.8-2.2" stroke="#1CF1D8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function FulcromPositions() {
  const position = REFERENCE_POSITION;
  const [priceMovePct, setPriceMovePct] = useState(0);
  const isLong = position.side === 'Long';
  const priceMultiplier = 1 + priceMovePct / 100;
  const simulatedMarkPrice = position.markPrice * priceMultiplier;
  const pnlDeltaUsd = position.sizeUsd * ((simulatedMarkPrice - position.markPrice) / position.markPrice) * (isLong ? 1 : -1);
  const simulatedPnlUsd = position.pnlUsd + pnlDeltaUsd;
  const simulatedPnlPct = position.pnlPct + (priceMovePct * position.leverage * (isLong ? 1 : -1));
  const simulatedNetValueUsd = position.netValueUsd + pnlDeltaUsd;
  const pnlTone = simulatedPnlUsd >= 0 ? 'success' : 'danger';
  const liquidationDistancePct = simulatedMarkPrice > 0
    ? isLong
      ? ((simulatedMarkPrice - position.liquidationPrice) / simulatedMarkPrice) * 100
      : ((position.liquidationPrice - simulatedMarkPrice) / simulatedMarkPrice) * 100
    : 0;
  const priceMoveToEntryPct = position.entryPrice > 0
    ? ((simulatedMarkPrice - position.entryPrice) / position.entryPrice) * 100
    : 0;
  const equityBufferUsd = Math.max(0, simulatedNetValueUsd - Math.abs(simulatedPnlUsd));
  const sliderMin = -10;
  const sliderMax = 10;
  const rangeLow = position.markPrice * (1 + sliderMin / 100);
  const rangeHigh = position.markPrice * (1 + sliderMax / 100);
  const markPositionPct = clamp(((simulatedMarkPrice - rangeLow) / (rangeHigh - rangeLow)) * 100, 0, 100);
  const liqPositionPct = clamp(((position.liquidationPrice - rangeLow) / (rangeHigh - rangeLow)) * 100, 0, 100);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-cro-card to-cro-dark p-4 shadow-[0_0_40px_rgba(124,58,237,0.12)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <FulcromHexIcon />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-cro-text sm:text-2xl">Fulcrom Perps</h2>
                <span className="rounded-full border border-purple-400/40 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-200">
                  Leveraged position
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-cro-muted">
                Track leveraged CRO exposure, liquidation buffer, collateral, and simulated profit or loss in one place.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-cro-border bg-cro-dark/70 px-4 py-3 text-sm">
            <div className="text-cro-muted">Platform</div>
            <div className="mt-1 font-semibold text-cro-text">{position.platform}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-cro-border bg-cro-dark/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-bold text-cro-text sm:text-3xl">{position.pair}</span>
            <span className="rounded-lg border border-cro-border bg-cro-card px-2.5 py-1 font-mono text-sm text-cro-muted">
              {formatNumber(position.leverage, 1)}x
            </span>
            <span className={`rounded-lg px-2.5 py-1 text-sm font-semibold ${isLong ? 'bg-cro-success/15 text-cro-success' : 'bg-cro-danger/15 text-cro-danger'}`}>
              {position.side}
            </span>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xs uppercase tracking-wide text-cro-muted">Mark / Entry</div>
            <div className="mt-1 font-mono text-cro-text">
              {formatPrice(simulatedMarkPrice)} <span className="text-cro-muted">/ {formatPrice(position.entryPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <MetricCard label="Net Value" value={formatUsd(simulatedNetValueUsd)} subtext={priceMovePct === 0 ? 'Current equity' : `${formatSignedNumber(pnlDeltaUsd, 2)} simulated`} tone="cyan" />
        <MetricCard
          label="PnL"
          value={`${simulatedPnlUsd >= 0 ? '+' : ''}${formatUsd(simulatedPnlUsd)} (${formatSignedNumber(simulatedPnlPct, 2)}%)`}
          subtext={`CRO vs entry: ${formatSignedNumber(priceMoveToEntryPct, 2)}%`}
          tone={pnlTone}
        />
        <MetricCard label="Position Size" value={formatUsd(position.sizeUsd)} subtext={`${formatNumber(position.leverage, 1)}x notional exposure`} />
        <MetricCard label="Collateral" value={formatUsd(position.collateralUsd)} subtext={`Net: ${formatUsd(position.netCollateralUsd)}`} />
      </div>

      <div className="rounded-xl border border-cro-cyan/30 bg-cro-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-cro-text">CRO Price Simulator</h3>
            <div className="mt-1 text-sm text-cro-muted">Slide CRO price to preview leveraged PnL and liquidation buffer.</div>
          </div>
          <button
            type="button"
            onClick={() => setPriceMovePct(0)}
            className="self-start rounded-lg border border-cro-cyan/40 px-3 py-1.5 text-sm text-cro-cyan hover:bg-cro-cyan/10 transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-cro-border bg-cro-dark/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-cro-muted">CRO move</span>
              <span className={`font-mono text-xl font-bold ${priceMovePct >= 0 ? 'text-cro-success' : 'text-cro-danger'}`}>
                {formatSignedNumber(priceMovePct, 1)}%
              </span>
            </div>
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step="0.1"
              value={priceMovePct}
              onChange={(event) => setPriceMovePct(Number(event.target.value))}
              className="mt-5 w-full accent-cro-cyan"
            />
            <div className="mt-2 flex justify-between font-mono text-xs text-cro-muted">
              <span>{formatSignedNumber(sliderMin, 0)}%</span>
              <span>Current</span>
              <span>{formatSignedNumber(sliderMax, 0)}%</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-cro-border bg-cro-card p-3">
                <div className="text-xs uppercase tracking-wide text-cro-muted">Sim Price</div>
                <div className="mt-1 font-mono text-lg text-cro-text">{formatPrice(simulatedMarkPrice)}</div>
              </div>
              <div className="rounded-lg border border-cro-border bg-cro-card p-3">
                <div className="text-xs uppercase tracking-wide text-cro-muted">PnL Change</div>
                <div className={`mt-1 font-mono text-lg ${pnlDeltaUsd >= 0 ? 'text-cro-success' : 'text-cro-danger'}`}>
                  {pnlDeltaUsd >= 0 ? '+' : ''}{formatUsd(pnlDeltaUsd)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-cro-border bg-cro-dark/60 p-4">
            <div className="text-sm text-cro-muted">Simulated outcome</div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-cro-muted">Net Value</span>
                <span className="font-mono text-cro-text">{formatUsd(simulatedNetValueUsd)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-cro-muted">PnL</span>
                <span className={`font-mono ${simulatedPnlUsd >= 0 ? 'text-cro-success' : 'text-cro-danger'}`}>
                  {simulatedPnlUsd >= 0 ? '+' : ''}{formatUsd(simulatedPnlUsd)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-cro-muted">Liq. Buffer</span>
                <span className={`font-mono ${liquidationDistancePct > 5 ? 'text-cro-success' : liquidationDistancePct > 2 ? 'text-cro-warning' : 'text-cro-danger'}`}>
                  {formatNumber(liquidationDistancePct, 2)}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-cro-muted">Liq. Price</span>
                <span className="font-mono text-cro-danger">{formatPrice(position.liquidationPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-cro-border bg-cro-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-cro-text">Liquidation Monitor</h3>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${liquidationDistancePct > 5 ? 'border-cro-success/40 bg-cro-success/10 text-cro-success' : liquidationDistancePct > 2 ? 'border-cro-warning/40 bg-cro-warning/10 text-cro-warning' : 'border-cro-danger/40 bg-cro-danger/10 text-cro-danger'}`}>
            {formatNumber(liquidationDistancePct, 2)}% buffer
          </span>
        </div>
        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-cro-muted">
              <span>Liq. price</span>
              <span>Sim mark price</span>
            </div>
            <div className="relative h-3 rounded-full bg-cro-dark">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cro-danger via-cro-warning to-cro-success" style={{ width: '100%' }} />
              <div className="absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-cro-danger shadow" style={{ left: `${liqPositionPct}%` }} />
              <div className="absolute top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: `${markPositionPct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-sm">
              <span className="text-cro-danger">{formatPrice(position.liquidationPrice)}</span>
              <span className="text-cro-text">{formatPrice(simulatedMarkPrice)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-3">
              <div className="text-xs uppercase tracking-wide text-cro-muted">Open Orders</div>
              <div className="mt-1 font-mono text-lg text-cro-text">{position.openOrders}</div>
            </div>
            <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-3">
              <div className="text-xs uppercase tracking-wide text-cro-muted">Equity Buffer</div>
              <div className="mt-1 font-mono text-lg text-cro-text">{formatUsd(equityBufferUsd)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
