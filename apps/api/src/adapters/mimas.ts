/**
 * Mimas Finance adapter — Compound V2 fork on Cronos mainnet.
 *
 * Mimas Finance is an algorithmic money market protocol on Cronos, forked from
 * Tranquil Finance (Harmony). The project has been inactive since ~2022.
 *
 * Contract addresses verified from:
 *   - DefiLlama adapter: https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/mimas-finance/index.js
 *   - CronoScan: https://cronoscan.com
 *
 * TODO: Verify/add remaining mToken addresses (mUSDC, mETH, mWBTC) from CronoScan
 *       by querying the comptroller's getAllMarkets() function:
 *       comptroller = 0xdD8c94211dD19155EFFbd57EAb6D4e0DE31A3b9E
 */
import { createCompoundAdapter } from './compound-base.js';
import { CRONOS_RPC_URLS } from '../config.js';

const MIMAS_MAX_LTV = 0.60; // TODO: verify actual maxLTV from Mimas Finance docs

const mimasConfig = {
  name: 'mimas',
  displayName: 'Mimas Finance',
  chainId: 25,
  rpcUrls: CRONOS_RPC_URLS,
  // Verified comptroller address from DefiLlama adapter
  comptroller: '0xdD8c94211dD19155EFFbd57EAb6D4e0DE31A3b9E' as `0x${string}`,
  maxLtv: MIMAS_MAX_LTV,
  markets: [
    {
      // mmCRO — verified from DefiLlama adapter
      tTokenAddress: '0xff024211741059a2540b01f5Be2e75fC0c1b3d82' as `0x${string}`,
      symbol: 'CRO',
      underlyingDecimals: 18,
      underlyingAddress: '0x5C7F8A570d578ED60E9c0fE56278c30F1B1c5A4e', // wCRO on Cronos
      isNative: true,
    },
    // TODO: Add mmUSDC address (query comptroller.getAllMarkets() on CronoScan)
    // {
    //   tTokenAddress: '0x...' as `0x${string}`,
    //   symbol: 'USDC',
    //   underlyingDecimals: 6,
    //   underlyingAddress: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59',
    // },
    // TODO: Add mmETH address
    // {
    //   tTokenAddress: '0x...' as `0x${string}`,
    //   symbol: 'ETH',
    //   underlyingDecimals: 18,
    //   underlyingAddress: '0xe44Fd7fCb2b1581822D0c862B68222998a0c299a',
    // },
    // TODO: Add mmWBTC address
    // {
    //   tTokenAddress: '0x...' as `0x${string}`,
    //   symbol: 'WBTC',
    //   underlyingDecimals: 8,
    //   underlyingAddress: '0x062E66477Faf219F25D27dCED647BF57C3107d52',
    // },
  ],
} as const;

export const mimasAdapter = createCompoundAdapter(mimasConfig);

export const fetchMimasPortfolio = mimasAdapter.fetchPortfolio;
