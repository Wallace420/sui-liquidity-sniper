export declare function scanForNewPools(debug?: boolean, config?: {
    minLiquiditySUI: number;
    maxRiskScore: number;
    minSuccessfulSells: number;
    maxSellTax: number;
    minHolders: number;
    minAge: number;
    maxTokensPerPool: number;
    requiredSocialLinks: number;
    maxTopHolderPercentage: number;
    minTwitterFollowers: number;
    maxBundleTransactions: number;
    checkRugDevs: boolean;
}): Promise<void>;
