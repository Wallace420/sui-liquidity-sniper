import { SuiClient } from '@mysten/sui/client';
import pLimit from 'p-limit';
import * as dotenv from 'dotenv';
import { env } from 'process';

// Lade Umgebungsvariablen (Mainnet)
dotenv.config({ path: '.env' });

// Unterstützte DEX-Plattformen
export type SUPPORTED_DEX = 'Cetus' | 'BlueMove';

// Netzwerk-Typen
type NetworkType = 'mainnet' | 'testnet' | 'devnet';

// Rate Limiting Konfiguration - Optimiert für Mainnet Performance
const RATE_LIMIT = {
  maxRequests: Number(env.RATE_LIMIT_MAX_REQUESTS) || 50,
  windowMs: Number(env.RATE_LIMIT_WINDOW_MS) || 1000,
  retryDelayMs: Number(env.RATE_LIMIT_RETRY_DELAY_MS) || 200,
  concurrentRequests: Number(env.CONCURRENT_REQUESTS) || 3,
  requestTimeoutMs: Number(env.REQUEST_TIMEOUT_MS) || 15000,
  wsTimeoutMs: 120000,
  maxRetries: Number(env.MAX_RETRIES) || 3,
  batchSize: Number(env.BATCH_SIZE) || 10
};

// RPC Node URLs mit Load Balancing
const RPC_NODES = [
  env.SUI_NODE_URL,
  env.SUI_NODE_URL_BACKUP_1,
  env.SUI_NODE_URL_BACKUP_2,
  env.SUI_NODE_URL_BACKUP_3
].filter(Boolean) as string[];

// Performance Cache
const CACHE_CONFIG = {
  enabled: env.CACHE_ENABLED === 'true',
  ttl: Number(env.CACHE_TTL) || 60000
};

// Trading Limits
const TRADING_LIMITS = {
  maxTradeAmount: Number(env.MAX_TRADE_AMOUNT) || 5,
  minTradeAmount: Number(env.MIN_TRADE_AMOUNT) || 0.1,
  maxSlippage: Number(env.MAX_SLIPPAGE) || 1.0,
  minLiquidity: Number(env.MIN_LIQUIDITY) || 100,
  maxPriceImpact: Number(env.MAX_PRICE_IMPACT) || 2.0
};

// Debug: Zeige Konfiguration
console.log('Konfiguration:', {
  nodes: RPC_NODES,
  rateLimits: RATE_LIMIT,
  cache: CACHE_CONFIG,
  tradingLimits: TRADING_LIMITS,
  env: env.NETWORK_ENV
});

// Rate Limiting und Load Balancing
let currentNodeIndex = 0;
let requestsInWindow = 0;
let windowStart = Date.now();
const limit = pLimit(RATE_LIMIT.concurrentRequests);

// Request Cache
const requestCache = new Map<string, { data: any; timestamp: number }>();

// Basis-Client
const baseClient = new SuiClient({ url: RPC_NODES[0] });

// Proxy für Rate-Limiting und Load Balancing
export const SUI = {
  client: new Proxy(baseClient, {
    get(target: SuiClient, prop: string | symbol) {
      const value = target[prop as keyof SuiClient];
      if (typeof value === 'function') {
        return async (...args: unknown[]) => {
          return limit(async () => {
            return withRetry(async () => {
              // Spezielle Behandlung für WebSocket-Verbindungen
              if (prop === 'subscribeEvent') {
                const client = new SuiClient({ 
                  url: getNextNode(),
                  wsTimeout: RATE_LIMIT.wsTimeoutMs,
                  timeoutMs: RATE_LIMIT.wsTimeoutMs
                });
                return client[prop as keyof SuiClient](...args);
              }

              // Cache-Check für normale Anfragen
              if (CACHE_CONFIG.enabled) {
                const cacheKey = `${String(prop)}-${JSON.stringify(args)}`;
                const cached = requestCache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.ttl) {
                  return cached.data;
                }
              }

              const client = new SuiClient({ 
                url: getNextNode(),
                timeoutMs: RATE_LIMIT.requestTimeoutMs
              });
              const result = await (client[prop as keyof SuiClient] as Function)(...args);

              // Cache-Update
              if (CACHE_CONFIG.enabled) {
                const cacheKey = `${String(prop)}-${JSON.stringify(args)}`;
                requestCache.set(cacheKey, {
                  data: result,
                  timestamp: Date.now()
                });
              }

              return result;
            });
          });
        };
      }
      return value;
    }
  }) as SuiClient
};

// Helper Funktionen
function getNextNode(): string {
  const now = Date.now();
  if (now - windowStart >= RATE_LIMIT.windowMs) {
    requestsInWindow = 0;
    windowStart = now;
  }

  if (requestsInWindow >= RATE_LIMIT.maxRequests) {
    currentNodeIndex = (currentNodeIndex + 1) % RPC_NODES.length;
    requestsInWindow = 0;
  }

  requestsInWindow++;
  return RPC_NODES[currentNodeIndex];
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(operation: () => Promise<T>, retries = RATE_LIMIT.maxRetries): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 
          RATE_LIMIT.requestTimeoutMs)
        )
      ]) as T;
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = RATE_LIMIT.retryDelayMs * Math.pow(2, i);
      await wait(delay);
      currentNodeIndex = (currentNodeIndex + 1) % RPC_NODES.length;
    }
  }
  throw new Error('All retries failed');
}

// Cache Cleanup
setInterval(() => {
  if (CACHE_CONFIG.enabled) {
    const now = Date.now();
    for (const [key, value] of requestCache.entries()) {
      if (now - value.timestamp > CACHE_CONFIG.ttl) {
        requestCache.delete(key);
      }
    }
  }
}, CACHE_CONFIG.ttl);

// Test RPC-Verbindung
(async () => {
  try {
    const version = await SUI.client.getLatestCheckpointSequenceNumber();
    console.log('🟢 RPC Verbindung erfolgreich:', {
      network: env.NETWORK_ENV,
      nodeUrl: RPC_NODES[currentNodeIndex],
      latestCheckpoint: version
    });
  } catch (error) {
    console.error('🔴 RPC Verbindungsfehler:', {
      network: env.NETWORK_ENV,
      nodeUrl: RPC_NODES[currentNodeIndex],
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
})(); 