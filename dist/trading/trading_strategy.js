import { SUI } from '../chain/config.js';
import { logError, logInfo } from '../utils/logger.js';
import { checkPoolSecurity } from '../security/pool_security.js';
import { createCetusBuyTransaction, sell as sellDirectCetus } from '../trader/dex/cetus.js';
import { createBlueMoveBuyTransaction } from '../trader/dex/bluemove.js';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { upsertTrade, getOpenTrades, updateTrade } from "../db/trade.js";
import wait from "../utils/wait.js";
import { sendBuyMessage, sendErrorMessage, sendSellMessage } from "../telegram/index.js";
import { scamProbability } from "../trader/checkscam.js";
import { sellWithAgg } from "../trader/index.js";
// Konstanten
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 Sekunde
const EMERGENCY_SELL_TIMEOUT = 20000; // 20 Sekunden
const TRADE_CHECK_INTERVAL = 2000; // 2 Sekunden
const HIGH_SCAM_PROBABILITY = 50;
const PROFIT_THRESHOLD = 200; // Erhöht von 1% auf 200%
const TRAILING_STOP_DISTANCE = 50; // Erhöht von 10% auf 50% für volatile Märkte
const POLL_INTERVAL = 1000;
const TRANSACTION_TIMEOUT = 100000;
// Konstanten für Trading-Strategie
const DEFAULT_POSITION_SIZE = 0.01; // 1% des verfügbaren Kapitals
const MAX_POSITION_SIZE = 0.05; // 5% des verfügbaren Kapitals
const DEFAULT_TAKE_PROFIT = 2.5; // 250% Take-Profit
const DEFAULT_STOP_LOSS = 0.2; // 20% Stop-Loss
const TRAILING_ACTIVATION = 1.0; // Aktivierung bei 100% Gewinn
const TRAILING_DISTANCE = 0.5; // 50% Trailing-Stop Distanz
// Zustandsverwaltung
const tradesRunning = new Set();
const stopLoss = new Map();
const maxVariance = new Map();
const tradeMetrics = new Map();
async function tryAgg(coinIn, coinOut, amount) {
    let retries = 0;
    let lastError = null;
    while (retries < MAX_RETRIES) {
        try {
            const tx = await sellWithAgg(coinIn, amount);
            if (tx)
                return tx;
        }
        catch (error) {
            lastError = error;
            console.error(`Aggregator attempt ${retries + 1}/${MAX_RETRIES} failed:`, error);
            // Track error metrics
            const metrics = tradeMetrics.get(coinIn) || { attempts: 0, lastAttempt: 0, errors: [] };
            metrics.attempts++;
            metrics.lastAttempt = Date.now();
            metrics.errors.push(lastError.message);
            tradeMetrics.set(coinIn, metrics);
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
    return '';
}
export class TradingStrategy {
    static instance;
    keypair;
    positions;
    highestPrices;
    activeTrades;
    constructor() {
        this.keypair = new Ed25519Keypair();
        this.positions = new Map();
        this.highestPrices = new Map();
        this.activeTrades = new Map();
    }
    static getInstance() {
        if (!TradingStrategy.instance) {
            TradingStrategy.instance = new TradingStrategy();
        }
        return TradingStrategy.instance;
    }
    getActiveTrades() {
        return this.activeTrades;
    }
    getTradeAnalysis(txId) {
        const trade = this.activeTrades.get(txId);
        if (!trade)
            return null;
        return {
            volume24h: trade.volume24h || 0,
            uniqueBuyers: trade.uniqueBuyers || 0,
            buyPressure: trade.buyPressure || 0,
            liquidityHealth: trade.liquidityHealth || 0,
            priceStability: trade.priceStability || 0
        };
    }
    async takeProfits(txId, profitType) {
        const trade = this.activeTrades.get(txId);
        if (!trade)
            return false;
        try {
            // Implementiere die Logik zum Verkaufen basierend auf profitType
            const tradingInfo = {
                initialSuiAmount: trade.initialSuiAmount || '0',
                currentAmount: trade.currentAmount || '0',
                tokenToTrade: trade.tokenAddress,
                tokenAmount: trade.tokenAmount,
                tokenOnWallet: trade.tokenAmount,
                poolAddress: trade.poolAddress,
                dex: trade.dex,
                suiIsA: trade.suiIsA,
                scamProbability: trade.scamProbability || 0
            };
            await this.sellAction(tradingInfo);
            this.activeTrades.delete(txId);
            return true;
        }
        catch (error) {
            logError('Fehler beim Profit-Taking', {
                error: error instanceof Error ? error.message : 'Unbekannter Fehler',
                txId
            });
            return false;
        }
    }
    async toggleAutoPilot(tradeId, status) {
        const trade = this.activeTrades.get(tradeId);
        if (trade) {
            trade.isAutoPilot = status;
            this.activeTrades.set(tradeId, trade);
        }
    }
    calculatePositionSize(poolData, securityScore) {
        // Basis-Position basierend auf Security Score
        let positionSize = DEFAULT_POSITION_SIZE * (securityScore / 100);
        // Liquiditäts-Anpassung
        const liquidityScore = this.calculateLiquidityScore(poolData);
        positionSize *= liquidityScore;
        // Maximale Position begrenzen
        return Math.min(positionSize, MAX_POSITION_SIZE);
    }
    calculateLiquidityScore(poolData) {
        const totalLiquidity = Number(poolData.amountA) + Number(poolData.amountB);
        // Logarithmische Skalierung der Liquidität
        return Math.min(1, Math.log10(totalLiquidity) / 10);
    }
    async updateTrailingStop(poolId, currentPrice) {
        const position = this.positions.get(poolId);
        if (!position?.trailingStop)
            return false;
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
    updateTradeMetrics(poolId, success, error) {
        const metrics = tradeMetrics.get(poolId) || { attempts: 0, lastAttempt: 0, errors: [] };
        metrics.attempts++;
        metrics.lastAttempt = Date.now();
        if (!success && error) {
            metrics.errors.push(error.message);
        }
        tradeMetrics.set(poolId, metrics);
    }
    async executeBuyStrategy(poolData, amount, slippage) {
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
            const positionConfig = {
                size: positionSize,
                takeProfit: DEFAULT_TAKE_PROFIT,
                stopLoss: DEFAULT_STOP_LOSS,
                trailingStop: true,
                trailingDistance: TRAILING_DISTANCE
            };
            this.positions.set(poolData.poolId, positionConfig);
            // Trading-Logik basierend auf DEX
            let transaction;
            switch (poolData.dex) {
                case 'Cetus':
                    transaction = await createCetusBuyTransaction(poolData.poolId, poolData.tokenAddress, adjustedAmount);
                    break;
                case 'BlueMove':
                    transaction = await createBlueMoveBuyTransaction(poolData.poolId, poolData.tokenAddress, adjustedAmount);
                    break;
                default:
                    throw new Error(`Nicht unterstützter DEX: ${poolData.dex}`);
            }
            // Transaktion ausführen
            const response = await this.executeTransaction(transaction);
            // Trade-Metriken aktualisieren
            this.updateTradeMetrics(poolData.poolId, true);
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
        }
        catch (error) {
            logError('Fehler bei der Ausführung der Kauf-Strategie', {
                error: error instanceof Error ? error.message : 'Unbekannter Fehler',
                poolId: poolData.poolId
            });
            if (error instanceof Error) {
                this.updateTradeMetrics(poolData.poolId, false, error);
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            };
        }
    }
    async executeSellStrategy(tradingInfo, slippage) {
        try {
            // Sicherheitsprüfung
            const security = await checkPoolSecurity(tradingInfo.poolAddress, tradingInfo.dex);
            if (!security.isSecure) {
                return {
                    success: false,
                    error: `Pool nicht sicher für Verkauf: ${security.warnings.join(', ')}`
                };
            }
            const position = this.positions.get(tradingInfo.poolAddress);
            if (!position) {
                return {
                    success: false,
                    error: 'Keine Position-Konfiguration gefunden'
                };
            }
            // Berechne aktuelle Performance
            const entryPrice = Number(tradingInfo.initialSuiAmount);
            const currentPrice = Number(tradingInfo.currentAmount);
            const performance = (currentPrice - entryPrice) / entryPrice;
            // Prüfe Take-Profit und Stop-Loss
            if (performance >= position.takeProfit) {
                logInfo('Take-Profit ausgelöst', {
                    poolId: tradingInfo.poolAddress,
                    performance: performance * 100
                });
            }
            else if (performance <= -position.stopLoss) {
                logInfo('Stop-Loss ausgelöst', {
                    poolId: tradingInfo.poolAddress,
                    performance: performance * 100
                });
            }
            else if (await this.updateTrailingStop(tradingInfo.poolAddress, currentPrice)) {
                logInfo('Trailing-Stop ausgelöst', {
                    poolId: tradingInfo.poolAddress,
                    performance: performance * 100
                });
            }
            else {
                return {
                    success: false,
                    error: 'Keine Verkaufsbedingung erfüllt'
                };
            }
            // Verkaufs-Logik basierend auf DEX
            let txId = '';
            switch (tradingInfo.dex) {
                case 'Cetus':
                    const cetusTxResult = await sellDirectCetus(tradingInfo);
                    txId = typeof cetusTxResult === 'string' ? cetusTxResult : '';
                    break;
                case 'BlueMove':
                    const bluemoveTxResult = await tryAgg(tradingInfo.tokenToTrade, "0x2::sui::SUI", tradingInfo.tokenAmount);
                    txId = bluemoveTxResult || '';
                    break;
                default:
                    throw new Error(`Nicht unterstützter DEX: ${tradingInfo.dex}`);
            }
            if (!txId) {
                throw new Error('Verkaufstransaktion fehlgeschlagen');
            }
            // Warte auf Transaktionsbestätigung
            const txResult = await SUI.client.waitForTransaction({
                digest: txId,
                options: { showBalanceChanges: true },
                pollInterval: POLL_INTERVAL,
                timeout: TRANSACTION_TIMEOUT
            });
            // Berechne Profit
            const { balanceChanges } = txResult;
            if (!balanceChanges?.length) {
                throw new Error('Keine Balance-Änderungen in der Verkaufstransaktion');
            }
            const suiBalance = balanceChanges.find((b) => b.coinType.endsWith("::sui::SUI"));
            if (!suiBalance) {
                throw new Error('SUI-Balance-Änderung nicht gefunden');
            }
            const profit = Number(suiBalance.amount) / Math.pow(10, 9);
            // Aktualisiere Trade-Daten
            await updateTrade({
                poolAddress: tradingInfo.poolAddress,
                sellDigest: txId,
                suiReceivedAmount: Math.abs(Number(suiBalance.amount)).toString(),
            });
            // Benachrichtige über erfolgreichen Verkauf
            await sendSellMessage(txId, tradingInfo.poolAddress);
            return {
                success: true,
                transactionId: txId,
                profit,
                metrics: {
                    entryPrice: entryPrice,
                    exitPrice: currentPrice,
                    timeInTrade: Date.now() - (position.lastUpdate || Date.now()),
                    slippage: 0
                }
            };
        }
        catch (error) {
            logError('Fehler bei der Ausführung der Verkaufs-Strategie', {
                error: error instanceof Error ? error.message : 'Unbekannter Fehler',
                poolId: tradingInfo.poolAddress
            });
            sendErrorMessage({
                message: `Verkauf fehlgeschlagen für ${tradingInfo.tokenToTrade}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            };
        }
    }
    async executeTransaction(tx) {
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
        }
        catch (error) {
            logError('Fehler beim Ausführen der Transaktion', {
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
            throw error;
        }
    }
    async buyAction(digest, info) {
        const { client } = SUI;
        try {
            const trade = await client.getTransactionBlock({
                digest,
                options: { showBalanceChanges: true }
            });
            const { balanceChanges } = trade;
            if (!balanceChanges?.length)
                return;
            const suiBalance = balanceChanges.find((b) => b.coinType.endsWith("::SUI"));
            const tokenBalance = balanceChanges.find((b) => !b.coinType.endsWith("::SUI"));
            if (!suiBalance || !tokenBalance) {
                throw new Error('Missing balance changes');
            }
            const scamChance = info ? await scamProbability(info) : 0;
            const tradeData = {
                tokenAddress: tokenBalance.coinType,
                tokenAmount: tokenBalance.amount,
                buyDigest: digest,
                suiSpentAmount: Math.abs(Number(suiBalance.amount)).toString(),
                dex: info?.dex || 'Cetus',
                poolAddress: info?.poolId || '',
                amountA: info?.amountA || '0',
                amountB: info?.amountB || '0',
                suiIsA: info?.coinA.endsWith("::SUI") === true,
                scamProbability: scamChance
            };
            await upsertTrade(tradeData);
            // Füge den Trade zu den aktiven Trades hinzu
            this.activeTrades.set(digest, {
                ...tradeData,
                currentValue: Number(suiBalance.amount) / Math.pow(10, 9),
                profitPercentage: 0,
                isAutoPilot: false
            });
            const tradingInfo = {
                initialSuiAmount: '0',
                currentAmount: '0',
                tokenToTrade: tokenBalance.coinType,
                tokenAmount: tokenBalance.amount,
                tokenOnWallet: tokenBalance.amount,
                poolAddress: info?.poolId || '',
                dex: info?.dex || 'Cetus',
                suiIsA: info?.coinA.endsWith("::sui::SUI") === true,
                scamProbability: scamChance,
                initialSolAmount: '0',
                tokenToSell: tokenBalance.coinType
            };
            // Erstelle ein kompatibles Objekt für sendBuyMessage
            const buyMessageData = {
                tokenAddress: tokenBalance.coinType,
                tokenAmount: tokenBalance.amount,
                buyDigest: digest,
                dex: info?.dex || 'Cetus',
                poolAddress: info?.poolId || '',
                suiSpentAmount: Math.abs(Number(suiBalance.amount)).toString(),
                sellAction: () => this.sellAction(tradingInfo),
                scamProbability: scamChance
            };
            sendBuyMessage(buyMessageData);
        }
        catch (e) {
            console.error("Error in buyAction:", e);
            await wait(1000);
            this.buyAction(digest, info);
        }
    }
    async sellAction(tradingInfo) {
        let tx = '';
        console.log("SELL ACTION::", tradingInfo);
        try {
            // Stelle sicher, dass die erforderlichen Felder für die Trader-Implementierung vorhanden sind
            const traderTradingInfo = {
                initialSolAmount: tradingInfo.initialSuiAmount,
                currentAmount: tradingInfo.currentAmount,
                tokenToSell: tradingInfo.tokenToTrade,
                tokenOnWallet: tradingInfo.tokenOnWallet || tradingInfo.tokenAmount,
                poolAddress: tradingInfo.poolAddress,
                dex: tradingInfo.dex,
                suiIsA: tradingInfo.suiIsA,
                scamProbability: tradingInfo.scamProbability || 0
            };
            switch (tradingInfo.dex) {
                case 'Cetus':
                    const cetusTxResult = await sellDirectCetus(traderTradingInfo);
                    tx = typeof cetusTxResult === 'string' ? cetusTxResult : '';
                    break;
                case 'BlueMove':
                    const bluemoveTxResult = await tryAgg(tradingInfo.tokenToTrade, "0x2::sui::SUI", tradingInfo.tokenAmount);
                    tx = bluemoveTxResult;
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
            const suiBalance = balanceChanges.find((b) => b.coinType.endsWith("::sui::SUI"));
            if (!suiBalance) {
                throw new Error('SUI balance change not found');
            }
            await updateTrade({
                poolAddress: tradingInfo.poolAddress,
                sellDigest: tx,
                suiReceivedAmount: Math.abs(Number(suiBalance.amount)).toString(),
            });
            await sendSellMessage(tx, tradingInfo.poolAddress);
        }
        catch (e) {
            console.error("Error in sellAction:", e);
            sendErrorMessage({
                message: `Sell failed for ${tradingInfo.tokenToTrade}: ${e instanceof Error ? e.message : 'Unknown error'}`
            });
            throw e; // Re-throw to be handled by caller
        }
    }
    async runTrade() {
        console.log("Running trade monitor");
        while (true) {
            try {
                const trades = await getOpenTrades();
                for (const trade of trades) {
                    if (tradesRunning.has(trade.poolAddress)) {
                        continue;
                    }
                    tradesRunning.add(trade.poolAddress);
                    this.monitorTrade(trade).catch(e => {
                        console.error(`Error monitoring trade ${trade.poolAddress}:`, e);
                        tradesRunning.delete(trade.poolAddress);
                    });
                }
            }
            catch (e) {
                console.error("Error in trade monitor:", e);
            }
            await wait(TRADE_CHECK_INTERVAL);
        }
    }
    async monitorTrade(trade) {
        try {
            const tradingInfo = await this.recoverPoolData(trade);
            if (!tradingInfo) {
                console.error("Could not recover pool data for trade:", trade.poolAddress);
                tradesRunning.delete(trade.poolAddress);
                return;
            }
            // Implementiere die Handelslogik hier
            // ...
        }
        catch (e) {
            console.error("Error in monitorTrade:", e);
        }
        finally {
            tradesRunning.delete(trade.poolAddress);
        }
    }
    async recoverPoolData(trade) {
        const { client } = SUI;
        try {
            const response = await client.getObject({
                id: trade.poolAddress,
                options: { showContent: true }
            });
            if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
                throw new Error('Invalid pool data structure');
            }
            const fields = response.data.content.fields;
            if (!fields) {
                throw new Error('Pool data fields not found');
            }
            switch (trade.dex) {
                case 'Cetus':
                    return {
                        initialSuiAmount: trade.suiIsA ? trade.initialPoolAmountA : trade.initialPoolAmountB,
                        currentAmount: trade.suiIsA ? fields.coin_a : fields.coin_b,
                        tokenToTrade: trade.tokenAddress,
                        tokenAmount: trade.tokenAmount,
                        tokenOnWallet: trade.tokenAmount,
                        poolAddress: trade.poolAddress,
                        suiIsA: trade.suiIsA,
                        dex: trade.dex,
                        scamProbability: trade.scamProbability
                    };
                case 'BlueMove':
                    return {
                        initialSuiAmount: trade.suiIsA ? trade.initialPoolAmountA : trade.initialPoolAmountB,
                        currentAmount: trade.suiIsA ? fields.reserve_x : fields.reserve_y,
                        tokenToTrade: trade.tokenAddress,
                        tokenAmount: trade.tokenAmount,
                        tokenOnWallet: trade.tokenAmount,
                        poolAddress: trade.poolAddress,
                        suiIsA: trade.suiIsA,
                        dex: trade.dex,
                        scamProbability: trade.scamProbability
                    };
                default:
                    throw new Error(`Unsupported DEX: ${trade.dex}`);
            }
        }
        catch (e) {
            console.error("Error recovering pool data:", e);
            return null;
        }
    }
}
// Exportiere eine Singleton-Instanz
export const tradingStrategy = TradingStrategy.getInstance();
//# sourceMappingURL=trading_strategy.js.map