import { upsertTrade, getOpenTrades, updateTrade } from "../db/trade.js";
import { SUI } from "../chain/config.js";
import wait from "../utils/wait.js";
import { sendBuyMessage, sendErrorMessage, sendSellMessage, sendUpdateMessage } from "../telegram/index.js";
import { sell as sellDirectCetus } from "./dex/cetus.js";
import { scamProbability } from "./checkscam.js";
import { sellWithAgg } from "./index.js";
// Constants
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second
const EMERGENCY_SELL_TIMEOUT = 20000; // 20 seconds
const TRADE_CHECK_INTERVAL = 2000; // 2 seconds
const HIGH_SCAM_PROBABILITY = 50;
const PROFIT_THRESHOLD = 1;
const TRAILING_STOP_DISTANCE = 10;
const POLL_INTERVAL = 1000;
const TRANSACTION_TIMEOUT = 100000;
// State management
const tradesRunning = new Set();
const stopLoss = new Map();
const maxVariance = new Map();
const tradeMetrics = new Map();
async function tryAgg(_coinIn, _coinOut, amount) {
    let retries = 0;
    let lastError = null;
    while (retries < MAX_RETRIES) {
        try {
            const tx = await sellWithAgg(_coinIn, amount);
            if (tx)
                return tx;
        }
        catch (error) {
            lastError = error;
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
export async function buyAction(digest, info) {
    const { client } = SUI;
    try {
        const trade = await client.getTransactionBlock({
            digest,
            options: { showBalanceChanges: true }
        });
        const { balanceChanges } = trade;
        if (!balanceChanges?.length)
            return null;
        const suiBalance = balanceChanges.find((b) => b.coinType.endsWith("::SUI"));
        const tokenBalance = balanceChanges.find((b) => !b.coinType.endsWith("::SUI"));
        if (!suiBalance || !tokenBalance) {
            throw new Error('Missing balance changes');
        }
        const scamChance = await scamProbability(info);
        const tradeData = {
            tokenAddress: tokenBalance.coinType,
            tokenAmount: tokenBalance.amount,
            buyDigest: digest,
            suiSpentAmount: Math.abs(Number(suiBalance.amount)).toString(),
            dex: info?.dex || 'Cetus',
            poolAddress: info?.poolId,
            amountA: info?.amountA,
            amountB: info?.amountB,
            suiIsA: info?.coinA.endsWith("::SUI") === true,
            scamProbability: scamChance
        };
        await upsertTrade(tradeData);
        const tradingInfo = {
            initialSolAmount: '0',
            currentAmount: '0',
            tokenToSell: tokenBalance.coinType,
            tokenOnWallet: tokenBalance.amount,
            poolAddress: info?.poolId,
            dex: info?.dex || 'Cetus',
            suiIsA: info?.coinA.endsWith("::sui::SUI") === true,
            scamProbability: scamChance
        };
        sendBuyMessage({
            ...tradeData,
            sellAction: () => sellAction(tradingInfo)
        });
    }
    catch (e) {
        console.error("Error in buyAction:", e);
        await wait(1000);
        return buyAction(digest, info);
    }
}
export async function sellAction(tradingInfo) {
    let tx = '';
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
            message: `Sell failed for ${tradingInfo.tokenToSell}: ${e instanceof Error ? e.message : 'Unknown error'}`
        });
        throw e; // Re-throw to be handled by caller
    }
}
async function recoverPoolData(trade) {
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
    }
    catch (e) {
        console.error("Error recovering pool data:", e);
        return null;
    }
}
export async function runTrade() {
    console.log("Running trade monitor");
    while (true) {
        try {
            const openTrades = await getOpenTrades();
            if (openTrades.length > 0) {
                await Promise.all(openTrades.map(async (trade) => {
                    const info = await recoverPoolData(trade);
                    if (info) {
                        await performTrade(info);
                    }
                }));
            }
        }
        catch (e) {
            console.error("Error in trade monitor:", e);
        }
        await wait(TRADE_CHECK_INTERVAL);
    }
}
async function performTrade(info) {
    if (tradesRunning.has(info.tokenToSell)) {
        console.log(`Trade already running for ${info.tokenToSell}`);
        return;
    }
    tradesRunning.add(info.tokenToSell);
    try {
        console.log("PERFORM TRADE::", info);
        const currentAmount = Number(info.currentAmount);
        const initialAmount = Number(info.initialSolAmount);
        const variation = ((currentAmount - initialAmount) / initialAmount) * 100;
        const max = maxVariance.get(info.tokenToSell) || -1;
        const stop = stopLoss.get(info.tokenToSell) || -10;
        // Emergency sell for high scam probability
        if (info.scamProbability > HIGH_SCAM_PROBABILITY) {
            console.log(`High scam probability (${info.scamProbability}%) detected for ${info.tokenToSell}`);
            try {
                await Promise.race([
                    sellAction(info),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Emergency sell timeout')), EMERGENCY_SELL_TIMEOUT))
                ]);
            }
            catch (e) {
                console.error('Emergency sell failed:', e);
                sendErrorMessage({
                    message: `Scam detected (${info.scamProbability}%), emergency sell failed: ${e instanceof Error ? e.message : 'Unknown error'}`
                });
            }
            return;
        }
        // Update trailing stop loss
        if (variation > max) {
            maxVariance.set(info.tokenToSell, variation);
            if (variation > TRAILING_STOP_DISTANCE) {
                const newStop = variation - TRAILING_STOP_DISTANCE;
                stopLoss.set(info.tokenToSell, newStop);
                console.log(`Updated stop loss to ${newStop}% for ${info.tokenToSell}`);
            }
        }
        // Check sell conditions
        if (variation < stop || variation > PROFIT_THRESHOLD) {
            console.log(`Selling ${info.tokenToSell} - Variation: ${variation}%, Stop: ${stop}%, Max: ${max}%`);
            try {
                await sellAction(info);
            }
            catch (e) {
                console.error('Sell failed:', e);
                sendErrorMessage({
                    message: `Sell failed for ${info.tokenToSell}: ${e instanceof Error ? e.message : 'Unknown error'}\nVariation: ${variation}%\nStop: ${stop}%\nMax: ${max}%`
                });
            }
            return;
        }
        sendUpdateMessage({
            tokenAddress: info.tokenToSell,
            variacao: variation,
            max,
            stop
        });
    }
    catch (e) {
        console.error('Trade execution error:', e);
        sendErrorMessage({
            message: `Trade error for ${info.tokenToSell}: ${e instanceof Error ? e.message : 'Unknown error'}`
        });
    }
    finally {
        tradesRunning.delete(info.tokenToSell);
    }
}
//# sourceMappingURL=tradeStrategy.js.map