import * as readline from 'readline';
import { WalletManager } from './wallet/wallet-manager.js';
import { logError, logInfo } from './utils/logger.js';
import { SUI } from './chain/config.js';
import { decomposeEventData } from './chain/extractor.js';
import * as fs from 'fs';
import * as path from 'path';
import { clearLine, clearScreenDown, cursorTo } from 'readline';
import { checkPoolSecurity } from './security/pool_security.js';
// Globale Variablen
let isTradingEnabled = false;
let isPoolHuntingEnabled = false;
let isAutoSnipingEnabled = false;
let rl;
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
    // Wallet & System
    WALLET: 'wallet',
    WALLET_MENU: 'wallet-menu',
    HELP: 'help',
    EXIT: 'exit'
};
// Initialisiere WalletManager
const walletManager = new WalletManager();
// Initialisiere das Readline Interface mit verbesserter Befehlsverarbeitung
function initializeReadline() {
    // Schließe existierendes Interface falls vorhanden
    if (rl) {
        rl.removeAllListeners();
        rl.close();
    }
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> ',
        terminal: true
    });
    // Command History
    process.stdin.on('keypress', (_, key) => {
        if (key) {
            switch (key.name) {
                case 'up':
                    if (historyIndex > 0) {
                        historyIndex--;
                        clearLine(process.stdout, 0);
                        cursorTo(process.stdout, 2);
                        process.stdout.write(commandHistory[historyIndex] || '');
                    }
                    break;
                case 'down':
                    if (historyIndex < commandHistory.length) {
                        historyIndex++;
                        clearLine(process.stdout, 0);
                        cursorTo(process.stdout, 2);
                        process.stdout.write(commandHistory[historyIndex] || '');
                    }
                    break;
                case 'c':
                    if (key.ctrl) {
                        console.log('\nBeende Programm...');
                        process.exit(0);
                    }
                    break;
            }
        }
    });
    // Event-Handler für Benutzereingaben
    rl.on('line', async (input) => {
        const command = input.trim().toLowerCase();
        // Speichere Befehl in History
        if (command && command !== commandHistory[commandHistory.length - 1]) {
            commandHistory.push(command);
            historyIndex = commandHistory.length;
        }
        // Verarbeite Befehl
        await processCommand(command);
        // Aktualisiere Status und zeige Prompt
        updateStatusBar();
        rl.prompt();
    });
    // Initialer Status und Prompt
    updateStatusBar();
    rl.prompt();
    // Setze das Interface für den WalletManager
    walletManager.setReadlineInterface(rl);
}
// Aktualisiere die Statusleiste
function updateStatusBar() {
    // Lösche vorherige Statusleiste
    cursorTo(process.stdout, 0, process.stdout.rows);
    clearLine(process.stdout, 0);
    // Erstelle Statustext
    const status = [
        `Scanner: ${statusBar.poolHunting ? '🟢' : '🔴'}`,
        `Trading: ${statusBar.trading ? '🟢' : '🔴'}`,
        `Auto-Snipe: ${statusBar.autoSniping ? '🟢' : '🔴'}`,
        `Pools: ${statusBar.poolsFound}`,
        statusBar.lastPool ? `Letzter Pool: ${statusBar.lastPool.dex} (${statusBar.lastPool.age})` : ''
    ].filter(Boolean).join(' | ');
    // Zeige Statusleiste
    cursorTo(process.stdout, 0, process.stdout.rows - 1);
    process.stdout.write('\x1b[7m' + status + '\x1b[0m');
    cursorTo(process.stdout, 0, process.stdout.rows - 2);
}
// Verarbeite Benutzerbefehle
async function processCommand(command) {
    switch (command) {
        case COMMANDS.START_SCANNER:
            statusBar.poolHunting = true;
            isPoolHuntingEnabled = true;
            logInfo('Pool-Scanner gestartet');
            break;
        case COMMANDS.STOP_SCANNER:
            statusBar.poolHunting = false;
            isPoolHuntingEnabled = false;
            logInfo('Pool-Scanner gestoppt');
            break;
        case COMMANDS.STATUS:
            logInfo('Status', {
                poolHunting: isPoolHuntingEnabled ? 'Aktiv' : 'Inaktiv',
                trading: isTradingEnabled ? 'Aktiviert' : 'Deaktiviert',
                autoSniping: isAutoSnipingEnabled ? 'An' : 'Aus',
                poolsGefunden: statusBar.poolsFound
            });
            break;
        case COMMANDS.SHOW_POOLS:
            try {
                // Lese und zeige die letzten 10 Pools aus der CSV
                const pools = fs.readFileSync(CSV_FILE, 'utf-8')
                    .split('\n')
                    .slice(1) // Header überspringen
                    .filter(Boolean)
                    .slice(-10); // Letzte 10 Einträge
                // Lösche vorherige Ausgabe
                clearScreenDown(process.stdout);
                console.log('\n=== Letzte 10 Pools ===');
                if (pools.length === 0) {
                    console.log('Noch keine Pools gefunden.');
                }
                else {
                    pools.forEach(pool => {
                        const [timestamp, dex, poolId, coinA, coinB, amountA, amountB] = pool.split(',');
                        console.log('\n' + '─'.repeat(50));
                        console.log(`Zeit: ${new Date(timestamp).toLocaleTimeString()}`);
                        console.log(`DEX: ${dex}`);
                        console.log(`Pool: ${poolId}`);
                        console.log(`Token: ${coinA} / ${coinB}`);
                        console.log(`Beträge: ${amountA} / ${amountB}`);
                    });
                    console.log('─'.repeat(50));
                }
            }
            catch (error) {
                logError('Fehler beim Lesen der Pools', { error: error instanceof Error ? error.message : 'Unbekannter Fehler' });
            }
            break;
        case COMMANDS.WALLET:
            const defaultWallet = walletManager.getDefaultWallet();
            if (defaultWallet) {
                console.log('\n=== Wallet Info ===');
                console.log('Adresse:', defaultWallet.address);
                console.log('Typ:', defaultWallet.type);
            }
            else {
                console.log('❌ Kein Wallet konfiguriert');
            }
            break;
        case COMMANDS.WALLET_MENU:
            await walletManager.showMainMenu();
            break;
        case COMMANDS.HELP:
            displayHelp();
            break;
        case COMMANDS.EXIT:
            logInfo('Beende Programm...');
            rl.close();
            process.exit(0);
            break;
        case COMMANDS.ENABLE_SNIPING:
            if (!walletManager.getDefaultWallet()) {
                logError('Kein Wallet konfiguriert. Bitte zuerst Wallet einrichten.');
                break;
            }
            statusBar.trading = true;
            isTradingEnabled = true;
            logInfo('Trading aktiviert');
            break;
        case COMMANDS.DISABLE_SNIPING:
            statusBar.trading = false;
            isTradingEnabled = false;
            logInfo('Trading deaktiviert');
            break;
        case COMMANDS.AUTO_SNIPE:
            if (!isTradingEnabled) {
                logError('Trading ist nicht aktiviert. Bitte erst Trading aktivieren.');
                break;
            }
            statusBar.autoSniping = !statusBar.autoSniping;
            isAutoSnipingEnabled = statusBar.autoSniping;
            logInfo(isAutoSnipingEnabled ? 'Auto-Sniping aktiviert' : 'Auto-Sniping deaktiviert');
            break;
        case COMMANDS.MANUAL_SNIPE:
            if (!isTradingEnabled) {
                logError('Trading ist nicht aktiviert. Bitte erst Trading aktivieren.');
                break;
            }
            console.log('\n=== Manuelles Sniping ===');
            const pools = fs.readFileSync(CSV_FILE, 'utf-8')
                .split('\n')
                .slice(1)
                .filter(Boolean)
                .slice(-5);
            if (pools.length === 0) {
                console.log('Keine Pools verfügbar.');
                break;
            }
            console.log('\nVerfügbare Pools:');
            pools.forEach((pool, index) => {
                const [timestamp, dex, poolId, coinA, coinB] = pool.split(',');
                console.log(`\n${index + 1}. Pool:`);
                console.log(`   Zeit: ${new Date(timestamp).toLocaleTimeString()}`);
                console.log(`   DEX: ${dex}`);
                console.log(`   ID: ${poolId}`);
                console.log(`   Token: ${coinA} / ${coinB}`);
            });
            rl.question('\nPool-Nummer zum Snipen (oder "cancel"): ', async (answer) => {
                if (answer.toLowerCase() === 'cancel') {
                    console.log('Sniping abgebrochen');
                    return;
                }
                const poolIndex = parseInt(answer) - 1;
                if (isNaN(poolIndex) || poolIndex < 0 || poolIndex >= pools.length) {
                    console.log('Ungültige Auswahl');
                    return;
                }
                const selectedPool = pools[poolIndex].split(',');
                console.log('\n🔍 Führe erweiterte Sicherheitschecks durch...');
                try {
                    const securityCheck = await checkPoolSecurity(selectedPool[2], // poolId
                    selectedPool[3], // tokenAddress (coinA)
                    selectedPool[1] // dex
                    );
                    console.log('\n=== Sicherheitsanalyse ===');
                    console.log('─'.repeat(50));
                    console.log(`Sicherheits-Score: ${securityCheck.score}%`);
                    console.log(`Status: ${securityCheck.isSecure ? '✅ Sicher' : '❌ Riskant'}`);
                    if (securityCheck.warnings.length > 0) {
                        console.log('\nWarnungen:');
                        securityCheck.warnings.forEach(warning => console.log(warning));
                    }
                    console.log('\nDetails:');
                    console.log('LP Token:', securityCheck.details.lpLocked ? '✅ Gesperrt' : '❌ Nicht gesperrt');
                    console.log('Honeypot:', securityCheck.details.isHoneypot ? '❌ Ja' : '✅ Nein');
                    console.log('Minting:', securityCheck.details.mintingEnabled ? '❌ Aktiviert' : '✅ Deaktiviert');
                    console.log('Ownership:', securityCheck.details.ownershipRenounced ? '✅ Aufgegeben' : '❌ Nicht aufgegeben');
                    console.log('\nEntwickler-Analyse:');
                    console.log(`Vorherige Scams: ${securityCheck.details.devWalletAnalysis.previousScams}`);
                    console.log(`Rug Pulls: ${securityCheck.details.devWalletAnalysis.rugPullHistory}`);
                    console.log(`Gesamt Pools: ${securityCheck.details.devWalletAnalysis.totalPools}`);
                    console.log('\nToken-Analyse:');
                    console.log(`Alter: ${securityCheck.details.tokenAnalysis.age} Stunden`);
                    console.log(`Holder: ${securityCheck.details.tokenAnalysis.holders}`);
                    console.log(`Transfers: ${securityCheck.details.tokenAnalysis.transfers}`);
                    console.log(`Verdächtige Transfers: ${securityCheck.details.tokenAnalysis.suspiciousTransfers}`);
                    console.log('\nPool-Analyse:');
                    console.log(`Liquiditäts-Score: ${securityCheck.details.poolAnalysis.liquidityScore}%`);
                    console.log(`Preis-Impact: ${securityCheck.details.poolAnalysis.priceImpact}%`);
                    console.log(`Buy Tax: ${securityCheck.details.poolAnalysis.buyTax}%`);
                    console.log(`Sell Tax: ${securityCheck.details.poolAnalysis.sellTax}%`);
                    console.log('─'.repeat(50));
                    if (!securityCheck.isSecure) {
                        console.log('\n🚨 Warnung: Dieser Pool hat Sicherheitsrisiken!');
                        rl.question('\nTrotzdem fortfahren? (yes/no): ', async (proceed) => {
                            if (proceed.toLowerCase() !== 'yes') {
                                console.log('Sniping abgebrochen');
                                return;
                            }
                            await proceedWithSnipe(selectedPool);
                        });
                    }
                    else {
                        await proceedWithSnipe(selectedPool);
                    }
                }
                catch (error) {
                    logError('Fehler bei der Sicherheitsanalyse', {
                        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
                        poolId: selectedPool[2]
                    });
                    console.log('\n❌ Sicherheitsanalyse fehlgeschlagen');
                }
            });
            break;
        case COMMANDS.POOL_STATS:
            try {
                const allPools = fs.readFileSync(CSV_FILE, 'utf-8')
                    .split('\n')
                    .slice(1)
                    .filter(Boolean);
                const stats = {
                    totalPools: allPools.length,
                    byDex: {},
                    last24h: allPools.filter(p => {
                        const timestamp = new Date(p.split(',')[0]).getTime();
                        return Date.now() - timestamp < 24 * 60 * 60 * 1000;
                    }).length,
                    avgLiquidity: 0,
                    tradingStats
                };
                // Berechne DEX-Statistiken
                allPools.forEach(pool => {
                    const dex = pool.split(',')[1];
                    stats.byDex[dex] = (stats.byDex[dex] || 0) + 1;
                });
                console.log('\n📊 Pool Statistiken');
                console.log('─'.repeat(50));
                console.log(`Gesamt Pools: ${stats.totalPools}`);
                console.log(`Pools (24h): ${stats.last24h}`);
                console.log('\nVerteilung nach DEX:');
                Object.entries(stats.byDex).forEach(([dex, count]) => {
                    const percentage = ((count / stats.totalPools) * 100).toFixed(1);
                    console.log(`${dex}: ${count} (${percentage}%)`);
                });
                if (isTradingEnabled) {
                    console.log('\nTrading Statistiken:');
                    console.log(`Erfolgreiche Trades: ${tradingStats.successfulTrades}`);
                    console.log(`Fehlgeschlagene Trades: ${tradingStats.failedTrades}`);
                    console.log(`Gesamt Profit: ${tradingStats.totalProfit.toFixed(2)} SUI`);
                    console.log(`Durchschnittliche Ausführungszeit: ${tradingStats.averageExecutionTime.toFixed(2)}ms`);
                }
                console.log('─'.repeat(50));
            }
            catch (error) {
                logError('Fehler beim Laden der Statistiken', { error: error instanceof Error ? error.message : 'Unbekannter Fehler' });
            }
            break;
        case COMMANDS.EXPORT_POOLS:
            try {
                const exportPath = path.join(process.cwd(), `pools_export_${Date.now()}.csv`);
                fs.copyFileSync(CSV_FILE, exportPath);
                console.log(`\n✅ Pools exportiert nach: ${exportPath}`);
            }
            catch (error) {
                logError('Fehler beim Exportieren', { error: error instanceof Error ? error.message : 'Unbekannter Fehler' });
            }
            break;
        default:
            logInfo('Unbekannter Befehl. Geben Sie "help" ein für eine Liste der Befehle.');
    }
}
function displayHelp() {
    console.log('\n📝 Verfügbare Kommandos:\n');
    console.log('=== Scanner-Steuerung ===');
    console.log('start-scanner    - Pool-Scanner starten');
    console.log('stop-scanner     - Pool-Scanner stoppen');
    console.log('status           - Aktuellen Status anzeigen\n');
    console.log('=== Trading-Modi ===');
    console.log('enable-sniping   - Sniping aktivieren');
    console.log('disable-sniping  - Sniping deaktivieren');
    console.log('auto-snipe       - Auto-Sniping ein/aus');
    console.log('manual-snipe     - Manuelles Sniping\n');
    console.log('=== Pool-Informationen ===');
    console.log('pools            - Gefundene Pools anzeigen');
    console.log('stats            - Statistiken anzeigen');
    console.log('export           - Pool-Daten exportieren\n');
    console.log('=== Wallet & System ===');
    console.log('wallet           - Wallet-Info anzeigen');
    console.log('wallet-menu      - Wallet-Manager öffnen');
    console.log('help             - Diese Hilfe anzeigen');
    console.log('exit             - Programm beenden\n');
}
// CSV Headers für Pool-Daten
const CSV_HEADERS = 'timestamp,dex,poolId,coinA,coinB,amountA,amountB,liquidity\n';
const CSV_FILE = path.join(process.cwd(), 'pools.csv');
// Stelle sicher, dass die CSV-Datei existiert
if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, CSV_HEADERS);
}
// Event Polling Funktion
async function startEventPolling() {
    try {
        // Verbindung testen
        const checkpoint = await SUI.client.getLatestCheckpointSequenceNumber();
        logInfo('🟢 Mainnet Verbindung hergestellt', { checkpoint });
        let poolCount = 0;
        const startTime = Date.now();
        let lastCheckpoint = BigInt(checkpoint) - BigInt(1000); // Starte 1000 Checkpoints zurück
        let lastEventTime = Date.now();
        let errorCount = 0;
        const MAX_ERRORS = 5;
        const ERROR_RESET_TIME = 60000; // 1 Minute
        let lastErrorTime = 0;
        // Endlos-Schleife für kontinuierliches Polling
        while (true) {
            try {
                // Überprüfe ob Scanner aktiv ist
                if (!isPoolHuntingEnabled) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                // Reset Error-Counter wenn genug Zeit vergangen ist
                if (Date.now() - lastErrorTime > ERROR_RESET_TIME) {
                    errorCount = 0;
                }
                // Hole neue Events mit erweitertem Checkpoint-Bereich
                const events = await SUI.client.queryEvents({
                    query: {
                        MoveEventType: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::factory::CreatePoolEvent'
                    },
                    limit: 50
                });
                // Hole auch Events vom zweiten DEX
                const events2 = await SUI.client.queryEvents({
                    query: {
                        MoveEventType: '0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Created_Pool_Event'
                    },
                    limit: 50
                });
                // Kombiniere die Events
                const allEvents = [...events.data, ...events2.data];
                // Verarbeite Events
                for (const event of allEvents) {
                    const poolData = decomposeEventData(event);
                    if (poolData) {
                        poolCount++;
                        const now = Date.now();
                        const eventAge = now - Number(event.timestampMs);
                        logInfo('🔵 Neuer Pool erkannt', {
                            timestamp: new Date(Number(event.timestampMs)).toISOString(),
                            alter: `${(eventAge / 1000).toFixed(2)}s`,
                            dex: poolData.dex,
                            poolId: poolData.poolId,
                            coins: {
                                coinA: poolData.coinA,
                                coinB: poolData.coinB
                            }
                        });
                        // Speichere Pool-Daten in CSV
                        await savePoolToCSV(poolData);
                        // Zeige Statistik alle 10 Pools
                        if (poolCount % 10 === 0) {
                            const runtime = (Date.now() - startTime) / 1000;
                            const avgEventAge = (now - lastEventTime) / 1000;
                            logInfo('📊 Scanner Statistik', {
                                poolsGefunden: poolCount,
                                laufzeitSekunden: runtime,
                                poolsProMinute: (poolCount / runtime * 60).toFixed(2),
                                durchschnEventAlter: `${avgEventAge.toFixed(2)}s`,
                                tradingAktiv: isTradingEnabled
                            });
                            lastEventTime = now;
                        }
                        // Aktualisiere Statusleiste bei neuen Pools
                        statusBar.poolsFound++;
                        statusBar.lastPool = {
                            dex: poolData.dex,
                            age: `${(eventAge / 1000).toFixed(2)}s`
                        };
                        updateStatusBar();
                    }
                }
                // Aktualisiere Checkpoint und passe Polling-Intervall an
                const currentCheckpoint = await SUI.client.getLatestCheckpointSequenceNumber();
                if (BigInt(currentCheckpoint) > lastCheckpoint) {
                    lastCheckpoint = BigInt(currentCheckpoint);
                    // Kurze Pause wenn neue Events gefunden wurden
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                else {
                    // Längere Pause wenn keine neuen Events
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                // Reset Error-Counter bei erfolgreicher Ausführung
                errorCount = 0;
            }
            catch (error) {
                errorCount++;
                lastErrorTime = Date.now();
                logError('Fehler beim Polling', {
                    error: error instanceof Error ? error.message : 'Unbekannter Fehler',
                    checkpoint: lastCheckpoint,
                    errorCount,
                    maxErrors: MAX_ERRORS
                });
                // Beende Programm bei zu vielen Fehlern
                if (errorCount >= MAX_ERRORS) {
                    logError('Zu viele Fehler - Neustart erforderlich', {
                        totalErrors: errorCount,
                        timeWindow: `${ERROR_RESET_TIME / 1000}s`
                    });
                    process.exit(1);
                }
                // Exponentielles Backoff bei Fehlern
                const backoffTime = Math.min(1000 * Math.pow(2, errorCount), 30000);
                logInfo('Warte vor erneutem Versuch', { backoffTime: `${backoffTime / 1000}s` });
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
    }
    catch (error) {
        logError('Fehler beim Event Polling', {
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
        throw error;
    }
}
// Hilfsfunktion zum Speichern von Pool-Daten in CSV
async function savePoolToCSV(pool) {
    const timestamp = new Date().toISOString();
    const csvLine = [
        timestamp,
        pool.dex,
        pool.poolId,
        pool.coinA,
        pool.coinB,
        pool.amountA,
        pool.amountB,
        pool.liquidity
    ].join(',');
    fs.appendFileSync(CSV_FILE, csvLine + '\n');
    logInfo('Pool in CSV gespeichert', { poolId: pool.poolId });
}
// Hilfsfunktion für das eigentliche Sniping
async function proceedWithSnipe(poolData) {
    rl.question('\nMenge zum Snipen (in SUI) oder "cancel": ', async (amount) => {
        if (amount.toLowerCase() === 'cancel') {
            console.log('Sniping abgebrochen');
            return;
        }
        const suiAmount = parseFloat(amount);
        if (isNaN(suiAmount) || suiAmount <= 0) {
            console.log('Ungültige Menge');
            return;
        }
        console.log(`\nStarte Sniping für ${suiAmount} SUI...`);
        // TODO: Implementiere tatsächliches Trading
        console.log('Trading-Funktionalität noch nicht implementiert');
    });
}
// Hauptfunktion
async function main() {
    try {
        // Setup User Interface
        initializeReadline();
        // Start event polling
        await startEventPolling();
    }
    catch (error) {
        logError('Fehler in der Hauptfunktion', {
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
        process.exit(1);
    }
}
// Starte die Anwendung
main().catch(console.error);
//# sourceMappingURL=index.js.map