import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createPublicClient, formatUnits, http, parseAbi } from 'viem';
import { cronos } from 'viem/chains';
import type { FulcromTradeHistoryEvent, FulcromTradeHistoryResponse } from '@cronos-dash/shared';
import { config } from '../config.js';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const FULCROM = {
  vault: '0x8C7Ef34aa54210c76D6d5E475f43e0c11f876098',
} as const;

const USD_DECIMALS = 30;
const DEFAULT_LOOKBACK_BLOCKS = 50_000n;
const MAX_LOOKBACK_BLOCKS = 500_000n;
// Cronos' public RPC rejects eth_getLogs ranges over roughly 2,000 blocks.
const RPC_CHUNK_SIZE = 1_900n;

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

const VAULT_EVENTS_ABI = parseAbi([
  'event IncreasePosition(bytes32 key, address account, address collateralToken, address indexToken, uint256 collateralDelta, uint256 sizeDelta, bool isLong, uint256 price, uint256 fee)',
  'event DecreasePosition(bytes32 key, address account, address collateralToken, address indexToken, uint256 collateralDelta, uint256 sizeDelta, bool isLong, uint256 price, uint256 fee)',
  'event ClosePosition(bytes32 key, uint256 size, uint256 collateral, uint256 averagePrice, uint256 entryFundingRate, uint256 reserveAmount, int256 realisedPnl)',
  'event LiquidatePosition(bytes32 key, address account, address collateralToken, address indexToken, bool isLong, uint256 size, uint256 collateral, uint256 reserveAmount, int256 realisedPnl, uint256 markPrice)',
]);

const [INCREASE_EVENT, DECREASE_EVENT, , LIQUIDATE_EVENT] = VAULT_EVENTS_ABI;

function usd(raw: bigint): number {
  return Number(formatUnits(raw, USD_DECIMALS));
}

function signedUsd(raw: bigint): number {
  return raw < 0n ? -usd(-raw) : usd(raw);
}

function symbolFor(address?: string): string {
  if (!address) return 'Unknown';
  return TOKEN_BY_ADDRESS.get(address.toLowerCase()) || 'Unknown';
}

async function getLogsInChunks(
  client: ReturnType<typeof createPublicClient>,
  event: typeof INCREASE_EVENT | typeof DECREASE_EVENT | typeof LIQUIDATE_EVENT,
  account: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
) {
  const logs = [];
  for (let start = fromBlock; start <= toBlock; start += RPC_CHUNK_SIZE + 1n) {
    const end = start + RPC_CHUNK_SIZE > toBlock ? toBlock : start + RPC_CHUNK_SIZE;
    const chunk = await client.getLogs({
      address: FULCROM.vault,
      event,
      args: { account } as never,
      fromBlock: start,
      toBlock: end,
    });
    logs.push(...chunk);
  }
  return logs;
}

export const fulcromTradeHistoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: { address: string; limit?: string; lookbackBlocks?: string };
  }>('/fulcrom-trade-history', {
    schema: {
      querystring: {
        type: 'object',
        required: ['address'],
        properties: {
          address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          limit: { type: 'string' },
          lookbackBlocks: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { address } = request.query;
      const limit = Math.min(100, Math.max(1, Number(request.query.limit || 25) || 25));
      const requestedLookback = BigInt(Math.max(1, Number(request.query.lookbackBlocks || DEFAULT_LOOKBACK_BLOCKS) || Number(DEFAULT_LOOKBACK_BLOCKS)));
      const lookbackBlocks = requestedLookback > MAX_LOOKBACK_BLOCKS ? MAX_LOOKBACK_BLOCKS : requestedLookback;

      try {
        const validAddress = addressSchema.parse(address) as `0x${string}`;
        const client = createPublicClient({
          chain: cronos,
          transport: http(config.cronosRpcUrl),
        });

        const latestBlock = await client.getBlockNumber();
        const fromBlock = latestBlock > lookbackBlocks ? latestBlock - lookbackBlocks : 0n;

        const [increaseResult, decreaseResult, liquidationResult] = await Promise.allSettled([
          getLogsInChunks(client, INCREASE_EVENT, validAddress, fromBlock, latestBlock),
          getLogsInChunks(client, DECREASE_EVENT, validAddress, fromBlock, latestBlock),
          getLogsInChunks(client, LIQUIDATE_EVENT, validAddress, fromBlock, latestBlock),
        ]);

        if (increaseResult.status === 'rejected' && decreaseResult.status === 'rejected' && liquidationResult.status === 'rejected') {
          fastify.log.error({ increaseResult, decreaseResult, liquidationResult }, 'Fulcrom trade-history log queries failed');
          return reply.status(502).send({ error: 'Failed to fetch Fulcrom trade history' });
        }

        const events: FulcromTradeHistoryEvent[] = [];
        const blockTimeCache = new Map<bigint, { blockTime: number; isoTime: string }>();
        const getBlockTime = async (blockNumber: bigint) => {
          const cached = blockTimeCache.get(blockNumber);
          if (cached) return cached;
          const block = await client.getBlock({ blockNumber });
          const blockTime = Number(block.timestamp);
          const value = { blockTime, isoTime: new Date(blockTime * 1000).toISOString() };
          blockTimeCache.set(blockNumber, value);
          return value;
        };

        const addTrade = async (log: Awaited<ReturnType<typeof getLogsInChunks>>[number], action: 'Increase' | 'Decrease') => {
          const args = log.args as unknown as {
            account: `0x${string}`;
            collateralToken: `0x${string}`;
            indexToken: `0x${string}`;
            collateralDelta: bigint;
            sizeDelta: bigint;
            isLong: boolean;
            price: bigint;
            fee: bigint;
          };
          const { blockTime, isoTime } = await getBlockTime(log.blockNumber!);
          const indexSymbol = symbolFor(args.indexToken);
          const collateralSymbol = symbolFor(args.collateralToken);
          events.push({
            id: `${log.transactionHash}-${log.logIndex}`,
            txHash: log.transactionHash!,
            blockNumber: Number(log.blockNumber),
            blockTime,
            isoTime,
            action,
            pair: `${indexSymbol}/USD`,
            side: args.isLong ? 'Long' : 'Short',
            sizeDeltaUsd: usd(args.sizeDelta),
            collateralDeltaUsd: usd(args.collateralDelta),
            priceUsd: usd(args.price),
            feeUsd: usd(args.fee),
            indexSymbol,
            collateralSymbol,
          });
        };

        const addLiquidation = async (log: Awaited<ReturnType<typeof getLogsInChunks>>[number]) => {
          const args = log.args as unknown as {
            account: `0x${string}`;
            collateralToken: `0x${string}`;
            indexToken: `0x${string}`;
            isLong: boolean;
            size: bigint;
            collateral: bigint;
            realisedPnl: bigint;
            markPrice: bigint;
          };
          const { blockTime, isoTime } = await getBlockTime(log.blockNumber!);
          const indexSymbol = symbolFor(args.indexToken);
          const collateralSymbol = symbolFor(args.collateralToken);
          events.push({
            id: `${log.transactionHash}-${log.logIndex}`,
            txHash: log.transactionHash!,
            blockNumber: Number(log.blockNumber),
            blockTime,
            isoTime,
            action: 'Liquidation',
            pair: `${indexSymbol}/USD`,
            side: args.isLong ? 'Long' : 'Short',
            sizeUsd: usd(args.size),
            collateralUsd: usd(args.collateral),
            priceUsd: usd(args.markPrice),
            realisedPnlUsd: signedUsd(args.realisedPnl),
            indexSymbol,
            collateralSymbol,
          });
        };

        const increaseLogs = increaseResult.status === 'fulfilled' ? increaseResult.value : [];
        const decreaseLogs = decreaseResult.status === 'fulfilled' ? decreaseResult.value : [];
        const liquidationLogs = liquidationResult.status === 'fulfilled' ? liquidationResult.value : [];

        await Promise.all([
          ...increaseLogs.map((log) => addTrade(log, 'Increase')),
          ...decreaseLogs.map((log) => addTrade(log, 'Decrease')),
          ...liquidationLogs.map((log) => addLiquidation(log)),
        ]);

        const response: FulcromTradeHistoryResponse = {
          address: validAddress,
          events: events.sort((a, b) => b.blockNumber - a.blockNumber).slice(0, limit),
          count: events.length,
          source: 'fulcrom-vault-events',
          fromBlock: Number(fromBlock),
          toBlock: Number(latestBlock),
          timestamp: Date.now(),
          note: 'Recent Fulcrom trade history is read from Vault events over a bounded block lookback; older fills may require a larger lookback or dedicated indexer.',
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