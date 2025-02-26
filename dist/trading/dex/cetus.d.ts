import { Transaction } from '@mysten/sui/transactions';
export declare function getCetusPools(): Promise<import("@mysten/sui/dist/esm/client/index.js").SuiEvent[]>;
export declare function createCetusBuyTransaction(poolId: string, tokenAddress: string, amount: number): Promise<Transaction>;
export declare function createCetusSellTransaction(poolId: string, tokenAddress: string, amount: bigint): Promise<Transaction>;
