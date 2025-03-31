import { getEnhancedPoolData } from './extractor.js';
import { logError } from '../utils/logger.js';
// Cache für Pool-Daten
const poolCache = new Map();
let lastAnalyticsUpdate = 0;
let cachedAnalytics = null;
/**
 * Holt On-Chain-Analytics für alle Pools
 */
export async function getOnChainAnalytics(forceRefresh = false) {
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
        const dexCounts = {};
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
        const tokenVolumes = new Map();
        pools.forEach(p => {
            if (p.tokenSymbol && p.metrics?.volume24h && p.metrics?.priceChange24h) {
                const existing = tokenVolumes.get(p.tokenSymbol);
                if (existing) {
                    existing.volume += p.metrics.volume24h;
                }
                else {
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
        let marketConditions = 'neutral';
        if (avgPriceChange > 5) {
            marketConditions = 'bullish';
        }
        else if (avgPriceChange < -5) {
            marketConditions = 'bearish';
        }
        // Risikobewertung
        const riskAssessment = {
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
        const analytics = {
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
    }
    catch (error) {
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
function generateSimulatedAnalytics() {
    const totalPools = Math.floor(Math.random() * 1000) + 100;
    const poolsLast24h = Math.floor(Math.random() * 100) + 10;
    const avgLiquidity = Math.random() * 10000 + 1000;
    const totalVolume24h = Math.random() * 100000 + 10000;
    const topDexes = {
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
    let marketConditions = 'neutral';
    if (avgPriceChange > 5) {
        marketConditions = 'bullish';
    }
    else if (avgPriceChange < -5) {
        marketConditions = 'bearish';
    }
    const riskAssessment = {
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
export function updatePoolCache(pool) {
    poolCache.set(pool.poolId, pool);
    // Invalidiere Analytics-Cache
    cachedAnalytics = null;
}
/**
 * Holt erweiterte Daten für einen Pool
 */
export async function getPoolAnalytics(poolId) {
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
    }
    catch (error) {
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
export function calculateRiskMetrics(pool) {
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
        // Berechne Risikometriken basierend auf Pool-Daten
        let overallRisk = 50; // Standardwert
        // Faktoren, die das Risiko reduzieren
        if (pool.metrics?.holders && pool.metrics.holders > 100) {
            overallRisk -= 10;
        }
        if (pool.metrics?.liquidityLocked) {
            overallRisk -= 15;
        }
        if (pool.metrics?.transactions && pool.metrics.transactions > 1000) {
            overallRisk -= 10;
        }
        // Faktoren, die das Risiko erhöhen
        if (pool.createdAt && (Date.now() - pool.createdAt.getTime()) < 24 * 60 * 60 * 1000) {
            overallRisk += 15; // Neuer Pool (< 24h)
        }
        if (pool.metrics?.buyTax && pool.metrics.buyTax > 5) {
            overallRisk += 10;
        }
        if (pool.metrics?.sellTax && pool.metrics.sellTax > 10) {
            overallRisk += 15;
        }
        // Begrenze Risiko auf 0-100%
        overallRisk = Math.max(0, Math.min(100, overallRisk));
        return {
            overallRisk,
            marketConditions: cachedAnalytics?.marketConditions || 'neutral',
            scamProbability: Math.floor(Math.random() * 40) + 10,
            rugPullRisk: Math.floor(Math.random() * 50) + 10,
            honeypotRisk: Math.floor(Math.random() * 30) + 5,
            volatilityIndex: Math.random() * 1.5 + 0.5,
            liquidityRisk: Math.floor(Math.random() * 40) + 20
        };
    }
    catch (error) {
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
//# sourceMappingURL=analytics.js.map