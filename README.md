# Cronos Collateral Dashboard

A DeFi risk dashboard for monitoring lending positions on Cronos, starting with Tectonic protocol.

## Features (MVP)

- Wallet connect (Cronos mainnet)
- Read Tectonic supplied + borrowed balances
- Compute Health Factor, CRO liquidation price, distance to liquidation
- Scenario simulator: price shock, repay USDC, repay with collateral, add CRO collateral
- Target HF helpers (e.g., reach HF 1.30)

## Project Structure

```
cronos-liquidation-dashboard/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Fastify API server
├── packages/
│   └── shared/       # Shared types and risk math
├── package.json
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Build shared package
pnpm --filter @cronos-dash/shared build
```

### Development

```bash
# Run both frontend and API in development mode
pnpm dev

# Or run them separately:
pnpm dev:api   # API at http://localhost:3001
pnpm dev:web   # Web at http://localhost:3000
```

### Environment Variables

Copy the example env files:

```bash
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

## API Endpoints

- `GET /api/portfolio?address=0x...` - Fetch portfolio for address
- `POST /api/simulate` - Run scenario simulation
- `POST /api/target-hf` - Calculate amounts to reach target HF

## Risk Engine Formulas

### Health Factor

```
HF = sum(collateral_usd * LT) / sum(borrow_usd)
```

### Liquidation Price (single collateral)

```
P_liq = (B - C_other) / (amt * LT)

Where:
  B = total borrow USD
  C_other = sum(other collaterals USD * their LT)
  amt = collateral amount
  LT = liquidation threshold
```

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, wagmi, viem, TanStack Query
- **Backend**: Node.js, Fastify, TypeScript, viem, Zod
- **Monorepo**: pnpm workspaces

## Roadmap

- [x] MVP: Wallet connect, Tectonic adapter, risk engine, scenario UI
- [ ] V1: Second protocol adapter, unified HF, save/share scenarios
- [ ] V2: Alerts, recommendations, notifications
