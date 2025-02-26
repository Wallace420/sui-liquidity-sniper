import { BacktestResult } from './backtest';
interface BacktestConfig {
    startTime?: number;
    endTime?: number;
    timeRanges?: Array<{
        name: string;
        start: number;
        end: number;
    }>;
    parallelRuns?: number;
    saveDetailedResults?: boolean;
    analyzeScamDetection?: boolean;
}
type TimedBacktestResult = BacktestResult & {
    startTime: number;
    endTime: number;
    rangeName?: string;
};
interface AnalysisSummary {
    overallStats: {
        totalTradesAnalyzed: number;
        averageWinRate: number;
        averageProfit: number;
        averageExecutionTime: number;
        averageScamDetectionAccuracy: number;
        profitConsistency: number;
        winRateConsistency: number;
    };
    bestPeriod: {
        timeRange: string;
        profit: number;
        winRate: number;
    };
    worstPeriod: {
        timeRange: string;
        profit: number;
        winRate: number;
    };
}
interface BacktestOutput {
    results: TimedBacktestResult[];
    analysis: AnalysisSummary;
}
declare function runBacktestWithConfig(config: BacktestConfig): Promise<BacktestOutput>;
export { runBacktestWithConfig, BacktestConfig, BacktestOutput, AnalysisSummary, TimedBacktestResult };
