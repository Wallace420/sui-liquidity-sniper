import { SUI } from "../chain/config.js";
import { ParsedPoolData } from "../chain/extractor.js";
import { SuiClient, SuiEvent, TransactionEffects } from "@mysten/sui/client";

interface ExtendedTransactionEffects extends TransactionEffects {
  events?: Array<SuiEvent & { parsedJson?: Record<string, any> }>;
}

// Constants for scam detection
const SUSPICIOUS_THRESHOLDS = {
  MIN_LIQUIDITY: 0.1, // Minimum liquidity in SUI
  MAX_CREATOR_TRADES: 10, // Maximum number of trades by creator in last 24h
  MIN_TOKEN_AGE: 3600, // Minimum token age in seconds (1 hour)
  SUSPICIOUS_RATIO: 5, // Ratio between token amounts that's suspicious
  MAX_SIMILAR_POOLS: 3, // Maximum number of similar pools by same creator
  CACHE_TTL: 300000, // Cache TTL in ms (5 minutes)
};

// Cache for scam checks to reduce RPC calls
const scamCheckCache = new Map<string, {
  probability: number;
  timestamp: number;
}>();

interface TokenMetadata {
  decimals: number;
  name: string;
  symbol: string;
  description?: string;
  iconUrl?: string;
  verified?: boolean;
  createdAt?: number;
}

interface ScamCheckResult {
  probability: number;
  reasons: string[];
}

// Blacklist für bekannte Scam-Token
const BLACKLISTED_TOKENS: string[] = [
  // Hier können bekannte Scam-Token-Adressen hinzugefügt werden
];

async function getTokenMetadata(client: SuiClient, coinType: string): Promise<TokenMetadata | null> {
  try {
    const response = await client.getCoinMetadata({ coinType });
    if (!response) return null;

    return {
      decimals: response.decimals,
      name: response.name || 'Unknown',
      symbol: response.symbol || 'UNKNOWN',
      description: response.description || undefined,
      iconUrl: response.iconUrl || undefined,
      verified: false, // Default to false, update based on verification status
      createdAt: Date.now(), // Default to current time if creation time not available
    };
  } catch (error) {
    console.error(`Error fetching metadata for ${coinType}:`, error);
    return null;
  }
}

async function checkCreatorHistory(
  client: SuiClient,
  creator: string,
  poolId: string
): Promise<{ isSuspicious: boolean; reason?: string }> {
  try {
    // Get creator's transaction history
    const txResponse = await client.queryTransactionBlocks({
      filter: {
        FromAddress: creator
      },
      options: {
        showEffects: true,
        showInput: true
      },
      limit: 50
    });

    if (!txResponse.data) {
      return { isSuspicious: true, reason: 'No transaction history found' };
    }

    // Count pool creations in last 24h
    const lastDay = Date.now() - 24 * 60 * 60 * 1000;
    const recentPools = txResponse.data.filter(tx => {
      const effects = tx.effects as ExtendedTransactionEffects;
      return Number(tx.timestampMs) > lastDay && 
        effects?.events?.some((e) => e.type.includes('::CreatePoolEvent'));
    });

    if (recentPools.length > SUSPICIOUS_THRESHOLDS.MAX_CREATOR_TRADES) {
      return { 
        isSuspicious: true, 
        reason: `Creator created ${recentPools.length} pools in last 24h`
      };
    }

    // Check for similar pools
    const similarPools = txResponse.data.filter(tx => {
      const effects = tx.effects as ExtendedTransactionEffects;
      return effects?.events?.some((e) => 
        e.type.includes('::CreatePoolEvent') && 
        e.parsedJson?.pool_id !== poolId &&
        (e.parsedJson?.coin_type_a === poolId || e.parsedJson?.coin_type_b === poolId)
      );
    });

    if (similarPools.length > SUSPICIOUS_THRESHOLDS.MAX_SIMILAR_POOLS) {
      return {
        isSuspicious: true,
        reason: `Creator has ${similarPools.length} similar pools`
      };
    }

    return { isSuspicious: false };
  } catch (error) {
    console.error('Error checking creator history:', error);
    return { isSuspicious: true, reason: 'Failed to verify creator history' };
  }
}

async function analyzeTokens(
  client: SuiClient,
  coinA: string,
  coinB: string
): Promise<{ isSuspicious: boolean; reason?: string }> {
  try {
    const [metadataA, metadataB] = await Promise.all([
      getTokenMetadata(client, coinA),
      getTokenMetadata(client, coinB)
    ]);

    if (!metadataA || !metadataB) {
      return { isSuspicious: true, reason: 'Missing token metadata' };
    }

    // Check for suspicious token names/symbols
    const suspiciousTerms = ['test', 'scam', 'fake', 'copy', 'replica'];
    const nameCheck = [metadataA.name.toLowerCase(), metadataB.name.toLowerCase()]
      .some(name => suspiciousTerms.some(term => name.includes(term)));

    if (nameCheck) {
      return { isSuspicious: true, reason: 'Suspicious token name detected' };
    }

    // Check for missing or suspicious descriptions
    if (!metadataA.description || !metadataB.description) {
      return { isSuspicious: true, reason: 'Missing token description' };
    }

    // Check token age if available
    const now = Date.now();
    if (metadataA.createdAt && (now - metadataA.createdAt) < SUSPICIOUS_THRESHOLDS.MIN_TOKEN_AGE) {
      return { isSuspicious: true, reason: 'Token A too new' };
    }
    if (metadataB.createdAt && (now - metadataB.createdAt) < SUSPICIOUS_THRESHOLDS.MIN_TOKEN_AGE) {
      return { isSuspicious: true, reason: 'Token B too new' };
    }

    return { isSuspicious: false };
  } catch (error) {
    console.error('Error analyzing tokens:', error);
    return { isSuspicious: true, reason: 'Failed to analyze tokens' };
  }
}

async function analyzeLiquidity(
  info: ParsedPoolData
): Promise<{ isSuspicious: boolean; reason?: string }> {
  try {
    const amountA = Number(info.amountA);
    const amountB = Number(info.amountB);

    // Check minimum liquidity
    if (amountA < SUSPICIOUS_THRESHOLDS.MIN_LIQUIDITY || amountB < SUSPICIOUS_THRESHOLDS.MIN_LIQUIDITY) {
      return { isSuspicious: true, reason: 'Insufficient liquidity' };
    }

    // Check for suspicious ratios
    const ratio = Math.max(amountA / amountB, amountB / amountA);
    if (ratio > SUSPICIOUS_THRESHOLDS.SUSPICIOUS_RATIO) {
      return { isSuspicious: true, reason: 'Suspicious token ratio' };
    }

    return { isSuspicious: false };
  } catch (error) {
    console.error('Error analyzing liquidity:', error);
    return { isSuspicious: true, reason: 'Failed to analyze liquidity' };
  }
}

export function checkIsBlackListed(coinType: string): boolean {
  // Überprüfen, ob der Token in der Blacklist ist
  return BLACKLISTED_TOKENS.includes(coinType);
}

export async function scamProbability(transactionInfo: any): Promise<number> {
  // Verbesserte Scam-Erkennung mit gewichteten Faktoren
  
  // Basisrisiko (zufällig, aber mit Gewichtung)
  const baseRisk = Math.random() * 30; // Maximal 30% Basisrisiko
  
  // Erweiterte Faktoren mit besserer Gewichtung
  const factors = {
    // Profitabilität - Hohe Profitmargen sind verdächtig
    profitMargin: transactionInfo.outputAmount && transactionInfo.inputAmount 
      ? (transactionInfo.outputAmount - transactionInfo.inputAmount) / transactionInfo.inputAmount 
      : Math.random() * 0.5,
    
    // Zeitbasierte Risiken - Neue Pools sind risikoreicher
    poolAge: transactionInfo.timestamp 
      ? Math.min(1.0, (Date.now() - transactionInfo.timestamp) / (7 * 24 * 60 * 60 * 1000)) // Normalisiert auf 1 Woche
      : Math.random() * 0.2, // Sehr niedriges Alter simulieren
    
    // Volumen und Liquidität - Niedrige Werte sind verdächtig
    liquidityDepth: transactionInfo.amountA && transactionInfo.amountB
      ? Math.min(1.0, (Number(transactionInfo.amountA) + Number(transactionInfo.amountB)) / 10000)
      : Math.random() * 0.3,
    
    // Token-Metriken
    tokenNameRisk: Math.random() * 0.5, // Simuliert Risiko basierend auf Token-Namen
    
    // Entwickler/Team-Metriken
    developerActivity: Math.random(), // Simuliert Entwickleraktivität
    
    // Marktmetriken
    priceVolatility: Math.random() * 0.5 + 0.5, // 50-100% Volatilität
  };

  // Gewichtete Berechnung mit verbesserten Faktoren
  let score = 
    // Basisrisiko (20%)
    baseRisk * 0.2 +
    
    // Profitabilitätsrisiken (15%)
    (factors.profitMargin > 0.5 ? 50 : factors.profitMargin > 0.3 ? 30 : 0) * 0.15 +
    
    // Zeitbasierte Risiken (25%)
    (factors.poolAge < 0.1 ? 70 : factors.poolAge < 0.3 ? 40 : factors.poolAge < 0.5 ? 20 : 0) * 0.25 +
    
    // Liquiditätsrisiken (25%)
    (factors.liquidityDepth < 0.1 ? 80 : factors.liquidityDepth < 0.3 ? 40 : factors.liquidityDepth < 0.5 ? 20 : 0) * 0.25 +
    
    // Token-Metriken (10%)
    (factors.tokenNameRisk > 0.7 ? 60 : factors.tokenNameRisk > 0.4 ? 30 : 0) * 0.1 +
    
    // Volatilitätsrisiko (5%)
    (factors.priceVolatility > 0.8 ? 40 : factors.priceVolatility > 0.6 ? 20 : 0) * 0.05;

  // Zusätzliche Risikofaktoren für bestimmte Bedingungen
  if (transactionInfo.coinA && transactionInfo.coinA.includes("test")) {
    score += 20; // Test-Token sind verdächtig
  }
  
  if (transactionInfo.coinB && transactionInfo.coinB.includes("test")) {
    score += 20; // Test-Token sind verdächtig
  }
  
  // Begrenze den Score auf 0-100
  return Math.min(100, Math.max(0, score));
}
