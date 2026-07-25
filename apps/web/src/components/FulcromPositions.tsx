'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FulcromPosition, FulcromTradeHistoryEvent } from '@cronos-dash/shared';
import { fetchFulcromPositions, fetchFulcromTradeHistory } from '@/lib/api';

const FULCROM_REFERENCE_POSITION: FulcromPosition = {
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
  indexSymbol: 'CRO',
  collateralSymbol: 'USDC',
  source: 'demo',
};

const MOONLANDER_REFERENCE_POSITION: FulcromPosition = {
  platform: 'Moonlander',
  pair: 'CRO/USD',
  side: 'Long',
  leverage: 15,
  netValueUsd: 984.44,
  pnlUsd: 31.01,
  pnlPct: 3.23,
  sizeUsd: 14479.17,
  collateralUsd: 960.67,
  netCollateralUsd: 960.67,
  markPrice: 0.05669,
  entryPrice: 0.05654,
  liquidationPrice: 0.05337,
  openOrders: 0,
  indexSymbol: 'CRO',
  collateralSymbol: 'USDC.e',
  source: 'demo',
  sizeTokenAmount: 255409.596049,
  takeProfitPrice: 0.06031,
  takeProfitPnlPct: 100.02,
  slippagePct: 1,
  orderType: 'Market',
  note: 'Manual Moonlander position from latest screenshot',
};

const REFERENCE_HISTORY: FulcromTradeHistoryEvent[] = [
  {
    id: 'demo-increase-cro-long',
    txHash: '0x0000000000000000000000000000000000000000000000000000000000000f01',
    blockNumber: 18750120,
    blockTime: 1784001600,
    isoTime: '2026-07-11T18:00:00.000Z',
    action: 'Increase',
    pair: 'CRO/USD',
    side: 'Long',
    sizeDeltaUsd: 2945.95,
    collateralDeltaUsd: 98.51,
    priceUsd: 0.05634,
    feeUsd: 2.95,
    indexSymbol: 'CRO',
    collateralSymbol: 'USDC',
  },
  {
    id: 'demo-decrease-cro-long',
    txHash: '0x0000000000000000000000000000000000000000000000000000000000000f02',
    blockNumber: 18742884,
    blockTime: 1783940400,
    isoTime: '2026-07-11T01:00:00.000Z',
    action: 'Decrease',
    pair: 'CRO/USD',
    side: 'Long',
    sizeDeltaUsd: 450,
    collateralDeltaUsd: 12,
    priceUsd: 0.05721,
    feeUsd: 0.45,
    realisedPnlUsd: 6.82,
    indexSymbol: 'CRO',
    collateralSymbol: 'USDC',
  },
];

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

function formatDate(isoTime: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoTime));
}

function explorerTxUrl(txHash: string): string {
  return `https://cronoscan.com/tx/${txHash}`;
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

type PerpsPlatform = 'fulcrom' | 'moonlander';

export function FulcromPositions({
  address,
  demoMode = false,
  platform = 'fulcrom',
}: {
  address?: string;
  demoMode?: boolean;
  platform?: PerpsPlatform;
}) {
  const [priceMovePct, setPriceMovePct] = useState(0);
  const [selectedPositionIndex, setSelectedPositionIndex] = useState(0);
  const isMoonlander = platform === 'moonlander';
  const platformLabel = isMoonlander ? 'Moonlander' : 'Fulcrom';
  const { data, isLoading, error } = useQuery({
    queryKey: ['fulcrom-positions', address],
    queryFn: () => fetchFulcromPositions(address!),
    enabled: !!address && !demoMode && !isMoonlander,
    refetchInterval: 30000,
  });
  const historyQuery = useQuery({
    queryKey: ['fulcrom-trade-history', address],
    queryFn: () => fetchFulcromTradeHistory(address!),
    enabled: false,
  });

  const livePositions = data?.positions || [];
  const positions = isMoonlander
    ? [MOONLANDER_REFERENCE_POSITION]
    : demoMode
      ? [FULCROM_REFERENCE_POSITION]
      : livePositions;
  const historyEvents = isMoonlander ? undefined : demoMode ? REFERENCE_HISTORY : historyQuery.data?.events;
  const position = positions[Math.min(selectedPositionIndex, Math.max(0, positions.length - 1))] || null;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-cro-border bg-cro-card p-6 text-center text-cro-muted">
        Loading {platformLabel} positions…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-cro-danger/40 bg-cro-danger/5 p-6 text-center">
        <div className="font-semibold text-cro-danger">Failed to load {platformLabel} positions</div>
        <div className="mt-1 text-sm text-cro-muted">Try again shortly, or verify directly on {platformLabel}.</div>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-cro-border bg-cro-card p-6 text-center">
          <div className="font-semibold text-cro-text">No open {platformLabel} positions</div>
          <div className="mt-1 text-sm text-cro-muted">Open perps positions for this wallet will appear here automatically when a live adapter is available.</div>
        </div>

        <div className="rounded-xl border border-cro-border bg-cro-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-cro-text">Trade History</h3>
              <div className="mt-1 text-sm text-cro-muted">
                Recent {platformLabel} increases, decreases, and liquidations for this wallet.
              </div>
            </div>
            {!demoMode && !isMoonlander && (
              <button
                type="button"
                onClick={() => historyQuery.refetch()}
                disabled={historyQuery.isFetching || !address}
                className="self-start rounded-lg border border-cro-cyan/40 px-3 py-1.5 text-sm text-cro-cyan hover:bg-cro-cyan/10 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {historyQuery.isFetching ? 'Loading…' : historyQuery.data ? 'Refresh history' : 'Load history'}
              </button>
            )}
          </div>

          {historyQuery.error && !demoMode && !isMoonlander && (
            <div className="mt-4 rounded-lg border border-cro-danger/30 bg-cro-danger/5 p-3 text-sm text-cro-danger">
              Failed to load {platformLabel} trade history. Try again shortly, or verify directly on {platformLabel}.
            </div>
          )}

          {!historyEvents && !historyQuery.error && !demoMode && !isMoonlander && (
            <div className="mt-4 rounded-lg border border-cro-border bg-cro-dark/60 p-4 text-sm text-cro-muted">
              Trade history is loaded on demand to avoid scanning Vault logs on every dashboard refresh.
            </div>
          )}

          {historyEvents && historyEvents.length === 0 && (
            <div className="mt-4 rounded-lg border border-cro-border bg-cro-dark/60 p-4 text-sm text-cro-muted">
              No {platformLabel} trade events were returned for this wallet.
            </div>
          )}

          {historyEvents && historyEvents.length > 0 && (
            <div className="mt-4 space-y-2">
              {historyEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="flex flex-col gap-2 rounded-lg border border-cro-border bg-cro-dark/60 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium text-cro-text">{event.action} {event.pair} {event.side}</div>
                    <div className="font-mono text-xs text-cro-muted">
                      {formatDate(event.isoTime)}{event.blockNumber > 0 ? ` · #${event.blockNumber}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:text-right">
                    <div className="font-mono text-cro-text">{formatUsd(event.sizeDeltaUsd ?? event.sizeUsd ?? 0)}</div>
                    <a href={explorerTxUrl(event.txHash)} target="_blank" rel="noreferrer" className="font-mono text-xs text-cro-cyan hover:underline">
                      {event.txHash.slice(0, 6)}…{event.txHash.slice(-4)}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

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
  const sliderMin = -100;
  const sliderMax = 100;
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
                <h2 className="text-xl font-semibold text-cro-text sm:text-2xl">{platformLabel} Perps</h2>
                <span className="rounded-full border border-purple-400/40 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-200">
                  Leveraged position
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-cro-muted">
                {isMoonlander
                  ? 'Manual Moonlander CRO long from the latest screenshot, with liquidation buffer, collateral, fees, and target price in one place.'
                  : 'Track leveraged CRO exposure, liquidation buffer, collateral, and simulated profit or loss in one place.'}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-cro-border bg-cro-dark/70 px-4 py-3 text-sm">
            <div className="text-cro-muted">Platform</div>
            <div className="mt-1 font-semibold text-cro-text">{position.platform}</div>
            <div className="mt-1 text-xs text-cro-muted">{position.source === 'live' ? 'Live on-chain' : isMoonlander ? 'Manual screenshot' : 'Demo data'}</div>
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

      {positions.length > 1 && (
        <div className="rounded-xl border border-cro-border bg-cro-card p-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="px-2 text-xs text-cro-muted whitespace-nowrap">{platformLabel} positions:</span>
            {positions.map((p, index) => (
              <button
                key={`${p.pair}-${p.side}-${index}`}
                type="button"
                onClick={() => {
                  setSelectedPositionIndex(index);
                  setPriceMovePct(0);
                }}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  index === selectedPositionIndex
                    ? 'bg-gradient-to-r from-purple-500 to-cro-cyan text-cro-dark'
                    : 'bg-cro-dark text-cro-muted hover:bg-cro-border hover:text-cro-text'
                }`}
              >
                {p.pair} {p.side} · {formatNumber(p.leverage, 1)}x
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <MetricCard label="Net Value" value={formatUsd(simulatedNetValueUsd)} subtext={priceMovePct === 0 ? 'Current equity' : `${formatSignedNumber(pnlDeltaUsd, 2)} simulated`} tone="cyan" />
        <MetricCard
          label="PnL"
          value={`${simulatedPnlUsd >= 0 ? '+' : ''}${formatUsd(simulatedPnlUsd)} (${formatSignedNumber(simulatedPnlPct, 2)}%)`}
          subtext={`CRO vs entry: ${formatSignedNumber(priceMoveToEntryPct, 2)}%`}
          tone={pnlTone}
        />
        <MetricCard
          label="Position Size"
          value={formatUsd(position.sizeUsd)}
          subtext={position.sizeTokenAmount ? `${formatNumber(position.sizeTokenAmount, 2)} ${position.indexSymbol}` : `${formatNumber(position.leverage, 1)}x notional exposure`}
        />
        <MetricCard label="Collateral" value={formatUsd(position.collateralUsd)} subtext={`Net: ${formatUsd(position.netCollateralUsd)}`} />
      </div>

      {(position.takeProfitPrice || position.stopLossPrice || position.feesUsd || position.slippagePct || position.orderType) && (
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          {position.takeProfitPrice && <MetricCard label="Take Profit" value={formatPrice(position.takeProfitPrice)} subtext={position.takeProfitPnlPct ? `Target PnL ${formatSignedNumber(position.takeProfitPnlPct, 2)}%` : undefined} tone="success" />}
          <MetricCard label="Stop Loss" value={position.stopLossPrice ? formatPrice(position.stopLossPrice) : 'Not set'} />
          {position.feesUsd !== undefined && <MetricCard label="Fees" value={formatUsd(position.feesUsd)} subtext={position.orderType ? `${position.orderType} order` : undefined} />}
          {position.slippagePct !== undefined && <MetricCard label="Slippage" value={`${formatNumber(position.slippagePct, 0)}%`} />}
        </div>
      )}

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

      <div className="rounded-xl border border-cro-border bg-cro-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-cro-text">Trade History</h3>
            <div className="mt-1 text-sm text-cro-muted">
              Recent {platformLabel} increases, decreases, and liquidations for this wallet.
            </div>
          </div>
          {!demoMode && !isMoonlander && (
            <button
              type="button"
              onClick={() => historyQuery.refetch()}
              disabled={historyQuery.isFetching || !address}
              className="self-start rounded-lg border border-cro-cyan/40 px-3 py-1.5 text-sm text-cro-cyan hover:bg-cro-cyan/10 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {historyQuery.isFetching ? 'Loading…' : historyQuery.data ? 'Refresh history' : 'Load history'}
            </button>
          )}
        </div>

        {isMoonlander && (
          <div className="mt-4 rounded-lg border border-cro-border bg-cro-dark/60 p-4 text-sm text-cro-muted">
            Moonlander history is not wired to a live adapter yet. This card tracks the manually captured open position from your screenshot.
          </div>
        )}

        {historyQuery.error && !demoMode && !isMoonlander && (
          <div className="mt-4 rounded-lg border border-cro-danger/30 bg-cro-danger/5 p-3 text-sm text-cro-danger">
            Failed to load {platformLabel} trade history. Try again shortly, or verify directly on {platformLabel}.
          </div>
        )}

        {!historyEvents && !historyQuery.error && !demoMode && !isMoonlander && (
          <div className="mt-4 rounded-lg border border-cro-border bg-cro-dark/60 p-4 text-sm text-cro-muted">
            Trade history is loaded on demand to avoid scanning Vault logs on every dashboard refresh.
          </div>
        )}

        {historyEvents && historyEvents.length === 0 && (
          <div className="mt-4 rounded-lg border border-cro-border bg-cro-dark/60 p-4 text-sm text-cro-muted">
            No {platformLabel} trade events were returned for this wallet.
          </div>
        )}

        {historyEvents && historyEvents.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-cro-border">
            <div className="hidden bg-cro-dark/80 text-xs uppercase tracking-wide text-cro-muted sm:grid sm:grid-cols-[1.1fr_1fr_0.9fr_0.9fr_0.9fr_0.7fr]">
              <div className="px-3 py-2">Time</div>
              <div className="px-3 py-2">Action</div>
              <div className="px-3 py-2 text-right">Size</div>
              <div className="px-3 py-2 text-right">Collateral</div>
              <div className="px-3 py-2 text-right">Price</div>
              <div className="px-3 py-2 text-right">Tx</div>
            </div>
            <div className="divide-y divide-cro-border">
              {historyEvents.map((event) => {
                const actionTone = event.action === 'Increase'
                  ? 'text-cro-success bg-cro-success/10 border-cro-success/30'
                  : event.action === 'Liquidation'
                    ? 'text-cro-danger bg-cro-danger/10 border-cro-danger/30'
                    : 'text-cro-warning bg-cro-warning/10 border-cro-warning/30';
                const size = event.sizeDeltaUsd ?? event.sizeUsd ?? 0;
                const collateral = event.collateralDeltaUsd ?? event.collateralUsd ?? 0;
                return (
                  <div key={event.id} className="grid gap-3 p-3 text-sm sm:grid-cols-[1.1fr_1fr_0.9fr_0.9fr_0.9fr_0.7fr] sm:items-center sm:gap-0">
                      <div className="font-mono text-xs text-cro-muted">
                        {formatDate(event.isoTime)}{event.blockNumber > 0 ? ` · #${event.blockNumber}` : ''}
                      </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${actionTone}`}>{event.action}</span>
                      <span className="font-medium text-cro-text">{event.pair}</span>
                      <span className={`text-xs ${event.side === 'Long' ? 'text-cro-success' : 'text-cro-danger'}`}>{event.side}</span>
                    </div>
                    <div className="flex justify-between gap-2 sm:block sm:text-right">
                      <span className="text-cro-muted sm:hidden">Size</span>
                      <span className="font-mono text-cro-text">{formatUsd(size)}</span>
                    </div>
                    <div className="flex justify-between gap-2 sm:block sm:text-right">
                      <span className="text-cro-muted sm:hidden">Collateral</span>
                      <span className="font-mono text-cro-text">{formatUsd(collateral)}</span>
                    </div>
                    <div className="flex justify-between gap-2 sm:block sm:text-right">
                      <span className="text-cro-muted sm:hidden">Price</span>
                      <span className="font-mono text-cro-text">{event.priceUsd ? formatPrice(event.priceUsd) : '—'}</span>
                    </div>
                    <div className="text-left sm:text-right">
                      <a
                        href={explorerTxUrl(event.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-cro-cyan hover:underline"
                      >
                        {event.txHash.slice(0, 6)}…{event.txHash.slice(-4)}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {historyQuery.data?.note && !demoMode && (
          <p className="mt-3 text-xs text-cro-muted">{historyQuery.data.note}</p>
        )}
      </div>
    </div>
  );
}
