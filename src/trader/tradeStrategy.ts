import { upsertTrade, getOpenTrades, updateTrade } from "../db/trade.js";
import { SUI, SUPPORTED_DEX } from "../chain/config.js";
import { ParsedPoolData } from "../chain/extractor.js";
import wait from "../utils/wait.js";
import { sendBuyMessage, sendErrorMessage, sendSellMessage, sendUpdateMessage } from "../telegram/index.js";
import { sell as sellDirectCetus } from "./dex/cetus.js";
import { scamProbability } from "./checkscam.js";
import { sellWithAgg } from "./index.js";
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { logError, logInfo } from '../utils/logger.js';
import { checkPoolSecurity } from '../security/pool_security.js';
import { createCetusBuyTransaction, createCetusSellTransaction } from './dex/cetus.js';
import { createBlueMoveBuyTransaction, createBlueMoveSellTransaction } from './dex/bluemove.js';
// @ts-ignore: Keine Typdefinition für bn.js
import BN from 'bn.js';
import { LIVE_TRADING_CONFIG } from "../config/trading_config.js";

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 500;
const EMERGENCY_SELL_TIMEOUT = 10000;
const TRADE_CHECK_INTERVAL = 1000;
const HIGH_SCAM_PROBABILITY = 40;
const PROFIT_THRESHOLD = 150;
const TRAILING_STOP_DISTANCE = 30;
const POLL_INTERVAL = 500;
const TRANSACTION_TIMEOUT = 60000;

// Konstanten für Trading-Strategie
const DEFAULT_POSITION_SIZE = 0.02;
const MAX_POSITION_SIZE = 0.08;
const DEFAULT_TAKE_PROFIT = 2.0;
const DEFAULT_STOP_LOSS = 0.15;
const TRAILING_ACTIVATION = 0.5;
const TRAILING_DISTANCE = 0.3;

// State management
const tradesRunning = new Set<string>();
const stopLoss = new Map<string, number>();
const maxVariance = new Map<string, number>();
const tradeMetrics = new Map<string, {
  attempts: number;
  lastAttempt: number;
  errors: string[];
}>();

// Vereinheitlichter TradingInfo-Typ
export type TradingInfo = {
  initialSolAmount: string;
  currentAmount: string;
  tokenToSell: string;
  tokenOnWallet: string;
  poolAddress: string;
  dex: SUPPORTED_DEX;
  suiIsA: boolean;
  scamProbability: number;
  // Optionale Felder für Kompatibilität mit trading_strategy.ts
  initialSuiAmount?: string;
  tokenToTrade?: string;
  tokenAmount?: string;
  securityScore?: number;
}

// Interface für Positionskonfiguration
interface PositionConfig {
  size: number;
  takeProfit: number;
  stopLoss: number;
  trailingStop: boolean;
  trailingDistance: number;
  lastUpdate?: number;
}

// Exportiere TradeResult für Kompatibilität mit trade_controller.ts
export interface TradeResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  profit?: number;
  metrics?: {
    entryPrice: number;
    exitPrice: number;
    timeInTrade: number;
    slippage: number;
  };
  // Zusätzliche Felder für Kompatibilität mit trade_controller.ts
  profitPercentage?: number;
}

// Erweiterte LogMetadata-Schnittstelle für Kompatibilität mit calculateProfit
interface ExtendedLogMetadata {
  error?: string;
  buyTxId?: string;
  sellTxId?: string;
  [key: string]: any;
}

async function tryAgg(_coinIn: string, _coinOut: string, amount: string): Promise<string | null> {
  let retries = 0;
  let lastError: Error | null = null;

  while (retries < MAX_RETRIES) {
    try {
      const tx = await sellWithAgg(_coinIn, amount);
      if (tx) return tx;
    } catch (error) {
      lastError = error as Error;
      console.error(`Aggregator attempt ${retries + 1}/${MAX_RETRIES} failed:`, error);
      
      // Track error metrics
      const metrics = tradeMetrics.get(_coinIn) || { attempts: 0, lastAttempt: 0, errors: [] };
      metrics.attempts++;
      metrics.lastAttempt = Date.now();
      metrics.errors.push(lastError.message);
      tradeMetrics.set(_coinIn, metrics);
    }

    retries++;
    if (retries < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, retries - 1); // Exponential backoff
      console.log(`Retrying in ${delay}ms... (${retries}/${MAX_RETRIES})`);
      await wait(delay);
    }
  }

  if (lastError) {
    throw new Error(`Aggregator failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
  }

  return null;
}

export class TradingStrategy {
  private static instance: TradingStrategy;
  private keypair: Ed25519Keypair;
  private positions: Map<string, PositionConfig>;
  private highestPrices: Map<string, number>;
  private activeTrades: Map<string, any>;
  private tradingEnabled: boolean;

  private constructor() {
    this.keypair = new Ed25519Keypair();
    this.positions = new Map();
    this.highestPrices = new Map();
    this.activeTrades = new Map();
    this.tradingEnabled = true;
  }

  public static getInstance(): TradingStrategy {
    if (!TradingStrategy.instance) {
      TradingStrategy.instance = new TradingStrategy();
    }
    return TradingStrategy.instance;
  }

  public getActiveTrades(): Map<string, any> {
    return this.activeTrades;
  }

  public getTradeAnalysis(txId: string): any {
    const trade = this.activeTrades.get(txId);
    if (!trade) return null;

    return {
      volume24h: trade.volume24h || 0,
      uniqueBuyers: trade.uniqueBuyers || 0,
      buyPressure: trade.buyPressure || 0,
      liquidityHealth: trade.liquidityHealth || 0,
      priceStability: trade.priceStability || 0
    };
  }

  public async takeProfits(txId: string, profitType: any): Promise<boolean> {
    const trade = this.activeTrades.get(txId);
    if (!trade) return false;

    try {
      // Implementiere die Logik zum Verkaufen basierend auf profitType
      const tradingInfo: TradingInfo = {
        initialSolAmount: trade.initialSuiAmount || '0',
        currentAmount: trade.currentAmount || '0',
        tokenToSell: trade.tokenAddress,
        tokenOnWallet: trade.tokenAmount,
        poolAddress: trade.poolAddress,
        dex: trade.dex,
        suiIsA: trade.suiIsA,
        scamProbability: trade.scamProbability || 0,
        // Kompatibilitätsfelder
        initialSuiAmount: trade.initialSuiAmount || '0',
        tokenToTrade: trade.tokenAddress,
        tokenAmount: trade.tokenAmount
      };

      await sellAction(tradingInfo);
      this.activeTrades.delete(txId);
      return true;
    } catch (error) {
      logError('Fehler beim Profit-Taking', {
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        txId
      });
      return false;
    }
  }

  public async toggleAutoPilot(tradeId: string, status: boolean): Promise<void> {
    const trade = this.activeTrades.get(tradeId);
    if (trade) {
      trade.isAutoPilot = status;
      this.activeTrades.set(tradeId, trade);
    }
  }

  private calculatePositionSize(
    poolData: ParsedPoolData,
    securityScore: number
  ): number {
    // Basis-Position basierend auf Security Score
    let positionSize = DEFAULT_POSITION_SIZE * (securityScore / 100);

    // Liquiditäts-Anpassung
    const liquidityScore = this.calculateLiquidityScore(poolData);
    positionSize *= liquidityScore;

    // Maximale Position begrenzen
    return Math.min(positionSize, MAX_POSITION_SIZE);
  }

  private calculateLiquidityScore(poolData: ParsedPoolData): number {
    const totalLiquidity = Number(poolData.amountA) + Number(poolData.amountB);
    // Verbesserte logarithmische Skalierung mit Mindestliquidität
    const minLiquidity = 1000; // Mindestliquidität in Basiseinheiten
    
    if (totalLiquidity < minLiquidity) {
      return 0; // Zu geringe Liquidität, sofort ablehnen
    }
    
    // Logarithmische Skalierung mit Bonus für höhere Liquidität
    const baseScore = Math.min(1, Math.log10(totalLiquidity) / 10);
    
    // Zusätzliche Faktoren für die Bewertung
    const balanceFactor = Math.min(
      Number(poolData.amountA) / Number(poolData.amountB),
      Number(poolData.amountB) / Number(poolData.amountA)
    );
    
    // Kombinierte Bewertung: Liquidität + Balance
    return baseScore * (0.5 + 0.5 * balanceFactor);
  }

  private async updateTrailingStop(
    poolId: string,
    currentPrice: number
  ): Promise<boolean> {
    const position = this.positions.get(poolId);
    if (!position?.trailingStop) return false;

    const highestPrice = this.highestPrices.get(poolId) || currentPrice;
    
    // Aktualisiere höchsten Preis
    if (currentPrice > highestPrice) {
      this.highestPrices.set(poolId, currentPrice);
      return false;
    }

    // Prüfe Trailing-Stop
    const trailingStopPrice = highestPrice * (1 - position.trailingDistance);
    if (currentPrice < trailingStopPrice) {
      return true; // Trailing-Stop ausgelöst
    }

    return false;
  }

  public async executeBuyStrategy(
    poolData: ParsedPoolData & { tokenAddress: string },
    amount: number,
    slippage: number
  ): Promise<TradeResult> {
    try {
      // Sicherheitsprüfung
      const security = await checkPoolSecurity(poolData.poolId, poolData.dex);
      if (!security.isSecure) {
        return {
          success: false,
          error: `Pool nicht sicher: ${security.warnings.join(', ')}`
        };
      }

      // Position Sizing
      const positionSize = this.calculatePositionSize(poolData, security.score);
      const adjustedAmount = amount * positionSize;

      // Position konfigurieren
      const positionConfig: PositionConfig = {
        size: positionSize,
        takeProfit: DEFAULT_TAKE_PROFIT,
        stopLoss: DEFAULT_STOP_LOSS,
        trailingStop: true,
        trailingDistance: TRAILING_DISTANCE
      };
      this.positions.set(poolData.poolId, positionConfig);

      // Trading-Logik basierend auf DEX
      let transaction: Transaction;
      switch (poolData.dex) {
        case 'Cetus':
          transaction = await createCetusBuyTransaction(
            poolData.poolId,
            poolData.tokenAddress,
            adjustedAmount
          );
          break;
        case 'BlueMove':
          transaction = await createBlueMoveBuyTransaction(
            poolData.poolId,
            poolData.tokenAddress,
            adjustedAmount
          );
          break;
        default:
          throw new Error(`Nicht unterstützter DEX: ${poolData.dex}`);
      }

      // Transaktion ausführen
      const response = await this.executeTransaction(transaction);
      
      // Initialisiere höchsten Preis für Trailing-Stop
      this.highestPrices.set(poolData.poolId, adjustedAmount);

      return {
        success: true,
        transactionId: response.digest,
        metrics: {
          entryPrice: adjustedAmount,
          exitPrice: 0,
          timeInTrade: 0,
          slippage: 0
        }
      };

    } catch (error) {
      logError('Fehler bei der Ausführung der Kauf-Strategie', {
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        poolId: poolData.poolId
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
    }
  }

  private async executeTransaction(tx: Transaction): Promise<SuiTransactionBlockResponse> {
    try {
      const result = await SUI.client.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        requestType: 'WaitForLocalExecution',
        options: {
          showEffects: true,
          showEvents: true
        }
      });

      if (result.effects?.status.status !== 'success') {
        throw new Error(`Transaktion fehlgeschlagen: ${result.effects?.status.error || 'Unbekannter Fehler'}`);
      }

      return result;
    } catch (error) {
      logError('Fehler beim Ausführen der Transaktion', {
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
      throw error;
    }
  }

  // Zusätzliche Methoden aus TradeController
  public enableTrading(): void {
    this.tradingEnabled = true;
    logInfo('Trading enabled');
  }

  public disableTrading(): void {
    this.tradingEnabled = false;
    logInfo('Trading disabled');
  }

  public isTradingEnabled(): boolean {
    return this.tradingEnabled;
  }

  // Methode zur Berechnung des Gewinns zwischen Kauf- und Verkaufstransaktion
  public async calculateProfit(
    buyTxId: string,
    sellTxId: string
  ): Promise<{ profit: number; profitPercentage: number }> {
    try {
      const buyTx = await SUI.client.getTransactionBlock({
        digest: buyTxId,
        options: { showBalanceChanges: true }
      });

      const sellTx = await SUI.client.getTransactionBlock({
        digest: sellTxId,
        options: { showBalanceChanges: true }
      });

      // Extrahiere SUI-Beträge aus den Transaktionen
      const buyChanges = buyTx.balanceChanges || [];
      const sellChanges = sellTx.balanceChanges || [];

      const suiBuy = buyChanges.find((change: any) => 
        change.coinType.endsWith('::sui::SUI') && BigInt(change.amount) < 0
      );

      const suiSell = sellChanges.find((change: any) => 
        change.coinType.endsWith('::sui::SUI') && BigInt(change.amount) > 0
      );

      if (!suiBuy || !suiSell) {
        throw new Error('Could not find SUI balance changes');
      }

      const buyAmount = Math.abs(Number(suiBuy.amount));
      const sellAmount = Math.abs(Number(suiSell.amount));
      
      const profit = sellAmount - buyAmount;
      const profitPercentage = (profit / buyAmount) * 100;

      return { profit, profitPercentage };
    } catch (error) {
      logError('Error calculating profit', {
        error: error instanceof Error ? error.message : 'Unknown error',
        buyTxId,
        sellTxId
      } as ExtendedLogMetadata);
      
      throw error;
    }
  }
}

export async function buyAction(digest: string, info: ParsedPoolData | null) {
  const { client } = SUI;

  try {
    const trade = await client.getTransactionBlock({
      digest,
      options: { showBalanceChanges: true }
    });

    const { balanceChanges } = trade;
    if (!balanceChanges?.length) return null;

    const suiBalance = balanceChanges.find((b: any) => b.coinType.endsWith("::SUI"));
    const tokenBalance = balanceChanges.find((b: any) => !b.coinType.endsWith("::SUI"));

    if (!suiBalance || !tokenBalance) {
      throw new Error('Missing balance changes');
    }

    const scamChance = await scamProbability(info!);

    // Stelle sicher, dass poolAddress nicht undefined ist
    if (!info?.poolId) {
      throw new Error('Pool ID is missing');
    }

    const tradeData = {
      tokenAddress: tokenBalance.coinType,
      tokenAmount: tokenBalance.amount,
      buyDigest: digest,
      suiSpentAmount: Math.abs(Number(suiBalance.amount)).toString(),
      dex: info?.dex || 'Cetus',
      poolAddress: info.poolId, // Jetzt garantiert nicht undefined
      amountA: info?.amountA,
      amountB: info?.amountB,
      suiIsA: info?.coinA.endsWith("::SUI") === true,
      scamProbability: scamChance
    };

    await upsertTrade(tradeData);

    const tradingInfo: TradingInfo = {
      initialSolAmount: '0',
      currentAmount: '0',
      tokenToSell: tokenBalance.coinType,
      tokenOnWallet: tokenBalance.amount,
      poolAddress: info.poolId, // Jetzt garantiert nicht undefined
      dex: info?.dex || 'Cetus',
      suiIsA: info?.coinA.endsWith("::sui::SUI") === true,
      scamProbability: scamChance
    };

    sendBuyMessage({
      ...tradeData,
      sellAction: () => sellAction(tradingInfo)
    });

  } catch (e) {
    console.error("Error in buyAction:", e);
    await wait(1000);
    return buyAction(digest, info);
  }
}

export async function sellAction(tradingInfo: TradingInfo): Promise<void> {
  let tx: string = '';

  console.log("SELL ACTION::", tradingInfo);

  try {
    switch (tradingInfo.dex) {
      case 'Cetus':
        const cetusTxResult = await sellDirectCetus(tradingInfo);
        tx = typeof cetusTxResult === 'string' ? cetusTxResult : '';
        break;

      case 'BlueMove':
        const bluemoveTxResult = await tryAgg(tradingInfo.tokenToSell, "0x2::sui::SUI", tradingInfo.tokenOnWallet);
        tx = bluemoveTxResult || '';
        break;

      default:
        console.log("Unsupported DEX");
        return;
    }

    if (!tx) {
      throw new Error('Sell transaction failed to execute');
    }

    const trade = await SUI.client.waitForTransaction({
      digest: tx,
      options: { showBalanceChanges: true },
      pollInterval: POLL_INTERVAL,
      timeout: TRANSACTION_TIMEOUT
    });

    const { balanceChanges } = trade;
    if (!balanceChanges?.length) {
      throw new Error('No balance changes in sell transaction');
    }

    const suiBalance = balanceChanges.find((b: any) => b.coinType.endsWith("::sui::SUI"));
    if (!suiBalance) {
      throw new Error('SUI balance change not found');
    }

    await updateTrade({
      poolAddress: tradingInfo.poolAddress,
      sellDigest: tx,
      suiReceivedAmount: Math.abs(Number(suiBalance.amount)).toString(),
    });

    await sendSellMessage(tx, tradingInfo.poolAddress);

  } catch (e) {
    console.error("Error in sellAction:", e);
    sendErrorMessage({ 
      message: `Sell failed for ${tradingInfo.tokenToSell}: ${e instanceof Error ? e.message : 'Unknown error'}`
    });
    throw e; // Re-throw to be handled by caller
  }
}

async function recoverPoolData(trade: any): Promise<TradingInfo | null> {
  const { client } = SUI;

  try {
    const response = await client.getObject({
      id: trade.poolAddress,
      options: { showContent: true }
    });

    if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
      throw new Error('Invalid pool data structure');
    }

    const fields = (response.data.content as { fields: Record<string, any> }).fields;
    if (!fields) {
      throw new Error('Pool data fields not found');
    }

    switch (trade.dex) {
      case 'Cetus':
        return {
          initialSolAmount: trade.suiIsA ? trade.initialPoolAmountA : trade.initialPoolAmountB,
          currentAmount: trade.suiIsA ? fields.coin_a : fields.coin_b,
          tokenToSell: trade.tokenAddress,
          tokenOnWallet: trade.tokenAmount,
          poolAddress: trade.poolAddress,
          suiIsA: trade.suiIsA,
          dex: trade.dex,
          scamProbability: trade.scamProbability
        };

      case 'BlueMove':
        return {
          initialSolAmount: trade.suiIsA ? trade.initialPoolAmountA : trade.initialPoolAmountB,
          currentAmount: trade.suiIsA ? fields.reserve_x : fields.reserve_y,
          tokenToSell: trade.tokenAddress,
          tokenOnWallet: trade.tokenAmount,
          poolAddress: trade.poolAddress,
          suiIsA: trade.suiIsA,
          dex: trade.dex,
          scamProbability: trade.scamProbability
        };

      default:
        throw new Error(`Unsupported DEX: ${trade.dex}`);
    }
  } catch (e) {
    console.error("Error recovering pool data:", e);
    return null;
  }
}

export async function runTrade(): Promise<never> {
  console.log("Running trade monitor");

  while (true) {
    try {
      const openTrades = await getOpenTrades();

      if (openTrades.length > 0) {
        await Promise.all(openTrades.map(async (trade: any) => {
          const info = await recoverPoolData(trade);
          if (info) {
            await performTrade(info);
          }
        }));
      }
    } catch (e) {
      console.error("Error in trade monitor:", e);
    }

    await wait(TRADE_CHECK_INTERVAL);
  }
}

async function performTrade(info: TradingInfo): Promise<void> {
  if (tradesRunning.has(info.tokenToSell)) {
    console.log(`Trade already running for ${info.tokenToSell}`);
    return;
  }

  tradesRunning.add(info.tokenToSell);

  try {
    console.log("PERFORM TRADE::", info);
    
    const currentAmount = Number(info.currentAmount);
    const initialAmount = Number(info.initialSolAmount);
    
    // Schneller Ausstieg bei ungültigen Werten
    if (isNaN(currentAmount) || isNaN(initialAmount) || initialAmount <= 0) {
      console.error(`Ungültige Beträge für ${info.tokenToSell}: current=${currentAmount}, initial=${initialAmount}`);
      return;
    }
    
    const variation = ((currentAmount - initialAmount) / initialAmount) * 100;
    
    const max = maxVariance.get(info.tokenToSell) || -1;
    const stop = stopLoss.get(info.tokenToSell) || -10;

    // Prioritätsbasierte Entscheidungsfindung
    // 1. Hohe Scam-Wahrscheinlichkeit - Sofortiger Verkauf
    if (info.scamProbability > HIGH_SCAM_PROBABILITY) {
      console.log(`Hohe Scam-Wahrscheinlichkeit (${info.scamProbability}%) erkannt für ${info.tokenToSell}`);
      try {
        await Promise.race([
          sellAction(info),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Emergency sell timeout')), EMERGENCY_SELL_TIMEOUT))
        ]);
      } catch (e) {
        console.error('Notverkauf fehlgeschlagen:', e);
        sendErrorMessage({ 
          message: `Scam erkannt (${info.scamProbability}%), Notverkauf fehlgeschlagen: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`
        });
      }
      return;
    }

    // 2. Gewinnmitnahme bei Erreichen des Profit-Thresholds
    if (variation > PROFIT_THRESHOLD) {
      console.log(`Gewinnmitnahme für ${info.tokenToSell} - Variation: ${variation.toFixed(2)}%, Ziel: ${PROFIT_THRESHOLD}%`);
      try {
        await sellAction(info);
        return;
      } catch (e) {
        console.error('Verkauf fehlgeschlagen:', e);
        sendErrorMessage({ 
          message: `Verkauf fehlgeschlagen für ${info.tokenToSell}: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`
        });
        return;
      }
    }

    // 3. Stop-Loss ausgelöst
    if (variation < stop) {
      console.log(`Stop-Loss ausgelöst für ${info.tokenToSell} - Variation: ${variation.toFixed(2)}%, Stop: ${stop.toFixed(2)}%`);
      try {
        await sellAction(info);
        return;
      } catch (e) {
        console.error('Stop-Loss Verkauf fehlgeschlagen:', e);
        sendErrorMessage({ 
          message: `Stop-Loss Verkauf fehlgeschlagen für ${info.tokenToSell}: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`
        });
        return;
      }
    }

    // 4. Trailing-Stop aktualisieren bei neuem Höchststand
    if (variation > max) {
      maxVariance.set(info.tokenToSell, variation);
      if (variation > TRAILING_STOP_DISTANCE) {
        const newStop = variation - TRAILING_STOP_DISTANCE;
        stopLoss.set(info.tokenToSell, newStop);
        console.log(`Trailing-Stop aktualisiert auf ${newStop.toFixed(2)}% für ${info.tokenToSell}`);
      }
    }

    // Status-Update senden
    sendUpdateMessage({
      tokenAddress: info.tokenToSell,
      variacao: variation,
      max,
      stop
    });
    
  } catch (e) {
    console.error('Trade-Ausführungsfehler:', e);
    sendErrorMessage({ 
      message: `Trade-Fehler für ${info.tokenToSell}: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`
    });
  } finally {
    tradesRunning.delete(info.tokenToSell);
  }
}

// Exportiere eine Singleton-Instanz
export const tradingStrategy = TradingStrategy.getInstance();
