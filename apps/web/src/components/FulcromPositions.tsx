'use client';

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

export function FulcromPositions() {
  const position = REFERENCE_POSITION;
  const isLong = position.side === 'Long';
  const pnlTone = position.pnlUsd >= 0 ? 'success' : 'danger';
  const liquidationDistancePct = position.markPrice > 0
    ? ((position.markPrice - position.liquidationPrice) / position.markPrice) * 100
    : 0;
  const priceMoveToBreakEvenPct = position.entryPrice > 0
    ? ((position.markPrice - position.entryPrice) / position.entryPrice) * 100
    : 0;
  const collateralBufferUsd = Math.max(0, position.netValueUsd - Math.abs(position.pnlUsd));

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
                  Reference position
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-cro-muted">
                Tracks leveraged CRO exposure separately from Tectonic lending risk. This card is seeded from your current Fulcrom screenshot so the live-data adapter can replace the values later without changing the UI.
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
              {formatPrice(position.markPrice)} <span className="text-cro-muted">/ {formatPrice(position.entryPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <MetricCard label="Net Value" value={formatUsd(position.netValueUsd)} subtext="Equity after current PnL" tone="cyan" />
        <MetricCard
          label="PnL"
          value={`${position.pnlUsd >= 0 ? '+' : ''}${formatUsd(position.pnlUsd)} (${position.pnlPct >= 0 ? '+' : ''}${formatNumber(position.pnlPct, 2)}%)`}
          subtext={`Move since entry: ${formatNumber(priceMoveToBreakEvenPct, 2)}%`}
          tone={pnlTone}
        />
        <MetricCard label="Position Size" value={formatUsd(position.sizeUsd)} subtext={`${formatNumber(position.leverage, 1)}x notional exposure`} />
        <MetricCard label="Collateral" value={formatUsd(position.collateralUsd)} subtext={`Net: ${formatUsd(position.netCollateralUsd)}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-cro-border bg-cro-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-cro-text">Liquidation Monitor</h3>
            <span className="rounded-full border border-cro-danger/40 bg-cro-danger/10 px-2.5 py-1 text-xs font-semibold text-cro-danger">
              {formatNumber(liquidationDistancePct, 2)}% buffer
            </span>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-cro-muted">
                <span>Liq. price</span>
                <span>Mark price</span>
              </div>
              <div className="relative h-3 rounded-full bg-cro-dark">
                <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cro-danger via-cro-warning to-cro-success" style={{ width: '100%' }} />
                <div className="absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: '88%' }} />
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-sm">
                <span className="text-cro-danger">{formatPrice(position.liquidationPrice)}</span>
                <span className="text-cro-text">{formatPrice(position.markPrice)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-3">
                <div className="text-xs uppercase tracking-wide text-cro-muted">Open Orders</div>
                <div className="mt-1 font-mono text-lg text-cro-text">{position.openOrders}</div>
              </div>
              <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-3">
                <div className="text-xs uppercase tracking-wide text-cro-muted">Equity Buffer</div>
                <div className="mt-1 font-mono text-lg text-cro-text">{formatUsd(collateralBufferUsd)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-cro-border bg-cro-card p-4 sm:p-5">
          <h3 className="font-semibold text-cro-text">Tracking Plan</h3>
          <div className="mt-4 space-y-3 text-sm text-cro-muted">
            <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-3">
              <div className="font-semibold text-cro-text">Best toggle pattern</div>
              <p className="mt-1">Use top-level protocol tabs: <span className="text-cro-cyan">Tectonic Lending</span> for collateral/borrow health and <span className="text-purple-200">Fulcrom Perps</span> for leveraged positions. This keeps risk math isolated while putting both dashboards in one page.</p>
            </div>
            <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-3">
              <div className="font-semibold text-cro-text">Next live-data hook</div>
              <p className="mt-1">Wire this card to Fulcrom position data by wallet address when a stable public subgraph/API or contract reader is added. The UI already separates mark, entry, liquidation, notional, collateral, and PnL fields.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
