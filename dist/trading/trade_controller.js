import { SUI } from '../chain/config.js';
import { LIVE_TRADING_CONFIG } from '../config/trading_config.js';
import { logError, logInfo } from '../utils/logger.js';
import { createCetusBuyTransaction } from '../trader/dex/cetus.js';
import { createBlueMoveBuyTransaction } from '../trader/dex/bluemove.js';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { tradingStrategy } from './trading_strategy.js';
export class TradeController {
    config;
    keypair;
    tradingEnabled = false;
    constructor(config, keypair) {
        this.config = config;
        this.keypair = keypair;
    }
    enableTrading() {
        this.tradingEnabled = true;
        logInfo('Trading enabled');
    }
    disableTrading() {
        this.tradingEnabled = false;
        logInfo('Trading disabled');
    }
    isTradingEnabled() {
        return this.tradingEnabled;
    }
    async executeTrade(poolId, tokenAddress, amount, dex) {
        // Sicherheitsprüfungen
        if (!this.tradingEnabled) {
            return { success: false, error: 'Trading is disabled' };
        }
        if (amount <= 0) {
            return { success: false, error: 'Invalid amount' };
        }
        try {
            // Erstelle Transaktion basierend auf DEX
            let transaction;
            switch (dex) {
                case 'Cetus':
                    transaction = await createCetusBuyTransaction(poolId, tokenAddress, amount);
                    break;
                case 'BlueMove':
                    transaction = await createBlueMoveBuyTransaction(poolId, tokenAddress, amount);
                    break;
                default:
                    return { success: false, error: `Unsupported DEX: ${dex}` };
            }
            // Führe Transaktion aus
            const response = await this.executeTransaction(transaction);
            // Starte Monitoring für diesen Trade
            tradingStrategy.buyAction(response.digest, {
                poolId,
                dex,
                amountA: '0',
                amountB: '0',
                coinA: tokenAddress.endsWith("::SUI") ? tokenAddress : "0x2::sui::SUI",
                coinB: tokenAddress.endsWith("::SUI") ? "0x2::sui::SUI" : tokenAddress,
                liquidity: '0'
            });
            return {
                success: true,
                transactionId: response.digest
            };
        }
        catch (error) {
            logError('Trade execution failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                poolId,
                tokenAddress,
                amount,
                dex
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async executeTransaction(transaction) {
        try {
            const result = await SUI.client.signAndExecuteTransaction({
                transaction,
                signer: this.keypair,
                requestType: 'WaitForLocalExecution',
                options: {
                    showEffects: true,
                    showEvents: true,
                    showBalanceChanges: true
                }
            });
            if (result.effects?.status.status !== 'success') {
                throw new Error(`Transaction failed: ${result.effects?.status.error || 'Unknown error'}`);
            }
            return result;
        }
        catch (error) {
            throw new Error(`Transaction error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async calculateProfit(buyTxId, sellTxId) {
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
            const suiBuy = buyChanges.find((change) => change.coinType.endsWith('::sui::SUI') && BigInt(change.amount) < 0);
            const suiSell = sellChanges.find((change) => change.coinType.endsWith('::sui::SUI') && BigInt(change.amount) > 0);
            if (!suiBuy || !suiSell) {
                throw new Error('Could not find SUI balance changes');
            }
            const buyAmount = Math.abs(Number(suiBuy.amount));
            const sellAmount = Math.abs(Number(suiSell.amount));
            const profit = sellAmount - buyAmount;
            const profitPercentage = (profit / buyAmount) * 100;
            return { profit, profitPercentage };
        }
        catch (error) {
            logError('Error calculating profit', {
                error: error instanceof Error ? error.message : 'Unknown error',
                buyTxId,
                sellTxId
            });
            throw error;
        }
    }
}
// Exportiere eine Singleton-Instanz
export const tradeController = new TradeController(LIVE_TRADING_CONFIG, new Ed25519Keypair());
//# sourceMappingURL=trade_controller.js.map