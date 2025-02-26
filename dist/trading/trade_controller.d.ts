import { SUPPORTED_DEX } from '../chain/config.js';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
interface TradeConfig {
    maxSlippagePercent: number;
    minSecurityScore: number;
    maxGasPrice: number;
}
interface TradeResult {
    success: boolean;
    transactionId?: string;
    error?: string;
    profit?: number;
    profitPercentage?: number;
}
export declare class TradeController {
    private config;
    private keypair;
    private tradingEnabled;
    constructor(config: TradeConfig, keypair: Ed25519Keypair);
    enableTrading(): void;
    disableTrading(): void;
    isTradingEnabled(): boolean;
    executeTrade(poolId: string, tokenAddress: string, amount: number, dex: SUPPORTED_DEX): Promise<TradeResult>;
    private executeTransaction;
    calculateProfit(buyTxId: string, sellTxId: string): Promise<{
        profit: number;
        profitPercentage: number;
    }>;
}
export declare const tradeController: TradeController;
export {};
