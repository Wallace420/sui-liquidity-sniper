import { Transaction } from '@mysten/sui/transactions';
export declare function getBlueMovePools(): Promise<import("@mysten/sui/dist/esm/client/index.js").SuiEvent[]>;
export declare function createBlueMoveBuyTransaction(poolId: string, tokenAddress: string, amount: number): Promise<Transaction>;
export declare function createBlueMoveSellTransaction(poolId: string, tokenAddress: string, amount: bigint): Promise<Transaction>;
