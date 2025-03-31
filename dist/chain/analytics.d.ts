import { ParsedPoolData } from './extractor.js';
import { RiskMetrics } from '../utils/dashboard.js';
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
/**
 * Holt On-Chain-Analytics für alle Pools
 */
export declare function getOnChainAnalytics(forceRefresh?: boolean): Promise<OnChainAnalytics>;
/**
 * Aktualisiert den Pool-Cache mit neuen Daten
 */
export declare function updatePoolCache(pool: ParsedPoolData): void;
/**
 * Holt erweiterte Daten für einen Pool
 */
export declare function getPoolAnalytics(poolId: string): Promise<ParsedPoolData | null>;
/**
 * Berechnet Risikometriken für einen Pool
 */
export declare function calculateRiskMetrics(pool: ParsedPoolData): RiskMetrics;
