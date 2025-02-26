interface SecurityCheckResult {
    isSecure: boolean;
    score: number;
    warnings: string[];
    details: {
        lpLocked: boolean;
        isHoneypot: boolean;
        hasOwnership: boolean;
        hasMintFunction: boolean;
        devWalletAge: number;
        devWalletTxCount: number;
        tokenHolders: number;
        poolLiquidity: number;
        ownershipRenounced: boolean;
        mintingEnabled: boolean;
        devWalletAnalysis: {
            previousScams: number;
            rugPullHistory: number;
            totalPools: number;
            averagePoolLifetime: number;
        };
        tokenAnalysis: {
            age: number;
            holders: number;
            transfers: number;
            suspiciousTransfers: number;
        };
        poolAnalysis: {
            liquidityScore: number;
            priceImpact: number;
            buyTax: number;
            sellTax: number;
            lpTokensLocked: boolean;
            lockDuration: number;
        };
    };
}
export declare function checkPoolSecurity(poolId: string, dex: string): Promise<SecurityCheckResult>;
export {};
