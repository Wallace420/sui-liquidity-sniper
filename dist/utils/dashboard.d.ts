export interface DashboardConfig {
    refreshRate: number;
    showPoolList: boolean;
    showTradeList: boolean;
    showWalletInfo: boolean;
    showRiskMetrics: boolean;
    compactMode: boolean;
}
export interface PoolData {
    poolId: string;
    dex: string;
    coinA: string;
    coinB: string;
    timestamp: number;
    liquidity?: number;
    volume24h?: number;
    priceChange24h?: number;
    tokenSymbol?: string;
    riskScore?: number;
    createdAt?: Date;
    age?: number;
}
export interface TradeData {
    tradeId: string;
    poolId: string;
    tokenSymbol: string;
    entryPrice: number;
    currentPrice: number;
    profitLoss: number;
    profitLossPercentage: number;
    status: 'pending' | 'bought' | 'selling' | 'sold' | 'failed';
    timestamp: number;
    amount: number;
    exitPrice?: number;
    exitTimestamp?: number;
}
export interface WalletInfo {
    address: string;
    balance: number;
    tokens: Array<{
        symbol: string;
        amount: number;
        value: number;
    }>;
    totalValue: number;
    pendingTransactions: number;
}
export interface RiskMetrics {
    overallRisk: number;
    marketConditions: 'bullish' | 'bearish' | 'neutral';
    scamProbability: number;
    rugPullRisk: number;
    honeypotRisk: number;
    volatilityIndex: number;
    liquidityRisk: number;
}
export interface SystemStatus {
    poolHunting: boolean;
    trading: boolean;
    autoSniping: boolean;
    poolsFound: number;
    lastPool?: {
        dex: string;
        age: string;
    };
    uptime: number;
    cpuUsage?: number;
    memoryUsage?: number;
}
export interface OnChainAnalytics {
    totalPools: number;
    poolsLast24h: number;
    avgLiquidity: number;
    topDexes: Record<string, number>;
    avgPoolLifetime: number;
    totalVolume24h: number;
    successfulTrades: number;
    failedTrades: number;
    totalProfit: number;
    avgExecutionTime: number;
    topTokens: {
        symbol: string;
        volume: number;
    }[];
}
export declare class Dashboard {
    private pools;
    private trades;
    private walletInfo?;
    private riskMetrics?;
    private systemStatus;
    config: DashboardConfig;
    private isRunning;
    private lastRenderTime;
    private renderInterval;
    private startTime;
    constructor(config?: Partial<DashboardConfig>);
    start(): void;
    stop(): void;
    updatePools(pools: PoolData[]): void;
    updateTrades(trades: TradeData[]): void;
    updateWalletInfo(walletInfo: WalletInfo): void;
    updateRiskMetrics(riskMetrics: RiskMetrics): void;
    updateSystemStatus(status: SystemStatus): void;
    getPools(): PoolData[];
    getTrades(): TradeData[];
    render(): Promise<void>;
    private getQualityColor;
    private getTradeTypeColor;
    private getTradeStatusColor;
    private getMarketConditionColor;
    private getRiskLevelColor;
    private renderHeader;
    private renderPoolList;
    private renderTradeList;
    private renderWalletInfo;
    private renderRiskMetrics;
    private renderFooter;
    private formatUptime;
    private getPoolQuality;
}
