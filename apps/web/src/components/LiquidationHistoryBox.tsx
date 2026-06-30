'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchLiquidationHistory } from '@/lib/api';

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

  return (
    <div className="bg-cro-card rounded-xl border border-cro-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-cro-text">Liquidation History</h3>
          <p className="text-xs text-cro-muted mt-1">
            Loaded on demand from Tectonic's subgraph so the dashboard does not query historical events on every refresh.
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
        <div className="space-y-3">
          <div className="text-sm text-cro-muted">
            Found <span className="font-mono text-cro-text">{history.count}</span> liquidation event{history.count === 1 ? '' : 's'}.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-cro-muted border-b border-cro-border">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Debt Repaid</th>
                  <th className="py-2 pr-3">Collateral Seized</th>
                  <th className="py-2 pr-3">Penalty Est.</th>
                  <th className="py-2 pr-3">Tx</th>
                </tr>
              </thead>
              <tbody>
                {history.events.map((event) => (
                  <tr key={event.id} className="border-b border-cro-border/60 last:border-0">
                    <td className="py-3 pr-3 text-cro-text whitespace-nowrap">
                      {new Date(event.blockTime * 1000).toLocaleDateString()}
                      <div className="text-xs text-cro-muted">block {event.blockNumber.toLocaleString()}</div>
                    </td>
                    <td className="py-3 pr-3 font-mono text-cro-text whitespace-nowrap">
                      {formatNumber(event.debtRepaidAmount, 2)} {event.debtSymbol}
                    </td>
                    <td className="py-3 pr-3 font-mono text-cro-danger whitespace-nowrap">
                      {formatNumber(event.estimatedCollateralAmount, 2)} {event.collateralSymbol}
                      <div className="text-xs text-cro-muted">
                        raw: {formatNumber(event.seizedTTokenAmount, 2)} {event.tTokenSymbol}
                      </div>
                    </td>
                    <td className="py-3 pr-3 font-mono text-cro-warning whitespace-nowrap">
                      {formatNumber(event.penaltyCollateralAmount, 2)} {event.collateralSymbol}
                      <div className="text-xs text-cro-muted">${formatNumber(event.penaltyUsd, 2)}</div>
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <a
                        href={`https://cronoscan.com/tx/${event.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-cro-cyan hover:underline"
                      >
                        {shortHash(event.txHash)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history.note && (
            <p className="text-xs text-cro-muted">{history.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
