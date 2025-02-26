import { runBacktest, BacktestResult } from './backtest';
import { logError, logInfo, logPerformance } from '../utils/logger';
import { prisma } from '../db';

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

async function analyzeResults(results: TimedBacktestResult[]): Promise<AnalysisSummary> {
  try {
    // Calculate aggregate statistics
    const totalTrades = results.reduce((sum, r) => sum + r.totalTrades, 0);
    const avgWinRate = results.reduce((sum, r) => sum + r.winRate, 0) / results.length;
    const avgProfit = results.reduce((sum, r) => sum + r.averageProfit, 0) / results.length;
    const avgExecutionTime = results.reduce((sum, r) => sum + r.averageExecutionTime, 0) / results.length;
    const avgScamDetection = results.reduce((sum, r) => sum + r.scamDetectionAccuracy, 0) / results.length;

    // Find best and worst performing periods
    const sortedByProfit = [...results].sort((a, b) => b.totalProfit - a.totalProfit);
    const bestPeriod = sortedByProfit[0];
    const worstPeriod = sortedByProfit[sortedByProfit.length - 1];

    // Calculate performance consistency
    const profitStdDev = calculateStandardDeviation(results.map(r => r.totalProfit));
    const winRateStdDev = calculateStandardDeviation(results.map(r => r.winRate));

    // Generate summary report
    const summary: AnalysisSummary = {
      overallStats: {
        totalTradesAnalyzed: totalTrades,
        averageWinRate: avgWinRate,
        averageProfit: avgProfit,
        averageExecutionTime: avgExecutionTime,
        averageScamDetectionAccuracy: avgScamDetection,
        profitConsistency: profitStdDev,
        winRateConsistency: winRateStdDev
      },
      bestPeriod: {
        timeRange: `${new Date(bestPeriod.startTime).toISOString()} - ${new Date(bestPeriod.endTime).toISOString()}`,
        profit: bestPeriod.totalProfit,
        winRate: bestPeriod.winRate
      },
      worstPeriod: {
        timeRange: `${new Date(worstPeriod.startTime).toISOString()} - ${new Date(worstPeriod.endTime).toISOString()}`,
        profit: worstPeriod.totalProfit,
        winRate: worstPeriod.winRate
      }
    };

    logInfo('Backtest Analysis Summary', summary);
    return summary;
  } catch (error) {
    logError('Failed to analyze backtest results', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

function calculateStandardDeviation(values: number[]): number {
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

interface BacktestOutput {
  results: TimedBacktestResult[];
  analysis: AnalysisSummary;
}

async function runBacktestWithConfig(config: BacktestConfig): Promise<BacktestOutput> {
  const results: TimedBacktestResult[] = [];
  const startTime = process.hrtime();

  try {
    if (config.timeRanges) {
      // Run backtests for multiple time ranges
      const promises = config.timeRanges.map(async range => {
        const result = await runBacktest(range.start, range.end);
        return {
          ...result,
          rangeName: range.name,
          startTime: range.start,
          endTime: range.end
        } as TimedBacktestResult;
      });

      // Run in parallel if specified
      if (config.parallelRuns) {
        const chunks = [];
        for (let i = 0; i < promises.length; i += config.parallelRuns) {
          chunks.push(promises.slice(i, i + config.parallelRuns));
        }

        for (const chunk of chunks) {
          const chunkResults = await Promise.all(chunk);
          results.push(...chunkResults);
        }
      } else {
        const sequentialResults = await Promise.all(promises);
        results.push(...sequentialResults);
      }
    } else {
      // Run single backtest
      const result = await runBacktest(config.startTime, config.endTime);
      results.push({
        ...result,
        startTime: config.startTime || Date.now() - (24 * 60 * 60 * 1000),
        endTime: config.endTime || Date.now()
      });
    }

    // Analyze results
    const analysis = await analyzeResults(results);

    // Save detailed results if requested
    if (config.saveDetailedResults) {
      await prisma.backtestResult.createMany({
        data: results.map(result => ({
          ...result,
          configuration: JSON.stringify(config),
          timestamp: new Date(),
          startTime: new Date(result.startTime),
          endTime: new Date(result.endTime)
        }))
      });
    }

    // Log performance metrics
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const totalTime = seconds * 1000 + nanoseconds / 1000000;
    
    logPerformance('Complete backtest execution', totalTime, {
      totalRuns: results.length,
      averageRunTime: totalTime / results.length,
      config
    });

    return {
      results,
      analysis
    };

  } catch (error) {
    logError('Backtest execution failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      config
    });
    throw error;
  }
}

// Example usage
async function main() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const config: BacktestConfig = {
    timeRanges: [
      {
        name: 'Last 24 hours',
        start: now - dayMs,
        end: now
      },
      {
        name: 'Previous 24 hours',
        start: now - (2 * dayMs),
        end: now - dayMs
      },
      {
        name: 'Last week',
        start: now - (7 * dayMs),
        end: now
      }
    ],
    parallelRuns: 2,
    saveDetailedResults: true,
    analyzeScamDetection: true
  };

  try {
    const { results, analysis } = await runBacktestWithConfig(config);
    
    logInfo('Backtest completed successfully', {
      config,
      analysisResults: analysis
    });

    return { results, analysis };
  } catch (error) {
    logError('Failed to run backtest', {
      error: error instanceof Error ? error.message : 'Unknown error',
      config
    });
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { runBacktestWithConfig, BacktestConfig, BacktestOutput, AnalysisSummary, TimedBacktestResult };
