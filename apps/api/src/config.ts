export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  cronosRpcUrl: process.env.CRONOS_RPC_URL || 'https://evm.cronos.org',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

// Cronos RPC endpoints with fallbacks
export const CRONOS_RPC_URLS = [
  config.cronosRpcUrl,
  'https://evm.cronos.org',
  'https://cronos-evm-rpc.publicnode.com',
  'https://rpc.vvs.finance',
].filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates

// Tectonic contract addresses on Cronos mainnet
export const TECTONIC_ADDRESSES = {
  comptroller: '0xb3831584acb95ED9cCb0C11f677B5AD01DeaeEc0' as const,
  priceOracle: '0xD4E0C9d5E1e2a8E2B7e5E1A7B5C3d3A5E1D4E0C9' as const, // Placeholder
  tCRO: '0xeAdf7c01DA7E93FdB5f16B0aa9ee85f978e89E95' as const,
  tUSDC: '0xB3bbf1bE947b245Aef26e3B6a9D777d7703F4c8e' as const,
  tETH: '0x543F4Db9BD26C9Eb6aD4DD1C33522c966C625774' as const,
  tWBTC: '0x67fD498E94d95972a4A2a44AccE00a000AF7Fe00' as const,
};

// Asset metadata
export const ASSETS = {
  CRO: {
    symbol: 'CRO',
    address: '0x5C7F8A570d578ED60E9c0fE56278c30F1B1c5A4e', // Wrapped CRO
    decimals: 18,
  },
  USDC: {
    symbol: 'USDC',
    address: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59',
    decimals: 6,
  },
  ETH: {
    symbol: 'ETH',
    address: '0xe44Fd7fCb2b1581822D0c862B68222998a0c299a', // WETH on Cronos
    decimals: 18,
  },
  WBTC: {
    symbol: 'WBTC',
    address: '0x062E66477Faf219F25D27dCED647BF57C3107d52',
    decimals: 8,
  },
} as const;
