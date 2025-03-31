import { SUPPORTED_DEX } from "../chain/config.js";
import { ParsedPoolData } from "../chain/extractor.js";
export type TradingInfo = {
    initialSolAmount: string;
    currentAmount: string;
    tokenToSell: string;
    tokenOnWallet: string;
    poolAddress: string;
    dex: SUPPORTED_DEX;
    suiIsA: boolean;
    scamProbability: number;
<<<<<<< HEAD
    initialSuiAmount?: string;
    tokenToTrade?: string;
    tokenAmount?: string;
    securityScore?: number;
};
export interface TradeResult {
    success: boolean;
    transactionId?: string;
    error?: string;
    profit?: number;
    metrics?: {
        entryPrice: number;
        exitPrice: number;
        timeInTrade: number;
        slippage: number;
    };
    profitPercentage?: number;
}
export declare class TradingStrategy {
    private static instance;
    private keypair;
    private positions;
    private highestPrices;
    private activeTrades;
    private tradingEnabled;
    private constructor();
    static getInstance(): TradingStrategy;
    getActiveTrades(): Map<string, any>;
    getTradeAnalysis(txId: string): any;
    takeProfits(txId: string, profitType: any): Promise<boolean>;
    toggleAutoPilot(tradeId: string, status: boolean): Promise<void>;
    private calculatePositionSize;
    private calculateLiquidityScore;
    private updateTrailingStop;
    executeBuyStrategy(poolData: ParsedPoolData & {
        tokenAddress: string;
    }, amount: number, slippage: number): Promise<TradeResult>;
    private executeTransaction;
    enableTrading(): void;
    disableTrading(): void;
    isTradingEnabled(): boolean;
    calculateProfit(buyTxId: string, sellTxId: string): Promise<{
        profit: number;
        profitPercentage: number;
    }>;
}
export declare function buyAction(digest: string, info: ParsedPoolData | null): Promise<null | undefined>;
export declare function sellAction(tradingInfo: TradingInfo): Promise<void>;
export declare function runTrade(): Promise<never>;
export declare const tradingStrategy: TradingStrategy;
=======
};
export declare function buyAction(digest: string, info: ParsedPoolData | null): Promise<null | undefined>;
export declare function sellAction(tradingInfo: TradingInfo): Promise<void>;
export declare function runTrade(): Promise<never>;
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
