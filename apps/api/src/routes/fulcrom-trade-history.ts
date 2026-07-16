import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { formatUnits } from 'viem';
import type { FulcromTradeHistoryEvent, FulcromTradeHistoryResponse } from '@cronos-dash/shared';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const FULCROM_TRADES_SUBGRAPH = 'https://graph-v2.cronoslabs.com/subgraphs/name/fulcrom/trades-prod';
const USD_DECIMALS = 30;

const TOKENS = [
  { symbol: 'AAVE', address: '0xE657b115bc45c0786274c824f83e3e02CE809185' },
  { symbol: 'ADA', address: '0x0e517979C2c1c1522ddB0c73905e0D39b3F990c0' },
  { symbol: 'ATOM', address: '0xb888d8dd1733d72681b30c00ee76bde93ae7aa93' },
  { symbol: 'BCH', address: '0x7589B70aBb83427bb7049e08ee9fC6479ccB7a23' },
  { symbol: 'BTC', address: '0x062e66477faf219f25d27dced647bf57c3107d52' },
  { symbol: 'CRO', address: '0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23' },
  { symbol: 'DOGE', address: '0x1a8e39ae59e5556b56b76fcba98d22c9ae557396' },
  { symbol: 'ETH', address: '0xe44fd7fcb2b1581822d0c862b68222998a0c299a' },
  { symbol: 'HBAR', address: '0xe0C7226a58f54db71eDc6289Ba2dc80349B41974' },
  { symbol: 'LTC', address: '0x9d97Be214b68C7051215BB61059B4e299Cd792c3' },
  { symbol: 'NEAR', address: '0xafe470ae215e48c144c7158eae3ccf0c451cb0cb' },
  { symbol: 'PAXG', address: '0x81749e7258f9e577f61f49ABeeB426b70F561b89' },
  { symbol: 'PENGU', address: '0x769409037336430A1a5890065B7853f0D1D8b58f' },
  { symbol: 'PEPE', address: '0xf868c454784048af4f857991583e34243c92ff48' },
  { symbol: 'SHIB', address: '0xbed48612bc69fa1cab67052b42a95fb30c1bcfee' },
  { symbol: 'SOL', address: '0xc9DE0F3e08162312528FF72559db82590b481800' },
  { symbol: 'SUI', address: '0x81710203A7FC16797aC9899228a87fd622df9706' },
  { symbol: 'TRUMP', address: '0xd1D7A0Ff6Cd3d494038b7FB93dbAeF624Da6f417' },
  { symbol: 'UNI', address: '0x16aD43896f7C47a5d9Ee546c44A22205738B329c' },
  { symbol: 'USDC', address: '0xc21223249ca28397b4b6541dffaecc539bff0c59' },
  { symbol: 'USDT', address: '0x66e428c3f67a68878562e79a0234c1f83c208770' },
  { symbol: 'WIF', address: '0x25e8c72d267b96e757875d8b565a42c0e3b8f12f' },
  { symbol: 'XRP', address: '0xb9ce0dd29c91e02d4620f57a66700fc5e41d6d15' },
] as const;

const TOKEN_BY_ADDRESS = new Map(TOKENS.map((token) => [token.address.toLowerCase(), token.symbol]));

const ACTIONS = [
  'CreateIncreasePosition',
  'ExecuteIncreasePosition',
  'CancelIncreasePosition',
  'CreateDecreasePosition',
  'ExecuteDecreasePosition',
  'CancelDecreasePosition',
  'CreateIncreaseOrder',
  'ExecuteIncreaseOrder',
  'CancelIncreaseOrder',
  'CreateDecreaseOrder',
  'ExecuteDecreaseOrder',
  'CancelDecreaseOrder',
  'LiquidatePosition',
  'PartialLiquidation',
] as const;

type SubgraphTradeEvent = {
  id: string;
  action: string;
  account: string;
  txhash: string;
  timestamp: string;
  params: string;
};

type ParsedParams = {
  path?: string[];
  indexToken?: string;
  collateralToken?: string;
  isLong?: boolean;
  size?: string;
  sizeDelta?: string;
  collateral?: string;
  collateralDelta?: string;
  markPrice?: string;
  executionPrice?: string;
  price?: string;
  averagePrice?: string;
  fee?: string;
  marginFee?: string;
  collectMarginFeeInUsd?: string;
  realisedPnl?: string;
  realizedPnl?: string;
};

function usd(raw?: string): number | undefined {
  if (!raw) return undefined;
  try {
    return Number(formatUnits(BigInt(raw), USD_DECIMALS));
  } catch {
    return undefined;
  }
}

function signedUsd(raw?: string): number | undefined {
  if (!raw) return undefined;
  try {
    const value = BigInt(raw);
    return value < 0n ? -Number(formatUnits(-value, USD_DECIMALS)) : Number(formatUnits(value, USD_DECIMALS));
  } catch {
    return undefined;
  }
}

function symbolFor(address?: string): string {
  if (!address) return 'Unknown';
  return TOKEN_BY_ADDRESS.get(address.toLowerCase()) || 'Unknown';
}

function mapAction(action: string): FulcromTradeHistoryEvent['action'] {
  if (action === 'LiquidatePosition' || action === 'PartialLiquidation') return 'Liquidation';
  if (action.startsWith('Create')) return 'Requested';
  if (action.startsWith('Cancel')) return 'Cancelled';
  if (action.includes('Decrease')) return 'Decrease';
  return 'Increase';
}

function parseTradeEvent(event: SubgraphTradeEvent): FulcromTradeHistoryEvent {
  let params: ParsedParams = {};
  try {
    params = JSON.parse(event.params || '{}') as ParsedParams;
  } catch {
    params = {};
  }

  const indexSymbol = symbolFor(params.indexToken);
  const collateralSymbol = symbolFor(params.collateralToken || params.path?.[0]);
  const blockTime = Number(event.timestamp);
  const action = mapAction(event.action);

  return {
    id: event.id,
    txHash: event.txhash,
    blockNumber: 0,
    blockTime,
    isoTime: new Date(blockTime * 1000).toISOString(),
    action,
    pair: `${indexSymbol}/USD`,
    side: params.isLong === false ? 'Short' : 'Long',
    sizeDeltaUsd: usd(params.sizeDelta),
    collateralDeltaUsd: usd(params.collateralDelta),
    sizeUsd: usd(params.size),
    collateralUsd: usd(params.collateral),
    priceUsd: usd(params.executionPrice || params.markPrice || params.price || params.averagePrice),
    feeUsd: usd(params.fee || params.marginFee || params.collectMarginFeeInUsd),
    realisedPnlUsd: signedUsd(params.realisedPnl || params.realizedPnl),
    indexSymbol,
    collateralSymbol,
  };
}

async function fetchTradingEvents(address: string, limit: number): Promise<SubgraphTradeEvent[]> {
  const actionList = ACTIONS.map((action) => action).join(',');
  const query = `
    query FulcromTradeHistory($account: String!, $first: Int!) {
      tradingEvents(
        first: $first
        orderBy: timestamp
        orderDirection: desc
        where: { account: $account, action_in: [${actionList}] }
      ) {
        id
        action
        account
        txhash
        timestamp
        params
      }
    }
  `;

  const response = await fetch(FULCROM_TRADES_SUBGRAPH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables: { account: address.toLowerCase(), first: limit } }),
  });

  if (!response.ok) {
    throw new Error(`Fulcrom trades subgraph failed with ${response.status}`);
  }

  const payload = await response.json() as { data?: { tradingEvents?: SubgraphTradeEvent[] }; errors?: unknown };
  if (payload.errors) {
    throw new Error('Fulcrom trades subgraph returned errors');
  }
  return payload.data?.tradingEvents || [];
}

export const fulcromTradeHistoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: { address: string; limit?: string };
  }>('/fulcrom-trade-history', {
    schema: {
      querystring: {
        type: 'object',
        required: ['address'],
        properties: {
          address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          limit: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { address } = request.query;
      const limit = Math.min(100, Math.max(1, Number(request.query.limit || 25) || 25));

      try {
        const validAddress = addressSchema.parse(address);
        const events = await fetchTradingEvents(validAddress, limit);
        const parsedEvents = events.map(parseTradeEvent);
        const timestamps = parsedEvents.map((event) => event.blockTime).filter(Boolean);

        const response: FulcromTradeHistoryResponse = {
          address: validAddress,
          events: parsedEvents,
          count: parsedEvents.length,
          source: 'fulcrom-trades-subgraph',
          fromBlock: 0,
          toBlock: 0,
          timestamp: Date.now(),
          note: timestamps.length > 0
            ? 'Fulcrom history is read from Fulcrom trades subgraph and includes requested, executed, cancelled, and liquidated position events.'
            : 'No Fulcrom trade-history events were returned by the Fulcrom trades subgraph for this wallet.',
        };

        return response;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid address format' });
        }
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch Fulcrom trade history' });
      }
    },
  });
};
