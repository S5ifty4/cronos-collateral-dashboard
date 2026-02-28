/**
 * Tectonic Finance adapter — Compound V2 fork on Cronos mainnet.
 * Uses the generic compound-base factory; re-exports fetchPrices for routes.
 */
import { createCompoundAdapter } from './compound-base.js';
import { TECTONIC_ADDRESSES, ASSETS, CRONOS_RPC_URLS } from '../config.js';

// Tectonic max LTV (Loan-to-Value): 63%
const TECTONIC_MAX_LTV = 0.63;

const tectonicConfig = {
  name: 'tectonic',
  displayName: 'Tectonic',
  chainId: 25,
  rpcUrls: CRONOS_RPC_URLS,
  comptroller: TECTONIC_ADDRESSES.comptroller,
  maxLtv: TECTONIC_MAX_LTV,
  markets: [
    {
      tTokenAddress: TECTONIC_ADDRESSES.tCRO,
      symbol: 'CRO',
      underlyingDecimals: 18,
      underlyingAddress: ASSETS.CRO.address,
      isNative: true,
    },
    {
      tTokenAddress: TECTONIC_ADDRESSES.tUSDC,
      symbol: 'USDC',
      underlyingDecimals: 6,
      underlyingAddress: ASSETS.USDC.address,
    },
    {
      tTokenAddress: TECTONIC_ADDRESSES.tETH,
      symbol: 'ETH',
      underlyingDecimals: 18,
      underlyingAddress: ASSETS.ETH.address,
    },
    {
      tTokenAddress: TECTONIC_ADDRESSES.tWBTC,
      symbol: 'WBTC',
      underlyingDecimals: 8,
      underlyingAddress: ASSETS.WBTC.address,
    },
  ],
} as const;

export const tectonicAdapter = createCompoundAdapter(tectonicConfig);

/**
 * Fetch portfolio from Tectonic (named export for backward compat with routes).
 */
export const fetchTectonicPortfolio = tectonicAdapter.fetchPortfolio;

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
