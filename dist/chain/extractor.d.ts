import { SUPPORTED_DEX } from "./config.js";
import { SuiTransactionBlockResponse, SuiEvent } from "@mysten/sui/client";
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
    success: boolean;
    coinA: string;
    coinB: string;
    amountA: string;
    amountB: string;
    poolId: string;
} | null>;
export declare function decomposeTransactionByDex(tx: SuiTransactionBlockResponse, dex?: SUPPORTED_DEX): ParsedPoolData | null;
export declare function decomposeEventData(event: SuiEvent): ParsedPoolData | null;
