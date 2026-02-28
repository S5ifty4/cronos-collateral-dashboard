/**
 * Client-side health factor history stored in localStorage.
 * Supports per-wallet snapshots capped at 500 entries / 90 days.
 */

export interface HealthSnapshot {
  timestamp: number;       // unix ms
  protocol: string;        // 'tectonic' | 'mimas' | 'all'
  healthFactor: number;
  totalBorrowUsd: number;
  totalCollateralUsd: number;
}

const MAX_ENTRIES = 500;
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function storageKey(wallet: string): string {
  return `croll_history_${wallet.toLowerCase()}`;
}

export function getSnapshots(wallet: string): HealthSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(wallet));
    if (!raw) return [];
    return JSON.parse(raw) as HealthSnapshot[];
  } catch {
    return [];
  }
}

export function pruneSnapshots(wallet: string): void {
  if (typeof window === 'undefined') return;
  const cutoff = Date.now() - MAX_AGE_MS;
  let entries = getSnapshots(wallet).filter((s) => s.timestamp >= cutoff);
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(entries.length - MAX_ENTRIES);
  }
  try {
    localStorage.setItem(storageKey(wallet), JSON.stringify(entries));
  } catch {
    // localStorage full — silently ignore
  }
}

export function saveSnapshot(wallet: string, snapshot: HealthSnapshot): void {
  if (typeof window === 'undefined') return;
  const entries = getSnapshots(wallet);
  entries.push(snapshot);
  try {
    localStorage.setItem(storageKey(wallet), JSON.stringify(entries));
  } catch {
    // ignore write errors
  }
  pruneSnapshots(wallet);
}
