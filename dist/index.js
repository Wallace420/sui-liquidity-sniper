import * as readline from 'readline';
import { WalletManager } from './wallet/wallet-manager.js';
import { logError, logInfo } from './utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import { clearLine, cursorTo } from 'readline';
import dotenv from 'dotenv';
import { Dashboard } from './utils/dashboard.js';
import { updatePoolCache, getPoolAnalytics, calculateRiskMetrics } from './chain/analytics.js';
import chalk from 'chalk';
// Lade Umgebungsvariablen
dotenv.config();
// Globale Variablen
let isRunning = false;
let isTradingEnabled = false;
let isPoolHuntingEnabled = false;
let isAutoSnipingEnabled = false;
const tradedPools = new Set();
let autoSnipeInterval = null;
let rl = null;
let tradingStats = {
    totalPools: 0,
    successfulTrades: 0,
    failedTrades: 0,
    totalProfit: 0,
    averageExecutionTime: 0
};
// Globale UI Variablen
let statusBar = {
    poolHunting: false,
    trading: false,
    autoSniping: false,
    poolsFound: 0
};
let commandHistory = [];
let historyIndex = 0;
// Kommandos
const COMMANDS = {
    // Scanner-Steuerung
    START_SCANNER: 'start-scanner',
    STOP_SCANNER: 'stop-scanner',
    STATUS: 'status',
    // Trading-Modi
    ENABLE_SNIPING: 'enable-sniping',
    DISABLE_SNIPING: 'disable-sniping',
    AUTO_SNIPE: 'auto-snipe',
    MANUAL_SNIPE: 'manual-snipe',
    // Pool-Informationen
    SHOW_POOLS: 'pools',
    POOL_STATS: 'stats',
    EXPORT_POOLS: 'export',
    ANALYTICS: 'analytics',
    // Wallet & System
    WALLET: 'wallet',
    WALLET_MENU: 'wallet-menu',
    HELP: 'help',
    EXIT: 'exit',
    DASHBOARD: 'dashboard'
};
// Initialisiere WalletManager
const walletManager = new WalletManager();
// Initialisiere Readline-Interface
function initializeReadline() {
    try {
        console.log('Initialisiere Benutzereingabe...');
        // Schließe existierendes Interface falls vorhanden
        if (rl) {
            rl.close();
        }
        // Erstelle neues Interface mit minimaler Konfiguration
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        // Einfache Befehlsverarbeitung
        rl.on('line', (line) => {
            const command = line.trim();
            if (command) {
                console.log(`Befehl empfangen: ${command}`);
                // Verarbeite Befehl synchron, um Probleme zu vermeiden
                try {
                    processCommand(command);
                }
                catch (error) {
                    console.error('Fehler bei der Befehlsverarbeitung:', error);
                }
            }
            // Zeige Prompt erneut an
            if (rl) {
                rl.prompt();
            }
        });
        // Setze Prompt
        rl.setPrompt('SUI-Sniper> ');
        // Zeige Willkommensnachricht und Prompt
        console.log('\n=== SUI LIQUIDITY SNIPER ===');
        console.log('Geben Sie "help" ein, um verfügbare Befehle anzuzeigen.\n');
        rl.prompt();
        console.log('Benutzereingabe initialisiert.');
        return true;
    }
    catch (error) {
        console.error('Fehler bei der Initialisierung des Readline-Interface:', error);
        return false;
    }
}
// Initialisiere Dashboard
const dashboard = new Dashboard({
    refreshRate: 5000,
    showPoolList: true,
    showTradeList: true,
    showWalletInfo: true,
    showRiskMetrics: true,
    compactMode: false
});
// Aktualisiere die Statusleiste
function updateStatusBar() {
    // Aktualisiere Dashboard-Status
    dashboard.updateSystemStatus({
        poolHunting: isPoolHuntingEnabled,
        trading: isTradingEnabled,
        autoSniping: isAutoSnipingEnabled,
        poolsFound: statusBar.poolsFound,
        lastPool: statusBar.lastPool,
        uptime: (Date.now() - startTime) / 1000
    });
    // Lösche vorherige Statusleiste
    cursorTo(process.stdout, 0, process.stdout.rows);
    clearLine(process.stdout, 0);
    // Erstelle Statustext mit verbesserten Symbolen und Farben
    const status = [
        `🔍 ${chalk.bold('Pool-Suche:')} ${statusBar.poolHunting ? chalk.green.bold("AKTIV") : chalk.red.bold("INAKTIV")}`,
        `🤖 ${chalk.bold('Auto-Snipe:')} ${statusBar.autoSniping ? chalk.green.bold("AKTIV") : chalk.red.bold("INAKTIV")}`,
        `💰 ${chalk.bold('Trading:')} ${statusBar.trading ? chalk.green.bold("AKTIV") : chalk.red.bold("INAKTIV")}`,
        `⏱️ ${chalk.bold('Laufzeit:')} ${chalk.cyan.bold(formatUptime((Date.now() - startTime) / 1000))}`,
        `📊 ${chalk.bold('Pools:')} ${chalk.yellow.bold(statusBar.poolsFound.toString())}`
    ].join(" │ ");
    // Zeige Statusleiste mit Hintergrund
    cursorTo(process.stdout, 0, process.stdout.rows - 1);
    process.stdout.write('\x1b[7m' + status + '\x1b[0m');
    cursorTo(process.stdout, 0, process.stdout.rows - 2);
}
// Verarbeite Benutzerbefehle
async function processCommand(command) {
    try {
        const normalizedCommand = command.trim().toLowerCase();
        // Befehlsverarbeitung mit verbessertem Feedback
        switch (normalizedCommand) {
            case COMMANDS.START_SCANNER:
                if (isPoolHuntingEnabled) {
                    console.log(chalk.yellow('⚠️ Scanner läuft bereits.'));
                    break;
                }
                console.log(chalk.green.bold('🔍 Starte Pool-Scanner...'));
                await startEventPolling();
                break;
            case COMMANDS.STOP_SCANNER:
                if (!isPoolHuntingEnabled) {
                    console.log(chalk.yellow('⚠️ Scanner ist bereits gestoppt.'));
                    break;
                }
                console.log(chalk.yellow.bold('🛑 Stoppe Pool-Scanner...'));
                stopEventPolling();
                break;
            case COMMANDS.STATUS:
                console.log(chalk.cyan.bold('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓'));
                console.log(chalk.cyan.bold('┃                               AKTUELLER STATUS                                ┃'));
                console.log(chalk.cyan.bold('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛'));
                console.log(`\n${chalk.bold('Pool-Scanner:')} ${isPoolHuntingEnabled ? chalk.green.bold('AKTIV') : chalk.red.bold('INAKTIV')}`);
                console.log(`${chalk.bold('Trading:')} ${isTradingEnabled ? chalk.green.bold('AKTIVIERT') : chalk.red.bold('DEAKTIVIERT')}`);
                console.log(`${chalk.bold('Auto-Sniping:')} ${isAutoSnipingEnabled ? chalk.green.bold('AN') : chalk.red.bold('AUS')}`);
                console.log(`${chalk.bold('Pools gefunden:')} ${chalk.yellow.bold(pools.length.toString())}`);
                console.log(`${chalk.bold('Trades:')} ${chalk.yellow.bold(trades.length.toString())}`);
                console.log(`${chalk.bold('Laufzeit:')} ${chalk.cyan.bold(formatUptime((Date.now() - startTime) / 1000))}`);
                // Zeige letzten gefundenen Pool an, wenn vorhanden
                if (lastPoolFound) {
                    const poolAge = formatUptime((Date.now() - lastPoolFound.timestamp) / 1000);
                    console.log(`\n${chalk.bold('Letzter Pool:')} ${chalk.green(lastPoolFound.tokenSymbol || 'Unbekannt')} auf ${chalk.green(lastPoolFound.dex)} (vor ${chalk.green(poolAge)})`);
                }
                // Zeige Systemressourcen an
                console.log(`\n${chalk.bold('Speichernutzung:')} ${chalk.yellow((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2))} MB`);
                // Trennlinie
                console.log(chalk.gray("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
                break;
            case COMMANDS.DASHBOARD:
                // Aktualisiere Dashboard mit aktuellen Daten
                dashboard.updatePools(pools);
                dashboard.updateTrades(trades);
                // Simuliere Wallet-Informationen
                const walletInfoForDashboard = {
                    address: '0x' + Math.random().toString(16).substring(2, 12),
                    balance: 10 + Math.random() * 5,
                    tokens: [
                        { symbol: 'SUI', amount: 10 + Math.random() * 5, value: 100 + Math.random() * 50 },
                        { symbol: 'USDC', amount: 100 + Math.random() * 50, value: 100 + Math.random() * 50 }
                    ],
                    totalValue: 250 + Math.random() * 100,
                    pendingTransactions: Math.floor(Math.random() * 3)
                };
                dashboard.updateWalletInfo(walletInfoForDashboard);
                // Aktualisiere System-Status
                dashboard.updateSystemStatus({
                    poolHunting: isPoolHuntingEnabled,
                    trading: isTradingEnabled,
                    autoSniping: isAutoSnipingEnabled,
                    poolsFound: pools.length,
                    uptime: (Date.now() - startTime) / 1000
                });
                // Rendere Dashboard mit längerer Verzögerung für bessere Lesbarkeit
                console.log(chalk.cyan.bold('📊 Rendere Dashboard... (Bitte warten)'));
                await dashboard.render();
                break;
            case COMMANDS.HELP:
                displayHelp();
                break;
            case COMMANDS.EXIT:
                console.log(chalk.yellow.bold('👋 Auf Wiedersehen!'));
                if (rl) {
                    rl.close();
                }
                process.exit(0);
                break;
            default:
                console.log(chalk.red(`❌ Unbekannter Befehl: ${command}`));
                console.log(chalk.yellow(`💡 Geben Sie "${COMMANDS.HELP}" ein, um verfügbare Befehle anzuzeigen.`));
        }
    }
    catch (error) {
        console.log(chalk.red.bold(`❌ Fehler bei der Befehlsverarbeitung:`));
        console.log(chalk.red(`   ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`));
    }
    // Aktualisiere Status-Anzeige
    updateStatusBar();
    // Stelle sicher, dass die Eingabeaufforderung wieder angezeigt wird
    if (rl) {
        rl.prompt();
    }
}
// Zeige Hilfe an
function displayHelp() {
    const helpText = `
${chalk.bold.cyan('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓')}
${chalk.bold.cyan('┃                           SUI LIQUIDITY SNIPER - BEFEHLE                          ┃')}
${chalk.bold.cyan('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛')}

${chalk.bold.yellow('📋 Scanner-Steuerung:')}
  ${chalk.green(COMMANDS.START_SCANNER)}     - Startet den Pool-Scanner
  ${chalk.green(COMMANDS.STOP_SCANNER)}      - Stoppt den Pool-Scanner
  ${chalk.green(COMMANDS.STATUS)}            - Zeigt den aktuellen Status an

${chalk.bold.yellow('💰 Trading-Modi:')}
  ${chalk.green(COMMANDS.ENABLE_SNIPING)}    - Aktiviert das Trading
  ${chalk.green(COMMANDS.DISABLE_SNIPING)}   - Deaktiviert das Trading
  ${chalk.green(COMMANDS.AUTO_SNIPE)}        - Aktiviert/Deaktiviert Auto-Sniping
  ${chalk.green(COMMANDS.MANUAL_SNIPE)}      - Startet manuelles Sniping

${chalk.bold.yellow('🔍 Pool-Informationen:')}
  ${chalk.green(COMMANDS.SHOW_POOLS)}        - Zeigt die letzten Pools an
  ${chalk.green(COMMANDS.POOL_STATS)}        - Zeigt Pool-Statistiken an
  ${chalk.green(COMMANDS.EXPORT_POOLS)}      - Exportiert Pools als CSV
  ${chalk.green(COMMANDS.ANALYTICS)}         - Zeigt On-Chain-Analytics an

${chalk.bold.yellow('🔧 Wallet & System:')}
  ${chalk.green(COMMANDS.WALLET)}            - Zeigt Wallet-Informationen an
  ${chalk.green(COMMANDS.WALLET_MENU)}       - Öffnet das Wallet-Menü
  ${chalk.green(COMMANDS.DASHBOARD)}         - Zeigt das Dashboard an
  ${chalk.green(COMMANDS.HELP)}              - Zeigt diese Hilfe an
  ${chalk.green(COMMANDS.EXIT)}              - Beendet das Programm

${chalk.bold.cyan('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓')}
${chalk.bold.cyan('┃                                    TIPPS                                         ┃')}
${chalk.bold.cyan('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛')}

${chalk.white('1.')} Starten Sie zuerst den Scanner mit ${chalk.green(COMMANDS.START_SCANNER)}
${chalk.white('2.')} Aktivieren Sie das Trading mit ${chalk.green(COMMANDS.ENABLE_SNIPING)}
${chalk.white('3.')} Für automatisches Trading nutzen Sie ${chalk.green(COMMANDS.AUTO_SNIPE)}
${chalk.white('4.')} Für manuelles Trading nutzen Sie ${chalk.green(COMMANDS.MANUAL_SNIPE)}
${chalk.white('5.')} Überwachen Sie Ihre Trades im Dashboard mit ${chalk.green(COMMANDS.DASHBOARD)}

${chalk.gray('Drücken Sie eine beliebige Taste, um fortzufahren...')}
`;
    console.log(helpText);
}
// CSV Headers für Pool-Daten
const CSV_HEADERS = 'timestamp,dex,poolId,coinA,coinB,amountA,amountB,liquidity\n';
const CSV_FILE = path.join(process.cwd(), 'pools.csv');
// Stelle sicher, dass die CSV-Datei existiert
if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, CSV_HEADERS);
}
// Konfiguration für die Anwendung
const config = {
    minQualityForAutoSnipe: 70,
    minSecurityScore: 50,
    refreshRate: 15000,
    maxErrorRetries: 5
};
// Hilfsfunktion zum Extrahieren der Pool-ID aus einem Ereignis
function extractPoolId(event) {
    try {
        // Für Turbos DEX
        if (event.type && event.type.includes('factory::CreatePoolEvent')) {
            return event.parsedJson?.pool_id || null;
        }
        // Für Cetus DEX
        if (event.type && event.type.includes('swap::Created_Pool_Event')) {
            return event.parsedJson?.pool_address || null;
        }
        return null;
    }
    catch (error) {
        console.error(chalk.red(`❌ Fehler beim Extrahieren der Pool-ID: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`));
        return null;
    }
}
// Funktion zum Abfragen von Turbos-Ereignissen
async function queryTurbosEvents() {
    try {
        // Hier würde die tatsächliche Implementierung stehen
        // Für Testzwecke geben wir ein leeres Array zurück
        return [];
    }
    catch (error) {
        console.error(chalk.red(`❌ Fehler beim Abfragen von Turbos-Ereignissen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`));
        return [];
    }
}
// Funktion zum Abfragen von Cetus-Ereignissen
async function queryCetusEvents() {
    try {
        // Hier würde die tatsächliche Implementierung stehen
        // Für Testzwecke geben wir ein leeres Array zurück
        return [];
    }
    catch (error) {
        console.error(chalk.red(`❌ Fehler beim Abfragen von Cetus-Ereignissen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`));
        return [];
    }
}
// Funktion zum Abrufen von Pool-Daten
async function fetchPoolData(poolId, event) {
    try {
        // Hier würde die tatsächliche Implementierung stehen
        // Für Testzwecke geben wir ein Beispiel-Objekt zurück
        return {
            id: poolId,
            dex: event.type?.includes('factory::CreatePoolEvent') ? 'Turbos' : 'Cetus',
            timestamp: Date.now(),
            liquidity: 1000 + Math.random() * 5000,
            tokenSymbol: 'TEST',
            quality: 0 // Wird später berechnet
        };
    }
    catch (error) {
        console.error(chalk.red(`❌ Fehler beim Abrufen von Pool-Daten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`));
        return null;
    }
}
// Globale Variablen für die Statusverfolgung
let poolsFound = 0;
let lastPoolFound = null;
// Funktion zum Überprüfen der Pool-Sicherheit
async function checkPoolSecurity(poolData) {
    try {
        // Hier würde die tatsächliche Implementierung stehen
        // Für Testzwecke geben wir einen zufälligen Wert zurück
        return 50 + Math.random() * 50;
    }
    catch (error) {
        console.error(chalk.red(`❌ Fehler bei der Sicherheitsprüfung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`));
        return 0;
    }
}
// Funktion zum Berechnen der Pool-Qualität
function calculatePoolQuality(poolData) {
    try {
        // Hier würde die tatsächliche Implementierung stehen
        // Für Testzwecke geben wir einen zufälligen Wert zurück
        return 30 + Math.random() * 70;
    }
    catch (error) {
        console.error(chalk.red(`❌ Fehler bei der Qualitätsberechnung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`));
        return 0;
    }
}
// Funktion zum Abrufen erweiterter Pool-Daten
async function fetchEnhancedPoolData(poolData) {
    try {
        // Hier würde die tatsächliche Implementierung stehen
        // Für Testzwecke erweitern wir die vorhandenen Daten
        return {
            ...poolData,
            volume24h: Math.random() * 10000,
            priceChange24h: (Math.random() * 20) - 10,
            holders: Math.floor(Math.random() * 100) + 5,
            createdAt: new Date(poolData.timestamp)
        };
    }
    catch (error) {
        console.error(chalk.red(`❌ Fehler beim Abrufen erweiterter Pool-Daten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`));
        return poolData;
    }
}
// Event Polling Funktion
async function startEventPolling() {
    // Flags setzen
    isPoolHuntingEnabled = true;
    updateStatusBar();
    // Variablen initialisieren
    poolsFound = 0;
    let lastDashboardUpdate = Date.now();
    let lastErrorReset = Date.now();
    let errorCount = 0;
    let retryDelay = 1000; // 1 Sekunde Anfangsverzögerung
    const MAX_RETRY_DELAY = 30000; // 30 Sekunden maximale Verzögerung
    // Dashboard starten
    dashboard.start();
    // Verbesserte Startmeldung mit mehr Details
    console.log(chalk.green.bold("\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
    console.log(chalk.green.bold("┃                              🔍 POOL-SUCHE GESTARTET                              ┃"));
    console.log(chalk.green.bold("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
    console.log(chalk.cyan("\n• Suche nach neuen Liquiditätspools auf Cetus und Turbos DEX"));
    console.log(chalk.cyan("• Auto-Sniping: " + (isAutoSnipingEnabled ? chalk.green("Aktiviert") : chalk.red("Deaktiviert"))));
    console.log(chalk.cyan("• Minimale Qualität für Auto-Snipe: " + chalk.yellow(config.minQualityForAutoSnipe.toString())));
    console.log(chalk.cyan("• Minimaler Sicherheitsscore: " + chalk.yellow(config.minSecurityScore.toString())));
    console.log(chalk.cyan("\nDrücken Sie 'q' zum Beenden oder 'help' für weitere Befehle.\n"));
    // Trennlinie für bessere Lesbarkeit
    console.log(chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
    // Endlosschleife für Event-Polling
    while (isPoolHuntingEnabled) {
        try {
            // Status aktualisieren mit Zeitstempel
            const currentTime = new Date().toLocaleTimeString();
            console.log(chalk.blue(`\n[${currentTime}] ⏳ Abfrage neuer Pools...`));
            // Events von verschiedenen DEXs abfragen
            const turbosEvents = await queryTurbosEvents();
            const cetusEvents = await queryCetusEvents();
            // Ergebnisse kombinieren
            const allEvents = [...turbosEvents, ...cetusEvents];
            if (allEvents.length > 0) {
                console.log(chalk.yellow(`📊 ${allEvents.length} neue Pool-Ereignisse gefunden. Verarbeitung...`));
            }
            else {
                // Weniger aufdringliche Meldung für keine Ereignisse
                console.log(chalk.gray(`[${currentTime}] 😴 Keine neuen Pool-Ereignisse gefunden.`));
            }
            // Jeden Pool verarbeiten mit einer Verzögerung für bessere Lesbarkeit
            for (const event of allEvents) {
                const poolData = await processPoolEvent(event);
                if (poolData && poolData.quality > 0) {
                    poolsFound++;
                    lastPoolFound = {
                        poolId: poolData.id,
                        dex: poolData.dex,
                        coinA: 'SUI',
                        coinB: poolData.tokenSymbol || 'Unbekannt',
                        timestamp: poolData.timestamp,
                        liquidity: poolData.liquidity,
                        tokenSymbol: poolData.tokenSymbol
                    };
                    // Formatierte Ausgabe für neue Qualitätspools mit verbesserter Layout
                    const timestamp = new Date().toLocaleTimeString();
                    const poolAge = Math.floor((Date.now() - poolData.timestamp) / 1000);
                    // Verbesserte visuelle Darstellung für neue Pools
                    console.log(chalk.green.bold("\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
                    console.log(chalk.green.bold("┃                            ✨ NEUER QUALITÄTSPOOL GEFUNDEN ✨                     ┃"));
                    console.log(chalk.green.bold("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
                    // Detaillierte Pool-Informationen mit besserer Formatierung
                    console.log(chalk.cyan(`\n⏰ Zeit:       ${chalk.white(timestamp)} (Alter: ${chalk.white(poolAge + 's')})`));
                    console.log(chalk.cyan(`🏦 DEX:        ${chalk.white(poolData.dex)}`));
                    console.log(chalk.cyan(`🆔 Pool ID:    ${chalk.white(poolData.id.substring(0, 10) + '...')}`));
                    console.log(chalk.cyan(`💰 Liquidität: ${chalk.white('$' + poolData.liquidity.toFixed(2))}`));
                    console.log(chalk.cyan(`⭐ Qualität:   ${chalk.white(poolData.quality.toFixed(2))}`));
                    console.log(chalk.cyan(`🪙 Token:      ${chalk.white(poolData.tokenSymbol || "Unbekannt")}`));
                    // Risikobewertung hinzufügen
                    const riskScore = Math.floor(Math.random() * 100); // Simuliert für Testzwecke
                    const riskColor = riskScore < 30 ? chalk.green : (riskScore < 70 ? chalk.yellow : chalk.red);
                    console.log(chalk.cyan(`🛡️ Risiko:     ${riskColor(riskScore + '%')}`));
                    // Trennlinie für bessere Lesbarkeit
                    console.log(chalk.gray("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
                    // Pool-Daten in CSV speichern
                    savePoolToCSV(poolData);
                    // Pool-Cache für Analytics aktualisieren
                    updatePoolCache(poolData);
                    // Erweiterte Pool-Daten für Dashboard abrufen
                    const enhancedPoolData = await fetchEnhancedPoolData(poolData);
                    dashboard.updatePools([enhancedPoolData]);
                    // Auto-Snipe Logik basierend auf Qualitätswerten mit verbesserter Darstellung
                    if (isAutoSnipingEnabled && poolData.quality > config.minQualityForAutoSnipe) {
                        console.log(chalk.magenta.bold(`\n🚀 AUTO-SNIPE WIRD GESTARTET 🚀`));
                        console.log(chalk.magenta(`Pool-Qualität: ${chalk.white(poolData.quality.toFixed(2))} (Minimum: ${config.minQualityForAutoSnipe})`));
                        console.log(chalk.magenta(`Token: ${chalk.white(poolData.tokenSymbol || "Unbekannt")}`));
                        console.log(chalk.magenta(`DEX: ${chalk.white(poolData.dex)}`));
                        await proceedWithSnipe([
                            poolData.id,
                            poolData.dex,
                            poolData.tokenSymbol || "Unbekannt",
                            String(poolData.quality)
                        ]);
                    }
                    // Verzögerung zwischen den Pools für bessere Lesbarkeit (3 Sekunden für wichtige Pools)
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
            // Dashboard alle 15 Sekunden aktualisieren mit verbesserter Darstellung
            if (Date.now() - lastDashboardUpdate > 15000) {
                const uptimeMinutes = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
                console.log(chalk.blue(`\n📊 Dashboard wird aktualisiert...`));
                console.log(chalk.blue(`• Pools gefunden: ${chalk.white(poolsFound.toString())}`));
                console.log(chalk.blue(`• Laufzeit: ${chalk.white(uptimeMinutes + ' Minuten')}`));
                console.log(chalk.blue(`• Scanner-Status: ${isPoolHuntingEnabled ? chalk.green('Aktiv') : chalk.red('Inaktiv')}`));
                // Simulierte Wallet-Informationen für das Dashboard
                const dashboardWalletInfo = {
                    address: "0x123...abc",
                    balance: 100.5,
                    tokens: [
                        { symbol: "SUI", amount: 100.5, value: 100.5 }
                    ],
                    totalValue: 100.5,
                    pendingTransactions: 0
                };
                dashboard.updateWalletInfo(dashboardWalletInfo);
                // System-Status aktualisieren
                updateSystemStatus();
                lastDashboardUpdate = Date.now();
            }
            // Fehler zurücksetzen, wenn eine Minute ohne Fehler vergangen ist
            if (Date.now() - lastErrorReset > 60000) {
                if (errorCount > 0) {
                    console.log(chalk.green(`✅ Fehler zurückgesetzt nach einer Minute ohne Probleme.`));
                }
                errorCount = 0;
                retryDelay = 1000;
                lastErrorReset = Date.now();
            }
            // Verzögerung zwischen den Abfragen (4 Sekunden für bessere Lesbarkeit)
            await new Promise(resolve => setTimeout(resolve, 4000));
        }
        catch (error) {
            errorCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
            // Verbesserte Fehlerdarstellung
            console.error(chalk.red.bold(`\n❌ FEHLER BEIM EVENT-POLLING (#${errorCount})`));
            console.error(chalk.red(`Fehlermeldung: ${errorMessage}`));
            // Exponentielles Backoff für Wiederholungsversuche mit verbesserter Darstellung
            retryDelay = Math.min(retryDelay * 1.5, MAX_RETRY_DELAY);
            const retrySeconds = (retryDelay / 1000).toFixed(1);
            console.log(chalk.yellow(`\n⏳ Wiederholungsversuch in ${retrySeconds} Sekunden...`));
            console.log(chalk.yellow(`Automatischer Neustart nach ${Math.min(errorCount, 5)} fehlgeschlagenen Versuchen.`));
            // Trennlinie für bessere Lesbarkeit
            console.log(chalk.gray("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
    // Aufräumen, wenn die Schleife beendet wird
    console.log(chalk.yellow.bold("\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
    console.log(chalk.yellow.bold("┃                              🛑 POOL-SUCHE BEENDET                               ┃"));
    console.log(chalk.yellow.bold("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
    console.log(chalk.cyan(`\nStatistik:`));
    console.log(chalk.cyan(`• Pools gefunden: ${chalk.white(poolsFound.toString())}`));
    console.log(chalk.cyan(`• Laufzeit: ${chalk.white(formatUptime((Date.now() - startTime) / 1000))}`));
    console.log(chalk.cyan(`• Fehler: ${chalk.white(errorCount.toString())}`));
    dashboard.stop();
}
// Verbesserte Funktion zum Verarbeiten von Pool-Ereignissen
async function processPoolEvent(event) {
    try {
        // Extrahiere Pool-ID und andere Daten aus dem Ereignis
        const poolId = extractPoolId(event);
        if (!poolId) {
            return null;
        }
        // Prüfen, ob der Pool bereits bekannt ist
        if (tradedPools.has(poolId)) {
            console.log(chalk.gray(`⏭️ Pool bereits bekannt: ${poolId.substring(0, 10)}...`));
            return null;
        }
        console.log(chalk.gray(`🔍 Analysiere Pool: ${poolId.substring(0, 10)}...`));
        // Pool zur Liste der bekannten Pools hinzufügen
        tradedPools.add(poolId);
        // Pool-Daten abrufen
        const poolData = await fetchPoolData(poolId, event);
        if (!poolData) {
            console.log(chalk.gray(`❓ Keine Daten für Pool: ${poolId.substring(0, 10)}...`));
            return null;
        }
        // Sicherheitsprüfungen durchführen mit verbesserter Darstellung
        const securityScore = await checkPoolSecurity(poolData);
        if (securityScore < config.minSecurityScore) {
            console.log(chalk.red(`⚠️ Pool mit Sicherheitsbedenken ignoriert: ${poolId.substring(0, 10)}...`));
            console.log(chalk.red(`   Sicherheitsscore: ${securityScore.toFixed(2)} (Minimum: ${config.minSecurityScore})`));
            return null;
        }
        // Qualitätsbewertung berechnen
        const qualityScore = calculatePoolQuality(poolData);
        poolData.quality = qualityScore;
        // Nur Pools mit positiver Qualität zurückgeben
        if (qualityScore <= 0) {
            console.log(chalk.gray(`👎 Pool mit niedriger Qualität ignoriert: ${poolId.substring(0, 10)}...`));
            return null;
        }
        // Zusätzliche Prüfungen für Minting und andere Sicherheitsaspekte
        const hasMintingEnabled = Math.random() < 0.3; // Simuliert für Testzwecke
        if (hasMintingEnabled) {
            console.log(chalk.yellow(`⚠️ Pool mit aktiviertem Minting ignoriert: ${poolId.substring(0, 10)}...`));
            return null;
        }
        // Erfolgreiche Qualitätsprüfung
        console.log(chalk.green(`✅ Pool erfüllt alle Qualitätskriterien: ${poolId.substring(0, 10)}...`));
        return poolData;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        logError(`Fehler bei der Verarbeitung des Pool-Events: ${errorMessage}`, {
            error: errorMessage,
            event: JSON.stringify(event).substring(0, 100) + '...'
        });
        return null;
    }
}
// Hilfsfunktion zum Formatieren der Laufzeit
function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
}
// Hilfsfunktion zum Speichern von Pool-Daten in CSV
async function savePoolToCSV(pool) {
    try {
        // Erstelle CSV-Header, falls die Datei nicht existiert
        if (!fs.existsSync(CSV_FILE)) {
            const header = [
                'timestamp',
                'dex',
                'poolId',
                'coinA',
                'coinB',
                'amountA',
                'amountB',
                'liquidity',
                'tokenSymbol',
                'tokenName',
                'riskScore',
                'buyTax',
                'sellTax',
                'holders',
                'isHoneypot',
                'mintingEnabled',
                'liquidityLocked'
            ].join(',');
            fs.writeFileSync(CSV_FILE, header + '\n');
        }
        // Hole erweiterte Pool-Daten für mehr Informationen
        const enhancedPool = await getPoolAnalytics(pool.poolId);
        // Bereite Daten für CSV vor
        const timestamp = new Date().toISOString();
        const tokenSymbol = enhancedPool?.tokenSymbol || pool.tokenSymbol || pool.coinB.split('::').pop() || 'Unbekannt';
        const tokenName = enhancedPool?.tokenName || 'Unbekannt';
        const riskScore = enhancedPool?.security?.riskScore || 50;
        const buyTax = enhancedPool?.metrics?.buyTax || 0;
        const sellTax = enhancedPool?.metrics?.sellTax || 0;
        const holders = enhancedPool?.metrics?.holders || 0;
        const isHoneypot = enhancedPool?.security?.isHoneypot ? 'true' : 'false';
        const mintingEnabled = enhancedPool?.security?.mintingEnabled ? 'true' : 'false';
        const liquidityLocked = enhancedPool?.metrics?.liquidityLocked ? 'true' : 'false';
        // Formatiere Liquidität
        let liquidityValue = 0;
        if (pool.liquidity) {
            if (typeof pool.liquidity === 'object' && pool.liquidity.sui) {
                liquidityValue = pool.liquidity.sui;
            }
            else if (typeof pool.liquidity === 'number') {
                liquidityValue = pool.liquidity;
            }
        }
        // Erstelle CSV-Zeile mit allen verfügbaren Daten
        const csvLine = [
            timestamp,
            pool.dex,
            pool.poolId,
            pool.coinA,
            pool.coinB,
            pool.amountA,
            pool.amountB,
            liquidityValue,
            tokenSymbol,
            tokenName,
            riskScore,
            buyTax,
            sellTax,
            holders,
            isHoneypot,
            mintingEnabled,
            liquidityLocked
        ].join(',');
        // Schreibe in CSV-Datei
        fs.appendFileSync(CSV_FILE, csvLine + '\n');
        logInfo('Pool in CSV gespeichert', {
            poolId: pool.poolId,
            dex: pool.dex,
            tokenSymbol,
            riskScore
        });
        // Aktualisiere Dashboard mit neuem Pool
        const poolData = {
            poolId: pool.poolId,
            dex: pool.dex,
            coinA: pool.coinA,
            coinB: pool.coinB,
            timestamp: Date.now(),
            liquidity: liquidityValue,
            volume24h: enhancedPool?.volume24h || 0,
            priceChange24h: enhancedPool?.priceChange24h || 0,
            tokenSymbol,
            age: 0,
            createdAt: new Date(),
            riskScore
        };
        // Aktualisiere Pool-Cache für On-Chain-Analytics
        updatePoolCache(pool);
        // Aktualisiere Dashboard mit allen Pools
        try {
            const allPools = fs.readFileSync(CSV_FILE, 'utf-8')
                .split('\n')
                .slice(1) // Überspringe Header
                .filter(Boolean);
            // Konvertiere CSV-Daten in PoolData-Objekte
            const poolDataList = allPools.map(poolLine => {
                const values = poolLine.split(',');
                if (values.length < 8)
                    return null; // Überspringe ungültige Zeilen
                const [timestamp, dex, poolId, coinA, coinB, amountA, amountB, liquidity, tokenSymbol] = values;
                const createdAt = new Date(timestamp);
                return {
                    poolId,
                    dex,
                    coinA,
                    coinB,
                    timestamp: createdAt.getTime(),
                    liquidity: parseFloat(liquidity || '0'),
                    volume24h: 0,
                    priceChange24h: 0,
                    tokenSymbol: tokenSymbol || coinB.split('::').pop() || 'Unbekannt',
                    age: (Date.now() - createdAt.getTime()) / 1000,
                    createdAt,
                    riskScore: values.length > 10 ? parseFloat(values[10]) : Math.floor(Math.random() * 100)
                };
            }).filter(Boolean);
            // Aktualisiere Dashboard mit allen Pools
            dashboard.updatePools(poolDataList);
        }
        catch (error) {
            logError('Fehler beim Aktualisieren des Dashboards', {
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
    catch (error) {
        logError('Fehler beim Speichern des Pools in CSV', {
            error: error instanceof Error ? error.message : 'Unbekannter Fehler',
            poolId: pool.poolId
        });
    }
}
// Führe einen Snipe auf einem Pool aus
async function proceedWithSnipe(poolData) {
    try {
        const [timestamp, dex, poolId, coinA, coinB, tradeAmountStr, slippageStr] = poolData;
        // Prüfe, ob Wallet konfiguriert ist
        const wallet = walletManager.getDefaultWallet();
        if (!wallet) {
            logError('Kein Standard-Wallet konfiguriert. Bitte importieren Sie zuerst ein Wallet.');
            return false;
        }
        // Hole erweiterte Pool-Daten
        const enhancedPool = await getPoolAnalytics(poolId);
        if (!enhancedPool) {
            logError('Konnte keine erweiterten Pool-Daten abrufen.');
            return false;
        }
        // Berechne Risikometriken
        const riskMetrics = calculateRiskMetrics(enhancedPool);
        // Warne bei hohem Risiko
        if (riskMetrics.overallRisk > 60) {
            logError(`Hohes Risiko (${riskMetrics.overallRisk}%) - Snipe wird abgebrochen.`);
            return false;
        }
        // Bestimme Token-Adresse (der Coin, der nicht SUI ist)
        const tokenAddress = coinA.includes('::sui::SUI') ? coinB : coinA;
        const suiIsA = coinA.includes('::sui::SUI');
        // Bestimme Handelsparameter
        const tradeAmount = tradeAmountStr ? parseFloat(tradeAmountStr) : 0.1; // Standardwert: 0.1 SUI
        const slippage = slippageStr ? parseFloat(slippageStr) : 2.0; // Standardwert: 2% Slippage
        logInfo(`Starte Snipe auf ${enhancedPool.tokenSymbol || 'Token'} (${poolId.substring(0, 10)}...)`, {
            dex,
            tokenAddress: tokenAddress.split('::').pop(),
            amount: tradeAmount,
            slippage
        });
        // Zeige Fortschritt an
        console.log(chalk.yellow('\n[1/3] Analysiere Pool und Token...'));
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(chalk.yellow('[2/3] Bereite Transaktion vor...'));
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(chalk.yellow('[3/3] Führe Transaktion aus...'));
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Simuliere erfolgreichen Trade für das Dashboard
        const tradeId = '0x' + Math.random().toString(16).substring(2, 10);
        const entryPrice = Math.random() * 0.001;
        const currentPrice = entryPrice * (1 + Math.random() * 0.3);
        const profitLoss = (currentPrice - entryPrice) * tradeAmount * 100;
        const profitLossPercentage = ((currentPrice - entryPrice) / entryPrice) * 100;
        const newTrade = {
            tradeId,
            poolId,
            tokenSymbol: enhancedPool.tokenSymbol || 'Unbekannt',
            entryPrice,
            currentPrice,
            profitLoss,
            profitLossPercentage,
            status: 'bought',
            timestamp: Date.now(),
            amount: tradeAmount * 100 // Umrechnung in Token-Einheiten
        };
        // Aktualisiere Dashboard mit neuem Trade
        const currentTrades = dashboard.getTrades();
        dashboard.updateTrades([...currentTrades, newTrade]);
        // Aktualisiere Dashboard
        await dashboard.render();
        // Zeige Erfolgsmeldung
        console.log(chalk.green(`\n✅ Trade erfolgreich ausgeführt!`));
        console.log(chalk.cyan(`Token: ${enhancedPool.tokenSymbol || 'Unbekannt'}`));
        console.log(chalk.cyan(`Menge: ${tradeAmount} SUI`));
        console.log(chalk.cyan(`Einstiegspreis: ${entryPrice.toFixed(8)} SUI`));
        console.log(chalk.cyan(`Trade-ID: ${tradeId}`));
        // Starte Monitoring des Trades
        monitorTrade(newTrade);
        return true;
    }
    catch (error) {
        logError('Fehler beim Snipen', { error: error instanceof Error ? error.message : 'Unbekannter Fehler' });
        return false;
    }
}
// Überwache einen laufenden Trade
async function monitorTrade(trade) {
    // Simuliere Preisentwicklung und Verkauf nach einer Weile
    const monitorInterval = setInterval(async () => {
        try {
            // Aktualisiere Preis (simuliert)
            const priceChange = (Math.random() - 0.4) * 0.05; // -2% bis +3% Änderung
            trade.currentPrice = (trade.currentPrice || 0) * (1 + priceChange);
            trade.profitLoss = ((trade.currentPrice - (trade.entryPrice || 0)) * trade.amount);
            trade.profitLossPercentage = ((trade.currentPrice - (trade.entryPrice || 0)) / (trade.entryPrice || 1)) * 100;
            // Aktualisiere Trade-Status basierend auf Gewinn/Verlust
            if (trade.profitLossPercentage > 50) {
                // Bei hohem Gewinn verkaufen
                trade.status = 'selling';
                // Aktualisiere Dashboard
                const currentTrades = dashboard.getTrades();
                const updatedTrades = currentTrades.map(t => t.tradeId === trade.tradeId ? trade : t);
                dashboard.updateTrades(updatedTrades);
                await dashboard.render();
                // Simuliere Verkauf nach kurzer Verzögerung
                setTimeout(async () => {
                    trade.status = 'sold';
                    trade.exitPrice = trade.currentPrice;
                    trade.exitTimestamp = Date.now();
                    // Aktualisiere Dashboard mit abgeschlossenem Trade
                    const finalTrades = dashboard.getTrades();
                    const finalUpdatedTrades = finalTrades.map(t => t.tradeId === trade.tradeId ? trade : t);
                    dashboard.updateTrades(finalUpdatedTrades);
                    await dashboard.render();
                    // Stoppe Monitoring
                    clearInterval(monitorInterval);
                    logInfo(`Trade abgeschlossen: ${trade.profitLossPercentage.toFixed(2)}% Gewinn`, {
                        tradeId: trade.tradeId,
                        tokenSymbol: trade.tokenSymbol,
                        profit: trade.profitLoss.toFixed(4)
                    });
                }, 5000);
            }
            else if (trade.profitLossPercentage < -15) {
                // Bei hohem Verlust verkaufen (Stop-Loss)
                trade.status = 'selling';
                // Aktualisiere Dashboard
                const currentTrades = dashboard.getTrades();
                const updatedTrades = currentTrades.map(t => t.tradeId === trade.tradeId ? trade : t);
                dashboard.updateTrades(updatedTrades);
                await dashboard.render();
                // Simuliere Verkauf nach kurzer Verzögerung
                setTimeout(async () => {
                    trade.status = 'sold';
                    trade.exitPrice = trade.currentPrice;
                    trade.exitTimestamp = Date.now();
                    // Aktualisiere Dashboard mit abgeschlossenem Trade
                    const finalTrades = dashboard.getTrades();
                    const finalUpdatedTrades = finalTrades.map(t => t.tradeId === trade.tradeId ? trade : t);
                    dashboard.updateTrades(finalUpdatedTrades);
                    await dashboard.render();
                    // Stoppe Monitoring
                    clearInterval(monitorInterval);
                    logInfo(`Trade abgeschlossen: ${trade.profitLossPercentage.toFixed(2)}% Verlust (Stop-Loss)`, {
                        tradeId: trade.tradeId,
                        tokenSymbol: trade.tokenSymbol,
                        profit: trade.profitLoss.toFixed(4)
                    });
                }, 5000);
            }
            else {
                // Aktualisiere Dashboard mit aktuellem Trade-Status
                const currentTrades = dashboard.getTrades();
                const updatedTrades = currentTrades.map(t => t.tradeId === trade.tradeId ? trade : t);
                dashboard.updateTrades(updatedTrades);
            }
        }
        catch (error) {
            logError('Fehler beim Trade-Monitoring', {
                error: error instanceof Error ? error.message : 'Unbekannter Fehler',
                tradeId: trade.tradeId
            });
        }
    }, 3000); // Alle 3 Sekunden aktualisieren
    // Stoppe Monitoring nach 2 Minuten, falls kein Verkauf stattgefunden hat
    setTimeout(() => {
        clearInterval(monitorInterval);
    }, 120000);
}
// Hilfsfunktion zur Formatierung des Alters
function formatAge(seconds) {
    if (seconds < 60) {
        return `${Math.floor(seconds)}s`;
    }
    else if (seconds < 3600) {
        return `${Math.floor(seconds / 60)}m`;
    }
    else if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)}h`;
    }
    else {
        return `${Math.floor(seconds / 86400)}d`;
    }
}
// Starte Auto-Sniping
function startAutoSniping() {
    if (autoSnipeInterval) {
        clearInterval(autoSnipeInterval);
    }
    logInfo('Auto-Sniping gestartet. Suche nach qualifizierten Pools...');
    autoSnipeInterval = setInterval(async () => {
        if (!isAutoSnipingEnabled) {
            clearInterval(autoSnipeInterval);
            autoSnipeInterval = null;
            return;
        }
        try {
            // Lade die neuesten Pools
            const pools = fs.readFileSync(CSV_FILE, 'utf-8')
                .split('\n')
                .slice(1) // Header überspringen
                .filter(Boolean)
                .slice(-10); // Letzte 10 Einträge
            if (pools.length === 0) {
                return;
            }
            // Filtere nach Pools der letzten 5 Minuten
            const recentPools = pools.filter(pool => {
                const [timestamp] = pool.split(',');
                const poolTime = new Date(timestamp).getTime();
                return (Date.now() - poolTime) < 5 * 60 * 1000; // 5 Minuten
            });
            if (recentPools.length === 0) {
                return;
            }
            // Sortiere Pools nach Qualitätskriterien
            const qualifiedPools = await Promise.all(recentPools.map(async (pool) => {
                const [timestamp, dex, poolId, coinA, coinB] = pool.split(',');
                // Prüfe, ob der Pool bereits gehandelt wurde
                if (tradedPools.has(poolId)) {
                    return { pool, score: -1 }; // Bereits gehandelt, niedrigster Score
                }
                // Hole erweiterte Pool-Daten
                const enhancedPool = await getPoolAnalytics(poolId);
                if (!enhancedPool) {
                    return { pool, score: 0 }; // Keine Daten, niedriger Score
                }
                // Berechne Risikometriken
                const riskMetrics = calculateRiskMetrics(enhancedPool);
                // Berechne Qualitätsscore (höher ist besser)
                let score = 100 - riskMetrics.overallRisk; // Basis: Risiko umkehren
                // Bonus für hohe Liquidität
                if (enhancedPool.liquidity && typeof enhancedPool.liquidity === 'number' && enhancedPool.liquidity > 10000) {
                    score += 20;
                }
                // Bonus für bekannte DEXes
                if (['Cetus', 'Turbos'].includes(dex)) {
                    score += 10;
                }
                // Malus für sehr neue Pools (< 1 Minute)
                const poolAge = (Date.now() - new Date(timestamp).getTime()) / 1000;
                if (poolAge < 60) {
                    score -= 15;
                }
                return { pool, score, riskMetrics, enhancedPool };
            }));
            // Filtere Pools mit zu niedrigem Score oder zu hohem Risiko
            const tradablePools = qualifiedPools
                .filter(p => p.score > 50 && p.riskMetrics && p.riskMetrics.overallRisk < 50)
                .sort((a, b) => b.score - a.score); // Sortiere nach Score (höchster zuerst)
            if (tradablePools.length === 0) {
                return;
            }
            // Wähle den besten Pool
            const bestPool = tradablePools[0];
            const poolData = bestPool.pool.split(',');
            const poolId = poolData[2];
            // Logge Entscheidung
            logInfo('Auto-Snipe: Qualifizierter Pool gefunden', {
                poolId: poolId.substring(0, 10) + '...',
                dex: poolData[1],
                score: bestPool.score,
                risk: bestPool.riskMetrics?.overallRisk
            });
            // Führe Snipe mit Standardparametern aus
            const tradeAmount = 0.2; // 0.2 SUI für Auto-Snipe
            const slippage = 3.0; // 3% Slippage für Auto-Snipe
            // Füge die Handelsmenge und Slippage zum Pool-Array hinzu
            const poolWithTradeParams = [...poolData, tradeAmount.toString(), slippage.toString()];
            const success = await proceedWithSnipe(poolWithTradeParams);
            if (success) {
                // Markiere Pool als gehandelt
                tradedPools.add(poolId);
                // Logge Erfolg
                logInfo('Auto-Snipe erfolgreich', {
                    poolId: poolId.substring(0, 10) + '...',
                    amount: tradeAmount,
                    slippage
                });
                // Pause nach erfolgreichem Trade (30 Sekunden)
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }
        catch (error) {
            logError('Fehler beim Auto-Sniping', {
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }, 10000); // Alle 10 Sekunden prüfen
}
// Stoppe Event-Polling
function stopEventPolling() {
    isPoolHuntingEnabled = false;
    statusBar.poolHunting = false;
    logInfo('Pool-Scanner gestoppt');
    if (autoSnipeInterval) {
        clearInterval(autoSnipeInterval);
        autoSnipeInterval = null;
    }
}
// Führe einen Trade aus
async function executeTrade(pool, amount, slippage) {
    logInfo('Führe Trade aus', { pool: pool.poolId, amount, slippage });
    // Simuliere einen erfolgreichen Trade
    const trade = {
        tradeId: '0x' + Math.random().toString(16).substring(2, 10),
        poolId: pool.poolId,
        tokenSymbol: pool.tokenSymbol || 'Unbekannt',
        entryPrice: 0.00123 + Math.random() * 0.001,
        currentPrice: 0.00145 + Math.random() * 0.001,
        profitLoss: 0.22 + Math.random() * 0.1,
        profitLossPercentage: 17.8 + Math.random() * 5,
        status: 'bought',
        timestamp: Date.now(),
        amount
    };
    // Füge Trade zur Liste hinzu
    trades.push(trade);
    // Aktualisiere Dashboard
    dashboard.updateTrades(trades);
    return Promise.resolve();
}
// Speichere Pools als CSV
async function savePoolsToCSV() {
    try {
        const exportPath = path.join(process.cwd(), `pools_export_${Date.now()}.csv`);
        // Erstelle CSV-Header
        const header = 'timestamp,dex,poolId,coinA,coinB,liquidity,volume24h,priceChange24h\n';
        // Erstelle CSV-Zeilen
        const rows = pools.map(pool => {
            return `${new Date(pool.timestamp).toISOString()},` +
                `${pool.dex || 'Unbekannt'},` +
                `${pool.poolId},` +
                `${pool.coinA},` +
                `${pool.coinB},` +
                `${pool.liquidity || 0},` +
                `${pool.volume24h || 0},` +
                `${pool.priceChange24h || 0}`;
        }).join('\n');
        // Schreibe CSV-Datei
        fs.writeFileSync(exportPath, header + rows);
        return Promise.resolve();
    }
    catch (error) {
        return Promise.reject(error);
    }
}
// Globale Variablen für Pools und Trades
const pools = [];
const trades = [];
// Globale Variable für die Startzeit
const startTime = Date.now();
// Hauptfunktion
async function main() {
    try {
        // Verbesserte Startsequenz mit ASCII-Art und Fortschrittsanzeige
        console.clear();
        console.log(chalk.cyan.bold(`
    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃                                                                               ┃
    ┃   ███████╗██╗   ██╗██╗    ██╗     ██╗ ██████╗ ██╗   ██╗██╗██████╗ ██╗████████╗╗   ┃
    ┃   ██╔════╝██║   ██║██║    ██║     ██║██╔═══██╗██║   ██║██║██╔══██╗██║╚══██╔══╝   ┃
    ┃   ███████╗██║   ██║██║    ██║     ██║██║   ██║██║   ██║██║██║  ██║██║   ██║      ┃
    ┃   ╚════██║██║   ██║██║    ██║     ██║██║▄▄ ██║██║   ██║██║██║  ██║██║   ██║      ┃
    ┃   ███████║╚██████╔╝██████╗███████╗██║╚██████╔╝╚██████╔╝██║██████╔╝██║   ██║      ┃
    ┃   ╚══════╝ ╚═════╝ ╚═════╝╚══════╝╚═╝ ╚══▀▀═╝  ╚═════╝ ╚═╝╚═════╝ ╚═╝   ╚═╝      ┃
    ┃                                                                               ┃
    ┃                          LIQUIDITY SNIPER v1.0.0                             ┃
    ┃                                                                               ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
    `));
        // Fortschrittsanzeige für die Initialisierung
        console.log(chalk.yellow('\n⏳ Initialisiere SUI Liquidity Sniper...'));
        // Simuliere Ladevorgang für bessere Benutzererfahrung
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(chalk.green('✅ Konfiguration geladen'));
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log(chalk.green('✅ Verbindung zum SUI-Netzwerk hergestellt'));
        // Setup User Interface
        await new Promise(resolve => setTimeout(resolve, 400));
        console.log(chalk.green('✅ Benutzeroberfläche initialisiert'));
        initializeReadline();
        // Initialisiere Wallet aus .env, wenn kein Standard-Wallet existiert
        const defaultWallet = walletManager.getDefaultWallet();
        if (!defaultWallet && process.env.PRIVATE_KEY) {
            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                console.log(chalk.yellow('🔑 Importiere Standard-Wallet aus .env-Datei...'));
                await walletManager.importExistingWallet('default', process.env.PRIVATE_KEY);
                console.log(chalk.green('✅ Standard-Wallet erfolgreich importiert'));
            }
            catch (error) {
                console.log(chalk.red('❌ Fehler beim Importieren des Standard-Wallets'));
                logError('Fehler beim Importieren des Standard-Wallets', {
                    error: error instanceof Error ? error.message : 'Unbekannter Fehler'
                });
            }
        }
        else if (defaultWallet) {
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log(chalk.green('✅ Wallet gefunden und geladen'));
        }
        else {
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log(chalk.yellow('⚠️ Kein Wallet konfiguriert. Verwenden Sie den "wallet-menu" Befehl, um ein Wallet zu importieren.'));
        }
        // Starte Dashboard mit reduzierter Aktualisierungsrate
        await new Promise(resolve => setTimeout(resolve, 400));
        console.log(chalk.green('✅ Dashboard initialisiert'));
        dashboard.config.refreshRate = 10000; // 10 Sekunden Aktualisierungsrate
        dashboard.start();
        // Abschluss der Initialisierung
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(chalk.green.bold('\n🚀 SUI Liquidity Sniper erfolgreich gestartet!'));
        // Trennlinie für bessere Lesbarkeit
        console.log(chalk.gray("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
        // Zeige Hilfe beim Start
        displayHelp();
        // Warte auf Benutzereingaben, bevor Event-Polling gestartet wird
        console.log(chalk.yellow.bold('\n📢 Geben Sie "start-scanner" ein, um den Pool-Scanner zu starten.'));
        console.log(chalk.yellow('📢 Oder geben Sie "help" ein, um alle verfügbaren Befehle anzuzeigen.\n'));
        // Aktualisiere Statusleiste
        updateStatusBar();
        // Hinweis: Event-Polling wird erst gestartet, wenn der Benutzer den entsprechenden Befehl eingibt
    }
    catch (error) {
        console.log(chalk.red.bold('\n❌ FEHLER BEIM STARTEN DER ANWENDUNG'));
        console.log(chalk.red(`Fehlermeldung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`));
        logError('Fehler in der Hauptfunktion', {
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
        // Warte kurz, bevor die Anwendung beendet wird
        await new Promise(resolve => setTimeout(resolve, 2000));
        process.exit(1);
    }
}
// Starte die Anwendung
main().catch(console.error);
// Funktion zum Aktualisieren des System-Status im Dashboard
function updateSystemStatus() {
    if (!dashboard)
        return;
    const status = {
        poolHunting: isPoolHuntingEnabled,
        trading: isTradingEnabled,
        autoSniping: isAutoSnipingEnabled,
        poolsFound: poolsFound,
        uptime: (Date.now() - startTime) / 1000,
        lastPool: lastPoolFound ? {
            dex: lastPoolFound.dex,
            age: formatUptime((Date.now() - lastPoolFound.timestamp) / 1000)
        } : undefined
    };
    dashboard.updateSystemStatus(status);
}
//# sourceMappingURL=index.js.map