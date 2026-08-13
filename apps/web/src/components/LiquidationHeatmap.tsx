'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LiquidationBucket, LiquidationHeatmapResponse, LiquidationPlatform, LiquidationPositionRisk } from '@cronos-dash/shared';
import { fetchLiquidationHeatmap } from '@/lib/api';

type PlatformFilter = 'all' | LiquidationPlatform;
type SideFilter = 'downside' | 'upside' | 'both';

const PLATFORM_OPTIONS: Array<{ value: PlatformFilter; label: string }> = [
  { value: 'all', label: 'Combined' },
  { value: 'tectonic', label: 'Tectonic' },
  { value: 'fulcrom', label: 'Fulcrom' },
  { value: 'moonlander', label: 'Moonlander' },
];

const SIDE_OPTIONS: Array<{ value: SideFilter; label: string }> = [
  { value: 'downside', label: 'Downside' },
  { value: 'upside', label: 'Upside shorts' },
  { value: 'both', label: 'Both' },
];

function formatUsd(value: number, decimals = 0): string {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPrice(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 })}`;
}

function formatPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function shortAddress(address?: string): string {
  if (!address) return '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function explorerAddressUrl(address?: string): string | undefined {
  return address ? `https://cronoscan.com/address/${address}` : undefined;
}

function bucketTone(bucket: LiquidationBucket, max: number): string {
  if (bucket.totalAtRiskUsd <= 0 || max <= 0) return 'bg-cro-dark/40';
  const intensity = bucket.totalAtRiskUsd / max;
  if (intensity > 0.66) return 'bg-cro-danger/25 border-cro-danger/50';
  if (intensity > 0.33) return 'bg-cro-warning/20 border-cro-warning/40';
  return 'bg-cro-cyan/10 border-cro-cyan/30';
}

function biggestPlatform(bucket: LiquidationBucket): string {
  const entries = Object.entries(bucket.byPlatform).sort(([, a], [, b]) => b.atRiskUsd - a.atRiskUsd);
  const [platform, value] = entries[0] || ['—', { atRiskUsd: 0 }];
  return value.atRiskUsd > 0 ? platform : '—';
}

function SummaryCards({ data }: { data: LiquidationHeatmapResponse }) {
  const totalAtRisk = Math.max(...data.buckets.map((bucket) => bucket.totalAtRiskUsd), 0);
  const nearestBucket = data.buckets.find((bucket) => bucket.shockPct !== 0 && bucket.totalAtRiskUsd > 0);
  const sourceCount = data.sources.filter((source) => source.ok).length;
  const positionCount = data.positions.length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-cro-border bg-cro-card p-4">
        <div className="text-xs uppercase tracking-wide text-cro-muted">CRO oracle/mark</div>
        <div className="mt-2 font-mono text-2xl font-bold text-cro-cyan">{formatPrice(data.currentPriceUsd)}</div>
        <div className="mt-1 text-xs text-cro-muted">Bucket baseline</div>
      </div>
      <div className="rounded-xl border border-cro-border bg-cro-card p-4">
        <div className="text-xs uppercase tracking-wide text-cro-muted">Max bucket risk</div>
        <div className="mt-2 font-mono text-2xl font-bold text-cro-text">{formatUsd(totalAtRisk)}</div>
        <div className="mt-1 text-xs text-cro-muted">Debt + perps notional split below</div>
      </div>
      <div className="rounded-xl border border-cro-border bg-cro-card p-4">
        <div className="text-xs uppercase tracking-wide text-cro-muted">Nearest cluster</div>
        <div className="mt-2 font-mono text-2xl font-bold text-cro-warning">{nearestBucket ? formatPct(nearestBucket.shockPct) : '—'}</div>
        <div className="mt-1 text-xs text-cro-muted">First non-zero risk bucket</div>
      </div>
      <div className="rounded-xl border border-cro-border bg-cro-card p-4">
        <div className="text-xs uppercase tracking-wide text-cro-muted">Coverage</div>
        <div className="mt-2 font-mono text-2xl font-bold text-cro-text">{sourceCount}/{data.sources.length} · {positionCount > 0 ? positionCount : 'summary'}</div>
        <div className="mt-1 text-xs text-cro-muted">Active venues · optional detail</div>
      </div>
    </div>
  );
}

function HeatmapTable({ data }: { data: LiquidationHeatmapResponse }) {
  const maxRisk = Math.max(...data.buckets.map((bucket) => bucket.totalAtRiskUsd), 0);

  return (
    <div className="rounded-xl border border-cro-border bg-cro-card overflow-hidden">
      <div className="border-b border-cro-border px-4 py-3">
        <h3 className="font-semibold text-cro-text">CRO liquidation buckets</h3>
        <p className="mt-1 text-sm text-cro-muted">Tectonic is debt at risk. Fulcrom/Moonlander are perps notional at risk.</p>
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[840px] text-sm">
          <thead className="bg-cro-dark/80 text-xs uppercase tracking-wide text-cro-muted">
            <tr>
              <th className="px-4 py-3 text-left">CRO move</th>
              <th className="px-4 py-3 text-left">CRO price</th>
              <th className="px-4 py-3 text-right">Total at risk</th>
              <th className="px-4 py-3 text-right">Tectonic debt</th>
              <th className="px-4 py-3 text-right">Fulcrom notional</th>
              <th className="px-4 py-3 text-right">Moonlander notional</th>
              <th className="px-4 py-3 text-right">Positions</th>
              <th className="px-4 py-3 text-left">Largest</th>
            </tr>
          </thead>
          <tbody>
            {data.buckets.map((bucket) => (
              <tr key={bucket.shockPct} className={`border-t border-cro-border/70 ${bucketTone(bucket, maxRisk)}`}>
                <td className="px-4 py-3 font-mono text-cro-text">{formatPct(bucket.shockPct)}</td>
                <td className="px-4 py-3 font-mono text-cro-muted">{formatPrice(bucket.priceUsd)}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-cro-text">{formatUsd(bucket.totalAtRiskUsd)}</td>
                <td className="px-4 py-3 text-right font-mono text-cro-muted">{formatUsd(bucket.byPlatform.tectonic.atRiskUsd)}</td>
                <td className="px-4 py-3 text-right font-mono text-cro-muted">{formatUsd(bucket.byPlatform.fulcrom.atRiskUsd)}</td>
                <td className="px-4 py-3 text-right font-mono text-cro-muted">{formatUsd(bucket.byPlatform.moonlander.atRiskUsd)}</td>
                <td className="px-4 py-3 text-right font-mono text-cro-muted">{bucket.positionCount}</td>
                <td className="px-4 py-3 capitalize text-cro-muted">{biggestPlatform(bucket)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-cro-border sm:hidden">
        {data.buckets.map((bucket) => (
          <div key={bucket.shockPct} className={`p-4 ${bucketTone(bucket, maxRisk)}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-cro-muted">CRO move</div>
                <div className="mt-1 font-mono text-lg font-bold text-cro-text">{formatPct(bucket.shockPct)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-cro-muted">At risk</div>
                <div className="mt-1 font-mono text-lg font-bold text-cro-cyan">{formatUsd(bucket.totalAtRiskUsd)}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-2">
                <div className="text-cro-muted">CRO price</div>
                <div className="mt-1 font-mono text-cro-text">{formatPrice(bucket.priceUsd)}</div>
              </div>
              <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-2">
                <div className="text-cro-muted">Positions</div>
                <div className="mt-1 font-mono text-cro-text">{bucket.positionCount}</div>
              </div>
              <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-2">
                <div className="text-cro-muted">Tectonic debt</div>
                <div className="mt-1 font-mono text-cro-text">{formatUsd(bucket.byPlatform.tectonic.atRiskUsd)}</div>
              </div>
              <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-2">
                <div className="text-cro-muted">Perps notional</div>
                <div className="mt-1 font-mono text-cro-text">{formatUsd(bucket.byPlatform.fulcrom.atRiskUsd + bucket.byPlatform.moonlander.atRiskUsd)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceNotes({ data }: { data: LiquidationHeatmapResponse }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {data.sources.map((source) => (
        <div key={source.platform} className={`rounded-xl border p-4 ${source.ok ? 'border-cro-border bg-cro-card' : 'border-cro-danger/40 bg-cro-danger/5'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold capitalize text-cro-text">{source.platform}</div>
            <div className={`rounded-full px-2 py-0.5 text-xs ${source.ok ? 'bg-cro-success/10 text-cro-success' : 'bg-cro-danger/10 text-cro-danger'}`}>{source.ok ? 'OK' : 'Issue'}</div>
          </div>
          <div className="mt-1 text-xs text-cro-muted">
            {source.ok ? 'Included in this market view' : 'Temporarily unavailable'}
          </div>
          {source.note && !source.ok && <p className="mt-2 text-sm text-cro-muted">{source.note}</p>}
        </div>
      ))}
    </div>
  );
}

function DetailRows({ positions }: { positions: LiquidationPositionRisk[] }) {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? positions : positions.slice(0, 20);

  return (
    <div className="rounded-xl border border-cro-border bg-cro-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-cro-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-cro-text">At-risk detail rows</h3>
          <p className="mt-1 text-sm text-cro-muted">Sorted by closest liquidation distance. Wallets link to Cronoscan.</p>
        </div>
        {positions.length > 20 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="self-start rounded-lg border border-cro-cyan/40 px-3 py-1.5 text-sm text-cro-cyan hover:bg-cro-cyan/10 transition-colors"
          >
            {expanded ? 'Show less' : `Show all ${positions.length}`}
          </button>
        )}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-cro-dark/80 text-xs uppercase tracking-wide text-cro-muted">
            <tr>
              <th className="px-4 py-3 text-left">Platform</th>
              <th className="px-4 py-3 text-left">Wallet</th>
              <th className="px-4 py-3 text-left">Pair</th>
              <th className="px-4 py-3 text-left">Side</th>
              <th className="px-4 py-3 text-right">Liq. price</th>
              <th className="px-4 py-3 text-right">Distance</th>
              <th className="px-4 py-3 text-right">At risk</th>
              <th className="px-4 py-3 text-left">Type</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((position) => (
              <tr key={position.id} className="border-t border-cro-border/70">
                <td className="px-4 py-3 capitalize text-cro-text">{position.platform}</td>
                <td className="px-4 py-3 font-mono text-cro-muted">
                  {position.account ? (
                    <a href={explorerAddressUrl(position.account)} target="_blank" rel="noreferrer" className="hover:text-cro-cyan">
                      {shortAddress(position.account)}
                    </a>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-cro-muted">{position.pair}</td>
                <td className="px-4 py-3 text-cro-muted">{position.side}</td>
                <td className="px-4 py-3 text-right font-mono text-cro-text">{formatPrice(position.liquidationPriceUsd)}</td>
                <td className="px-4 py-3 text-right font-mono text-cro-muted">{position.distancePct.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</td>
                <td className="px-4 py-3 text-right font-mono text-cro-text">{formatUsd(position.amountAtRiskUsd)}</td>
                <td className="px-4 py-3 text-cro-muted">{position.riskKind === 'lending-debt' ? 'Debt' : 'Perps notional'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-cro-muted">No at-risk rows returned for this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-cro-border sm:hidden">
        {rows.map((position) => (
          <div key={position.id} className="p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold capitalize text-cro-text">{position.platform}</div>
                <div className="mt-1 text-cro-muted">{position.pair} · {position.side}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-cro-muted">At risk</div>
                <div className="mt-1 font-mono text-cro-cyan">{formatUsd(position.amountAtRiskUsd)}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-2">
                <div className="text-cro-muted">Wallet</div>
                <div className="mt-1 font-mono text-cro-text">
                  {position.account ? (
                    <a href={explorerAddressUrl(position.account)} target="_blank" rel="noreferrer" className="hover:text-cro-cyan">
                      {shortAddress(position.account)}
                    </a>
                  ) : '—'}
                </div>
              </div>
              <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-2">
                <div className="text-cro-muted">Liq. price</div>
                <div className="mt-1 font-mono text-cro-text">{formatPrice(position.liquidationPriceUsd)}</div>
              </div>
              <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-2">
                <div className="text-cro-muted">Distance</div>
                <div className="mt-1 font-mono text-cro-text">{position.distancePct.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</div>
              </div>
              <div className="rounded-lg border border-cro-border bg-cro-dark/60 p-2">
                <div className="text-cro-muted">Type</div>
                <div className="mt-1 text-cro-text">{position.riskKind === 'lending-debt' ? 'Debt' : 'Perps notional'}</div>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="px-4 py-8 text-center text-cro-muted">No positions match this filter.</div>}
      </div>
    </div>
  );
}

export function LiquidationHeatmap() {
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [side, setSide] = useState<SideFilter>('downside');
  const [includeDetails, setIncludeDetails] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['liquidation-heatmap', platform, side, includeDetails],
    queryFn: () => fetchLiquidationHeatmap({ platform, side, includeDetails }),
    refetchInterval: 60_000,
  });

  const sortedPositions = useMemo(() => data?.positions.slice().sort((a, b) => a.distancePct - b.distancePct) || [], [data]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cro-border bg-cro-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-cro-cyan">Market Risk</div>
            <h2 className="mt-1 text-2xl font-bold text-cro-text">CRO Liquidation Heatmap</h2>
            <p className="mt-2 max-w-3xl text-sm text-cro-muted">
              No-login view of CRO liquidation clusters across Tectonic lending and CRO perps venues. Use combined for market pressure, then separate tabs to see the source.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="self-start rounded-lg border border-cro-cyan/40 px-3 py-1.5 text-sm text-cro-cyan hover:bg-cro-cyan/10 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto px-1">
            <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-cro-muted">View</span>
            {PLATFORM_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setPlatform(option.value)}
                className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                  platform === option.value
                    ? 'border-cro-cyan/50 bg-cro-cyan/15 text-cro-cyan shadow-[0_0_18px_rgba(76,219,255,0.10)]'
                    : 'border-cro-border bg-cro-dark/60 text-cro-muted hover:border-cro-cyan/30 hover:text-cro-text'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto px-1">
            <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-cro-muted">Direction</span>
            {SIDE_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setSide(option.value)}
                className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                  side === option.value
                    ? 'border-purple-400/50 bg-purple-500/15 text-purple-200 shadow-[0_0_18px_rgba(168,85,247,0.12)]'
                    : 'border-cro-border bg-cro-dark/60 text-cro-muted hover:border-purple-400/30 hover:text-cro-text'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-cro-border bg-cro-card p-6 text-center text-cro-muted">
          Loading liquidation heatmap…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-cro-danger/40 bg-cro-danger/5 p-6 text-center">
          <div className="font-semibold text-cro-danger">Failed to load liquidation heatmap</div>
          <div className="mt-1 text-sm text-cro-muted">{error instanceof Error ? error.message : 'Try again shortly.'}</div>
        </div>
      )}

      {data && (
        <>
          <SummaryCards data={data} />
          <HeatmapTable data={data} />
          <SourceNotes data={data} />
          {includeDetails ? (
            <DetailRows positions={sortedPositions} />
          ) : (
            <div className="rounded-xl border border-cro-border bg-cro-card p-5 text-center">
              <div className="font-semibold text-cro-text">Wallet-level details are optional</div>
              <p className="mx-auto mt-1 max-w-2xl text-sm text-cro-muted">
                Start with the summary view, then load wallet-level details when you want to inspect the positions behind a cluster.
              </p>
              <button
                type="button"
                onClick={() => setIncludeDetails(true)}
                className="mt-4 rounded-lg border border-cro-cyan/40 px-4 py-2 text-sm font-semibold text-cro-cyan hover:bg-cro-cyan/10 transition-colors"
              >
                Load detail rows
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
