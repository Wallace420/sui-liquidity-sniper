import { ParsedPoolData } from "../../chain/extractor.js";
import { CalculateRatesResult } from "@cetusprotocol/cetus-sui-clmm-sdk";
import { TradingInfo } from "../tradeStrategy.js";
import { Transaction } from '@mysten/sui/transactions';
export type QuoteType = {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    poolId: string;
};
/**
 * Holt alle Cetus Pools mit der SDK-Methode
 */
export declare function getCetusPools(): Promise<import("@cetusprotocol/cetus-sui-clmm-sdk").Pool[]>;
/**
 * Alternative Methode zum Abrufen von Cetus Pools über Events
 */
export declare function getCetusPoolsViaEvents(): Promise<import("@mysten/sui/dist/esm/client/index.js").SuiEvent[]>;
/**
 * Holt ein Quote für einen Pool
 */
export declare function getQuote(pool: any): Promise<CalculateRatesResult>;
/**
 * Kauft Token mit der Cetus SDK
 */
export declare function buy(poolData: ParsedPoolData): Promise<string>;
/**
 * Verkauft Token mit der Cetus SDK
 */
export declare function sell(sellData: TradingInfo): Promise<string>;
/**
 * Erstellt eine Transaktion zum Kauf von Token mit der Transaction API
 */
export declare function createCetusBuyTransaction(poolId: string, tokenAddress: string, amount: number): Promise<Transaction>;
/**
 * Erstellt eine Transaktion zum Verkauf von Token mit der Transaction API
 */
export declare function createCetusSellTransaction(poolId: string, tokenAddress: string, amount: bigint): Promise<Transaction>;
