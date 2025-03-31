import { SUPPORTED_DEX } from "./config.js";
import { SuiTransactionBlockResponse, SuiEvent } from "@mysten/sui/client";
<<<<<<< HEAD
export interface ParsedPoolData {
    poolId: string;
    coinA: string;
    coinB: string;
    amountA: string | number;
    amountB: string | number;
    liquidity?: any;
    dex: string;
    creator?: string;
    tokenSymbol?: string;
    tokenName?: string;
    tokenAddress?: string;
    dexType?: 'Cetus' | 'BlueMove' | 'Turbos' | 'Kriya' | 'Unknown';
    createdAt?: Date;
    volume24h?: number;
    priceChange24h?: number;
    socialLinks?: {
        website?: string;
        telegram?: string;
        twitter?: string;
        discord?: string;
    };
    metrics?: {
        holders?: number;
        transactions?: number;
        marketCap?: number;
        fullyDilutedValue?: number;
        volume24h?: number;
        priceChange24h?: number;
        buyTax?: number;
        sellTax?: number;
        liquidityLocked?: boolean;
        lockDuration?: number;
    };
    analytics?: {
        priceHistory?: Array<{
            timestamp: number;
            price: number;
        }>;
        volumeHistory?: Array<{
            timestamp: number;
            volume: number;
        }>;
        holderDistribution?: Record<string, number>;
        tradingPairs?: string[];
    };
    security?: {
        riskScore?: number;
        isHoneypot?: boolean;
        rugPullRisk?: number;
        ownershipRenounced?: boolean;
        mintingEnabled?: boolean;
        previousScams?: number;
    };
}
export interface ExtractedTransactionInfo {
    inputAmount: number;
    outputAmount: number;
    timestamp: number;
=======
export type ParsedPoolData = {
    coinA: string;
    coinB: string;
    amountA: string;
    amountB: string;
    poolId: string;
    liquidity: string;
    dex: SUPPORTED_DEX;
    creator?: string;
};
export declare function getTransactionInfo(txDigest: string, dex: string): Promise<{
    inputAmount: number;
    outputAmount: number;
    timestamp: string | null | undefined;
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
    success: boolean;
    coinA: string;
    coinB: string;
    amountA: string;
    amountB: string;
    poolId: string;
<<<<<<< HEAD
    dex?: string;
    slippage?: number;
    gasFee?: number;
    priceImpact?: number;
}
/**
 * Holt detaillierte Informationen zu einer Transaktion
 * @param txDigest Transaktions-Hash
 * @param dex DEX-Name
 * @returns Extrahierte Transaktionsinformationen
 */
export declare function getTransactionInfo(txDigest: string, dex: string): Promise<ExtractedTransactionInfo | null>;
/**
 * Extrahiert Pool-Daten aus einem Event
 */
export declare function decomposeEventData(event: SuiEvent): ParsedPoolData | null;
/**
 * Extrahiert Pool-Daten aus einer Transaktion basierend auf dem DEX
 */
export declare function decomposeTransactionByDex(tx: SuiTransactionBlockResponse, dex: SUPPORTED_DEX): ParsedPoolData | null;
/**
 * Holt erweiterte Pool-Daten mit On-Chain-Analytics
 */
export declare function getEnhancedPoolData(poolId: string): Promise<ParsedPoolData | null>;
=======
} | null>;
export declare function decomposeTransactionByDex(tx: SuiTransactionBlockResponse, dex?: SUPPORTED_DEX): ParsedPoolData | null;
export declare function decomposeEventData(event: SuiEvent): ParsedPoolData | null;
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
