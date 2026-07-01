'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchLiquidationHistory } from '@/lib/api';
import { InfoTooltip } from './InfoTooltip';

interface LiquidationHistoryBoxProps {
  address?: string;
}

function formatNumber(n: number | undefined, decimals = 2): string {
  if (n === undefined || !isFinite(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export function LiquidationHistoryBox({ address }: LiquidationHistoryBoxProps) {
  const historyQuery = useQuery({
    queryKey: ['liquidation-history', address],
    queryFn: () => fetchLiquidationHistory(address!),
    enabled: false,
    staleTime: 10 * 60 * 1000,
  });

  if (!address) {
    return null;
  }

  const history = historyQuery.data;
  const debtSymbols = history ? Array.from(new Set(history.events.map((event) => event.debtSymbol).filter(Boolean))) : [];
  const totalDebtRepaid = debtSymbols.length === 1
    ? history?.events.reduce((sum, event) => sum + (event.debtRepaidAmount || 0), 0) || 0
    : undefined;
  const totalPenaltyUsd = history?.events.reduce((sum, event) => sum + (event.penaltyUsd || 0), 0) || 0;

  return (
    <div className="bg-cro-card rounded-xl border border-cro-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-cro-text">Liquidation History</h3>
            <InfoTooltip label="About liquidation history">
              Loads prior liquidation events for the connected wallet from Tectonic's public subgraph. Collateral amounts are approximate because tToken exchange rates are converted with current market data, not exact historical block rates.
            </InfoTooltip>
          </div>
          <p className="text-xs text-cro-muted mt-1">
            Review prior liquidation events for this wallet. Loaded only on demand to keep the dashboard fast.
          </p>
        </div>
        <button
          type="button"
          onClick={() => historyQuery.refetch()}
          disabled={historyQuery.isFetching}
          className="px-4 py-2 rounded-lg bg-cro-cyan text-cro-dark text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {historyQuery.isFetching ? 'Loading…' : history ? 'Refresh history' : 'Load history'}
        </button>
      </div>

      {historyQuery.error && (
        <div className="rounded-lg border border-cro-danger/50 bg-cro-danger/5 px-3 py-2 text-sm text-cro-danger">
          Failed to load liquidation history. Try again in a minute.
        </div>
      )}

      {!history && !historyQuery.error && (
        <div className="rounded-lg border border-cro-border bg-cro-dark/40 px-3 py-2 text-sm text-cro-muted">
          History is intentionally not auto-loaded. Click the button when you want to inspect prior liquidations.
        </div>
      )}

      {history && history.events.length === 0 && (
        <div className="rounded-lg border border-cro-border bg-cro-dark/40 px-3 py-2 text-sm text-cro-muted">
          No prior liquidation events found for this wallet in the Tectonic subgraph.
        </div>
      )}

      {history && history.events.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-cro-border bg-cro-dark/40 px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-cro-muted">Events</div>
              <div className="mt-1 font-mono text-lg text-cro-text">{history.count}</div>
            </div>
            <div className="rounded-lg border border-cro-border bg-cro-dark/40 px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-cro-muted">Debt Repaid</div>
              <div className="mt-1 font-mono text-lg text-cro-text">
                {totalDebtRepaid !== undefined ? `${formatNumber(totalDebtRepaid, 2)} ${debtSymbols[0]}` : 'Mixed assets'}
              </div>
            </div>
            <div className="rounded-lg border border-cro-warning/30 bg-cro-warning/5 px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-cro-muted">Penalty Est.</div>
              <div className="mt-1 font-mono text-lg text-cro-warning">${formatNumber(totalPenaltyUsd, 2)}</div>
            </div>
          </div>

          <div className="space-y-3">
            {history.events.map((event) => (
              <div key={event.id} className="rounded-xl border border-cro-border bg-cro-dark/40 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-cro-border/60 pb-3">
                  <div>
                    <div className="font-medium text-cro-text">
                      {new Date(event.blockTime * 1000).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-xs text-cro-muted">Block {event.blockNumber.toLocaleString()}</div>
                  </div>
                  <a
                    href={`https://cronoscan.com/tx/${event.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-cro-border px-3 py-1 font-mono text-xs text-cro-cyan hover:border-cro-cyan hover:bg-cro-cyan/5"
                  >
                    {shortHash(event.txHash)}
                  </a>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-cro-muted">Debt repaid</div>
                    <div className="mt-1 font-mono text-cro-text">
                      {formatNumber(event.debtRepaidAmount, 2)} {event.debtSymbol}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-cro-muted">Collateral seized</div>
                    <div className="mt-1 font-mono text-cro-danger">
                      {formatNumber(event.estimatedCollateralAmount, 2)} {event.collateralSymbol}
                    </div>
                    <div className="text-xs text-cro-muted">raw: {formatNumber(event.seizedTTokenAmount, 2)} {event.tTokenSymbol}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-cro-muted">Penalty est.</div>
                    <div className="mt-1 font-mono text-cro-warning">
                      {formatNumber(event.penaltyCollateralAmount, 2)} {event.collateralSymbol}
                    </div>
                    <div className="text-xs text-cro-muted">${formatNumber(event.penaltyUsd, 2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {history.note && (
            <p className="text-xs text-cro-muted">{history.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
