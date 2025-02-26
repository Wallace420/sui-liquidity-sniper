import { runBacktestWithConfig } from './runBacktest';
import { logError, logInfo, logPerformance } from '../utils/logger';
async function runAnalysis(config) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    try {
        // Run backtests for each timeframe
        const timeRanges = config.timeframes.map(frame => ({
            name: frame.name,
            start: now - (frame.duration * dayMs),
            end: now
        }));
        const backtestConfig = {
            timeRanges,
            parallelRuns: config.parallelRuns || 2,
            saveDetailedResults: config.saveResults,
            analyzeScamDetection: config.analyzeScamDetection
        };
        const startTime = process.hrtime();
        const { results, analysis } = await runBacktestWithConfig(backtestConfig);
        // Calculate additional metrics
        const profitability = calculateProfitability(results);
        const riskMetrics = calculateRiskMetrics(results);
        const efficiencyMetrics = calculateEfficiencyMetrics(results);
        // Generate comprehensive report
        const report = {
            summary: analysis,
            profitability,
            riskMetrics,
            efficiencyMetrics,
            timeframeComparison: compareTimeframes(results),
            recommendations: generateRecommendations({
                analysis,
                profitability,
                riskMetrics,
                efficiencyMetrics
            })
        };
        // Log performance
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const totalTime = seconds * 1000 + nanoseconds / 1000000;
        logPerformance('Analysis completed', totalTime, {
            timeframes: config.timeframes.length,
            totalTrades: analysis.overallStats.totalTradesAnalyzed
        });
        logInfo('Analysis Report', { report });
        return report;
    }
    catch (error) {
        logError('Analysis failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            config
        });
        throw error;
    }
}
function calculateProfitability(results) {
    return {
        totalProfitLoss: results.reduce((sum, r) => sum + r.totalProfit, 0),
        averageTradeProfit: results.reduce((sum, r) => sum + r.averageProfit, 0) / results.length,
        profitFactor: calculateProfitFactor(results),
        returnOnInvestment: calculateROI(results),
        profitConsistency: calculateProfitConsistency(results)
    };
}
function calculateRiskMetrics(results) {
    return {
        maxDrawdown: Math.min(...results.map(r => r.maxDrawdown)),
        sharpeRatio: calculateSharpeRatio(results),
        volatility: calculateVolatility(results),
        riskRewardRatio: calculateRiskRewardRatio(results),
        downsideDeviation: calculateDownsideDeviation(results)
    };
}
function calculateEfficiencyMetrics(results) {
    return {
        averageExecutionTime: results.reduce((sum, r) => sum + r.averageExecutionTime, 0) / results.length,
        successRate: results.reduce((sum, r) => sum + r.winRate, 0) / results.length,
        scamDetectionAccuracy: results.reduce((sum, r) => sum + r.scamDetectionAccuracy, 0) / results.length,
        gasEfficiency: calculateGasEfficiency(results)
    };
}
function compareTimeframes(results) {
    const timeframeComparisons = results.map(result => ({
        timeframe: result.rangeName,
        performance: {
            profitability: result.totalProfit,
            winRate: result.winRate,
            executionEfficiency: result.averageExecutionTime,
            riskAdjustedReturn: result.totalProfit / Math.abs(result.maxDrawdown)
        }
    }));
    return {
        comparisons: timeframeComparisons,
        bestTimeframe: timeframeComparisons.reduce((best, current) => current.performance.riskAdjustedReturn > best.performance.riskAdjustedReturn ? current : best),
        trends: analyzeTimeframeTrends(timeframeComparisons)
    };
}
function generateRecommendations(metrics) {
    const recommendations = [];
    // Profitability recommendations
    if (metrics.profitability.profitFactor < 1.5) {
        recommendations.push({
            area: 'Profitability',
            suggestion: 'Consider adjusting entry/exit criteria to improve profit factor',
            priority: 'High'
        });
    }
    // Risk management recommendations
    if (Math.abs(metrics.riskMetrics.maxDrawdown) > 0.2) {
        recommendations.push({
            area: 'Risk Management',
            suggestion: 'Implement stricter stop-loss mechanisms to reduce maximum drawdown',
            priority: 'High'
        });
    }
    // Efficiency recommendations
    if (metrics.efficiencyMetrics.averageExecutionTime > 1000) {
        recommendations.push({
            area: 'Execution Efficiency',
            suggestion: 'Optimize transaction submission and confirmation process',
            priority: 'Medium'
        });
    }
    // Scam detection recommendations
    if (metrics.efficiencyMetrics.scamDetectionAccuracy < 0.9) {
        recommendations.push({
            area: 'Scam Detection',
            suggestion: 'Refine scam detection algorithm and add additional verification steps',
            priority: 'High'
        });
    }
    return recommendations;
}
// Helper functions for calculations
function calculateProfitFactor(results) {
    const profits = results.reduce((sum, r) => sum + Math.max(0, r.totalProfit), 0);
    const losses = Math.abs(results.reduce((sum, r) => sum + Math.min(0, r.totalProfit), 0));
    return losses === 0 ? profits : profits / losses;
}
function calculateROI(results) {
    const totalProfit = results.reduce((sum, r) => sum + r.totalProfit, 0);
    const totalInvestment = results.reduce((sum, r) => sum + r.gasUsed, 0);
    return totalInvestment === 0 ? 0 : (totalProfit / totalInvestment) * 100;
}
function calculateProfitConsistency(results) {
    const profits = results.map(r => r.totalProfit);
    const mean = profits.reduce((sum, p) => sum + p, 0) / profits.length;
    const variance = profits.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / profits.length;
    return Math.sqrt(variance);
}
function calculateSharpeRatio(results) {
    const returns = results.map(r => r.totalProfit);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const riskFreeRate = 0.02; // Assuming 2% risk-free rate
    return stdDev === 0 ? 0 : (avgReturn - riskFreeRate) / stdDev;
}
function calculateVolatility(results) {
    const returns = results.map(r => r.totalProfit);
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    return Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length);
}
function calculateRiskRewardRatio(results) {
    const avgProfit = results.reduce((sum, r) => sum + Math.max(0, r.totalProfit), 0) / results.length;
    const avgLoss = Math.abs(results.reduce((sum, r) => sum + Math.min(0, r.totalProfit), 0)) / results.length;
    return avgLoss === 0 ? avgProfit : avgProfit / avgLoss;
}
function calculateDownsideDeviation(results) {
    const returns = results.map(r => r.totalProfit);
    const targetReturn = 0; // Minimum acceptable return
    const downside = returns.map(r => Math.min(r - targetReturn, 0));
    return Math.sqrt(downside.reduce((sum, d) => sum + Math.pow(d, 2), 0) / downside.length);
}
function calculateGasEfficiency(results) {
    const totalProfit = results.reduce((sum, r) => sum + r.totalProfit, 0);
    const totalGas = results.reduce((sum, r) => sum + r.gasUsed, 0);
    return totalGas === 0 ? 0 : totalProfit / totalGas;
}
function analyzeTimeframeTrends(comparisons) {
    // Sort by timeframe duration
    const sorted = [...comparisons].sort((a, b) => parseInt(a.timeframe.split(' ')[1]) - parseInt(b.timeframe.split(' ')[1]));
    return {
        profitabilityTrend: calculateTrend(sorted.map(c => c.performance.profitability)),
        efficiencyTrend: calculateTrend(sorted.map(c => c.performance.executionEfficiency)),
        consistencyAcrossTimeframes: calculateConsistency(sorted.map(c => c.performance.winRate))
    };
}
function calculateTrend(values) {
    if (values.length < 2)
        return 'Stable';
    const changes = values.slice(1).map((v, i) => v - values[i]);
    const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;
    if (Math.abs(avgChange) < 0.05)
        return 'Stable';
    return avgChange > 0 ? 'Improving' : 'Declining';
}
function calculateConsistency(values) {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev < 0.1)
        return 'High';
    if (stdDev < 0.2)
        return 'Medium';
    return 'Low';
}
// Example usage
async function main() {
    const config = {
        timeframes: [
            { name: 'Last 24 hours', duration: 1 },
            { name: 'Last 3 days', duration: 3 },
            { name: 'Last week', duration: 7 },
            { name: 'Last month', duration: 30 }
        ],
        parallelRuns: 2,
        saveResults: true,
        analyzeScamDetection: true,
        compareWithBaseline: true
    };
    try {
        const report = await runAnalysis(config);
        console.log('Analysis completed successfully');
        return report;
    }
    catch (error) {
        console.error('Analysis failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}
export { runAnalysis };
//# sourceMappingURL=runAnalysis.js.map