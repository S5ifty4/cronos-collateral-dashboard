/**
 * Tectonic Finance adapter — Compound V2 fork on Cronos mainnet.
 * Uses the generic compound-base factory; re-exports fetchPrices for routes.
 */
import { createCompoundAdapter } from './compound-base.js';
import { CRONOS_RPC_URLS } from '../config.js';

// Tectonic max LTV (Loan-to-Value): 63%
const TECTONIC_MAX_LTV = 0.63;

const tectonicConfig = {
  name: 'tectonic',
  displayName: 'Tectonic',
  chainId: 25,
  rpcUrls: CRONOS_RPC_URLS,
  comptroller: '0xb3831584acb95ED9cCb0C11f677B5AD01DeaeEc0',
  // Verified on-chain: call oracle() on comptroller returns this address.
  // Uses Chainlink feeds — same prices Tectonic uses for liquidations.
  priceOracle: '0xD360D8cABc1b2e56eCf348BFF00D2Bd9F658754A' as const,
  maxLtv: TECTONIC_MAX_LTV,
  markets: [
    // ── Native ────────────────────────────────────────────────────────────────
    { tTokenAddress: '0xeAdf7c01DA7E93FdB5f16B0aa9ee85f978e89E95', symbol: 'CRO',    underlyingDecimals: 18, isNative: true },
    // ── Stablecoins ───────────────────────────────────────────────────────────
    { tTokenAddress: '0xB3bbf1bE947b245Aef26e3B6a9D777d7703F4c8e', symbol: 'USDC',   underlyingDecimals: 6,  underlyingAddress: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59' },
    { tTokenAddress: '0xA683fdfD9286eeDfeA81CF6dA14703DA683c44E5', symbol: 'USDT',   underlyingDecimals: 6,  underlyingAddress: '0x66e428c3f67a68878562e79A0234c1F83c208770' },
    { tTokenAddress: '0xE1c4c56f772686909c28C319079D41adFD6ec89b', symbol: 'DAI',    underlyingDecimals: 18, underlyingAddress: '0xF2001B145b43032AAF5Ee2884e456CCd805F677D' },
    { tTokenAddress: '0x4bD41f188f6A05F02b46BB2a1f8ba776e528F9D2', symbol: 'TUSD',   underlyingDecimals: 18, underlyingAddress: '0x87EFB3ec1576Dec8ED47e58B832bEdCd86eE186e' },
    { tTokenAddress: '0x6D1861C723F2eC35d5aE13f470bF197A8258dE3E', symbol: 'USC',    underlyingDecimals: 18, underlyingAddress: '0xD42E078ceA2bE8D03cd9dFEcC1f0d28915Edea78' },
    // ── Major crypto ──────────────────────────────────────────────────────────
    { tTokenAddress: '0x543F4Db9BD26C9Eb6aD4DD1C33522c966C625774', symbol: 'ETH',    underlyingDecimals: 18, underlyingAddress: '0xe44Fd7fCb2b1581822D0c862B68222998a0c299a' },
    { tTokenAddress: '0x67fD498E94d95972a4A2a44AccE00a000AF7Fe00', symbol: 'WBTC',   underlyingDecimals: 8,  underlyingAddress: '0x062E66477Faf219F25D27dCED647BF57C3107d52' },
    { tTokenAddress: '0x0D9706531B517d24623118934De69108968ba266', symbol: 'ATOM',   underlyingDecimals: 6,  underlyingAddress: '0xB888d8Dd1733d72681b30c00ee76BDE93ae7aa93' },
    { tTokenAddress: '0x29984c47B0bAc5a59290ef082E1f651A7019EC4A', symbol: 'ADA',    underlyingDecimals: 6,  underlyingAddress: '0x0e517979C2c1c1522ddB0c73905e0D39b3F990c0' },
    { tTokenAddress: '0x53B4112cba389302B065d2A92bB249d27f51c680', symbol: 'XRP',    underlyingDecimals: 6,  underlyingAddress: '0xb9Ce0dd29C91E02d4620F57a66700Fc5e41d6D15' },
    { tTokenAddress: '0xE3E2ceA8DFFa592EADaB7D9c7f1E0cC6700490aa', symbol: 'LTC',    underlyingDecimals: 8,  underlyingAddress: '0x9d97Be214b68C7051215BB61059B4e299Cd792c3' },
    // ── Cronos ecosystem ──────────────────────────────────────────────────────
    { tTokenAddress: '0xfe6934FDf050854749945921fAA83191Bccf20Ad', symbol: 'TONIC',  underlyingDecimals: 18, underlyingAddress: '0xDD73dEa10ABC2Bff99c60882EC5b2B81Bb1Dc5B2' },
    { tTokenAddress: '0xB075A3590c9FFc8332c47Db49f5c6Ee1dBcDF804', symbol: 'VVS',    underlyingDecimals: 18, underlyingAddress: '0x2D03bECE6747ADC00E1a131BBA1469C15fD11e03' },
    { tTokenAddress: '0xf4F21A4990ACD891d05dface12A2b8F57e61d1Ee', symbol: 'LCRO',   underlyingDecimals: 18, underlyingAddress: '0x9Fae23A2700FEeCd5b93e43fDBc03c76AA7C08A6' },
    { tTokenAddress: '0x6b986d5109cd065E4098664b3e2E34b4028967cd', symbol: 'LCRO',   underlyingDecimals: 18, underlyingAddress: '0x9Fae23A2700FEeCd5b93e43fDBc03c76AA7C08A6' }, // deprecated tLCROd — some users may still have balances
    // ── Crypto.com wrapped ────────────────────────────────────────────────────
    { tTokenAddress: '0xecD4bea6ed20a4a820ae2C4900E5501a985A3fe3', symbol: 'CDCBTC', underlyingDecimals: 8,  underlyingAddress: '0x2e53c5586e12a99d4CAE366E9Fc5C14fE9c6495d' },
    { tTokenAddress: '0xBffcD14ED8cB224B26B692d7Eb4118FFEDFAbDbd', symbol: 'CDCETH', underlyingDecimals: 18, underlyingAddress: '0x7a7c9db510aB29A2FC362a4c34260BEcB5cE3446' },
  ],
} as const;

export const tectonicAdapter = createCompoundAdapter(tectonicConfig);

/**
 * Fetch portfolio from Tectonic (named export for backward compat with routes).
 */
export const fetchTectonicPortfolio = tectonicAdapter.fetchPortfolio;

/**
 * Fetch Tectonic's Chainlink oracle prices directly (no wallet address needed).
 * Used by /prices endpoint so demo mode + simulator stay in sync with calculations.
 */
export async function fetchTectonicOraclePrices(): Promise<Record<string, number>> {
  const { fetchOraclePricesForConfig } = await import('./compound-base.js');
  return fetchOraclePricesForConfig(tectonicConfig);
}

// ─── Price fetching (shared, kept in tectonic for backward compat) ────────────

// CoinGecko IDs for our assets
const COINGECKO_IDS: Record<string, string> = {
  CRO: 'crypto-com-chain',
  USDC: 'usd-coin',
  ETH: 'ethereum',
  WBTC: 'wrapped-bitcoin',
  BTC: 'bitcoin',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  ATOM: 'cosmos',
};

const FALLBACK_PRICES: Record<string, number> = {
  CRO: 0.09,
  USDC: 1.0,
  ETH: 3200,
  WBTC: 98000,
  BTC: 98000,
  SOL: 180,
  BNB: 600,
  XRP: 2.5,
  ADA: 0.9,
  AVAX: 35,
  DOGE: 0.3,
  DOT: 7,
  MATIC: 0.5,
  LINK: 18,
  ATOM: 9,
};

let priceCache: Record<string, number> | null = null;
let priceCacheTimestamp = 0;
const PRICE_CACHE_TTL = 300_000; // 5 minutes

export async function fetchPrices(): Promise<Record<string, number>> {
  const now = Date.now();
  if (priceCache && now - priceCacheTimestamp < PRICE_CACHE_TTL) {
    console.log('Using cached prices:', priceCache);
    return priceCache;
  }

  try {
    const ids = Object.values(COINGECKO_IDS).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!response.ok) {
      console.warn('CoinGecko API error, using fallback prices');
      return priceCache ?? FALLBACK_PRICES;
    }

    const data = (await response.json()) as Record<string, { usd?: number }>;

    const prices: Record<string, number> = {};
    for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
      prices[symbol] = data[geckoId]?.usd ?? FALLBACK_PRICES[symbol];
    }

    priceCache = prices;
    priceCacheTimestamp = now;
    console.log('Fetched live prices:', prices);
    return prices;
  } catch (error) {
    console.error('Failed to fetch prices from CoinGecko:', error);
    return priceCache ?? FALLBACK_PRICES;
  }
}
