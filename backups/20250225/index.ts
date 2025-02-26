import { SUI } from './chain/config';
import { WalletManager } from './wallet/wallet-manager';
import { logInfo, logError } from './utils/logger';
import { tradingMonitor } from './trading/live_monitor';
import { tradeController } from './trading/trade_controller';
import { LIVE_TRADING_CONFIG } from './config/live_trading';
import { decomposeTransactionByDex } from './chain/extractor';
import { scamProbability } from './trader/checkscam';
import * as fs from 'fs';
import * as path from 'path';
import { ParsedPoolData } from './chain/extractor';
import * as readline from 'readline';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getFaucetHost, requestSuiFromFaucetV0 } from './utils/faucet';

// Trading-Status
let isTradingEnabled = false;

// Initialisiere WalletManager
const walletManager = new WalletManager();

// Readline Interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Benutzerkommandos
const COMMANDS = {
  ENABLE_TRADING: 'enable',
  DISABLE_TRADING: 'disable',
  STATUS: 'status',
  HELP: 'help',
  EXIT: 'exit',
  WALLET: 'wallet',
  WALLET_MENU: 'wallet-menu'
} as const;

// Hilfsfunktion für Benutzerinteraktion
function setupUserInterface() {
  console.log('\n📝 Verfügbare Kommandos:');
  console.log('enable       - Trading aktivieren');
  console.log('disable      - Trading deaktivieren');
  console.log('status       - Aktuellen Status anzeigen');
  console.log('wallet       - Wallet-Informationen anzeigen');
  console.log('wallet-menu  - Wallet-Manager Menü öffnen');
  console.log('help         - Diese Hilfe anzeigen');
  console.log('exit         - Programm beenden\n');

  rl.on('line', async (input) => {
    const [command, ...args] = input.trim().toLowerCase().split(' ');

    switch (command) {
      case COMMANDS.ENABLE_TRADING:
        const defaultWallet = walletManager.getDefaultWallet();
        if (!defaultWallet) {
          logError('Kein Standard-Wallet gefunden. Bitte erstellen Sie zuerst ein Wallet.');
          break;
        }
        isTradingEnabled = true;
        const balance = await SUI.client.getBalance({
          owner: defaultWallet.address,
          coinType: '0x2::sui::SUI'
        });
        logInfo('Trading aktiviert', { 
          balance: balance.totalBalance,
          maxTradeAmount: LIVE_TRADING_CONFIG.CAPITAL_LIMITS.MAX_TRADE_AMOUNT
        });
        break;

      case COMMANDS.DISABLE_TRADING:
        isTradingEnabled = false;
        logInfo('Trading deaktiviert');
        break;

      case COMMANDS.STATUS:
        const stats = tradingMonitor.getStats();
        const currentWallet = walletManager.getDefaultWallet();
        logInfo('Status', {
          tradingAktiv: isTradingEnabled,
          statistik: stats,
          walletAddress: currentWallet?.address || 'Kein Wallet konfiguriert'
        });
        break;

      case COMMANDS.WALLET:
        const wallet = walletManager.getDefaultWallet();
        if (wallet) {
          try {
            const objects = await SUI.client.getAllCoins({ owner: wallet.address });
            logInfo('Wallet Info', {
              address: wallet.address,
              type: wallet.type,
              coins: objects.data.length,
              objects: objects.data.map(o => ({
                coinType: o.coinType,
                balance: o.balance
              }))
            });
          } catch (error) {
            logError('Fehler beim Abrufen der Wallet-Info', { error });
          }
        } else {
          logInfo('Kein Standard-Wallet konfiguriert. Nutzen Sie "wallet-menu" um ein Wallet einzurichten.');
        }
        break;

      case COMMANDS.WALLET_MENU:
        walletManager.showMainMenu();
        break;

      case COMMANDS.HELP:
        setupUserInterface();
        break;

      case COMMANDS.EXIT:
        logInfo('Beende Programm...');
        process.exit(0);
        break;

      default:
        logInfo('Unbekanntes Kommando. Geben Sie "help" ein für eine Liste der Befehle.');
    }
  });
}

// CSV Header und Dateinamen definieren
const CSV_HEADERS = [
  'timestamp',
  'poolId',
  'dex',
  'coinA',
  'coinB',
  'amountA',
  'amountB',
  'liquidity',
  'creator'
].join(',');

const CSV_FILE = path.join(process.cwd(), 'pools.csv');

// Hilfsfunktion zum Speichern von Pool-Daten in CSV
async function savePoolToCSV(pool: ParsedPoolData) {
  const timestamp = new Date().toISOString();
  const csvLine = [
    timestamp,
    pool.poolId,
    pool.dex,
    pool.coinA,
    pool.coinB,
    pool.amountA,
    pool.amountB,
    pool.liquidity,
    pool.creator || 'unknown'
  ].join(',');

  // Erstelle CSV-Datei wenn sie nicht existiert
  if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, CSV_HEADERS + '\n');
  }

  // Füge neue Zeile hinzu
  fs.appendFileSync(CSV_FILE, csvLine + '\n');
  logInfo('Pool in CSV gespeichert', { poolId: pool.poolId });
}

// Polling-Funktion für neue Events
async function pollNewEvents(lastCheckpoint: string) {
  const events = await SUI.client.queryEvents({
    query: {
      MoveEventType: [
        '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::factory::CreatePoolEvent',
        '0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Created_Pool_Event'
      ]
    },
    order: 'ascending'
  });

  return events.data;
}

// Hauptfunktion
async function main() {
  try {
    // Verbindung testen
    const checkpoint = await SUI.client.getLatestCheckpointSequenceNumber();
    logInfo('🟢 Mainnet Verbindung hergestellt', { checkpoint });

    // Starte Benutzerinterface
    setupUserInterface();

    let poolCount = 0;
    const startTime = Date.now();
    let lastCheckpoint = checkpoint;

    // Endlos-Schleife für kontinuierliches Polling
    while (true) {
      try {
        // Hole neue Events
        const events = await pollNewEvents(lastCheckpoint);
        
        // Verarbeite Events
        for (const event of events) {
          const poolData = decomposeTransactionByDex(event as any);
          
          if (poolData) {
            poolCount++;
            logInfo('🔵 Neuer Pool erkannt', {
              timestamp: new Date().toISOString(),
              dex: poolData.dex,
              poolId: poolData.poolId,
              coins: {
                coinA: poolData.coinA,
                coinB: poolData.coinB
              }
            });

            // Speichere Pool-Daten in CSV
            await savePoolToCSV(poolData);

            // Trading-Logik wenn aktiviert
            if (isTradingEnabled) {
              try {
                // Scam-Check
                const scamScore = await scamProbability(poolData);
                if (scamScore > LIVE_TRADING_CONFIG.SAFETY_CHECKS.SCAM_SCORE_THRESHOLD) {
                  logInfo('Pool als riskant eingestuft', { scamScore, poolData });
                  continue;
                }

                // Trading-Entscheidung
                const analysis = await tradeController.analyzeTradeConditions(poolData.poolId);
                if (!tradeController.shouldContinueHolding(analysis)) {
                  logInfo('Pool entspricht nicht den Trading-Kriterien', { analysis });
                  continue;
                }

                // Handelsausführung
                const tradeResult = await tradeController.executeTrade(poolData.poolId, {
                  amount: LIVE_TRADING_CONFIG.CAPITAL_LIMITS.MIN_TRADE_AMOUNT,
                  slippage: LIVE_TRADING_CONFIG.SAFETY_CHECKS.MAX_SLIPPAGE
                });

                if (tradeResult) {
                  logInfo('Trade erfolgreich ausgeführt', { tradeResult });
                }
              } catch (error) {
                logError('Fehler beim Trading', {
                  error: error instanceof Error ? error.message : 'Unbekannter Fehler',
                  pool: poolData
                });
              }
            }

            // Zeige Statistik alle 10 Pools
            if (poolCount % 10 === 0) {
              const runtime = (Date.now() - startTime) / 1000;
              logInfo('📊 Scanner Statistik', {
                poolsGefunden: poolCount,
                laufzeitSekunden: runtime,
                poolsProMinute: (poolCount / runtime * 60).toFixed(2),
                tradingAktiv: isTradingEnabled
              });
            }
          }
        }

        // Aktualisiere Checkpoint
        lastCheckpoint = await SUI.client.getLatestCheckpointSequenceNumber();
        
        // Kurze Pause zwischen Polls
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logError('Fehler beim Polling', {
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
        // Kurze Pause bei Fehler
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

  } catch (error) {
    logError('Kritischer Fehler', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
    process.exit(1);
  }
}

// Starte Scanner
logInfo('🚀 Starte Pool-Scanner...');
main().catch(error => {
  logError('Scanner fehlgeschlagen', { error });
  process.exit(1);
});
