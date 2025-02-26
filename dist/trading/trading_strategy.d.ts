import { SUPPORTED_DEX } from '../chain/config.js';
import { ParsedPoolData } from '../chain/extractor.js';
export interface TradingInfo {
    initialSuiAmount: string;
    currentAmount: string;
    tokenToTrade: string;
    tokenAmount: string;
    tokenOnWallet?: string;
    poolAddress: string;
    dex: SUPPORTED_DEX;
    suiIsA: boolean;
    securityScore?: number;
    scamProbability?: number;
    initialSolAmount: string;
    tokenToSell: string;
}
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
}
export declare class TradingStrategy {
    private static instance;
    private keypair;
    private positions;
    private highestPrices;
    private activeTrades;
    private constructor();
    static getInstance(): TradingStrategy;
    getActiveTrades(): Map<string, any>;
    getTradeAnalysis(txId: string): any;
    takeProfits(txId: string, profitType: any): Promise<boolean>;
    toggleAutoPilot(tradeId: string, status: boolean): Promise<void>;
    private calculatePositionSize;
    private calculateLiquidityScore;
    private updateTrailingStop;
    private updateTradeMetrics;
    executeBuyStrategy(poolData: ParsedPoolData & {
        tokenAddress: string;
    }, amount: number, slippage: number): Promise<TradeResult>;
    executeSellStrategy(tradingInfo: TradingInfo, slippage: number): Promise<TradeResult>;
    private executeTransaction;
    buyAction(digest: string, info: ParsedPoolData | null): Promise<void>;
    sellAction(tradingInfo: TradingInfo): Promise<void>;
    runTrade(): Promise<never>;
    private monitorTrade;
    private recoverPoolData;
}
export declare const tradingStrategy: TradingStrategy;
