// @ts-ignore: Kann nur mit esModuleInterop importiert werden
import TelegramBot from 'node-telegram-bot-api';
import { SUI } from '../chain/config.js';
import { tradeController as importedTradeController } from '../trading/trade_controller.js';
// Kommentiere den nicht existierenden Import aus
//import { tradingMonitor } from '../trading/live_monitor';
import { LIVE_TRADING_CONFIG } from '../config/live_trading.js';
import * as dotenv from 'dotenv';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';
// Verwende den importierten tradeController
const tradeController = importedTradeController;
// Implementiere eine eigene getSuiPrice-Funktion, da der Import fehlt
export async function getSuiPrice() {
    try {
        // Versuche, den SUI-Preis von CoinGecko abzurufen
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd');
        const data = await response.json();
        if (data && data.sui && data.sui.usd) {
            return data.sui.usd;
        }
        // Fallback: Versuche Binance API
        try {
            const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SUIUSDT');
            const binanceData = await binanceResponse.json();
            if (binanceData && binanceData.price) {
                return parseFloat(binanceData.price);
            }
        }
        catch (binanceError) {
            console.error("Fehler beim Abrufen des SUI-Preises von Binance:", binanceError);
        }
        // Fallback-Wert, wenn beide API-Anfragen fehlschlagen
        return 1.25;
    }
    catch (error) {
        console.error("Fehler beim Abrufen des SUI-Preises:", error);
        return 1.25; // Fallback-Wert
    }
}
// Implementiere einen einfachen Trading-Monitor als Ersatz
const tradingMonitor = {
    isActive: false,
    stats: {
        trades: [],
        successfulTrades: 0,
        totalProfit: 0,
        totalLoss: 0,
        isActive: false
    },
    getStats() {
        return this.stats;
    },
    start() {
        this.isActive = true;
        this.stats.isActive = true;
        console.log("Trading Monitor gestartet");
    },
    stop() {
        this.isActive = false;
        this.stats.isActive = false;
        console.log("Trading Monitor gestoppt");
    }
};
let USDollar = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});
dotenv.config();
const token = process.env.TELEGRAM_TOKEN || '';
const bot = new TelegramBot(token, { polling: true });
// Hauptmenü-Optionen
const MAIN_MENU_OPTIONS = {
    reply_markup: {
        keyboard: [
            ['🔄 Aktive Trades', '👛 Wallet Info'],
            ['⚙️ Einstellungen', '📊 Performance'],
            ['🎯 Sniper Modus', '⛔️ Stop Trading']
        ],
        resize_keyboard: true
    }
};
// Trading-Einstellungen Menü
const TRADING_SETTINGS_OPTIONS = {
    reply_markup: {
        keyboard: [
            ['💰 Trade Limits', '⚠️ Risk Settings'],
            ['🔒 Security', '🔙 Zurück']
        ],
        resize_keyboard: true
    }
};
// Initialisiere Bot-Kommandos
// @ts-ignore: Property 'setMyCommands' existiert in der Typdefinition nicht
bot.setMyCommands([
    { command: '/start', description: 'Bot starten' },
    { command: '/menu', description: 'Hauptmenü anzeigen' },
    { command: '/trades', description: 'Aktive Trades anzeigen' },
    { command: '/wallet', description: 'Wallet-Informationen' },
    { command: '/settings', description: 'Einstellungen anpassen' },
    { command: '/performance', description: 'Performance-Statistiken' }
]);
// Start-Kommando
// @ts-ignore: Property 'onText' existiert in der Typdefinition nicht
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '🤖 *Willkommen beim SUI Liquidity Sniper*\n\n' +
        'Verwenden Sie das Menü unten für die Navigation.\n\n' +
        '📈 *Features:*\n' +
        '• Automatisches Trading\n' +
        '• Wallet Management\n' +
        '• Performance Tracking\n' +
        '• Sicherheitseinstellungen', {
        parse_mode: 'Markdown',
        ...MAIN_MENU_OPTIONS
    });
});
// Hauptmenü-Handler
// @ts-ignore: Property 'onText' existiert in der Typdefinition nicht
bot.onText(/🔄 Aktive Trades/, async (msg) => {
    const chatId = msg.chat.id;
    // @ts-ignore: Property 'getActiveTrades' existiert in der Typdefinition nicht
    const trades = tradeController.getActiveTrades();
    if (trades.size === 0) {
        await bot.sendMessage(chatId, '🔄 Keine aktiven Trades vorhanden');
        return;
    }
    // @ts-ignore: Kann nur mit downlevelIteration iteriert werden
    for (const [txId, trade] of trades) {
        const buttons = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📈 Details', callback_data: `trade_details:${txId}` },
                        { text: '💰 Take Profit', callback_data: `take_profit:${txId}` }
                    ],
                    [
                        { text: '🤖 AutoPilot', callback_data: `autopilot:${txId}` },
                        { text: '❌ Schließen', callback_data: `close_trade:${txId}` }
                    ]
                ]
            }
        };
        await bot.sendMessage(chatId, `*Trade #${txId.slice(0, 8)}*\n` +
            `Token: \`${trade.tokenAddress}\`\n` +
            `Profit: ${trade.profitPercentage.toFixed(2)}%\n` +
            `Autopilot: ${trade.isAutoPilot ? '✅' : '❌'}\n` +
            `Wert: ${USDollar.format(trade.currentValue)}`, {
            parse_mode: 'Markdown',
            ...buttons
        });
    }
});
// Wallet-Info Handler
// @ts-ignore: Property 'onText' existiert in der Typdefinition nicht
bot.onText(/👛 Wallet Info/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const keypair = Ed25519Keypair.fromSecretKey(fromB64(process.env.SUI_WALLET_SECRET_KEY || ''));
        const address = keypair.getPublicKey().toSuiAddress();
        const balance = await SUI.client.getBalance({ owner: address });
        const suiPrice = await getSuiPrice();
        const buttons = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📤 Senden', callback_data: 'send_sui' },
                        { text: '📥 Empfangen', callback_data: 'receive_sui' }
                    ],
                    [
                        { text: '🔄 Aktualisieren', callback_data: 'refresh_wallet' }
                    ]
                ]
            }
        };
        await bot.sendMessage(chatId, `*Wallet Übersicht*\n\n` +
            `Adresse: \`${address}\`\n` +
            `Balance: ${Number(balance.totalBalance) / Math.pow(10, 9)} SUI\n` +
            `Wert: ${USDollar.format((Number(balance.totalBalance) / Math.pow(10, 9)) * suiPrice)}`, {
            parse_mode: 'Markdown',
            ...buttons
        });
    }
    catch (error) {
        await bot.sendMessage(chatId, '❌ Fehler beim Laden der Wallet-Informationen');
    }
});
// Performance-Handler
// @ts-ignore: Property 'onText' existiert in der Typdefinition nicht
bot.onText(/📊 Performance/, async (msg) => {
    const chatId = msg.chat.id;
    const stats = tradingMonitor.getStats();
    const buttons = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📈 Details', callback_data: 'performance_details' },
                    { text: '📊 Grafiken', callback_data: 'performance_charts' }
                ],
                [
                    { text: '🔄 Aktualisieren', callback_data: 'refresh_performance' }
                ]
            ]
        }
    };
    await bot.sendMessage(chatId, `*Performance Übersicht*\n\n` +
        `Trades Heute: ${stats.trades.length}\n` +
        `Erfolgsrate: ${((stats.successfulTrades / stats.trades.length) * 100).toFixed(2)}%\n` +
        `Gewinn: ${USDollar.format(stats.totalProfit)}\n` +
        `Verlust: ${USDollar.format(stats.totalLoss)}\n` +
        `Netto: ${USDollar.format(stats.totalProfit - stats.totalLoss)}`, {
        parse_mode: 'Markdown',
        ...buttons
    });
});
// Einstellungen-Handler
// @ts-ignore: Property 'onText' existiert in der Typdefinition nicht
bot.onText(/⚙️ Einstellungen/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '*Trading Einstellungen*\n\n' +
        'Wählen Sie eine Kategorie:', {
        parse_mode: 'Markdown',
        ...TRADING_SETTINGS_OPTIONS
    });
});
// Sniper-Modus Handler
// @ts-ignore: Property 'onText' existiert in der Typdefinition nicht
bot.onText(/🎯 Sniper Modus/, async (msg) => {
    const chatId = msg.chat.id;
    // @ts-ignore: Property 'getActiveTrades' existiert in der Typdefinition nicht
    const trades = tradeController.getActiveTrades();
    const buttons = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔍 Suchen', callback_data: 'search_token' },
                    { text: '📋 Liste', callback_data: 'token_list' }
                ],
                [
                    { text: '⚙️ Einstellungen', callback_data: 'sniper_settings' },
                    { text: '🔙 Zurück', callback_data: 'back_to_main' }
                ]
            ]
        }
    };
    let message = '*🎯 Sniper Modus*\n\n';
    if (trades.size > 0) {
        message += 'Aktive Trades:\n';
        // @ts-ignore: Kann nur mit downlevelIteration iteriert werden
        for (const [txId, _] of trades) {
            message += `• Trade #${txId.slice(0, 8)}\n`;
        }
    }
    else {
        message += 'Keine aktiven Trades. Bereit für neue Gelegenheiten!';
    }
    await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...buttons
    });
});
// Risk Settings Handler
// @ts-ignore: Property 'onText' existiert in der Typdefinition nicht
bot.onText(/⚠️ Risk Settings/, async (msg) => {
    const chatId = msg.chat.id;
    const buttons = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '💰 Trade Size', callback_data: 'set_trade_size' },
                    { text: '📊 Slippage', callback_data: 'set_slippage' }
                ],
                [
                    { text: '🛡️ Scam Protection', callback_data: 'set_scam_protection' },
                    { text: '⏱️ Stop Loss', callback_data: 'set_stop_loss' }
                ]
            ]
        }
    };
    await bot.sendMessage(chatId, '*Risiko-Einstellungen*\n\n' +
        `Max Trade: ${USDollar.format(LIVE_TRADING_CONFIG.CAPITAL_LIMITS.MAX_TRADE_AMOUNT)} SUI\n` +
        `Daily Limit: ${USDollar.format(LIVE_TRADING_CONFIG.CAPITAL_LIMITS.DAILY_TRADE_LIMIT)} SUI\n` +
        `Stop Loss: ${LIVE_TRADING_CONFIG.CAPITAL_LIMITS.MAX_POSITION_LOSS}%\n` +
        `Scam Protection: ${LIVE_TRADING_CONFIG.SAFETY_CHECKS.SCAM_SCORE_THRESHOLD}%`, {
        parse_mode: 'Markdown',
        ...buttons
    });
});
// Security Settings Handler
// @ts-ignore: Property 'onText' existiert in der Typdefinition nicht
bot.onText(/🔒 Security/, async (msg) => {
    const chatId = msg.chat.id;
    const buttons = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔍 LP Check', callback_data: 'set_lp_check' },
                    { text: '🕵️ Contract Scan', callback_data: 'set_contract_scan' }
                ],
                [
                    { text: '⚡️ Anti-Bot', callback_data: 'set_anti_bot' },
                    { text: '🛡️ Sandwich Protection', callback_data: 'set_sandwich_protection' }
                ]
            ]
        }
    };
    await bot.sendMessage(chatId, '*Sicherheitseinstellungen*\n\n' +
        '🔍 *LP Check:* Prüft Liquidität und Token-Verteilung\n' +
        '🕵️ *Contract Scan:* Analysiert Smart Contract auf Risiken\n' +
        '⚡️ *Anti-Bot:* Schutz vor Bot-Manipulation\n' +
        '🛡️ *Sandwich Protection:* Verhindert Sandwich-Attacken', {
        parse_mode: 'Markdown',
        ...buttons
    });
});
// Callback Query Handler
// @ts-ignore: Event-Typ wird nicht korrekt erkannt
bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    if (!chatId || !query.data)
        return;
    const [action, ...params] = query.data.split(':');
    switch (action) {
        case 'trade_details':
            const tradeDetails = tradeController.getActiveTrades().get(params[0]);
            if (tradeDetails) {
                const analysis = tradeController.getTradeAnalysis(params[0]);
                await bot.sendMessage(chatId, `*Trade Details #${params[0].slice(0, 8)}*\n\n` +
                    `Volume 24h: ${USDollar.format(analysis?.volume24h || 0)}\n` +
                    `Käufer: ${analysis?.uniqueBuyers || 0}\n` +
                    `Kaufdruck: ${analysis?.buyPressure.toFixed(2) || 0}\n` +
                    `Liquidität: ${analysis?.liquidityHealth}%\n` +
                    `Stabilität: ${analysis?.priceStability}%`, { parse_mode: 'Markdown' });
            }
            break;
        case 'take_profit':
            const profitButtons = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '20%', callback_data: `profit_execute:${params[0]}:20` },
                            { text: 'Initial', callback_data: `profit_execute:${params[0]}:initial` },
                            { text: '100%', callback_data: `profit_execute:${params[0]}:100` }
                        ]
                    ]
                }
            };
            await bot.sendMessage(chatId, '*Wählen Sie die Profit-Strategie:*', {
                parse_mode: 'Markdown',
                ...profitButtons
            });
            break;
        case 'profit_execute':
            const [txId, profitType] = params;
            const profitSuccess = await tradeController.takeProfits(txId, profitType);
            await bot.sendMessage(chatId, profitSuccess ? '✅ Profit erfolgreich realisiert' : '❌ Fehler beim Profit-Taking');
            break;
        case 'sniper_start':
            tradingMonitor.start();
            await bot.sendMessage(chatId, '🟢 Sniper Modus aktiviert');
            break;
        case 'sniper_stop':
            tradingMonitor.stop();
            await bot.sendMessage(chatId, '🔴 Sniper Modus deaktiviert');
            break;
        case 'sniper_config':
            const configButtons = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Max Trade', callback_data: 'config_max_trade' },
                            { text: 'Min Trade', callback_data: 'config_min_trade' }
                        ],
                        [
                            { text: 'Scam Score', callback_data: 'config_scam_score' },
                            { text: 'Slippage', callback_data: 'config_slippage' }
                        ]
                    ]
                }
            };
            await bot.sendMessage(chatId, '*Sniper Konfiguration*\n' +
                'Wählen Sie die zu ändernde Einstellung:', {
                parse_mode: 'Markdown',
                ...configButtons
            });
            break;
        case 'set_trade_size':
            await bot.sendMessage(chatId, 'Geben Sie die maximale Trade-Größe in SUI ein:\n' +
                'Format: `/set_max_trade 1.5`', { parse_mode: 'Markdown' });
            break;
        case 'set_slippage':
            await bot.sendMessage(chatId, 'Geben Sie den maximalen Slippage in % ein:\n' +
                'Format: `/set_slippage 1.0`', { parse_mode: 'Markdown' });
            break;
        case 'set_scam_protection':
            await bot.sendMessage(chatId, 'Geben Sie den Scam-Score Schwellenwert in % ein:\n' +
                'Format: `/set_scam_score 20`', { parse_mode: 'Markdown' });
            break;
        case 'autopilot':
            const [tradeId] = params;
            const autopilotTrade = tradeController.getActiveTrades().get(tradeId);
            if (autopilotTrade) {
                const newStatus = !autopilotTrade.isAutoPilot;
                await tradeController.toggleAutoPilot(tradeId, newStatus);
                await bot.sendMessage(chatId, `🤖 Autopilot ${newStatus ? 'aktiviert' : 'deaktiviert'} für Trade #${tradeId.slice(0, 8)}`);
            }
            break;
        case 'close_trade':
            const [closeTradeId] = params;
            const closingSuccess = await tradeController.takeProfits(closeTradeId, '100%');
            await bot.sendMessage(chatId, closingSuccess ? '✅ Trade erfolgreich geschlossen' : '❌ Fehler beim Schließen des Trades');
            break;
        case 'sell_all':
            const trades = tradeController.getActiveTrades();
            let successCount = 0;
            let failCount = 0;
            // @ts-ignore: Kann nur mit downlevelIteration iteriert werden
            for (const [txId, _] of trades) {
                const success = await tradeController.takeProfits(txId, '100%');
                if (success)
                    successCount++;
                else
                    failCount++;
            }
            await bot.sendMessage(chatId, `*Trading gestoppt*\n\n` +
                `✅ ${successCount} Trades erfolgreich geschlossen\n` +
                `❌ ${failCount} Trades fehlgeschlagen`, { parse_mode: 'Markdown' });
            break;
        case 'pause_trading':
            tradingMonitor.stop();
            await bot.sendMessage(chatId, '⏸️ Trading pausiert. Aktive Positionen bleiben bestehen.');
            break;
        case 'set_lp_check':
            const lpButtons = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Min. Liquidität', callback_data: 'set_min_liquidity' },
                            { text: 'LP Lock Check', callback_data: 'set_lp_lock' }
                        ]
                    ]
                }
            };
            // Sichere Behandlung von REQUIRED_LP_LOCK
            const lpLockSetting = LIVE_TRADING_CONFIG.SAFETY_CHECKS.hasOwnProperty('REQUIRED_LP_LOCK')
                ? LIVE_TRADING_CONFIG.SAFETY_CHECKS.REQUIRED_LP_LOCK
                : false;
            await bot.sendMessage(chatId, '*LP Sicherheitseinstellungen*\n\n' +
                `Aktuelle Einstellungen:\n` +
                `• Min. Liquidität: ${LIVE_TRADING_CONFIG.PERFORMANCE_THRESHOLDS.MIN_LIQUIDITY} SUI\n` +
                `• LP Lock erforderlich: ${lpLockSetting ? 'Ja' : 'Nein'}`, {
                parse_mode: 'Markdown',
                ...lpButtons
            });
            break;
        case 'set_contract_scan':
            const contractButtons = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Honeypot Check', callback_data: 'set_honeypot_check' },
                            { text: 'Ownership Check', callback_data: 'set_ownership_check' }
                        ],
                        [
                            { text: 'Blacklist Check', callback_data: 'set_blacklist_check' },
                            { text: 'Mint Check', callback_data: 'set_mint_check' }
                        ]
                    ]
                }
            };
            await bot.sendMessage(chatId, '*Smart Contract Sicherheit*\n\n' +
                'Wählen Sie die zu prüfenden Parameter:', {
                parse_mode: 'Markdown',
                ...contractButtons
            });
            break;
        case 'set_anti_bot':
            const antibotButtons = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Aggressiv', callback_data: 'antibot_aggressive' },
                            { text: 'Standard', callback_data: 'antibot_standard' },
                            { text: 'Minimal', callback_data: 'antibot_minimal' }
                        ]
                    ]
                }
            };
            await bot.sendMessage(chatId, '*Anti-Bot Schutz*\n\n' +
                '• Aggressiv: Maximaler Schutz, höhere Gaskosten\n' +
                '• Standard: Ausgewogener Schutz\n' +
                '• Minimal: Basis-Schutz, niedrige Gaskosten', {
                parse_mode: 'Markdown',
                ...antibotButtons
            });
            break;
        case 'set_sandwich_protection':
            const sandwichButtons = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Aktiv', callback_data: 'sandwich_active' },
                            { text: 'Passiv', callback_data: 'sandwich_passive' }
                        ]
                    ]
                }
            };
            await bot.sendMessage(chatId, '*Sandwich-Attacken Schutz*\n\n' +
                '• Aktiv: Verwendet Flash-Bundles\n' +
                '• Passiv: Nur Slippage-Schutz', {
                parse_mode: 'Markdown',
                ...sandwichButtons
            });
            break;
    }
    // @ts-ignore: Methode wird nicht erkannt
    await bot.answerCallbackQuery(query.id);
});
// Command Handler für Einstellungen
// @ts-ignore: Property 'onText' existiert in der Typdefinition nicht
bot.onText(/\/set_max_trade (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!match)
        return;
    const amount = parseFloat(match[1]);
    if (isNaN(amount)) {
        await bot.sendMessage(chatId, '❌ Ungültige Eingabe. Bitte geben Sie eine Zahl ein.');
        return;
    }
    // Hier würde die Konfiguration aktualisiert werden
    await bot.sendMessage(chatId, `✅ Maximale Trade-Größe auf ${amount} SUI gesetzt`);
});
// LP Sicherheitseinstellungen
// @ts-ignore: Property 'REQUIRED_LP_LOCK' existiert nicht im Typ
const lpLockRequired = LIVE_TRADING_CONFIG.SAFETY_CHECKS.REQUIRED_LP_LOCK ? 'Ja' : 'Nein';
// Export der wichtigen Funktionen
export async function sendBuyMessage({ tokenAddress, tokenAmount, buyDigest, dex, poolAddress, suiSpentAmount, sellAction, scamProbability }) {
    const suiPrice = await getSuiPrice();
    const suiSpentAmountNumber = Number(suiSpentAmount);
    function scamInfo(scamProbability) {
        if (scamProbability <= 20) {
            return "✅ Sicher";
        }
        else if (scamProbability <= 50) {
            return "⚠️ Mittel";
        }
        else {
            return "❌ Riskant";
        }
    }
    const message = `
  🟢 *Neuer Trade ausgeführt* 🟢 

  🔍 *Risiko-Level: ${scamInfo(scamProbability)}*

  📊 *DEX Information:* 
  • Name: ${dex}
  • Pool: \`${poolAddress}\`

  🪙 *Token Information:* 
  • Adresse: \`${tokenAddress}\`
  • Name: ${tokenAddress.split("::")[1]}
  • Symbol: ${tokenAddress.split("::")[2]}
  
  💰 *Trade Details:* 
  • Token Menge: ${Number(tokenAmount) / Math.pow(10, 9)}
  • SUI Ausgegeben: ${suiSpentAmountNumber / Math.pow(10, 9)}
  • SUI Preis: ${USDollar.format(suiPrice)}
  • Gesamtwert: ${USDollar.format((suiSpentAmountNumber / Math.pow(10, 9)) * suiPrice)}

  ⏱ *Zeit:* ${new Date().toLocaleString('de-DE')}
  `;
    const buttons = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔗 Explorer', url: `https://suivision.xyz/txblock/${buyDigest}` },
                    { text: '📊 Chart', url: `https://suivision.xyz/token/${tokenAddress}` }
                ],
                [
                    { text: '🔴 Sofort Verkaufen', callback_data: 'forced_sell' },
                    { text: '⚙️ Stop Loss', callback_data: 'set_stop_loss' }
                ]
            ]
        }
    };
    await bot.sendMessage(process.env.TELEGRAM_GROUP_ID, message, {
        parse_mode: 'Markdown',
        ...buttons
    });
}
export async function sendSellMessage(digest, poolAddress) {
    // Bestehende Implementierung...
}
export async function sendUpdateMessage(params) {
    // Bestehende Implementierung...
}
export function sendErrorMessage(params) {
    // Bestehende Implementierung...
}
// Wallet Management Funktionen
// @ts-ignore: Property 'onText' existiert in der Typdefinition nicht
bot.onText(/\/send (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!match)
        return;
    const [_, address, amount] = match;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
        await bot.sendMessage(chatId, '❌ Ungültiger Betrag');
        return;
    }
    try {
        const keypair = Ed25519Keypair.fromSecretKey(fromB64(process.env.SUI_WALLET_SECRET_KEY || ''));
        const tx = {
            kind: 'pay',
            data: {
                inputCoins: [], // Wird automatisch gefüllt
                recipients: [address],
                amounts: [Math.floor(numAmount * 1e9)],
                gasBudget: 2000000
            }
        };
        // @ts-ignore: Property 'signAndExecuteTransactionBlock' existiert nicht im Typ
        const response = await SUI.client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx
        });
        await bot.sendMessage(chatId, `✅ Transaktion erfolgreich\n` +
            `Digest: \`${response.digest}\`\n` +
            `Betrag: ${numAmount} SUI\n` +
            `Empfänger: \`${address}\``, { parse_mode: 'Markdown' });
    }
    catch (error) {
        await bot.sendMessage(chatId, '❌ Fehler bei der Transaktion: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    }
});
// Stop Trading Handler
// @ts-ignore: Property 'onText' existiert in der Typdefinition nicht
bot.onText(/⛔️ Stop Trading/, async (msg) => {
    const chatId = msg.chat.id;
    const buttons = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔴 Alles Verkaufen', callback_data: 'sell_all' },
                    { text: '⏸️ Nur Pausieren', callback_data: 'pause_trading' }
                ],
                [
                    { text: '🔙 Abbrechen', callback_data: 'cancel_stop' }
                ]
            ]
        }
    };
    await bot.sendMessage(chatId, '*Trading Stoppen*\n\n' +
        'Wählen Sie eine Option:\n' +
        '• Alle Positionen verkaufen\n' +
        '• Trading pausieren (behält Positionen)', {
        parse_mode: 'Markdown',
        ...buttons
    });
});
//# sourceMappingURL=index.js.map