import { runBacktest } from './backtest';
import { logInfo } from '../utils/logger';
async function main() {
    // Zeitraum für den Backtest festlegen (letzte 7 Tage)
    const endTime = Date.now();
    const startTime = endTime - (7 * 24 * 60 * 60 * 1000);
    logInfo('Starting backtest', {
        timeRange: {
            start: new Date(startTime).toISOString(),
            end: new Date(endTime).toISOString()
        }
    });
    try {
        const results = await runBacktest(startTime, endTime);
        logInfo('Backtest completed', {
            results: {
                totalTrades: results.totalTrades,
                successfulTrades: results.successfulTrades,
                failedTrades: results.failedTrades,
                totalProfit: `${results.totalProfit.toFixed(2)}%`,
                averageProfit: `${results.averageProfit.toFixed(2)}%`,
                maxDrawdown: `${results.maxDrawdown.toFixed(2)}%`,
                winRate: `${results.winRate.toFixed(2)}%`,
                scamDetectionAccuracy: `${results.scamDetectionAccuracy.toFixed(2)}%`,
                averageExecutionTime: `${(results.averageExecutionTime / 1000).toFixed(2)}s`,
                gasUsed: results.gasUsed
            },
            timeRange: {
                start: new Date(results.startTime).toISOString(),
                end: new Date(results.endTime).toISOString()
            }
        });
    }
    catch (error) {
        logInfo('Backtest failed', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
main().catch(console.error);
//# sourceMappingURL=run.js.map