import { SUI } from "../chain/config";
import { getCetusPools } from "../trader/dex/cetus";
import { Pool } from "@cetusprotocol/cetus-sui-clmm-sdk";
import pLimit from "p-limit";
import { scamProbability } from "../trader/checkscam";

// Configuration
const PARALLEL_REQUESTS = 5;
const SCAN_INTERVAL = 1000; // 1 second
const MIN_LIQUIDITY_THRESHOLD = 1000; // Minimum liquidity in SUI
const MAX_POOL_AGE = 3600; // 1 hour in seconds

// Pool tracking
const knownPools = new Set<string>();
const poolMetadata = new Map<string, {
  firstSeen: number;
  liquidityHistory: number[];
  riskScore: number;
}>>();

// Rate limiting
const limit = pLimit(PARALLEL_REQUESTS);

// WebSocket connection for real-time updates
const wsEndpoint = "wss://sui-mainnet.blockvision.org/v1/ws";
let ws: WebSocket;

/**
 * Initialize WebSocket connection
 */
function initializeWebSocket() {
  ws = new WebSocket(wsEndpoint);
  
  ws.onopen = () => {
    console.log("WebSocket connected");
    // Subscribe to new block notifications
    ws.send(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sui_subscribeBlock",
      params: []
    }));
  };

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    if (data.method === "sui_subscribeBlock") {
      await scanNewPools();
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    setTimeout(initializeWebSocket, 5000);
  };

  ws.onclose = () => {
    console.log("WebSocket disconnected");
    setTimeout(initializeWebSocket, 5000);
  };
}

/**
 * Analyze pool for potential risks
 */
async function analyzePool(pool: Pool) {
  try {
    // Check token verification status
    const tokenAddress = pool.coinTypeB.endsWith("::sui::SUI") ? pool.coinTypeA : pool.coinTypeB;
    const scamRisk = await scamProbability({ poolId: pool.poolAddress, coinA: pool.coinTypeA, coinB: pool.coinTypeB });
    
    // Check liquidity depth
    const liquidityUSD = Number(pool.liquidity) / 1e9;
    
    // Check pool age
    const metadata = poolMetadata.get(pool.poolAddress);
    const poolAge = metadata ? (Date.now() - metadata.firstSeen) / 1000 : 0;
    
    // Calculate risk score (0-100, lower is better)
    const riskScore = Math.min(100, Math.max(0,
      scamRisk * 0.5 + // 50% weight on scam probability
      (liquidityUSD < MIN_LIQUIDITY_THRESHOLD ? 30 : 0) + // Penalize low liquidity
      (poolAge < 3600 ? 20 : 0) // Penalize very new pools
    ));
    
    return {
      isRisky: riskScore > 50,
      riskScore,
      reasons: [
        scamRisk > 50 ? "High scam probability" : null,
        liquidityUSD < MIN_LIQUIDITY_THRESHOLD ? "Low liquidity" : null,
        poolAge < 3600 ? "New pool" : null
      ].filter(Boolean)
    };
  } catch (error) {
    console.error("Error analyzing pool:", error);
    return { isRisky: true, riskScore: 100, reasons: ["Analysis failed"] };
  }
}

/**
 * Scan for new liquidity pools
 */
async function scanNewPools() {
  try {
    // Get all current pools
    const pools = await getCetusPools();
    
    // Process pools in parallel with rate limiting
    await Promise.all(pools.map(pool => limit(async () => {
      if (knownPools.has(pool.poolAddress)) return;
      
      // Analyze new pool
      const analysis = await analyzePool(pool);
      
      // Store pool metadata
      poolMetadata.set(pool.poolAddress, {
        firstSeen: Date.now(),
        liquidityHistory: [Number(pool.liquidity)],
        riskScore: analysis.riskScore
      });
      
      // Add to known pools
      knownPools.add(pool.poolAddress);
      
      // Emit pool discovery event if safe
      if (!analysis.isRisky) {
        console.log(`New safe pool discovered: ${pool.poolAddress}`);
        // TODO: Implement event emission system
      }
    })));
  } catch (error) {
    console.error("Error scanning pools:", error);
  }
}

/**
 * Start the pool scanner service
 */
export function startPoolScanner() {
  // Initialize WebSocket connection
  initializeWebSocket();
  
  // Start periodic scanning
  setInterval(scanNewPools, SCAN_INTERVAL);
  
  console.log("Pool scanner started");
}

/**
 * Stop the pool scanner service
 */
export function stopPoolScanner() {
  if (ws) {
    ws.close();
  }
  console.log("Pool scanner stopped");
}
