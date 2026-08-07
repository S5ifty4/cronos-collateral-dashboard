# CRO Liquidation Heatmaps Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a no-login public CRO liquidation heatmap/risk page to Crollateral covering Tectonic CRO collateral plus Fulcrom and Moonlander CRO perps liquidation maps.

**Architecture:** Build a backend aggregation endpoint that reads public/on-chain/indexed protocol data, normalizes every at-risk position into shared `LiquidationBucket` rows, caches expensive scans, and renders a separate + combined market-wide heatmap in the existing Crollateral dashboard style. Keep wallet-connected personal risk separate from market-wide public liquidation heatmaps.

**Tech Stack:** Fastify API (`apps/api`), Next.js/React web (`apps/web`), shared TypeScript types (`packages/shared`), Tectonic public subgraph, Fulcrom trades subgraph + live Vault prices, Moonlander Diamond TradingReaderFacet/on-chain events or a small indexer cache, Cronos RPC via viem.

---

## Product recommendation

### Recommended UX

Add a new no-login section called **Liquidation Heatmap** available from the unauthenticated dashboard state and connected wallet state.

Use three levels of display:

1. **Combined CRO Risk Overview**
   - One top card/table combining Tectonic + Fulcrom + Moonlander.
   - Rows bucketed by CRO price drop from current oracle/mark: `-5%`, `-10%`, `-15%`, `-20%`, `-25%`, `-35%`, `-50%`, `-80%`.
   - Columns: `CRO price`, `total debt/notional at risk`, `positions/accounts at risk`, `lending debt at risk`, `perps notional at risk`, `largest platform`, `last updated`.
   - This answers: “Is there a market-wide CRO liquidation cascade?”

2. **Separate protocol tabs/cards**
   - `Tectonic Lending`
   - `Fulcrom Perps`
   - `Moonlander Perps`
   - Each protocol keeps its own terminology. Do not call perps “Health Factor” and do not call lending positions “leverage”.
   - This answers: “Where is the risk coming from?”

3. **Detail drawers / advanced table**
   - Show anonymized/linked wallet/position rows only after expanding.
   - Fields: platform, account/position hash, side, collateral/debt/notional, liquidation price, distance %, pair, source, timestamp.
   - Link to Cronoscan/subgraph tx/position when available.

### Separate vs combined

Do both, but default to combined overview.

- **Combined is best for narrative and market-risk headline:** CRO price levels where total forced selling/closing may cluster.
- **Separate is best for correctness:** Tectonic liquidations and perps liquidations are different mechanics and should not be merged without labels.
- **Implementation rule:** Normalize to a shared shape, but preserve `riskKind: 'lending-debt' | 'perps-notional'` so the UI never implies they are identical.

### What not to do

- Do not require wallet login for this feature.
- Do not use screenshots/static values as live data.
- Do not scrape CronosDash as the data source. It has a useful UX pattern, but its public API blocks outside trusted site context and it currently focuses Moonlander/Fulcrom/Hyperliquid open/closed activity, not Tectonic CRO lending.
- Do not auto-scan all Moonlander positions synchronously on every page load if on-chain pagination is expensive. Cache/index it.

---

## Data model

Create shared types in `packages/shared/src/types.ts`:

```ts
export type LiquidationPlatform = 'tectonic' | 'fulcrom' | 'moonlander';
export type LiquidationRiskKind = 'lending-debt' | 'perps-notional';
export type LiquidationSide = 'Long' | 'Short' | 'Borrow';

export interface LiquidationPositionRisk {
  id: string;
  platform: LiquidationPlatform;
  riskKind: LiquidationRiskKind;
  account?: string;
  pair: string;
  side: LiquidationSide;
  collateralSymbol: string;
  debtOrIndexSymbol: string;
  currentPriceUsd: number;
  liquidationPriceUsd: number;
  distancePct: number;
  collateralUsd?: number;
  debtUsd?: number;
  notionalUsd?: number;
  amountAtRiskUsd: number;
  source: string;
  updatedAt: number;
}

export interface LiquidationBucket {
  shockPct: number;
  priceUsd: number;
  totalAtRiskUsd: number;
  positionCount: number;
  byPlatform: Record<LiquidationPlatform, { atRiskUsd: number; count: number }>;
  byRiskKind: Record<LiquidationRiskKind, { atRiskUsd: number; count: number }>;
}

export interface LiquidationHeatmapResponse {
  asset: 'CRO';
  currentPriceUsd: number;
  buckets: LiquidationBucket[];
  positions: LiquidationPositionRisk[];
  sources: Array<{ platform: LiquidationPlatform; source: string; updatedAt: number; note?: string }>;
  timestamp: number;
  note?: string;
}
```

---

## Data source design

### Tectonic CRO lending

Best source: Tectonic public subgraph:

`https://graph-v2.cronoslabs.com/subgraphs/name/tectonic/tectonic-main`

Verified useful entities/fields:

- `accounts(where:{hasBorrowed:true}) { id tokens { storedBorrowBalance tTokenBalance enteredMarket market { underlyingSymbol collateralFactor underlyingPriceUSD exchangeRate } } }`
- `markets { underlyingSymbol collateralFactor underlyingPriceUSD exchangeRate totalBorrows totalSupply cash }`
- `tectonicCores { closeFactor liquidationIncentive }`
- Existing app already uses this subgraph for `/api/liquidation-history`.

Risk calculation:

For each borrower account:

1. Convert collateral value:
   - `underlyingAmount = tTokenBalance * exchangeRate`
   - `collateralUsd = underlyingAmount * underlyingPriceUSD`
   - weighted collateral = `collateralUsd * collateralFactor` if `enteredMarket`
2. Convert debt value:
   - `debtUsd = storedBorrowBalance * underlyingPriceUSD`
3. Current health = `weightedCollateralUsd / debtUsd`.
4. To produce a CRO liquidation map, shock only CRO price and recalculate account health per shock bucket.
5. `amountAtRiskUsd` should be total debt that becomes liquidatable at that shock.
6. For an individual account liquidation price, solve for CRO price where weighted collateral equals debt, holding non-CRO prices constant.

Important labels:

- Show **debt at risk**, not “notional”.
- Distinguish `CRO as collateral` vs `CRO as borrowed debt`. The user specifically wants “Tectonic CRO liquidation map like shown above,” so Phase 1 should focus accounts with CRO/tCRO/LCRO collateral and any borrowed asset.

Implementation note:

- Do not fetch every account on every request. Add a cache file/DB table or in-memory TTL refreshed by background job because the Tectonic subgraph may require pagination over many borrower accounts.
- Page with `first: 1000, skip: N` until empty.
- Cache normalized positions for 1–5 minutes.

### Fulcrom CRO perps

Best source: Fulcrom trades subgraph for market-wide open positions:

`https://graph-v2.cronoslabs.com/subgraphs/name/fulcrom/trades-prod`

Verified useful entity:

```graphql
{
  activePositions(first: 5, orderBy: size, orderDirection: desc) {
    id
    account
    indexToken
    collateralToken
    isLong
    size
    collateral
    averagePrice
    realisedPnl
    createdAt
  }
}
```

Existing app already has Fulcrom live wallet route using:

- Reader contract: `0x3881df9c3115aA4a2E35C080764B5Dd8112dE177`
- Vault: `0x8C7Ef34aa54210c76D6d5E475f43e0c11f876098`
- Current mark from Vault `getMinPrice/getMaxPrice`.

Risk calculation:

1. Filter active positions where `indexToken` is WCRO/CRO: `0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23`.
2. Convert USD fields from 30-decimal fixed point.
3. Compute approximate liquidation price like existing `/api/fulcrom-positions`:
   - long: `entryPrice * max(0, 1 - effectiveCollateralUsd / sizeUsd)`
   - short: `entryPrice * (1 + effectiveCollateralUsd / sizeUsd)`
   - Include Fulcrom liquidation fee if available; existing approximation subtracts `$5`.
4. Bucket longs by CRO downside liquidation price. Shorts are upside-risk; include separately or behind an `Upside risk` toggle because the user asked CRO liquidation heatmap likely for downside cascades.
5. `amountAtRiskUsd = sizeUsd` for perps; optionally also show collateral at risk.

### Moonlander CRO perps

Known existing wallet adapter source:

- Moonlander diamond: `0xE6F6351fb66f3a35313fEEFF9116698665FBEeC9`
- `positionsCount(address user, address pairBase)`
- `positionsByPage(address user, address pairBase, offset, limit)`
- WCRO pair base: `0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23`
- USDC token: `0xc21223249CA28397B4B6541dfFaEcC539BfF0c59`

Problem:

- These reader methods need a user address; they are good for connected wallet positions but not sufficient for a public market-wide heatmap unless we can enumerate accounts.

Best Phase 1 approach:

1. Search Moonlander events / app source for open/increase/decrease/liquidation events emitted by the Diamond.
2. If event ABI is available, build a small indexer that scans Diamond logs in chunks and maintains active CRO positions in a local JSON/SQLite cache.
3. If event ABI is not quickly reliable, show Moonlander as “wallet-only / indexer pending” in the heatmap and do not fake it.

Acceptable Phase 1 fallback:

- Fulcrom + Tectonic public heatmap live first.
- Moonlander tab shows a clear empty state: “Market-wide Moonlander heatmap requires an indexer; connected-wallet Moonlander positions are already live.”
- Then add Moonlander indexer as Phase 2.

---

## Backend implementation tasks

### Task 1: Add shared heatmap types

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/index.ts`

Add the `LiquidationHeatmapResponse` model above and export it.

Verification:

```bash
npm run build -w @cronos-dash/shared
```

### Task 2: Add Tectonic market-wide risk collector

**Files:**
- Create: `apps/api/src/services/tectonic-liquidation-map.ts`
- Test: unit tests if test harness exists; otherwise add pure helper tests under shared/api if available.

Functions:

- `fetchTectonicBorrowerAccounts()`
- `normalizeTectonicAccountRisk(account, shocks)`
- `buildTectonicCroLiquidationMap()`

Must include pagination, timeout handling, and TTL cache.

Verification:

```bash
curl 'http://localhost:3001/api/liquidation-heatmap?asset=CRO&platform=tectonic'
```

Expected: JSON with current CRO price, buckets, and Tectonic-only positions.

### Task 3: Add Fulcrom market-wide CRO perps collector

**Files:**
- Create: `apps/api/src/services/fulcrom-liquidation-map.ts`

Use `activePositions` from Fulcrom trades subgraph, filter CRO index token, compute liquidation price, bucket downside long risk and optional upside short risk.

Verification:

```bash
curl 'http://localhost:3001/api/liquidation-heatmap?asset=CRO&platform=fulcrom'
```

Expected: Fulcrom buckets populated from subgraph active positions.

### Task 4: Add unified API route

**Files:**
- Create: `apps/api/src/routes/liquidation-heatmap.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/web/src/lib/api.ts`

Route:

`GET /api/liquidation-heatmap?asset=CRO&platform=all|tectonic|fulcrom|moonlander&side=downside|upside|both`

Response merges positions and buckets by price shock.

Important: Return partial data with source notes if one platform fails; do not fail the entire heatmap unless all collectors fail.

### Task 5: Add Moonlander indexer placeholder or live collector

**Files:**
- Create: `apps/api/src/services/moonlander-liquidation-map.ts`

Phase 1 options:

- If logs/event ABI is found quickly: implement chunked log scanner and cache active positions.
- Otherwise: return an empty `sources` entry with `note: 'Market-wide Moonlander heatmap requires indexer; connected-wallet Moonlander positions are live.'`

Do not show demo Moonlander market data as live.

### Task 6: Add web API client

**Files:**
- Modify: `apps/web/src/lib/api.ts`

Add:

```ts
export async function fetchLiquidationHeatmap(params: { platform?: string; side?: string }): Promise<LiquidationHeatmapResponse>
```

### Task 7: Add UI component

**Files:**
- Create: `apps/web/src/components/LiquidationHeatmap.tsx`
- Modify: `apps/web/src/components/Dashboard.tsx`

UI pieces:

- Header: `CRO Liquidation Heatmap`
- Toggle pills: `Combined`, `Tectonic`, `Fulcrom`, `Moonlander`
- Toggle: `Downside`, `Upside`, `Both` for perps shorts.
- Summary cards: total at risk, nearest danger band, largest platform, current CRO price.
- Heatmap table with color intensity by `totalAtRiskUsd`.
- Expandable details table.

Dashboard placement:

- Show no-login alongside `Connect Wallet` / `Try Demo Mode`, e.g. button `View CRO Liquidation Heatmap`.
- In connected/demo dashboard, add it as a top-level category option or card below the category toggle. Preferred: add a third category `Market Risk` next to `Lending` and `Perps`, then render this component.

### Task 8: Build/test/deploy verification

Run:

```bash
npm run build -w @cronos-dash/shared
npm run build -w @cronos-dash/api
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=dummy npm run build -w @cronos-dash/web
```

Then deploy through existing Git/Railway/Vercel workflow and verify:

```bash
curl -s 'https://cronos-dashapi-production.up.railway.app/api/liquidation-heatmap?asset=CRO&platform=all' | python3 -m json.tool | head -80
curl -I https://www.crollateral.finance
```

Browser-check:

- unauthenticated heatmap visible without wallet login
- connected wallet still loads Tectonic positions
- `Lending` / `Perps` still work
- mobile width has no horizontal overflow

---

## Open questions / risks

1. **Tectonic subgraph pagination cost:** Need to measure borrower account count and query latency before choosing 1-min vs 5-min cache.
2. **Tectonic stale account flags:** Some `hasBorrowed:true` accounts have zero borrow balances. Filter by actual debt > dust threshold.
3. **Moonlander market-wide enumeration:** Current reader requires wallet address. Need event ABI/indexing for no-login market heatmap.
4. **Perps liquidation formulas:** Fulcrom/Moonlander approximate formulas should be labeled as planning estimates unless protocol exact formula is verified.
5. **Combined units:** Lending “debt at risk” and perps “notional at risk” must be visually split so users do not compare them as identical risk.

---

## Suggested Phase 1 slice

Ship a useful MVP in this order:

1. Tectonic CRO lending heatmap from subgraph.
2. Fulcrom CRO perps heatmap from activePositions subgraph.
3. Combined view with source breakdown.
4. Moonlander placeholder with honest note.
5. Then Moonlander indexer as Phase 2.

This gives Crollateral a real no-login public feature quickly without compromising the live-data rule.
