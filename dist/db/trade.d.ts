interface TradeData {
    tokenAddress: string;
    tokenAmount: string;
    buyDigest: string;
    dex: string;
    suiSpentAmount: string;
    poolAddress?: string;
    initialPoolAmountA?: string;
    initialPoolAmountB?: string;
    amountA?: string;
    amountB?: string;
    suiIsA?: boolean;
    scamProbability?: number;
    sellDigest?: string;
    suiReceivedAmount?: string;
}
export declare const upsertTrade: (data: TradeData) => Promise<{
<<<<<<< HEAD
=======
    amountA: string | null;
    amountB: string | null;
    dex: string;
    status: string;
    timestamp: Date;
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
    id: string;
    tokenAddress: string;
    tokenAmount: string;
    buyDigest: string;
    sellDigest: string | null;
    suiSpentAmount: string;
    suiReceivedAmount: string | null;
<<<<<<< HEAD
    dex: string;
    poolAddress: string | null;
    amountA: string | null;
    amountB: string | null;
    suiIsA: boolean;
    scamProbability: number;
    status: string;
    timestamp: Date;
=======
    poolAddress: string | null;
    suiIsA: boolean;
    scamProbability: number;
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
}>;
interface UpdateTradeData {
    poolAddress: string;
    sellDigest: string;
    suiReceivedAmount: string;
}
export declare const updateTrade: (data: UpdateTradeData) => Promise<{
<<<<<<< HEAD
=======
    amountA: string | null;
    amountB: string | null;
    dex: string;
    status: string;
    timestamp: Date;
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
    id: string;
    tokenAddress: string;
    tokenAmount: string;
    buyDigest: string;
    sellDigest: string | null;
    suiSpentAmount: string;
    suiReceivedAmount: string | null;
<<<<<<< HEAD
    dex: string;
    poolAddress: string | null;
    amountA: string | null;
    amountB: string | null;
    suiIsA: boolean;
    scamProbability: number;
    status: string;
    timestamp: Date;
}>;
export declare const getTrade: (poolAddress: string) => Promise<{
=======
    poolAddress: string | null;
    suiIsA: boolean;
    scamProbability: number;
}>;
export declare const getTrade: (poolAddress: string) => Promise<{
    amountA: string | null;
    amountB: string | null;
    dex: string;
    status: string;
    timestamp: Date;
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
    id: string;
    tokenAddress: string;
    tokenAmount: string;
    buyDigest: string;
    sellDigest: string | null;
    suiSpentAmount: string;
    suiReceivedAmount: string | null;
<<<<<<< HEAD
    dex: string;
    poolAddress: string | null;
    amountA: string | null;
    amountB: string | null;
    suiIsA: boolean;
    scamProbability: number;
    status: string;
    timestamp: Date;
} | null>;
export declare const getTrades: () => Promise<{
=======
    poolAddress: string | null;
    suiIsA: boolean;
    scamProbability: number;
} | null>;
export declare const getTrades: () => Promise<{
    amountA: string | null;
    amountB: string | null;
    dex: string;
    status: string;
    timestamp: Date;
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
    id: string;
    tokenAddress: string;
    tokenAmount: string;
    buyDigest: string;
    sellDigest: string | null;
    suiSpentAmount: string;
    suiReceivedAmount: string | null;
<<<<<<< HEAD
    dex: string;
    poolAddress: string | null;
    amountA: string | null;
    amountB: string | null;
    suiIsA: boolean;
    scamProbability: number;
    status: string;
    timestamp: Date;
}[]>;
export declare const getOpenTrades: () => Promise<{
=======
    poolAddress: string | null;
    suiIsA: boolean;
    scamProbability: number;
}[]>;
export declare const getOpenTrades: () => Promise<{
    amountA: string | null;
    amountB: string | null;
    dex: string;
    status: string;
    timestamp: Date;
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
    id: string;
    tokenAddress: string;
    tokenAmount: string;
    buyDigest: string;
    sellDigest: string | null;
    suiSpentAmount: string;
    suiReceivedAmount: string | null;
<<<<<<< HEAD
    dex: string;
    poolAddress: string | null;
    amountA: string | null;
    amountB: string | null;
    suiIsA: boolean;
    scamProbability: number;
    status: string;
    timestamp: Date;
=======
    poolAddress: string | null;
    suiIsA: boolean;
    scamProbability: number;
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
}[]>;
export {};
