export interface Transaction {
    digest: string;
    timestamp: number;
    sender?: string;
    success?: boolean;
    gasFee?: number;
    type?: string;
    dex?: string;
<<<<<<< HEAD
    id?: string;
    amount?: number;
    date?: Date;
=======
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
}
export interface ClusterNode {
    url: string;
    weight: number;
    status: 'active' | 'inactive' | 'error';
    lastChecked?: number;
    responseTime?: number;
    errorCount?: number;
<<<<<<< HEAD
    id?: string;
}
export interface ParsedPoolData {
    poolId: string;
    tokenSymbol: string;
    tokenName: string;
    tokenAddress: string;
    liquidity: {
        sui: number;
        token: number;
    };
    dexType: 'Cetus' | 'BlueMove' | 'Turbos' | 'Kriya' | 'Unknown';
    createdAt: Date;
    socialLinks?: {
        website?: string;
        telegram?: string;
        twitter?: string;
        discord?: string;
    };
    metrics?: {
        holders?: number;
        transactions?: number;
        marketCap?: number;
        fullyDilutedValue?: number;
    };
}
export interface PoolFilterConfig {
    minLiquiditySUI: number;
    maxRiskScore: number;
    minSuccessfulSells: number;
    maxSellTax: number;
    minHolders: number;
    minAge: number;
    maxTokensPerPool: number;
    requiredSocialLinks: number;
}
export interface SnipingConfig {
    autoMode: boolean;
    minLiquiditySUI: number;
    maxRiskScore: number;
    positionSize: number;
    takeProfit: number;
    stopLoss: number;
    trailingStop: boolean;
    trailingDistance: number;
}
export interface PoolStatus {
    poolId: string;
    tokenSymbol?: string;
    tokenName?: string;
    riskScore: number;
    isHoneypot: boolean;
    status: 'watching' | 'buying' | 'bought' | 'selling' | 'sold' | 'failed';
    timestamp: Date;
    liquidity?: number;
    entryPrice?: number;
    currentPrice?: number;
    profitLoss?: number;
    profitLossPercentage?: number;
    holders?: number;
    createdAt?: Date;
    socialLinksCount?: number;
    topHoldersPercentage?: number;
    twitterFollowers?: number;
    bundleTransactions?: number;
    isRugDev?: boolean;
}
export interface TradeMetrics {
    activePools: number;
    successfulTrades: number;
    failedTrades: number;
    averageProfit: number;
    totalProfit: number;
}
export interface SUI {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
}
export declare const SUI: SUI;
export interface Assets {
    id: string;
    value: number;
}
export interface Operation {
    id: string;
    type: string;
}
export interface Congestion {
    level: number;
    description: string;
=======
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
}
