import { SuiClient, SuiEvent, EventId } from "@mysten/sui/client";
import { SUI } from "../chain/config.js";
import { logError, logInfo, logPerformance } from "../utils/logger.js";
import { getTransactionInfo } from "../chain/extractor.js";
import { scamProbability } from "../trader/checkscam.js";
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto';
import pLimit from 'p-limit';

// Konfigurationskonstanten
const BATCH_SIZE = 10;
const CONCURRENT_REQUESTS = 3;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;
const limit = pLimit(CONCURRENT_REQUESTS);

// Cache für Transaktionen und Scam-Checks
const transactionCache = new Map<string, any>();
const scamCheckCache = new Map<string, boolean>();

// Hilfsfunktion für Verzögerung
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry-Funktion mit exponentieller Verzögerung
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  attempts: number = RETRY_ATTEMPTS,
  initialDelay: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt === attempts) break;
      
      const delayTime = initialDelay * Math.pow(2, attempt - 1);
      await delay(delayTime);
    }
  }
  
  throw lastError;
}

// Typdefinitionen
interface GasInfo {
  computationCost: string;
  storageCost: string;
  storageRebate: string;
}

type ExtendedSuiEvent = SuiEvent & {
  gasUsed?: GasInfo;
};

// Umbenennen des Interface zu IBacktestResult um Namenskonflikte zu vermeiden
export interface IBacktestResult {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
  averageProfit: number;
  maxDrawdown: number;
  winRate: number;
  averageExecutionTime: number;
  scamDetectionAccuracy: number;
  gasUsed: number;
}

// Prisma Model Type
type PrismaBacktestResult = {
  id: string;
  timestamp: Date;
  startTime: Date;
  endTime: Date;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
  averageProfit: number;
  maxDrawdown: number;
  winRate: number;
  averageExecutionTime: number;
  scamDetectionAccuracy: number;
  gasUsed: number;
  profitFactor: number | null;
  sharpeRatio: number | null;
  maxConsecutiveLosses: number | null;
  maxConsecutiveWins: number | null;
  averageWinSize: number | null;
  averageLossSize: number | null;
  largestWin: number | null;
  largestLoss: number | null;
  averageLatency: number | null;
  maxLatency: number | null;
  minLatency: number | null;
  truePositives: number | null;
  falsePositives: number | null;
  trueNegatives: number | null;
  falseNegatives: number | null;
  cpuUsage: number | null;
  memoryUsage: number | null;
  networkRequests: number | null;
  configuration: string | null;
  notes: string | null;
};

// Prisma Client als globale Variable initialisieren
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

interface TradeMetrics {
  profit: number;
  executionTime: number;
  gasUsed: number;
  scamDetected: boolean;
  wasActuallyScam: boolean;
  timestamp: number;
  txPosition: number; // Position in der LP-Sequenz
  totalLatency: number; // Gesamtlatenz inkl. Netzwerk
}

class Backtester {
  private client: SuiClient;
  private results: IBacktestResult;
  private trades: Map<string, TradeMetrics>;
  private startTime: number = 0;
  private endTime: number = 0;

  constructor(startTime?: number, endTime?: number) {
    this.client = SUI.client;
    this.trades = new Map();
    this.results = {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfit: 0,
      averageProfit: 0,
      maxDrawdown: 0,
      winRate: 0,
      averageExecutionTime: 0,
      scamDetectionAccuracy: 0,
      gasUsed: 0
    };
  }

  async initialize(startTime?: number, endTime?: number) {
    if (startTime && endTime) {
      this.startTime = startTime;
      this.endTime = endTime;
    } else {
      // Default to last 24 hours if no time range provided
      this.endTime = Date.now();
      this.startTime = this.endTime - (24 * 60 * 60 * 1000);
    }
    await this.loadHistoricalData();
  }

  private async loadHistoricalData() {
    try {
      // Load historical pool creation events
      const blueMoveEvents = await this.loadDEXEvents("BlueMove");
      const cetusEvents = await this.loadDEXEvents("Cetus");

      logInfo('Historical data loaded', {
        blueMoveEvents: blueMoveEvents.length,
        cetusEvents: cetusEvents.length,
        timeRange: {
          start: new Date(this.startTime).toISOString(),
          end: new Date(this.endTime).toISOString()
        }
      });

      // Process events
      await this.processEvents([...blueMoveEvents, ...cetusEvents]);
    } catch (error) {
      logError('Failed to load historical data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timeRange: {
          start: new Date(this.startTime).toISOString(),
          end: new Date(this.endTime).toISOString()
        }
      });
    }
  }

  private async loadDEXEvents(dex: string): Promise<ExtendedSuiEvent[]> {
    const events: ExtendedSuiEvent[] = [];
    let cursor: EventId | null = null;
    let hasMore = true;
    const batchPromises: Promise<void>[] = [];

    const filter = dex === "BlueMove" 
      ? { MoveEventType: "0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Created_Pool_Event" }
      : { MoveEventType: "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::factory::CreatePoolEvent" };

    while (hasMore) {
      try {
        const promise = limit(async () => {
          const response = await retryWithBackoff(async () => {
            await delay(Math.random() * 1000);
            return await this.client.queryEvents({
              query: filter,
              cursor,
              order: 'ascending'
            });
          });

          const filteredEvents = response.data.filter(event => {
            const timestamp = Number(event.timestampMs);
            return timestamp >= this.startTime && timestamp <= this.endTime;
          });

          events.push(...filteredEvents as ExtendedSuiEvent[]);
          
          cursor = response.nextCursor || null;
          hasMore = response.hasNextPage && cursor !== null;
        });

        batchPromises.push(promise);

        if (batchPromises.length >= CONCURRENT_REQUESTS) {
          await Promise.all(batchPromises);
          batchPromises.length = 0;
          await delay(1000);
        }

      } catch (error) {
        logError(`Failed to load ${dex} events`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          cursor
        });
        
        await delay(5000);
        continue;
      }
    }

    if (batchPromises.length > 0) {
      await Promise.all(batchPromises);
    }

    return events;
  }

  private async processEvents(events: ExtendedSuiEvent[]) {
    const batches = [];
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      batches.push(events.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      // Parallele Vorverarbeitung der Events
      const preprocessPromises = batch.map(event => ({
        txDigest: event.id.txDigest,
        dex: event.type.includes("BlueMove") ? "BlueMove" : "Cetus",
        timestamp: Number(event.timestampMs)
      }));

      const preprocessed = await Promise.all(preprocessPromises);
      
      // Sortiere Events nach Timestamp für LP-Position-Tracking
      const sortedEvents = preprocessed.sort((a, b) => a.timestamp - b.timestamp);
      
      const promises = sortedEvents.map((eventInfo, index) => limit(async () => {
        const startTime = performance.now();
        const networkStartTime = Date.now();
        
        try {
          const { txDigest, dex } = eventInfo;
          
          // Optimierter Cache-Zugriff mit Promise.all
          const [cachedTx, cachedScam] = await Promise.all([
            transactionCache.get(txDigest),
            scamCheckCache.get(txDigest)
          ]);
          
          let transactionInfo = cachedTx;
          if (!transactionInfo) {
            transactionInfo = await retryWithBackoff(async () => {
              return await getTransactionInfo(txDigest, dex);
            });
            if (transactionInfo) {
              transactionCache.set(txDigest, transactionInfo);
            }
          }
          
          if (!transactionInfo) return;

          let isScam = cachedScam;
          let scamScore: number;
          
          if (isScam === undefined) {
            [scamScore, isScam] = await Promise.all([
              retryWithBackoff(async () => await scamProbability(transactionInfo)),
              retryWithBackoff(async () => await this.verifyIfWasScam(txDigest))
            ]);
            scamCheckCache.set(txDigest, isScam);
          } else {
            scamScore = isScam ? 100 : 0;
          }

          const executionTime = performance.now() - startTime;
          const totalLatency = Date.now() - networkStartTime;

          // Find original event for gas calculation
          const originalEvent = batch.find(e => e.id.txDigest === txDigest);
          if (!originalEvent) return;

          // Store trade metrics with position tracking
          this.trades.set(txDigest, {
            profit: this.calculateProfit(transactionInfo),
            executionTime,
            gasUsed: this.calculateGasUsed(originalEvent),
            scamDetected: scamScore > 50,
            wasActuallyScam: isScam || false,
            timestamp: eventInfo.timestamp,
            txPosition: index + 1,
            totalLatency
          });

        } catch (error) {
          logError('Failed to process event', {
            error: error instanceof Error ? error.message : 'Unknown error',
            txDigest: eventInfo.txDigest,
            executionTime: performance.now() - startTime
          });
        }
      }));

      await Promise.all(promises);
      
      // Analysiere Transaktionspositionen
      const positionStats = Array.from(this.trades.values()).reduce((acc, trade) => {
        if (trade.txPosition <= 5) {
          acc.topFiveCount++;
          acc.topFiveProfit += trade.profit;
          acc.topFiveLatency += trade.totalLatency;
        }
        return acc;
      }, { topFiveCount: 0, topFiveProfit: 0, topFiveLatency: 0 });

      logInfo('Position Statistics', {
        totalTrades: this.trades.size,
        inTopFive: positionStats.topFiveCount,
        topFiveSuccessRate: (positionStats.topFiveCount / this.trades.size) * 100,
        averageTopFiveProfit: positionStats.topFiveCount > 0 ? 
          positionStats.topFiveProfit / positionStats.topFiveCount : 0,
        averageTopFiveLatency: positionStats.topFiveCount > 0 ? 
          positionStats.topFiveLatency / positionStats.topFiveCount : 0
      });

      await delay(500); // Reduzierte Verzögerung zwischen Batches
      
      // Zwischenergebnisse berechnen und speichern
      await this.calculateResults();

      // Optimierte Cache-Bereinigung
      if (transactionCache.size > 1000) {
        const oldestKeys = Array.from(transactionCache.keys())
          .sort((a, b) => {
            const timeA = this.trades.get(a)?.timestamp || 0;
            const timeB = this.trades.get(b)?.timestamp || 0;
            return timeA - timeB;
          })
          .slice(0, 500);
        oldestKeys.forEach(key => transactionCache.delete(key));
      }
    }
  }

  private calculateProfit(transactionInfo: any): number {
    try {
        const { inputAmount, outputAmount } = transactionInfo;
        const rawProfit = (outputAmount - inputAmount) / inputAmount * 100;
        
        // Risikoangepasste Rendite
        const riskAdjustment = this.calculateRiskAdjustment(transactionInfo);
        const adjustedProfit = rawProfit * riskAdjustment;
        
        // Berücksichtigung von Handelskosten
        const tradingCosts = this.calculateTradingCosts(inputAmount);
        
        return adjustedProfit - tradingCosts;
    } catch (error) {
        logError('Failed to calculate profit', {
            error: error instanceof Error ? error.message : 'Unknown error',
            transactionInfo
        });
        return 0;
    }
  }

  private calculateRiskAdjustment(transactionInfo: any): number {
    // Basis-Risikofaktor
    let riskFactor = 1.0;

    // Liquiditätsbasierte Anpassung
    const liquidityFactor = Math.min(1.0, transactionInfo.inputAmount / 10000); // Normalisiert auf 10k
    riskFactor *= (0.5 + 0.5 * liquidityFactor);

    // Volatilitätsbasierte Anpassung (simuliert)
    const volatility = Math.random() * 0.5 + 0.5; // 50-100% Volatilität
    riskFactor *= (1 - volatility * 0.2); // Max 20% Reduktion basierend auf Volatilität

    // Zeitbasierte Anpassung
    const poolAge = Date.now() - (transactionInfo.timestamp || Date.now());
    const ageFactor = Math.min(1.0, poolAge / (24 * 60 * 60 * 1000)); // Normalisiert auf 24h
    riskFactor *= (0.7 + 0.3 * ageFactor);

    return Math.max(0.1, Math.min(1.0, riskFactor));
  }

  private calculateTradingCosts(amount: number): number {
    // Basiskosten (Gas, Slippage, etc.)
    const baseCosts = 0.3; // 0.3%
    
    // Größenabhängige Kosten
    const sizeCosts = Math.max(0, 0.2 * (1 - Math.min(1.0, amount / 10000))); // Max 0.2% für kleine Trades
    
    // Marktimpact (simuliert)
    const impactCosts = 0.1 * Math.pow(amount / 10000, 2); // Quadratischer Marktimpact
    
    return baseCosts + sizeCosts + impactCosts;
  }

  private calculateGasUsed(event: ExtendedSuiEvent): number {
    try {
        if (!event.gasUsed) return 0;
        
        return Number(event.gasUsed.computationCost || 0) +
               Number(event.gasUsed.storageCost || 0) -
               Number(event.gasUsed.storageRebate || 0);
    } catch (error) {
        logError('Failed to calculate gas used', {
            error: error instanceof Error ? error.message : 'Unknown error',
            event
        });
        return 0;
    }
  }

  private async verifyIfWasScam(txDigest: string): Promise<boolean> {
    // Implement verification logic to determine if a token was actually a scam
    // This could involve checking if the token was later blacklisted, 
    // if liquidity was removed, or if there were suspicious transactions
    return false; // Placeholder
  }

  private async calculateResults() {
    let totalProfit = 0;
    let totalExecutionTime = 0;
    let totalGasUsed = 0;
    let correctScamDetections = 0;
    let balance = 0;
    let maxDrawdown = 0;
    let peakBalance = 0;
    let currentDrawdown = 0;

    // Sortiere Trades nach Zeitstempel
    const sortedTrades = Array.from(this.trades.entries()).sort((a, b) => {
      const timestampA = new Date(a[1].timestamp || 0).getTime();
      const timestampB = new Date(b[1].timestamp || 0).getTime();
      return timestampA - timestampB;
    });

    // Tracking für zusätzliche Metriken
    let consecutiveLosses = 0;
    let consecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let maxConsecutiveWins = 0;
    let totalWinAmount = 0;
    let totalLossAmount = 0;
    let largestWin = 0;
    let largestLoss = 0;
    let winCount = 0;
    let lossCount = 0;

    // Tracking für Scam-Metriken
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;

    for (const [_, metrics] of sortedTrades) {
      // Profit und Performance Metriken
      totalProfit += metrics.profit;
      totalExecutionTime += metrics.executionTime;
      totalGasUsed += metrics.gasUsed;

      // Balance und Drawdown Berechnung
      balance += metrics.profit;
      if (balance > peakBalance) {
        peakBalance = balance;
        currentDrawdown = 0;
      } else {
        currentDrawdown = ((peakBalance - balance) / peakBalance) * 100;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }

      // Consecutive Trades Tracking
      if (metrics.profit > 0) {
        winCount++;
        totalWinAmount += metrics.profit;
        largestWin = Math.max(largestWin, metrics.profit);
        consecutiveWins++;
        consecutiveLosses = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins);
      } else {
        lossCount++;
        totalLossAmount += Math.abs(metrics.profit);
        largestLoss = Math.min(largestLoss, metrics.profit);
        consecutiveLosses++;
        consecutiveWins = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
      }

      // Scam Detection Metriken
      if (metrics.scamDetected && metrics.wasActuallyScam) {
        truePositives++;
      } else if (metrics.scamDetected && !metrics.wasActuallyScam) {
        falsePositives++;
      } else if (!metrics.scamDetected && !metrics.wasActuallyScam) {
        trueNegatives++;
      } else {
        falseNegatives++;
      }
    }

    const totalTrades = this.trades.size;
    const successfulTrades = winCount;
    const averageWinSize = winCount > 0 ? totalWinAmount / winCount : 0;
    const averageLossSize = lossCount > 0 ? totalLossAmount / lossCount : 0;
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount;

    // Sharpe Ratio Berechnung (vereinfacht)
    const returns = Array.from(this.trades.values()).map(t => t.profit);
    const averageReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((a, b) => a + Math.pow(b - averageReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev !== 0 ? averageReturn / stdDev : 0;

    this.results = {
      totalTrades,
      successfulTrades,
      failedTrades: totalTrades - successfulTrades,
      totalProfit,
      averageProfit: totalProfit / totalTrades,
      maxDrawdown,
      winRate: (successfulTrades / totalTrades) * 100,
      averageExecutionTime: totalExecutionTime / totalTrades,
      scamDetectionAccuracy: (correctScamDetections / totalTrades) * 100,
      gasUsed: totalGasUsed
    };

    // Speichern der erweiterten Metriken
    const resultData: Omit<PrismaBacktestResult, 'id'> = {
      timestamp: new Date(),
      startTime: new Date(this.startTime),
      endTime: new Date(this.endTime),
      totalTrades: this.results.totalTrades,
      successfulTrades: this.results.successfulTrades,
      failedTrades: this.results.failedTrades,
      totalProfit: this.results.totalProfit,
      averageProfit: this.results.averageProfit,
      maxDrawdown: this.results.maxDrawdown,
      winRate: this.results.winRate,
      averageExecutionTime: this.results.averageExecutionTime,
      scamDetectionAccuracy: this.results.scamDetectionAccuracy,
      gasUsed: this.results.gasUsed,
      profitFactor,
      sharpeRatio,
      maxConsecutiveLosses,
      maxConsecutiveWins,
      averageWinSize,
      averageLossSize,
      largestWin,
      largestLoss,
      averageLatency: totalExecutionTime / totalTrades,
      maxLatency: Math.max(...Array.from(this.trades.values()).map(t => t.executionTime)),
      minLatency: Math.min(...Array.from(this.trades.values()).map(t => t.executionTime)),
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      cpuUsage: process.cpuUsage().user / 1000000,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      networkRequests: totalTrades * 2, // Schätzung: 2 Requests pro Trade
      configuration: JSON.stringify({
        batchSize: BATCH_SIZE,
        concurrentRequests: CONCURRENT_REQUESTS,
        retryAttempts: RETRY_ATTEMPTS,
        retryDelay: RETRY_DELAY
      }),
      notes: `Backtest durchgeführt mit optimierter Profit- und Risikoberechnung. 
              Scam-Erkennung: TP=${truePositives}, FP=${falsePositives}, 
              TN=${trueNegatives}, FN=${falseNegatives}`
    };

    await prisma.backtestResult.create({
      data: resultData
    });

    logInfo('Backtest results saved', {
      id: crypto.randomUUID(),
      metrics: {
        profitFactor,
        sharpeRatio,
        maxConsecutiveLosses,
        maxConsecutiveWins,
        averageWinSize,
        averageLossSize,
        scamDetection: {
          truePositives,
          falsePositives,
          trueNegatives,
          falseNegatives
        }
      }
    });
  }

  getResults(): IBacktestResult & { startTime: number; endTime: number } {
    return {
      ...this.results,
      startTime: this.startTime,
      endTime: this.endTime
    };
  }
}

export async function runBacktest(startTime?: number, endTime?: number): Promise<IBacktestResult & { startTime: number; endTime: number }> {
  const backtester = new Backtester(startTime, endTime);
  await backtester.initialize();
  return backtester.getResults();
}
