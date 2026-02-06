import type {
  UnifiedPortfolio,
  SimulateRequest,
  ScenarioResult,
  TargetHFInput,
  TargetHFResult,
} from '@cronos-dash/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchPrices(): Promise<Record<string, number>> {
  const res = await fetch(`${API_BASE}/api/prices`);
  if (!res.ok) {
    throw new Error('Failed to fetch prices');
  }
  const data = await res.json();
  return data.prices;
}

export async function fetchPortfolio(address: string): Promise<UnifiedPortfolio> {
  const res = await fetch(`${API_BASE}/api/portfolio?address=${address}`);
  if (!res.ok) {
    throw new Error('Failed to fetch portfolio');
  }
  return res.json();
}

export async function simulateScenario(
  request: SimulateRequest
): Promise<ScenarioResult> {
  const res = await fetch(`${API_BASE}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    throw new Error('Simulation failed');
  }
  return res.json();
}

export async function calculateTargetHF(
  input: TargetHFInput
): Promise<TargetHFResult> {
  const res = await fetch(`${API_BASE}/api/target-hf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error('Target HF calculation failed');
  }
  return res.json();
}
