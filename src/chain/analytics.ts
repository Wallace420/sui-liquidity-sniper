import { SUI } from './config.js';
import { ParsedPoolData, getEnhancedPoolData } from './extractor.js';
import { logDebug, logError, logInfo } from '../utils/logger.js';
import { RiskMetrics } from '../utils/dashboard.js';

// Typen für On-Chain-Analytics
export interface OnChainAnalytics {
  totalPools: number;
  poolsLast24h: number;
  avgLiquidity: number;
  topDexes: Record<string, number>;
  avgPoolLifetime: number;
  totalVolume24h: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
  avgExecutionTime: number;
  topTokens: Array<{
    symbol: string;
    volume: number;
    priceChange: number;
  }>;
  marketConditions: 'bullish' | 'bearish' | 'neutral';
  riskAssessment: RiskMetrics;
}

// Cache für Pool-Daten
const poolCache = new Map<string, ParsedPoolData>();
let lastAnalyticsUpdate = 0;
let cachedAnalytics: OnChainAnalytics | null = null;

/**
 * Holt On-Chain-Analytics für alle Pools
 */
export async function getOnChainAnalytics(forceRefresh = false): Promise<OnChainAnalytics> {
  // Verwende Cache, wenn verfügbar und nicht älter als 5 Minuten
  const now = Date.now();
  if (!forceRefresh && cachedAnalytics && now - lastAnalyticsUpdate < 5 * 60 * 1000) {
    return cachedAnalytics;
  }
  
  try {
    // Hole alle Pools aus dem Cache
    const pools = Array.from(poolCache.values());
    
    // Wenn keine Pools im Cache, simuliere Daten für den Backtest
    if (pools.length === 0) {
      const analytics = generateSimulatedAnalytics();
      cachedAnalytics = analytics;
      lastAnalyticsUpdate = now;
      return analytics;
    }
    
    // Berechne Statistiken
    const totalPools = pools.length;
    
    // Pools in den letzten 24 Stunden
    const last24h = pools.filter(p => {
      if (p.createdAt) {
        return (now - p.createdAt.getTime()) < 24 * 60 * 60 * 1000;
      }
      return false;
    }).length;
    
    // Durchschnittliche Liquidität
    const totalLiquidity = pools.reduce((sum, p) => {
      if (p.liquidity && typeof p.liquidity === 'object' && p.liquidity.sui) {
        return sum + p.liquidity.sui;
      }
      return sum;
    }, 0);
    const avgLiquidity = totalLiquidity / totalPools;
    
    // Top DEXes
    const dexCounts: Record<string, number> = {};
    pools.forEach(p => {
      dexCounts[p.dex] = (dexCounts[p.dex] || 0) + 1;
    });
    
    // Durchschnittliches Pool-Alter
    const totalAge = pools.reduce((sum, p) => {
      if (p.createdAt) {
        return sum + (now - p.createdAt.getTime()) / 1000;
      }
      return sum;
    }, 0);
    const avgPoolLifetime = totalAge / totalPools;
    
    // Gesamtvolumen in den letzten 24 Stunden
    const totalVolume24h = pools.reduce((sum, p) => {
      if (p.metrics?.volume24h) {
        return sum + p.metrics.volume24h;
      }
      return sum;
    }, 0);
    
    // Top Tokens nach Volumen
    const tokenVolumes = new Map<string, { symbol: string, volume: number, priceChange: number }>();
    pools.forEach(p => {
      if (p.tokenSymbol && p.metrics?.volume24h && p.metrics?.priceChange24h) {
        const existing = tokenVolumes.get(p.tokenSymbol);
        if (existing) {
          existing.volume += p.metrics.volume24h;
        } else {
          tokenVolumes.set(p.tokenSymbol, {
            symbol: p.tokenSymbol,
            volume: p.metrics.volume24h,
            priceChange: p.metrics.priceChange24h
          });
        }
      }
    });
    
    const topTokens = Array.from(tokenVolumes.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
    
    // Marktbedingungen basierend auf Preisentwicklung
    const avgPriceChange = topTokens.reduce((sum, t) => sum + t.priceChange, 0) / topTokens.length;
    let marketConditions: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    
    if (avgPriceChange > 5) {
      marketConditions = 'bullish';
    } else if (avgPriceChange < -5) {
      marketConditions = 'bearish';
    }
    
    // Risikobewertung
    const riskAssessment: RiskMetrics = {
      overallRisk: Math.floor(Math.random() * 60) + 20, // 20-80%
      marketConditions,
      scamProbability: Math.floor(Math.random() * 40) + 10, // 10-50%
      rugPullRisk: Math.floor(Math.random() * 50) + 10, // 10-60%
      honeypotRisk: Math.floor(Math.random() * 30) + 5, // 5-35%
      volatilityIndex: Math.random() * 1.5 + 0.5, // 0.5-2.0
      liquidityRisk: Math.floor(Math.random() * 40) + 20 // 20-60%
    };
    
    // Simuliere Trading-Statistiken für den Backtest
    const successfulTrades = Math.floor(Math.random() * 50) + 10;
    const failedTrades = Math.floor(Math.random() * 20) + 5;
    const totalProfit = (Math.random() * 100) - 20; // -20 bis +80 SUI
    const avgExecutionTime = Math.random() * 5000 + 1000; // 1-6 Sekunden
    
    // Erstelle Analytics-Objekt
    const analytics: OnChainAnalytics = {
      totalPools,
      poolsLast24h: last24h,
      avgLiquidity,
      topDexes: dexCounts,
      avgPoolLifetime,
      totalVolume24h,
      successfulTrades,
      failedTrades,
      totalProfit,
      avgExecutionTime,
      topTokens,
      marketConditions,
      riskAssessment
    };
    
    // Aktualisiere Cache
    cachedAnalytics = analytics;
    lastAnalyticsUpdate = now;
    
    return analytics;
  } catch (error) {
    logError('Fehler beim Abrufen der On-Chain-Analytics', { 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
    
    // Fallback: Simulierte Daten
    return generateSimulatedAnalytics();
  }
}

/**
 * Generiert simulierte Analytics-Daten für den Backtest
 */
function generateSimulatedAnalytics(): OnChainAnalytics {
  const totalPools = Math.floor(Math.random() * 1000) + 100;
  const poolsLast24h = Math.floor(Math.random() * 100) + 10;
  const avgLiquidity = Math.random() * 10000 + 1000;
  const totalVolume24h = Math.random() * 100000 + 10000;
  
  const topDexes: Record<string, number> = {
    'Cetus': Math.floor(Math.random() * 500) + 100,
    'BlueMove': Math.floor(Math.random() * 300) + 50,
    'Turbos': Math.floor(Math.random() * 200) + 30,
    'Kriya': Math.floor(Math.random() * 100) + 20
  };
  
  const topTokens = [
    { symbol: 'TOKEN1', volume: Math.random() * 50000 + 5000, priceChange: Math.random() * 30 - 10 },
    { symbol: 'TOKEN2', volume: Math.random() * 40000 + 4000, priceChange: Math.random() * 20 - 5 },
    { symbol: 'TOKEN3', volume: Math.random() * 30000 + 3000, priceChange: Math.random() * 15 - 5 },
    { symbol: 'TOKEN4', volume: Math.random() * 20000 + 2000, priceChange: Math.random() * 10 - 3 },
    { symbol: 'TOKEN5', volume: Math.random() * 10000 + 1000, priceChange: Math.random() * 5 - 2 }
  ];
  
  const avgPriceChange = topTokens.reduce((sum, t) => sum + t.priceChange, 0) / topTokens.length;
  let marketConditions: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (avgPriceChange > 5) {
    marketConditions = 'bullish';
  } else if (avgPriceChange < -5) {
    marketConditions = 'bearish';
  }
  
  const riskAssessment: RiskMetrics = {
    overallRisk: Math.floor(Math.random() * 60) + 20, // 20-80%
    marketConditions,
    scamProbability: Math.floor(Math.random() * 40) + 10, // 10-50%
    rugPullRisk: Math.floor(Math.random() * 50) + 10, // 10-60%
    honeypotRisk: Math.floor(Math.random() * 30) + 5, // 5-35%
    volatilityIndex: Math.random() * 1.5 + 0.5, // 0.5-2.0
    liquidityRisk: Math.floor(Math.random() * 40) + 20 // 20-60%
  };
  
  return {
    totalPools,
    poolsLast24h,
    avgLiquidity,
    topDexes,
    avgPoolLifetime: Math.random() * 30 * 24 * 60 * 60, // 0-30 Tage in Sekunden
    totalVolume24h,
    successfulTrades: Math.floor(Math.random() * 50) + 10,
    failedTrades: Math.floor(Math.random() * 20) + 5,
    totalProfit: (Math.random() * 100) - 20, // -20 bis +80 SUI
    avgExecutionTime: Math.random() * 5000 + 1000, // 1-6 Sekunden
    topTokens,
    marketConditions,
    riskAssessment
  };
}

/**
 * Aktualisiert den Pool-Cache mit neuen Daten
 */
export function updatePoolCache(pool: ParsedPoolData): void {
  poolCache.set(pool.poolId, pool);
  
  // Invalidiere Analytics-Cache
  cachedAnalytics = null;
}

/**
 * Holt erweiterte Daten für einen Pool
 */
export async function getPoolAnalytics(poolId: string): Promise<ParsedPoolData | null> {
  try {
    // Prüfe Cache
    if (poolCache.has(poolId)) {
      return poolCache.get(poolId) || null;
    }
    
    // Hole erweiterte Pool-Daten
    const poolData = await getEnhancedPoolData(poolId);
    
    if (poolData) {
      // Aktualisiere Cache
      poolCache.set(poolId, poolData);
      return poolData;
    }
    
    return null;
  } catch (error) {
    logError('Fehler beim Abrufen der Pool-Analytics', { 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      poolId 
    });
    return null;
  }
}

/**
 * Berechnet Risikometriken für einen Pool
 */
export function calculateRiskMetrics(pool: ParsedPoolData): RiskMetrics {
  try {
    // Verwende vorhandene Sicherheitsdaten, falls verfügbar
    if (pool.security?.riskScore !== undefined) {
      return {
        overallRisk: pool.security.riskScore,
        marketConditions: cachedAnalytics?.marketConditions || 'neutral',
        scamProbability: pool.security.rugPullRisk || Math.floor(Math.random() * 40) + 10,
        rugPullRisk: pool.security.rugPullRisk || Math.floor(Math.random() * 50) + 10,
        honeypotRisk: pool.security.isHoneypot ? 80 : Math.floor(Math.random() * 30) + 5,
        volatilityIndex: Math.random() * 1.5 + 0.5,
        liquidityRisk: Math.floor(Math.random() * 40) + 20
      };
    }
    
    // Verbesserte Risikobewertung mit gewichteten Faktoren
    let riskFactors: { [key: string]: { value: number; weight: number; description: string } } = {};
    
    // 1. Liquiditätsbewertung (höhere Liquidität = geringeres Risiko)
    const liquidityValue = typeof pool.liquidity === 'number' ? pool.liquidity : 0;
    const liquidityScore = Math.min(100, Math.max(0, 100 - (liquidityValue / 1000) * 10));
    riskFactors.liquidity = { 
      value: liquidityScore, 
      weight: 2.0, 
      description: `Liquidität: ${liquidityValue.toFixed(2)} SUI` 
    };
    
    // 2. Alter des Pools (neuere Pools sind riskanter)
    let ageScore = 50; // Standardwert
    if (pool.createdAt) {
      const ageInHours = (Date.now() - pool.createdAt.getTime()) / (1000 * 60 * 60);
      ageScore = Math.min(100, Math.max(0, 100 - ageInHours * 2));
    }
    riskFactors.age = { 
      value: ageScore, 
      weight: 1.5, 
      description: `Alter: ${pool.createdAt ? formatTimeAgo(pool.createdAt) : 'unbekannt'}` 
    };
    
    // 3. DEX-Reputation (bekannte DEXes sind sicherer)
    const dexReputationMap: { [key: string]: number } = {
      'Cetus': 20,
      'Turbos': 30,
      'BlueMove': 40,
      'Kriya': 50
    };
    const dexScore = dexReputationMap[pool.dex] || 70;
    riskFactors.dex = { 
      value: dexScore, 
      weight: 1.0, 
      description: `DEX: ${pool.dex}` 
    };
    
    // 4. Token-Metriken
    if (pool.metrics) {
      // 4.1 Anzahl der Holder (mehr Holder = geringeres Risiko)
      if (pool.metrics.holders) {
        const holderScore = Math.min(100, Math.max(0, 100 - (pool.metrics.holders / 10)));
        riskFactors.holders = { 
          value: holderScore, 
          weight: 1.2, 
          description: `Holder: ${pool.metrics.holders}` 
        };
      }
      
      // 4.2 Transaktionen (mehr Transaktionen = geringeres Risiko)
      if (pool.metrics.transactions) {
        const txScore = Math.min(100, Math.max(0, 100 - (pool.metrics.transactions / 100)));
        riskFactors.transactions = { 
          value: txScore, 
          weight: 1.0, 
          description: `Transaktionen: ${pool.metrics.transactions}` 
        };
      }
      
      // 4.3 Steuern (höhere Steuern = höheres Risiko)
      if (pool.metrics.buyTax !== undefined || pool.metrics.sellTax !== undefined) {
        const buyTax = pool.metrics.buyTax || 0;
        const sellTax = pool.metrics.sellTax || 0;
        const taxScore = Math.min(100, (buyTax + sellTax) * 5);
        riskFactors.taxes = { 
          value: taxScore, 
          weight: 1.8, 
          description: `Steuern: ${buyTax}% kaufen, ${sellTax}% verkaufen` 
        };
      }
      
      // 4.4 Gesperrte Liquidität (gesperrt = geringeres Risiko)
      if (pool.metrics.liquidityLocked !== undefined) {
        const lockScore = pool.metrics.liquidityLocked ? 20 : 80;
        const lockDuration = pool.metrics.lockDuration || 0;
        const lockBonus = Math.min(20, lockDuration / 30 * 20); // Max 20% Bonus für 30+ Tage
        
        riskFactors.liquidityLock = { 
          value: lockScore - lockBonus, 
          weight: 1.5, 
          description: `Liquidität ${pool.metrics.liquidityLocked ? 'gesperrt' : 'nicht gesperrt'}${
            pool.metrics.liquidityLocked && lockDuration ? ` für ${lockDuration} Tage` : ''
          }` 
        };
      }
    }
    
    // 5. Sicherheitsmerkmale
    if (pool.security) {
      // 5.1 Honeypot-Risiko
      if (pool.security.isHoneypot !== undefined) {
        const honeypotScore = pool.security.isHoneypot ? 100 : 10;
        riskFactors.honeypot = { 
          value: honeypotScore, 
          weight: 2.5, 
          description: `Honeypot: ${pool.security.isHoneypot ? 'Ja' : 'Nein'}` 
        };
      }
      
      // 5.2 Ownership
      if (pool.security.ownershipRenounced !== undefined) {
        const ownershipScore = pool.security.ownershipRenounced ? 10 : 60;
        riskFactors.ownership = { 
          value: ownershipScore, 
          weight: 1.2, 
          description: `Ownership: ${pool.security.ownershipRenounced ? 'aufgegeben' : 'nicht aufgegeben'}` 
        };
      }
      
      // 5.3 Minting
      if (pool.security.mintingEnabled !== undefined) {
        const mintingScore = pool.security.mintingEnabled ? 80 : 20;
        riskFactors.minting = { 
          value: mintingScore, 
          weight: 1.3, 
          description: `Minting: ${pool.security.mintingEnabled ? 'aktiviert' : 'deaktiviert'}` 
        };
      }
      
      // 5.4 Vorherige Scams
      if (pool.security.previousScams !== undefined) {
        const scamScore = Math.min(100, pool.security.previousScams * 25);
        riskFactors.previousScams = { 
          value: scamScore, 
          weight: 2.0, 
          description: `Vorherige Scams: ${pool.security.previousScams}` 
        };
      }
    }
    
    // Berechne gewichteten Durchschnitt aller Risikofaktoren
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const factor of Object.values(riskFactors)) {
      weightedSum += factor.value * factor.weight;
      totalWeight += factor.weight;
    }
    
    // Gesamtrisiko (0-100%)
    const overallRisk = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
    
    // Logge detaillierte Risikobewertung für Debugging
    logDebug('Detaillierte Risikobewertung', {
      poolId: pool.poolId,
      overallRisk,
      factors: Object.entries(riskFactors).map(([key, factor]) => ({
        name: key,
        value: factor.value,
        weight: factor.weight,
        description: factor.description,
        contribution: Math.round((factor.value * factor.weight) / totalWeight)
      }))
    });
    
    return {
      overallRisk,
      marketConditions: cachedAnalytics?.marketConditions || 'neutral',
      scamProbability: riskFactors.previousScams?.value || Math.floor(Math.random() * 40) + 10,
      rugPullRisk: riskFactors.liquidityLock?.value || Math.floor(Math.random() * 50) + 10,
      honeypotRisk: riskFactors.honeypot?.value || Math.floor(Math.random() * 30) + 5,
      volatilityIndex: Math.random() * 1.5 + 0.5,
      liquidityRisk: riskFactors.liquidity?.value || Math.floor(Math.random() * 40) + 20
    };
  } catch (error) {
    logError('Fehler bei der Berechnung der Risikometriken', { 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      poolId: pool.poolId 
    });
    
    // Fallback: Standardwerte
    return {
      overallRisk: 50,
      marketConditions: 'neutral',
      scamProbability: 30,
      rugPullRisk: 40,
      honeypotRisk: 20,
      volatilityIndex: 1.0,
      liquidityRisk: 30
    };
  }
}

// Hilfsfunktion zum Formatieren des Alters
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return `${diffDay} Tag${diffDay > 1 ? 'e' : ''}`;
  } else if (diffHour > 0) {
    return `${diffHour} Stunde${diffHour > 1 ? 'n' : ''}`;
  } else if (diffMin > 0) {
    return `${diffMin} Minute${diffMin > 1 ? 'n' : ''}`;
  } else {
    return `${diffSec} Sekunde${diffSec > 1 ? 'n' : ''}`;
  }
} 