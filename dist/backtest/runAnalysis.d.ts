interface AnalysisConfig {
    timeframes: Array<{
        name: string;
        duration: number;
    }>;
    parallelRuns?: number;
    saveResults?: boolean;
    analyzeScamDetection?: boolean;
    compareWithBaseline?: boolean;
}
declare function runAnalysis(config: AnalysisConfig): Promise<{
    summary: any;
    profitability: {
        totalProfitLoss: any;
        averageTradeProfit: number;
        profitFactor: number;
        returnOnInvestment: number;
        profitConsistency: number;
    };
    riskMetrics: {
        maxDrawdown: number;
        sharpeRatio: number;
        volatility: number;
        riskRewardRatio: number;
        downsideDeviation: number;
    };
    efficiencyMetrics: {
        averageExecutionTime: number;
        successRate: number;
        scamDetectionAccuracy: number;
        gasEfficiency: number;
    };
    timeframeComparison: {
        comparisons: {
            timeframe: any;
            performance: {
                profitability: any;
                winRate: any;
                executionEfficiency: any;
                riskAdjustedReturn: number;
            };
        }[];
        bestTimeframe: {
            timeframe: any;
            performance: {
                profitability: any;
                winRate: any;
                executionEfficiency: any;
                riskAdjustedReturn: number;
            };
        };
        trends: {
            profitabilityTrend: "Improving" | "Declining" | "Stable";
            efficiencyTrend: "Improving" | "Declining" | "Stable";
            consistencyAcrossTimeframes: "High" | "Medium" | "Low";
        };
    };
    recommendations: {
        area: string;
        suggestion: string;
        priority: string;
    }[];
}>;
export { runAnalysis, AnalysisConfig };
