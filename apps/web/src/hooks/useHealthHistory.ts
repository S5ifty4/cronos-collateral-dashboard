import { useEffect, useState } from 'react';
import type { UnifiedPortfolio } from '@cronos-dash/shared';
import { saveSnapshot, getSnapshots, type HealthSnapshot } from '@/lib/health-history';

export function useHealthHistory(
  address: string | undefined,
  portfolio: UnifiedPortfolio | undefined
): { snapshots: HealthSnapshot[] } {
  const [snapshots, setSnapshots] = useState<HealthSnapshot[]>([]);

  // Save snapshot whenever portfolio changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!address || !portfolio) return;

    const now = Date.now();

    // Unified snapshot
    saveSnapshot(address, {
      timestamp: now,
      protocol: 'all',
      healthFactor: portfolio.unified.healthFactor,
      totalBorrowUsd: portfolio.unified.totalBorrowUsd,
      totalCollateralUsd: portfolio.unified.totalCollateralUsd,
    });

    // Per-protocol snapshots
    for (const snap of portfolio.snapshots) {
      saveSnapshot(address, {
        timestamp: now,
        protocol: snap.protocol,
        healthFactor: snap.risk.healthFactor,
        totalBorrowUsd: snap.totals.borrowUsd,
        totalCollateralUsd: snap.totals.collateralUsd,
      });
    }

    setSnapshots(getSnapshots(address));
  }, [address, portfolio]);

  // Load on mount / address change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!address) {
      setSnapshots([]);
      return;
    }
    setSnapshots(getSnapshots(address));
  }, [address]);

  return { snapshots };
}
