/**
 * All active protocol adapters.
 * Each adapter has: { name, displayName, fetchPortfolio(address, prices) }
 */
import { tectonicAdapter } from './tectonic.js';
import { mimasAdapter } from './mimas.js';

export const adapters = [tectonicAdapter, mimasAdapter];

export { tectonicAdapter, mimasAdapter };
export { fetchTectonicPortfolio, fetchPrices, fetchTectonicOraclePrices as fetchOraclePrices } from './tectonic.js';
export { fetchMimasPortfolio } from './mimas.js';
