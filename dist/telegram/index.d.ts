export declare function getSuiPrice(): Promise<number>;
export declare function sendBuyMessage({ tokenAddress, tokenAmount, buyDigest, dex, poolAddress, suiSpentAmount, sellAction, scamProbability }: {
    tokenAddress: string;
    tokenAmount: string;
    buyDigest: string;
    dex: string;
    poolAddress: string;
    suiSpentAmount: string;
    sellAction: () => Promise<void>;
    scamProbability: number;
}): Promise<void>;
export declare function sendSellMessage(digest: string, poolAddress: string): Promise<void>;
export declare function sendUpdateMessage(params: any): Promise<void>;
export declare function sendErrorMessage(params: any): void;
