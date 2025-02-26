import * as terminal from './terminal.js';
import chalk from 'chalk';
import { trade } from '../trader/index.js';
import { checkIsHoneyPot } from '../trader/checkIsHoneyPot.js';
import { scamProbability } from '../trader/checkscam.js';
import { ParsedPoolData, PoolStatus, SnipingConfig, TradeMetrics, SUI } from '../types/index.js';
import { Table } from 'console-table-printer';

// Konfiguration für das Sniping
const config: SnipingConfig = {
  autoMode: false,
  minLiquiditySUI: 300,
  maxRiskScore: 60,
  positionSize: 0.1, // SUI
  takeProfit: 50, // %
  stopLoss: 20, // %
  trailingStop: true,
  trailingDistance: 10, // %
};

// Metriken für das Tracking
const metrics: TradeMetrics = {
  activePools: 0,
  successfulTrades: 0,
  failedTrades: 0,
  averageProfit: 0,
  totalProfit: 0,
};

// Cache für Pool-Details
const poolCache: Map<string, ParsedPoolData> = new Map();
const poolStatuses: PoolStatus[] = [];

// Schnellzugriffsbefehle
const QUICK_COMMANDS: Record<string, string> = {
  'q': 'exit',
  'h': 'help',
  'c': 'clear',
  's': 'status',
  'p': 'pools',
  'a': 'auto on',
  'x': 'auto off',
  'r': 'risk',
  'f': 'filter',
  'qb': 'quickbuy',
  'qs': 'quicksell',
  'w': 'wallet',
};

/**
 * Verarbeitet einen Befehl
 * @param command Befehl
 */
export async function handleCommand(command: string): Promise<void> {
  // Prüfe auf Schnellzugriffsbefehle
  if (command in QUICK_COMMANDS) {
    command = QUICK_COMMANDS[command];
  }

  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();

  try {
    switch (cmd) {
      case 'help':
        terminal.displayHelp();
        break;

      case 'clear':
        terminal.displayHeader();
        break;

      case 'status':
        displayStatus();
        break;

      case 'pools':
        terminal.displayActivePoolsTable(poolStatuses);
        break;

      case 'details':
        if (parts.length < 2) {
          terminal.displayError('Bitte gib eine Pool-ID an.');
          return;
        }
        await showPoolDetails(parts[1]);
        break;

      case 'buy':
        if (parts.length < 3) {
          terminal.displayError('Bitte gib eine Pool-ID und einen Betrag an.');
          return;
        }
        await buyToken(parts[1], parseFloat(parts[2]));
        break;

      case 'sell':
        if (parts.length < 3) {
          terminal.displayError('Bitte gib eine Pool-ID und einen Betrag an.');
          return;
        }
        await sellToken(parts[1], parseFloat(parts[2]));
        break;

      case 'auto':
        if (parts.length < 2) {
          terminal.displayError('Bitte gib "on" oder "off" an.');
          return;
        }
        toggleAutoMode(parts[1].toLowerCase() === 'on');
        break;

      case 'set':
        if (parts.length < 3) {
          terminal.displayError('Bitte gib einen Parameter und einen Wert an.');
          return;
        }
        setParameter(parts[1], parts[2]);
        break;

      case 'exit':
        process.exit(0);
        break;

      // Neue Befehle
      case 'risk':
        await showRiskAnalysis();
        break;

      case 'filter':
        showFilterSettings();
        break;

      case 'quickbuy':
        await quickBuy();
        break;

      case 'quicksell':
        await quickSell();
        break;

      case 'wallet':
        showWalletInfo();
        break;

      case 'scan':
        await scanForPools();
        break;

      case 'monitor':
        togglePoolMonitoring(parts.length > 1 ? parts[1].toLowerCase() === 'on' : true);
        break;

      default:
        terminal.displayError(`Unbekannter Befehl: ${cmd}`);
        terminal.displayHelp();
        break;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    terminal.displayError(`Fehler bei der Ausführung des Befehls: ${errorMessage}`);
  }
}

/**
 * Zeigt den aktuellen Status an
 */
function displayStatus(): void {
  terminal.displaySnipingSummary(metrics);
  
  console.log('\n');
  console.log(`${chalk.bold('Aktuelle Konfiguration:')}`);
  console.log(`${chalk.cyan('Auto-Modus:')} ${config.autoMode ? chalk.green('Ein') : chalk.red('Aus')}`);
  console.log(`${chalk.cyan('Min. Liquidität:')} ${config.minLiquiditySUI} SUI`);
  console.log(`${chalk.cyan('Max. Risiko-Score:')} ${config.maxRiskScore}%`);
  console.log(`${chalk.cyan('Positionsgröße:')} ${config.positionSize} SUI`);
  console.log(`${chalk.cyan('Take Profit:')} ${config.takeProfit}%`);
  console.log(`${chalk.cyan('Stop Loss:')} ${config.stopLoss}%`);
  console.log(`${chalk.cyan('Trailing Stop:')} ${config.trailingStop ? chalk.green('Ein') : chalk.red('Aus')}`);
  console.log(`${chalk.cyan('Trailing Distance:')} ${config.trailingDistance}%`);
}

/**
 * Zeigt Details zu einem Pool an
 * @param poolId Pool-ID
 */
async function showPoolDetails(poolId: string): Promise<void> {
  terminal.startSpinner(`Lade Details für Pool ${poolId}...`);
  
  try {
    // Prüfe, ob der Pool im Cache ist
    let poolData = poolCache.get(poolId);
    
    if (!poolData) {
      // Simuliere das Laden von Pool-Daten
      poolData = await fetchPoolData(poolId);
      poolCache.set(poolId, poolData);
    }
    
    // Finde den Pool-Status, falls vorhanden
    const poolStatus = poolStatuses.find(p => p.poolId === poolId);
    
    terminal.stopSpinner(`Details für Pool ${poolId} geladen.`, 'success');
    terminal.displayPoolDetails(poolData, poolStatus);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    terminal.stopSpinner(`Fehler beim Laden der Pool-Details: ${errorMessage}`, 'error');
  }
}

/**
 * Kauft Token aus einem Pool
 * @param poolId Pool-ID
 * @param amount Betrag in SUI
 */
async function buyToken(poolId: string, amount: number): Promise<void> {
  if (isNaN(amount) || amount <= 0) {
    terminal.displayError('Bitte gib einen gültigen Betrag an.');
    return;
  }
  
  terminal.startSpinner(`Kaufe Token aus Pool ${poolId}...`);
  
  try {
    // Prüfe, ob der Pool im Cache ist
    let poolData = poolCache.get(poolId);
    
    if (!poolData) {
      // Simuliere das Laden von Pool-Daten
      poolData = await fetchPoolData(poolId);
      poolCache.set(poolId, poolData);
    }
    
    // Berechne den Preis
    const price = calculateTokenPrice(poolData);
    
    // Simuliere den Kauf
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Aktualisiere den Pool-Status
    const existingIndex = poolStatuses.findIndex(p => p.poolId === poolId);
    
    // Erstelle ein Objekt für scamProbability und checkIsHoneyPot
    // Verwende 'as any', um Typprobleme zu umgehen
    const extendedPoolData = {
      poolId: poolData.poolId,
      coinA: `${poolData.tokenAddress}::${poolData.tokenSymbol}`,
      coinB: SUI.address,
      amountA: String(poolData.liquidity.token),
      amountB: String(poolData.liquidity.sui),
      dex: poolData.dexType,
      liquidity: String(poolData.liquidity.sui)
    } as any;
    
    const riskScore = await scamProbability(extendedPoolData);
    const honeypotCheck = await checkIsHoneyPot(extendedPoolData);
    
    const newStatus: PoolStatus = {
      poolId,
      tokenSymbol: poolData.tokenSymbol,
      entryPrice: price,
      currentPrice: price,
      profitLoss: 0,
      profitLossPercentage: 0,
      status: 'bought',
      riskScore,
      isHoneypot: honeypotCheck.isHoneypot, // Verwende nur den boolean-Wert
      timestamp: new Date(),
    };
    
    if (existingIndex >= 0) {
      poolStatuses[existingIndex] = newStatus;
    } else {
      poolStatuses.push(newStatus);
      metrics.activePools++;
    }
    
    terminal.stopSpinner(`Token aus Pool ${poolId} erfolgreich gekauft.`, 'success');
    terminal.displaySuccess(`${amount} SUI wurden in ${poolData.tokenSymbol} investiert.`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    terminal.stopSpinner(`Fehler beim Kauf: ${errorMessage}`, 'error');
  }
}

/**
 * Verkauft Token aus einem Pool
 * @param poolId Pool-ID
 * @param percentage Prozentsatz (0-100)
 */
async function sellToken(poolId: string, percentage: number): Promise<void> {
  if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
    terminal.displayError('Bitte gib einen gültigen Prozentsatz an (1-100).');
    return;
  }
  
  terminal.startSpinner(`Verkaufe ${percentage}% der Token aus Pool ${poolId}...`);
  
  try {
    // Finde den Pool-Status
    const poolStatus = poolStatuses.find(p => p.poolId === poolId);
    
    if (!poolStatus) {
      terminal.stopSpinner(`Pool ${poolId} nicht gefunden.`, 'error');
      return;
    }
    
    if (poolStatus.status !== 'bought') {
      terminal.stopSpinner(`Pool ${poolId} ist nicht im Status 'bought'.`, 'error');
      return;
    }
    
    // Simuliere den Verkauf
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Aktualisiere den Pool-Status
    const profit = (Math.random() * 2 - 1) * 10; // Zufälliger Gewinn/Verlust zwischen -10% und +10%
    const entryPrice = poolStatus.entryPrice || 0; // Fallback zu 0 wenn undefined
    const newPrice = entryPrice * (1 + profit / 100);
    
    const updatedStatus: Partial<PoolStatus> = {
      currentPrice: newPrice,
      profitLoss: (newPrice - entryPrice) * 0.1, // Angenommen, wir haben 0.1 SUI investiert
      profitLossPercentage: profit,
      status: percentage === 100 ? 'sold' : 'bought',
      timestamp: new Date(),
    };
    
    // Aktualisiere den Pool-Status
    const index = poolStatuses.findIndex(p => p.poolId === poolId);
    if (index >= 0) {
      poolStatuses[index] = { ...poolStatuses[index], ...updatedStatus };
      
      // Aktualisiere die Metriken
      if (percentage === 100) {
        metrics.activePools--;
        
        // Sicherstellen, dass profitLoss definiert ist
        const profitLoss = updatedStatus.profitLoss || 0;
        
        if (profit >= 0) {
          metrics.successfulTrades++;
          metrics.totalProfit += profitLoss;
          metrics.averageProfit = metrics.totalProfit / metrics.successfulTrades;
        } else {
          metrics.failedTrades++;
          metrics.totalProfit += profitLoss;
        }
      }
    }
    
    terminal.stopSpinner(`${percentage}% der Token wurden verkauft.`, 'success');
    terminal.displaySuccess(`${percentage}% der Token wurden mit ${profit >= 0 ? 'Gewinn' : 'Verlust'} von ${profit.toFixed(2)}% verkauft.`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    terminal.stopSpinner(`Fehler beim Verkauf: ${errorMessage}`, 'error');
  }
}

/**
 * Schaltet den Auto-Modus ein/aus
 * @param enabled Aktiviert?
 */
function toggleAutoMode(enabled: boolean): void {
  config.autoMode = enabled;
  terminal.displaySuccess(`Auto-Modus wurde ${enabled ? 'aktiviert' : 'deaktiviert'}.`);
}

/**
 * Setzt einen Parameter
 * @param param Parameter
 * @param value Wert
 */
function setParameter(param: string, value: string): void {
  switch (param.toLowerCase()) {
    case 'minliquidity':
      const minLiquidity = parseFloat(value);
      if (isNaN(minLiquidity) || minLiquidity < 0) {
        terminal.displayError('Bitte gib einen gültigen Wert an.');
        return;
      }
      config.minLiquiditySUI = minLiquidity;
      break;
    case 'maxrisk':
      const maxRisk = parseFloat(value);
      if (isNaN(maxRisk) || maxRisk < 0 || maxRisk > 100) {
        terminal.displayError('Bitte gib einen gültigen Wert an (0-100).');
        return;
      }
      config.maxRiskScore = maxRisk;
      break;
    case 'size':
      const size = parseFloat(value);
      if (isNaN(size) || size <= 0) {
        terminal.displayError('Bitte gib einen gültigen Wert an.');
        return;
      }
      config.positionSize = size;
      break;
    case 'takeprofit':
      const takeProfit = parseFloat(value);
      if (isNaN(takeProfit) || takeProfit <= 0) {
        terminal.displayError('Bitte gib einen gültigen Wert an.');
        return;
      }
      config.takeProfit = takeProfit;
      break;
    case 'stoploss':
      const stopLoss = parseFloat(value);
      if (isNaN(stopLoss) || stopLoss <= 0) {
        terminal.displayError('Bitte gib einen gültigen Wert an.');
        return;
      }
      config.stopLoss = stopLoss;
      break;
    case 'trailingstop':
      config.trailingStop = value.toLowerCase() === 'on';
      break;
    case 'trailingdistance':
      const trailingDistance = parseFloat(value);
      if (isNaN(trailingDistance) || trailingDistance <= 0) {
        terminal.displayError('Bitte gib einen gültigen Wert an.');
        return;
      }
      config.trailingDistance = trailingDistance;
      break;
    default:
      terminal.displayError(`Unbekannter Parameter: ${param}`);
      return;
  }
  
  terminal.displaySuccess(`Parameter ${param} wurde auf ${value} gesetzt.`);
}

/**
 * Simuliert das Laden von Pool-Daten
 * @param poolId Pool-ID
 * @returns Pool-Daten
 */
async function fetchPoolData(poolId: string): Promise<ParsedPoolData> {
  // Simuliere eine Verzögerung
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generiere zufällige Pool-Daten
  return {
    poolId,
    tokenSymbol: `TOKEN${Math.floor(Math.random() * 1000)}`,
    tokenName: `Token ${Math.floor(Math.random() * 1000)}`,
    tokenAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
    liquidity: {
      sui: Math.random() * 1000 + 100,
      token: Math.random() * 1000000 + 10000,
    },
    dexType: Math.random() > 0.5 ? 'Cetus' : 'BlueMove',
    createdAt: new Date(Date.now() - Math.random() * 1000000),
    socialLinks: {
      website: Math.random() > 0.3 ? 'https://example.com' : undefined,
      telegram: Math.random() > 0.3 ? 'https://t.me/example' : undefined,
      twitter: Math.random() > 0.3 ? 'https://twitter.com/example' : undefined,
      discord: Math.random() > 0.3 ? 'https://discord.gg/example' : undefined,
    },
    metrics: {
      holders: Math.floor(Math.random() * 1000 + 10),
      transactions: Math.floor(Math.random() * 10000 + 100),
      marketCap: Math.random() * 100000 + 1000,
      fullyDilutedValue: Math.random() * 1000000 + 10000,
    },
  };
}

/**
 * Berechnet den Preis eines Tokens
 * @param pool Pool-Daten
 * @returns Preis in SUI
 */
function calculateTokenPrice(pool: ParsedPoolData): number {
  return pool.liquidity.sui / pool.liquidity.token;
}

/**
 * Zeigt eine Risikoanalyse für alle aktiven Pools an
 */
async function showRiskAnalysis(): Promise<void> {
  terminal.startSpinner('Führe Risikoanalyse durch...');
  
  try {
    if (poolStatuses.length === 0) {
      terminal.stopSpinner('Keine aktiven Pools gefunden.', 'info');
      return;
    }
    
    // Sortiere Pools nach Risiko (höchstes zuerst)
    const sortedPools = [...poolStatuses].sort((a, b) => b.riskScore - a.riskScore);
    
    terminal.stopSpinner('Risikoanalyse abgeschlossen.', 'success');
    
    // Zeige Risikotabelle an
    console.log('\nRisikoanalyse:');
    
    const table = new Table({
      columns: [
        { name: 'symbol', title: 'Symbol', alignment: 'left' },
        { name: 'risk', title: 'Risiko', alignment: 'center' },
        { name: 'honeypot', title: 'Honeypot', alignment: 'center' },
        { name: 'status', title: 'Status', alignment: 'center' },
        { name: 'profit', title: 'Gewinn/Verlust', alignment: 'right' },
      ],
    });
    
    for (const pool of sortedPools) {
      table.addRow({
        symbol: pool.tokenSymbol,
        risk: `${pool.riskScore}%`,
        honeypot: pool.isHoneypot ? 'JA' : 'NEIN',
        status: pool.status,
        profit: pool.profitLossPercentage ? `${pool.profitLossPercentage.toFixed(2)}%` : 'N/A',
      }, {
        color: pool.riskScore > 70 ? 'red' : pool.riskScore > 40 ? 'yellow' : 'green',
      });
    }
    
    table.printTable();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    terminal.stopSpinner(`Fehler bei der Risikoanalyse: ${errorMessage}`, 'error');
  }
}

/**
 * Zeigt die aktuellen Filtereinstellungen an und ermöglicht deren Änderung
 */
function showFilterSettings(): void {
  console.log('\nAktuelle Filtereinstellungen:');
  console.log(`Min. Liquidität: ${config.minLiquiditySUI} SUI`);
  console.log(`Max. Risiko-Score: ${config.maxRiskScore}%`);
  console.log(`Take Profit: ${config.takeProfit}%`);
  console.log(`Stop Loss: ${config.stopLoss}%`);
  
  console.log('\nSchnelleinstellung:');
  console.log(`set minliquidity <wert> - Minimale Liquidität in SUI`);
  console.log(`set maxrisk <wert> - Maximaler Risiko-Score (0-100)`);
  console.log(`set takeprofit <wert> - Take-Profit in Prozent`);
  console.log(`set stoploss <wert> - Stop-Loss in Prozent`);
}

/**
 * Führt einen Schnellkauf des neuesten/besten Pools durch
 */
async function quickBuy(): Promise<void> {
  terminal.startSpinner('Suche nach dem besten Pool für Schnellkauf...');
  
  try {
    // Simuliere die Suche nach dem besten Pool
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Finde den neuesten Pool mit niedrigem Risiko
    const bestPools = poolStatuses
      .filter(p => p.status === 'watching' && p.riskScore < config.maxRiskScore && !p.isHoneypot)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (bestPools.length === 0) {
      terminal.stopSpinner('Kein geeigneter Pool für Schnellkauf gefunden.', 'warn');
      return;
    }
    
    const bestPool = bestPools[0];
    terminal.stopSpinner(`Bester Pool für Schnellkauf gefunden: ${bestPool.tokenSymbol}`, 'success');
    
    // Führe den Kauf durch
    await buyToken(bestPool.poolId, config.positionSize);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    terminal.stopSpinner(`Fehler beim Schnellkauf: ${errorMessage}`, 'error');
  }
}

/**
 * Verkauft alle Token mit Gewinn oder im Verlust
 */
async function quickSell(): Promise<void> {
  terminal.startSpinner('Bereite Schnellverkauf vor...');
  
  try {
    // Finde alle gekauften Pools
    const boughtPools = poolStatuses.filter(p => p.status === 'bought');
    
    if (boughtPools.length === 0) {
      terminal.stopSpinner('Keine gekauften Pools zum Verkaufen gefunden.', 'warn');
      return;
    }
    
    terminal.stopSpinner(`${boughtPools.length} Pool(s) zum Verkaufen gefunden.`, 'success');
    
    // Verkaufe alle Pools
    for (const pool of boughtPools) {
      await sellToken(pool.poolId, 100);
    }
    
    terminal.displaySuccess(`Schnellverkauf von ${boughtPools.length} Pool(s) abgeschlossen.`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    terminal.stopSpinner(`Fehler beim Schnellverkauf: ${errorMessage}`, 'error');
  }
}

/**
 * Zeigt Wallet-Informationen an
 */
function showWalletInfo(): void {
  console.log('\nWallet-Informationen:');
  console.log('---------------------');
  console.log(`Adresse: 0x${Math.random().toString(16).substring(2, 42)}`);
  console.log(`SUI-Guthaben: 10.5 SUI`);
  console.log(`Token-Guthaben: 5 verschiedene Token`);
  console.log(`Gesamtwert: 15.3 SUI`);
  console.log(`Offene Trades: ${metrics.activePools}`);
  console.log('---------------------');
}

/**
 * Scannt aktiv nach neuen Pools
 */
async function scanForPools(): Promise<void> {
  terminal.startSpinner('Scanne nach neuen Pools...');
  
  try {
    // Simuliere das Scannen nach neuen Pools
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Generiere einen zufälligen neuen Pool
    const poolId = `0x${Math.random().toString(16).substring(2, 42)}`;
    const tokenSymbol = `TOKEN${Math.floor(Math.random() * 1000)}`;
    const poolData = await fetchPoolData(poolId);
    
    // Erstelle ein Objekt für scamProbability und checkIsHoneyPot
    // Verwende 'as any', um Typprobleme zu umgehen
    const extendedPoolData = {
      poolId: poolData.poolId,
      coinA: `${poolData.tokenAddress}::${poolData.tokenSymbol}`,
      coinB: SUI.address,
      amountA: String(poolData.liquidity.token),
      amountB: String(poolData.liquidity.sui),
      dex: poolData.dexType,
      liquidity: String(poolData.liquidity.sui)
    } as any;
    
    const riskScore = await scamProbability(extendedPoolData);
    const honeypotCheck = await checkIsHoneyPot(extendedPoolData);
    
    // Füge den Pool zu den aktiven Pools hinzu
    poolStatuses.push({
      poolId,
      tokenSymbol,
      status: 'watching',
      riskScore,
      isHoneypot: honeypotCheck.isHoneypot,
      timestamp: new Date()
    });
    
    terminal.stopSpinner(`Scan abgeschlossen. 1 neuer Pool gefunden.`, 'success');
    terminal.displayNewPoolAlert(poolData, riskScore, honeypotCheck.isHoneypot);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    terminal.stopSpinner(`Fehler beim Scannen nach neuen Pools: ${errorMessage}`, 'error');
  }
}

/**
 * Schaltet die kontinuierliche Pool-Überwachung ein/aus
 */
function togglePoolMonitoring(enabled: boolean): void {
  // Hier würde die Logik für die kontinuierliche Überwachung implementiert werden
  terminal.displaySuccess(`Pool-Überwachung wurde ${enabled ? 'aktiviert' : 'deaktiviert'}.`);
}

/**
 * Initialisiert den Command Handler
 */
export function initialize(): void {
  terminal.displayHeader();
  terminal.initializeUserInput(handleCommand);
} 