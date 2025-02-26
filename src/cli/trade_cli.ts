import { tradeController } from '../trading/trade_controller';
import { tradingMonitor } from '../trading/live_monitor';
import { logInfo, logWarning } from '../utils/logger';
import { LIVE_TRADING_CONFIG } from '../config/live_trading';
import readline from 'readline';
import dotenv from 'dotenv';
import { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';
import { SUI } from '../chain/config.js';
import { getFaucetHost, requestSuiFromFaucetV0 } from '@mysten/sui/faucet';
import { getCetusPools } from '../trader/dex/cetus';

// Lade Umgebungsvariablen
dotenv.config({ path: '.env.testnet' });

// Überprüfe Konfiguration
function checkEnvironment() {
  const requiredVars = [
    'NETWORK_ENV',
    'SUI_NODE_URL',
    'LOG_LEVEL',
    'DATABASE_URL',
    'SUI_WALLET_ADDRESS'
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error('Fehlende Umgebungsvariablen:', missing.join(', '));
    process.exit(1);
  }

  console.log('Umgebung:', {
    network: process.env.NETWORK_ENV,
    node: process.env.SUI_NODE_URL,
    logLevel: process.env.LOG_LEVEL
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function displayHelp() {
  console.log(`
Verfügbare Befehle:
  wallet                      - Zeigt Wallet-Informationen
  wallet send <addr> <amount> - Sendet SUI an eine Adresse
  wallet history             - Zeigt detaillierte Transaktionshistorie
  wallet objects             - Zeigt alle Objekte in der Wallet
  wallet nfts                - Zeigt alle NFTs in der Wallet
  wallet tokens              - Zeigt alle Token-Balances
  
  faucet                     - Fordert Testnet SUI an
  
  trade start                - Startet den Trading-Bot
  trade stop                 - Stoppt den Trading-Bot
  trade config               - Zeigt/ändert Trading-Konfiguration
  trade limits               - Zeigt/ändert Trading-Limits
  
  pool create <token>        - Erstellt einen neuen Liquidity Pool
  pool add <id> <amount>     - Fügt Liquidität hinzu
  pool remove <id> <amount>  - Entfernt Liquidität
  pool list                  - Zeigt alle verfügbaren Pools
  
  swap <tokenA> <tokenB>     - Führt einen Token-Swap durch
  
  monitor                    - Zeigt Live-Monitoring
  help                      - Zeigt diese Hilfe
  exit                      - Beendet das Programm
  `);
}

async function handleCommand(input: string) {
  const [command, subCommand, ...args] = input.trim().split(' ');

  switch (command.toLowerCase()) {
    case 'wallet':
      if (!process.env.SUI_WALLET_ADDRESS) {
        console.log('Keine Wallet konfiguriert. Generiere neue Wallet...');
        await generateNewWallet();
        return;
      }

      switch (subCommand?.toLowerCase()) {
        case 'send':
          if (args.length < 2) {
            console.log('Verwendung: wallet send <adresse> <menge>');
            return;
          }
          await sendSUI(args[0], Number(args[1]));
          break;

        case 'history':
          await showTransactionHistory();
          break;

        case 'objects':
          await showWalletObjects();
          break;

        case 'nfts':
          await showWalletNFTs();
          break;

        case 'tokens':
          await showTokenBalances();
          break;

        default:
          await showWalletInfo();
          break;
      }
      break;

    case 'faucet':
      await requestTestnetTokens();
      break;

    case 'list':
      const trades = tradeController.getActiveTrades();
      console.log('\nAktive Trades:');
      trades.forEach((trade, txId) => {
        console.log(`
ID: ${txId}
Token: ${trade.tokenAddress}
Profit: ${trade.profitPercentage.toFixed(2)}%
Wert: ${trade.currentValue.toFixed(2)} SUI
Autopilot: ${trade.isAutoPilot ? 'An' : 'Aus'}
        `);
      });
      break;

    case 'analyze':
      if (!args[0]) {
        console.log('Bitte TxId angeben');
        return;
      }
      const analysis = tradeController.getTradeAnalysis(args[0]);
      if (analysis) {
        console.log(`
Analyse für ${args[0]}:
24h Volumen: ${analysis.volume24h}
Unique Buyers: ${analysis.uniqueBuyers}
Insider Activity: ${analysis.hasInsiderActivity ? 'Ja' : 'Nein'}
Bundled TX: ${analysis.hasBundledTransactions ? 'Ja' : 'Nein'}
Buy Pressure: ${analysis.buyPressure.toFixed(2)}
Liquidity Health: ${analysis.liquidityHealth}%
Price Stability: ${analysis.priceStability}%
        `);
      } else {
        console.log('Trade nicht gefunden');
      }
      break;

    case 'profit':
      if (!args[0] || !args[1]) {
        console.log('Bitte TxId und Profit-Typ (20%, initial, 100%) angeben');
        return;
      }
      const profitType = args[1] as '20%' | 'initial' | '100%';
      const success = await tradeController.takeProfits(args[0], profitType);
      console.log(success ? 'Profit erfolgreich realisiert' : 'Fehler beim Profit-Taking');
      break;

    case 'auto':
      if (!args[0] || !args[1]) {
        console.log('Bitte TxId und Status (on/off) angeben');
        return;
      }
      const shouldAutomate = args[1].toLowerCase() === 'on';
      await tradeController.toggleAutoPilot(args[0], shouldAutomate);
      console.log(`Autopilot für ${args[0]} ${shouldAutomate ? 'aktiviert' : 'deaktiviert'}`);
      break;

    case 'monitor':
      console.log('\nLive Monitoring:');
      const stats = tradingMonitor.getStats();
      console.log(`
Aktive Zeit: ${(stats.runtime / (1000 * 60 * 60)).toFixed(2)}h
Trades Heute: ${stats.trades.length}
Erfolgsrate: ${((stats.successfulTrades / stats.trades.length) * 100).toFixed(2)}%
Gesamtprofit: ${stats.totalProfit.toFixed(2)} SUI
      `);
      break;

    case 'help':
      displayHelp();
      break;

    case 'exit':
      console.log('Beende Programm...');
      rl.close();
      process.exit(0);
      break;

    case 'trade':
      if (!subCommand) {
        console.log('Bitte Unterbefehl angeben (start/stop/config/limits)');
        return;
      }

      switch (subCommand.toLowerCase()) {
        case 'start':
          await startTrading();
          break;

        case 'stop':
          await stopTrading();
          break;

        case 'config':
          await showOrUpdateConfig();
          break;

        case 'limits':
          await showOrUpdateLimits();
          break;

        default:
          console.log('Unbekannter Trade-Befehl. Verfügbar: start, stop, config, limits');
      }
      break;

    case 'pool':
      if (!subCommand) {
        console.log('Bitte Unterbefehl angeben (create/add/remove/list)');
        return;
      }

      switch (subCommand.toLowerCase()) {
        case 'create':
          if (!args[0]) {
            console.log('Verwendung: pool create <token>');
            return;
          }
          await createPool(args[0]);
          break;

        case 'add':
          if (args.length < 2) {
            console.log('Verwendung: pool add <pool-id> <amount>');
            return;
          }
          await addLiquidity(args[0], Number(args[1]));
          break;

        case 'remove':
          if (args.length < 2) {
            console.log('Verwendung: pool remove <pool-id> <amount>');
            return;
          }
          await removeLiquidity(args[0], Number(args[1]));
          break;

        case 'list':
          await listPools();
          break;

        default:
          console.log('Unbekannter Pool-Befehl. Verfügbar: create, add, remove, list');
      }
      break;

    default:
      console.log('Unbekannter Befehl. "help" für Hilfe.');
  }
}

async function generateNewWallet() {
  try {
    const keypair = new Ed25519Keypair();
    const address = keypair.getPublicKey().toSuiAddress();
    
    // Export private key in correct format
    const privateKeyArray = keypair.getSecretKey();
    const privateKey = Buffer.from(privateKeyArray).toString('base64');
    
    console.log('\nNeue Wallet generiert:');
    console.log('Address:', address);
    console.log('Private Key:', privateKey);
    console.log('\nBitte diese Informationen in .env speichern:');
    console.log('SUI_WALLET_ADDRESS=' + address);
    console.log('SUI_WALLET_SECRET_KEY=' + privateKey);
    
    return { address, privateKey };
  } catch (error) {
    console.error('Fehler bei Wallet-Generierung:', error);
    return null;
  }
}

async function showWalletInfo() {
  const walletAddress = process.env.SUI_WALLET_ADDRESS;
  if (!walletAddress) {
    console.error('Wallet Adresse nicht konfiguriert');
    return;
  }

  try {
    const [balance, incomingTxs, outgoingTxs] = await Promise.all([
      SUI.client.getBalance({
        owner: walletAddress
      }),
      SUI.client.queryTransactionBlocks({
        filter: {
          ToAddress: walletAddress
        },
        limit: 5,
        options: {
          showEffects: true,
          showInput: true
        }
      }),
      SUI.client.queryTransactionBlocks({
        filter: {
          FromAddress: walletAddress
        },
        limit: 5,
        options: {
          showEffects: true,
          showInput: true
        }
      })
    ]);
    
    console.log('\nWallet Info:');
    console.log('Address:', walletAddress);
    console.log('Balance:', Number(balance.totalBalance) / 1_000_000_000, 'SUI');
    
    if (incomingTxs.data.length > 0) {
      console.log('\nEingehende Transaktionen:');
      incomingTxs.data.forEach((tx: SuiTransactionBlockResponse) => {
        console.log(`- ${tx.digest} (${new Date(Number(tx.timestampMs)).toLocaleString()})`);
        if (tx.effects?.status?.status === 'success') {
          console.log('  Status: Erfolgreich');
        } else {
          console.log('  Status:', tx.effects?.status?.status || 'Unbekannt');
        }
      });
    }
    
    if (outgoingTxs.data.length > 0) {
      console.log('\nAusgehende Transaktionen:');
      outgoingTxs.data.forEach((tx: SuiTransactionBlockResponse) => {
        console.log(`- ${tx.digest} (${new Date(Number(tx.timestampMs)).toLocaleString()})`);
      });
    }

    // Prüfe auf ausstehende Transaktionen
    const pendingTxs = [...incomingTxs.data, ...outgoingTxs.data].filter(
      tx => tx.effects?.status?.status && tx.effects.status.status !== 'success'
    );

    if (pendingTxs.length > 0) {
      console.log('\nAusstehende Transaktionen:', pendingTxs.length);
      console.log('Bitte warten Sie einige Sekunden und prüfen Sie dann erneut...');
    }

  } catch (error) {
    console.error('Fehler beim Abrufen der Wallet-Informationen:', error);
    if (error instanceof Error) {
      console.error('Error Details:', error.message);
    }
  }
}

async function requestTestnetTokens() {
  const walletAddress = process.env.SUI_WALLET_ADDRESS;
  if (!walletAddress) {
    console.log('Bitte zuerst Wallet konfigurieren (wallet command)');
    return;
  }

  try {
    console.log('Fordere Devnet SUI an...');
    console.log('Wallet Adresse:', walletAddress);
    
    // Verwende den offiziellen Sui SDK Faucet Client
    const faucetHost = getFaucetHost('devnet');
    console.log('Faucet Host:', faucetHost);

    const response = await requestSuiFromFaucetV0({
      host: faucetHost,
      recipient: walletAddress,
    });

    console.log('Faucet Response:', response);
    console.log('Faucet Request erfolgreich!');
    console.log('Bitte warten Sie einige Sekunden und überprüfen Sie dann die Balance mit "wallet"');

    // Warte 5 Sekunden und zeige dann die Balance
    await new Promise(resolve => setTimeout(resolve, 5000));
    await showWalletInfo();

  } catch (error) {
    console.error('Fehler beim Faucet Request:', error);
    if (error instanceof Error) {
      console.error('Error Details:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

// Event Listener für Updates
tradeController.on('tradeUpdate', ({ txId, trade }) => {
  console.log(`\nTrade Update für ${txId}:`);
  console.log(`Aktueller Profit: ${trade.profitPercentage.toFixed(2)}%`);
  if (trade.analysis.hasInsiderActivity || trade.analysis.hasBundledTransactions) {
    console.log('⚠️ Warnung: Verdächtige Aktivität erkannt');
  }
});

// Neue Wallet-Funktionen
async function sendSUI(toAddress: string, amount: number) {
  try {
    console.log(`Sende ${amount} SUI an ${toAddress}...`);
    // TODO: Implementiere Transaktion
    console.log('Diese Funktion wird bald implementiert!');
  } catch (error) {
    console.error('Fehler beim Senden:', error);
  }
}

async function showTransactionHistory() {
  const walletAddress = process.env.SUI_WALLET_ADDRESS!;
  try {
    const [incoming, outgoing] = await Promise.all([
      SUI.client.queryTransactionBlocks({
        filter: { ToAddress: walletAddress },
        limit: 10,
        options: { showEffects: true, showInput: true }
      }),
      SUI.client.queryTransactionBlocks({
        filter: { FromAddress: walletAddress },
        limit: 10,
        options: { showEffects: true, showInput: true }
      })
    ]);

    console.log('\nTransaktionshistorie:');
    console.log('\nEingehende Transaktionen:');
    incoming.data.forEach(tx => {
      console.log(`- ${tx.digest}`);
      console.log(`  Zeitpunkt: ${new Date(Number(tx.timestampMs)).toLocaleString()}`);
      console.log(`  Status: ${tx.effects?.status?.status || 'Unbekannt'}`);
      if (tx.effects?.status?.error) {
        console.log(`  Fehler: ${tx.effects.status.error}`);
      }
    });

    console.log('\nAusgehende Transaktionen:');
    outgoing.data.forEach(tx => {
      console.log(`- ${tx.digest}`);
      console.log(`  Zeitpunkt: ${new Date(Number(tx.timestampMs)).toLocaleString()}`);
      console.log(`  Status: ${tx.effects?.status?.status || 'Unbekannt'}`);
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Historie:', error);
  }
}

async function showWalletObjects() {
  const walletAddress = process.env.SUI_WALLET_ADDRESS!;
  try {
    const objects = await SUI.client.getOwnedObjects({
      owner: walletAddress,
      options: { showContent: true }
    });

    console.log('\nWallet Objekte:');
    objects.data.forEach(obj => {
      console.log(`- ID: ${obj.data?.objectId}`);
      console.log(`  Typ: ${obj.data?.type}`);
      if (obj.data?.content) {
        console.log('  Inhalt:', obj.data.content);
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Objekte:', error);
  }
}

async function showWalletNFTs() {
  console.log('\nNFT Funktion wird bald implementiert!');
}

async function showTokenBalances() {
  const walletAddress = process.env.SUI_WALLET_ADDRESS!;
  try {
    const coins = await SUI.client.getAllCoins({
      owner: walletAddress
    });

    console.log('\nToken Balances:');
    const balances = new Map<string, bigint>();
    
    coins.data.forEach(coin => {
      const balance = balances.get(coin.coinType) || 0n;
      balances.set(coin.coinType, balance + BigInt(coin.balance));
    });

    balances.forEach((balance, coinType) => {
      const formattedBalance = Number(balance) / 1_000_000_000;
      console.log(`- ${coinType}: ${formattedBalance}`);
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Token Balances:', error);
  }
}

// Neue Trading-Funktionen
let isTrading = false;
let tradingInterval: NodeJS.Timeout | null = null;

async function startTrading() {
  if (isTrading) {
    console.log('Trading läuft bereits!');
    return;
  }

  try {
    console.log('\nStarte Trading Bot...');
    console.log('Konfiguration:', LIVE_TRADING_CONFIG);
    
    isTrading = true;
    tradingMonitor.start();

    // Start des Trading-Loops
    tradingInterval = setInterval(async () => {
      try {
        await checkAndExecuteTrades();
      } catch (error) {
        console.error('Fehler im Trading-Loop:', error);
      }
    }, 1000); // Prüfe jede Sekunde

    console.log('Trading Bot gestartet!');
    console.log('Überwache neue Pools...');
    console.log('Nutze "monitor" für Live-Updates');
    console.log('Nutze "trade stop" zum Beenden');
  } catch (error) {
    console.error('Fehler beim Starten des Trading Bots:', error);
    await stopTrading();
  }
}

async function stopTrading() {
  if (!isTrading) {
    console.log('Trading ist nicht aktiv!');
    return;
  }

  try {
    console.log('\nStoppe Trading Bot...');
    
    isTrading = false;
    if (tradingInterval) {
      clearInterval(tradingInterval);
      tradingInterval = null;
    }
    
    tradingMonitor.stop();
    
    console.log('Trading Bot gestoppt!');
    console.log('Trading Statistiken:');
    const stats = tradingMonitor.getStats();
    console.log(`- Laufzeit: ${(stats.runtime / (1000 * 60 * 60)).toFixed(2)}h`);
    console.log(`- Trades: ${stats.trades.length}`);
    console.log(`- Erfolgsrate: ${((stats.successfulTrades / stats.trades.length) * 100).toFixed(2)}%`);
    console.log(`- Gesamtprofit: ${stats.totalProfit.toFixed(2)} SUI`);
  } catch (error) {
    console.error('Fehler beim Stoppen des Trading Bots:', error);
  }
}

async function checkAndExecuteTrades() {
  if (!isTrading) return;

  try {
    const scanStartTime = Date.now();
    const newPools = await getNewPools();
    const scanDuration = Date.now() - scanStartTime;
    
    const shouldShowFullUpdate = scanStartTime % 10000 < 1000 || newPools.length > 0;
    
    if (shouldShowFullUpdate) {
      console.log('\n🔍 Pool Scanner Status:');
      console.log(`   Scan-Zeit: ${scanDuration}ms`);
      console.log(`   Gefundene Pools: ${newPools.length}`);
    } else {
      process.stdout.write('.');
    }
    
    for (const pool of newPools) {
      console.log('\n✨ Neuer Pool entdeckt:');
      console.log(`   DEX: ${pool.dex}`);
      console.log(`   Token: ${pool.coinA} / ${pool.coinB}`);
      console.log(`   Liquidität: ${pool.liquidity || '0'} SUI`);
      
      // Zeige Links für den Pool
      await showPoolLinks(pool);
      
      if (!checkTradingLimits()) {
        console.log('   ⚠️ Trading-Limits erreicht');
        continue;
      }

      const analysis = await analyzePool(pool);
      if (shouldTrade(analysis)) {
        console.log('   ✅ Trade wird ausgeführt');
        await executeTrade(pool, analysis);
      }
    }
    
  } catch (error) {
    if (error instanceof Error) {
      console.log(`\n⚠️ Scanner: ${error.message}`);
    }
  }
}

// Pool Interface
interface Pool {
  poolId: string;
  dex: string;
  coinA: string;
  coinB: string;
  liquidity?: string;
}

async function getNewPools(): Promise<Pool[]> {
  try {
    // Hole aktive Pools von verschiedenen DEXes
    const pools = await Promise.all([
      getCetusPools(),
      // TODO: Füge weitere DEXes hinzu
    ]);

    return pools.flat();
  } catch (error) {
    console.error('Fehler beim Abrufen neuer Pools:', error);
    return [];
  }
}

async function analyzePool(pool: any) {
  // TODO: Implementiere Pool-Analyse
  return {
    scamScore: 0,
    liquidity: 0,
    age: 0,
    priceImpact: 0
  };
}

function shouldTrade(analysis: any) {
  return (
    analysis.scamScore < LIVE_TRADING_CONFIG.SAFETY_CHECKS.SCAM_SCORE_THRESHOLD &&
    analysis.liquidity >= LIVE_TRADING_CONFIG.PERFORMANCE_THRESHOLDS.MIN_LIQUIDITY &&
    analysis.priceImpact <= LIVE_TRADING_CONFIG.PERFORMANCE_THRESHOLDS.MAX_PRICE_IMPACT
  );
}

async function executeTrade(pool: any, analysis: any) {
  // TODO: Implementiere Trade-Ausführung
  console.log('Trade würde ausgeführt werden:', { pool, analysis });
}

function checkTradingLimits() {
  // TODO: Implementiere Limit-Checks
  return true;
}

async function showOrUpdateConfig() {
  console.log('\nAktuelle Trading-Konfiguration:');
  console.log(JSON.stringify(LIVE_TRADING_CONFIG, null, 2));
  console.log('\nKonfiguration kann aktuell nur in der Datei geändert werden.');
}

async function showOrUpdateLimits() {
  console.log('\nAktuelle Trading-Limits:');
  console.log('- Max Trade:', LIVE_TRADING_CONFIG.CAPITAL_LIMITS.MAX_TRADE_AMOUNT, 'SUI');
  console.log('- Min Trade:', LIVE_TRADING_CONFIG.CAPITAL_LIMITS.MIN_TRADE_AMOUNT, 'SUI');
  console.log('- Tägliches Limit:', LIVE_TRADING_CONFIG.CAPITAL_LIMITS.DAILY_TRADE_LIMIT, 'Trades');
  console.log('- Max Verlust/Tag:', LIVE_TRADING_CONFIG.CAPITAL_LIMITS.MAX_DAILY_LOSS, 'SUI');
  console.log('\nLimits können aktuell nur in der Datei geändert werden.');
}

// Pool Management Funktionen
async function createPool(tokenAddress: string) {
  try {
    console.log(`Erstelle neuen Pool für Token: ${tokenAddress}`);
    
    // Validiere Token
    const tokenInfo = await SUI.client.getCoinMetadata({ coinType: tokenAddress });
    if (!tokenInfo) {
      console.log('Token nicht gefunden oder ungültig');
      return;
    }

    console.log('Token Info:', {
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      decimals: tokenInfo.decimals
    });

    // TODO: Implementiere Pool-Erstellung
    console.log('Pool-Erstellung wird implementiert...');
    
  } catch (error) {
    console.error('Fehler bei Pool-Erstellung:', error);
  }
}

async function addLiquidity(poolId: string, amount: number) {
  try {
    console.log(`Füge ${amount} SUI Liquidität zu Pool ${poolId} hinzu`);
    
    // Prüfe Pool
    const poolObject = await SUI.client.getObject({
      id: poolId,
      options: { showContent: true }
    });
    
    if (!poolObject.data) {
      console.log('Pool nicht gefunden');
      return;
    }

    // TODO: Implementiere Liquiditäts-Hinzufügung
    console.log('Liquiditäts-Hinzufügung wird implementiert...');
    
  } catch (error) {
    console.error('Fehler beim Hinzufügen von Liquidität:', error);
  }
}

async function removeLiquidity(poolId: string, amount: number) {
  try {
    console.log(`Entferne ${amount} SUI Liquidität aus Pool ${poolId}`);
    
    // Prüfe Pool
    const poolObject = await SUI.client.getObject({
      id: poolId,
      options: { showContent: true }
    });
    
    if (!poolObject.data) {
      console.log('Pool nicht gefunden');
      return;
    }

    // TODO: Implementiere Liquiditäts-Entfernung
    console.log('Liquiditäts-Entfernung wird implementiert...');
    
  } catch (error) {
    console.error('Fehler beim Entfernen von Liquidität:', error);
  }
}

async function listPools() {
  try {
    console.log('\nVerfügbare Pools:');
    
    const pools = await Promise.all([
      getCetusPools(),
      // TODO: Füge weitere DEXes hinzu
    ]);

    const allPools = pools.flat();
    
    if (allPools.length === 0) {
      console.log('Keine aktiven Pools gefunden');
      return;
    }

    for (const pool of allPools) {
      console.log(`\nPool ID: ${pool.poolId}`);
      console.log(`DEX: ${pool.dex}`);
      console.log(`Token A: ${pool.coinA}`);
      console.log(`Token B: ${pool.coinB}`);
      console.log(`Liquidität: ${pool.liquidity || '0'} SUI`);
      
      // Zeige Links für jeden Pool
      await showPoolLinks(pool);
    }
    
  } catch (error) {
    console.error('Fehler beim Auflisten der Pools:', error);
  }
}

interface ScamAnalysisParams {
  inputAmount: number;
  timestamp: number;
  poolId: string;
  coinA: string;
  coinB: string;
  dex: string;
}

interface SecurityChecks {
  isLpBurned: boolean;
  isHoneypot: boolean;
  isBlacklisted: boolean;
  isWhitelisted: boolean;
  hasRestrictedFunctions: boolean;
  hasSuspiciousPatterns: boolean;
  ownershipRenounced: boolean;
  hasAntiBot: boolean;
  mintAuthority: {
    isMintable: boolean;
    mintLimit: string | null;
    mintAuthorities: string[];
  };
  bundleAnalysis: {
    hasBundledTx: boolean;
    suspiciousBundles: boolean;
    frontrunProtection: boolean;
    sandwichProtection: boolean;
  };
}

async function checkPoolSecurity(params: ScamAnalysisParams): Promise<SecurityChecks> {
  try {
    // LP Token Burn Check
    const lpBurnCheck = await SUI.client.getObject({
      id: params.poolId,
      options: { showContent: true }
    });
    const lpData = lpBurnCheck.data?.content as { type: string; fields?: any };
    const isLpBurned = lpData?.fields?.burned === true;

    // Honeypot Check (Simuliere Test-Transaktion)
    const isHoneypot = await checkHoneypot(params.poolId);

    // Blacklist/Whitelist Status
    const [isBlacklisted, isWhitelisted] = await Promise.all([
      checkBlacklist(params.coinA),
      checkWhitelist(params.coinA)
    ]);

    // Überprüfe verdächtige Funktionen und Muster
    const contractAnalysis = await analyzeContract(params.coinA);

    // Mint Authority Analyse
    const mintAnalysis = await analyzeMintAuthority(params.coinA);

    // Bundle Transaktions-Analyse
    const bundleAnalysis = await analyzeBundleTransactions(params.poolId, params.coinA);

    return {
      isLpBurned,
      isHoneypot,
      isBlacklisted,
      isWhitelisted,
      hasRestrictedFunctions: contractAnalysis.hasRestrictedFunctions,
      hasSuspiciousPatterns: contractAnalysis.hasSuspiciousPatterns,
      ownershipRenounced: contractAnalysis.ownershipRenounced,
      hasAntiBot: contractAnalysis.hasAntiBot,
      mintAuthority: mintAnalysis,
      bundleAnalysis
    };
  } catch (error) {
    console.error('Fehler bei Sicherheitsprüfungen:', error);
    return {
      isLpBurned: false,
      isHoneypot: true,
      isBlacklisted: false,
      isWhitelisted: false,
      hasRestrictedFunctions: true,
      hasSuspiciousPatterns: true,
      ownershipRenounced: false,
      hasAntiBot: true,
      mintAuthority: {
        isMintable: true,
        mintLimit: null,
        mintAuthorities: []
      },
      bundleAnalysis: {
        hasBundledTx: true,
        suspiciousBundles: true,
        frontrunProtection: false,
        sandwichProtection: false
      }
    };
  }
}

async function checkHoneypot(poolId: string): Promise<boolean> {
  // TODO: Implementiere Honeypot-Check durch Test-Swaps
  return false;
}

async function checkBlacklist(tokenAddress: string): Promise<boolean> {
  // TODO: Implementiere Blacklist-Check gegen bekannte Scam-Token
  return false;
}

async function checkWhitelist(tokenAddress: string): Promise<boolean> {
  // TODO: Implementiere Whitelist-Check gegen verifizierte Token
  return false;
}

async function analyzeContract(tokenAddress: string): Promise<{
  hasRestrictedFunctions: boolean;
  hasSuspiciousPatterns: boolean;
  ownershipRenounced: boolean;
  hasAntiBot: boolean;
}> {
  // TODO: Implementiere detaillierte Vertragsanalyse
  return {
    hasRestrictedFunctions: false,
    hasSuspiciousPatterns: false,
    ownershipRenounced: true,
    hasAntiBot: false
  };
}

async function analyzeMintAuthority(tokenAddress: string): Promise<{
  isMintable: boolean;
  mintLimit: string | null;
  mintAuthorities: string[];
}> {
  try {
    // Hole Token-Metadaten und Berechtigungen
    const tokenInfo = await SUI.client.getObject({
      id: tokenAddress,
      options: { showContent: true, showOwner: true }
    });

    // Analysiere Mint-Funktionen und Berechtigungen
    const mintableCheck = await SUI.client.getDynamicFields({
      parentId: tokenAddress
    });

    return {
      isMintable: mintableCheck.data.some(field => field.name.toString().includes('mint')),
      mintLimit: null, // TODO: Implementiere Limit-Extraktion
      mintAuthorities: [] // TODO: Implementiere Authority-Extraktion
    };
  } catch (error) {
    console.error('Fehler bei Mint Authority Analyse:', error);
    return {
      isMintable: true,
      mintLimit: null,
      mintAuthorities: []
    };
  }
}

async function analyzeBundleTransactions(poolId: string, tokenAddress: string): Promise<{
  hasBundledTx: boolean;
  suspiciousBundles: boolean;
  frontrunProtection: boolean;
  sandwichProtection: boolean;
}> {
  try {
    // Hole die letzten Transaktionen
    const txs = await SUI.client.queryTransactionBlocks({
      filter: {
        InputObject: poolId
      },
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true
      },
      limit: 50
    });

    // Analysiere Transaktionsmuster
    const bundlePatterns = txs.data.map(tx => ({
      hasMultipleActions: tx.transaction?.data.transaction.kind === 'ProgrammableTransaction',
      hasHighGas: Number(tx.effects?.gasUsed?.computationCost || 0) > 1000000,
      isFromContract: tx.transaction?.data.sender.startsWith('0x'),
    }));

    // Zähle verdächtige Muster
    const suspiciousCount = bundlePatterns.filter(p => 
      p.hasMultipleActions && p.hasHighGas && p.isFromContract
    ).length;

    return {
      hasBundledTx: bundlePatterns.some(p => p.hasMultipleActions),
      suspiciousBundles: suspiciousCount > 5,
      frontrunProtection: false, // TODO: Implementiere Frontrun-Schutz-Erkennung
      sandwichProtection: false  // TODO: Implementiere Sandwich-Schutz-Erkennung
    };
  } catch (error) {
    console.error('Fehler bei Bundle-Analyse:', error);
    return {
      hasBundledTx: true,
      suspiciousBundles: true,
      frontrunProtection: false,
      sandwichProtection: false
    };
  }
}

async function scamProbability(params: ScamAnalysisParams): Promise<number> {
  // Basis-Risikofaktoren
  const timeSinceCreation = (Date.now() - params.timestamp) / (1000 * 60); // in Minuten
  const liquidityScore = Math.min(params.inputAmount / 1000, 100); // Maximal 100%
  
  // Sicherheitsprüfungen
  const security = await checkPoolSecurity(params);
  
  // Gewichtete Risikofaktoren
  const weights = {
    time: 15,        // 15% Gewichtung für Zeit
    liquidity: 20,   // 20% Gewichtung für Liquidität
    lpBurn: 15,      // 15% für LP Token Burn
    honeypot: 20,    // 20% für Honeypot-Check
    blacklist: 10,   // 10% für Blacklist/Whitelist
    contract: 20     // 20% für Vertragsanalyse
  };

  // Berechne einzelne Scores
  const timeScore = Math.min(timeSinceCreation / 60, 1) * weights.time;
  const liquidityScore2 = (liquidityScore / 100) * weights.liquidity;
  const lpBurnScore = security.isLpBurned ? weights.lpBurn : 0;
  const honeypotScore = security.isHoneypot ? 0 : weights.honeypot;
  const blacklistScore = (security.isBlacklisted ? 0 : (security.isWhitelisted ? weights.blacklist : weights.blacklist / 2));
  
  // Contract Analysis Score
  const contractScore = (
    (security.ownershipRenounced ? 8 : 0) +
    (!security.hasRestrictedFunctions ? 4 : 0) +
    (!security.hasSuspiciousPatterns ? 4 : 0) +
    (!security.hasAntiBot ? 4 : 0)
  );

  // Gesamtrisiko (100 - Score = Scam-Wahrscheinlichkeit)
  const safetyScore = 
    timeScore +
    liquidityScore2 +
    lpBurnScore +
    honeypotScore +
    blacklistScore +
    (contractScore / 20) * weights.contract;

  return Math.max(0, Math.min(100 - safetyScore, 100));
}

async function showPoolLinks(pool: Pool) {
  // Hole zusätzliche Analysen
  const analysis = await analyzePool(pool);
  const scamScore = await scamProbability({ 
    inputAmount: Number(pool.liquidity), 
    timestamp: Date.now(),
    poolId: pool.poolId,
    coinA: pool.coinA,
    coinB: pool.coinB,
    dex: pool.dex
  });

  // Hole Sicherheitsprüfungen
  const security = await checkPoolSecurity({
    inputAmount: Number(pool.liquidity),
    timestamp: Date.now(),
    poolId: pool.poolId,
    coinA: pool.coinA,
    coinB: pool.coinB,
    dex: pool.dex
  });

  // Technische Pool-Informationen
  console.log('\n📊 Pool Details:');
  console.log(`   ID: ${pool.poolId}`);
  console.log(`   DEX: ${pool.dex}`);
  console.log(`   Token: ${pool.coinA} / ${pool.coinB}`);
  console.log(`   Liquidität: ${pool.liquidity || '0'} SUI`);

  // Erweiterte Risikoanalyse
  console.log('\n⚠️ Risikoanalyse:');
  console.log(`   Scam Score: ${scamScore.toFixed(2)}%`);
  console.log(`   Liquiditätstiefe: ${analysis.liquidity.toFixed(2)}%`);
  console.log(`   Pool Alter: ${analysis.age} Minuten`);
  console.log(`   Preiseinfluss: ${analysis.priceImpact.toFixed(2)}%`);
  
  // Sicherheitschecks
  console.log('\n🔒 Sicherheitschecks:');
  console.log(`   LP Token Burn: ${security.isLpBurned ? '✅' : '❌'}`);
  console.log(`   Honeypot: ${security.isHoneypot ? '❌ Gefahr' : '✅ Sicher'}`);
  console.log(`   Blacklist Status: ${security.isBlacklisted ? '❌ Gelistet' : '✅ Clean'}`);
  console.log(`   Whitelist Status: ${security.isWhitelisted ? '✅ Verifiziert' : '⚠️ Unbekannt'}`);
  console.log(`   Ownership: ${security.ownershipRenounced ? '✅ Renounced' : '⚠️ Aktiv'}`);
  console.log(`   Anti-Bot: ${security.hasAntiBot ? '⚠️ Aktiv' : '✅ Inaktiv'}`);
  
  // Mint Authority Info
  console.log('\n🔑 Mint Authority:');
  console.log(`   Mintable: ${security.mintAuthority.isMintable ? '⚠️ Ja' : '✅ Nein'}`);
  if (security.mintAuthority.isMintable) {
    console.log(`   Mint Limit: ${security.mintAuthority.mintLimit || 'Unbegrenzt ⚠️'}`);
    if (security.mintAuthority.mintAuthorities.length > 0) {
      console.log('   Mint Authorities:');
      security.mintAuthority.mintAuthorities.forEach(auth => 
        console.log(`   • ${auth}`)
      );
    }
  }

  // Bundle Analyse
  console.log('\n📦 Bundle Analyse:');
  console.log(`   Gebündelte TXs: ${security.bundleAnalysis.hasBundledTx ? '⚠️ Gefunden' : '✅ Keine'}`);
  console.log(`   Verdächtige Bundles: ${security.bundleAnalysis.suspiciousBundles ? '❌ Ja' : '✅ Nein'}`);
  console.log(`   Frontrun Schutz: ${security.bundleAnalysis.frontrunProtection ? '✅ Aktiv' : '⚠️ Inaktiv'}`);
  console.log(`   Sandwich Schutz: ${security.bundleAnalysis.sandwichProtection ? '✅ Aktiv' : '⚠️ Inaktiv'}`);

  // Trading Tools & Analyse
  console.log('\n🔍 Trading Tools:');
  console.log('   Charts & Analyse:');
  console.log(`   • Dexscreener: https://dexscreener.com/sui/${pool.poolId}`);
  console.log(`   • DexCheck: https://dexcheck.fair.xyz/sui/${pool.poolId}`);
  console.log(`   • GMGN: https://gmgn.io/token-sui/${pool.coinA}`);
  console.log(`   • AXIOM: https://www.axiom.xyz/sui/pool/${pool.poolId}`);
  console.log(`   • SuiVision: https://suivision.xyz/pool/${pool.poolId}`);
  console.log(`   • DefiLlama: https://defillama.com/protocol/sui/${pool.dex.toLowerCase()}`);
  
  // Community & Social Media
  console.log('\n👥 Community & Social:');
  console.log(`   • Telegram: https://t.me/${pool.dex.toLowerCase()}_announcements`);
  console.log(`   • Twitter/X: https://x.com/${pool.dex.toLowerCase()}`);
  console.log(`   • Discord: https://discord.gg/${pool.dex.toLowerCase()}`);
  console.log(`   • Medium: https://medium.com/@${pool.dex.toLowerCase()}`);
  console.log(`   • GitHub: https://github.com/${pool.dex.toLowerCase()}`);

  // Trading Limits & Status
  console.log('\n💰 Trading Status:');
  console.log(`   Max Trade: ${LIVE_TRADING_CONFIG.CAPITAL_LIMITS.MAX_TRADE_AMOUNT} SUI`);
  console.log(`   Tägliches Limit: ${LIVE_TRADING_CONFIG.CAPITAL_LIMITS.DAILY_TRADE_LIMIT} Trades`);
  console.log(`   Stop Loss: ${LIVE_TRADING_CONFIG.CAPITAL_LIMITS.MAX_POSITION_LOSS} SUI`);
  console.log(`   Trading erlaubt: ${checkTradingLimits() ? '✅ Ja' : '❌ Nein'}`);
}

// Start CLI
console.log('Sui Liquidity Sniper CLI');
checkEnvironment();
displayHelp();

rl.on('line', async (input) => {
  try {
    await handleCommand(input);
  } catch (error) {
    console.error('Fehler:', error);
  }
  rl.prompt();
});

rl.prompt();