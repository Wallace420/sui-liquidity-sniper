import * as commandHandler from './utils/command-handler.js';
import * as terminal from './utils/terminal.js';
import logger, { logInfo, logWarn, logError, logPool, logDebug } from './utils/logger.js';
import { trade } from './trader/index.js';
import { SUI, ParsedPoolData, PoolStatus } from './types/index.js';
import { scamProbability } from './trader/checkscam.js';
import { checkIsHoneyPot } from './trader/checkIsHoneyPot.js';
import chalk from 'chalk';
import boxen from 'boxen';

// Konfiguration für Pool-Filterung
const POOL_FILTER_CONFIG = {
  minLiquiditySUI: 250, // Mindestliquidität in SUI (reduziert von 500 auf 250)
  maxRiskScore: 40, // Maximaler Risiko-Score (0-100)
  minSuccessfulSells: 2, // Mindestanzahl erfolgreicher Verkäufe
  maxSellTax: 10, // Maximale Verkaufssteuer in Prozent
  minHolders: 50, // Mindestanzahl an Token-Haltern
  minAge: 3600, // Mindestalter in Sekunden (1 Stunde)
  maxTokensPerPool: 1000000000, // Maximale Anzahl an Token pro Pool
  requiredSocialLinks: 1, // Mindestanzahl an Social-Media-Links
  maxTopHolderPercentage: 70, // Maximaler Prozentsatz der Top 10 Holder
  minTwitterFollowers: 100, // Mindestanzahl an Twitter-Followern
  maxBundleTransactions: 3, // Maximale Anzahl an Bundle-Transaktionen
  checkRugDevs: true, // Prüfe auf bekannte Rug-Entwickler
};

// Globale Variablen
let isScanning = false;
let activePools: PoolStatus[] = [];
let startTime = Date.now();
let poolsFound = 0;
let lastDisplayTime = 0;
let tradingActive = false;

// Statistiken
const stats = {
  poolsGefunden: 0,
  poolsProMinute: '0.00',
  laufzeitSekunden: 0,
  tradingAktiv: false,
  erfolgreiche: 0,
  fehlgeschlagene: 0,
  gesamtGewinn: 0,
};

/**
 * Hauptfunktion
 */
async function main() {
  try {
    // Zeige Header
    terminal.displayHeader();
    
    // Initialisiere Befehlsverarbeitung
    terminal.initializeUserInput(command => {
      commandHandler.handleCommand(command);
    });
    
    // Zeige das Hilfe-Menü automatisch an
    terminal.displayHelp();
    
    // Starte Trade-Monitor
    startTradeMonitor();
    logger.info('Trade-Monitor gestartet');
    
    // Starte Pool-Scanner
    startPoolScanner();
    logger.info('Pool-Scanner gestartet');
    
    // Aktualisiere Statistiken regelmäßig
    setInterval(() => {
      updateStatistics();
      
      // Zeige Statistiken alle 5 Minuten an
      const now = Date.now();
      if (now - lastDisplayTime > 5 * 60 * 1000) {
        displayStatistics(stats);
        lastDisplayTime = now;
      }
    }, 10000); // Alle 10 Sekunden
    
  } catch (error) {
    logger.error('Fehler beim Starten der Anwendung', { error: String(error) });
  }
}

/**
 * Startet den Trade-Monitor
 */
function startTradeMonitor() {
  try {
    // Starte den Trade-Monitor in einem separaten Thread
    setInterval(() => {
      try {
        // Hier würde die Logik für das Monitoring von Trades implementiert werden
        // Für diese Demo verwenden wir eine einfache Simulation
        monitorTrades();
      } catch (error: unknown) {
        // Fange Fehler ab, damit der Hauptprozess nicht abstürzt
        const errorMessage = error instanceof Error ? error.message : String(error);
        logError('Fehler im Trade-Monitor', { error: errorMessage });
      }
    }, 5000); // Alle 5 Sekunden
    
    logInfo('Trade-Monitor gestartet');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError('Fehler beim Starten des Trade-Monitors', { error: errorMessage });
  }
}

/**
 * Überwacht aktive Trades
 */
function monitorTrades() {
  // Simuliere die Überwachung von Trades
  const boughtPools = activePools.filter(p => p.status === 'bought');
  
  if (boughtPools.length > 0) {
    // Aktualisiere die Preise und Gewinne/Verluste
    boughtPools.forEach(pool => {
      // Simuliere Preisänderungen
      const priceChange = (Math.random() * 2 - 1) * 5; // -5% bis +5%
      const entryPrice = pool.entryPrice || 0;
      const newPrice = entryPrice * (1 + priceChange / 100);
      
      // Aktualisiere den Pool-Status
      const index = activePools.findIndex(p => p.poolId === pool.poolId);
      if (index >= 0) {
        activePools[index] = {
          ...activePools[index],
          currentPrice: newPrice,
          profitLoss: (newPrice - entryPrice) * 0.1, // Angenommen, wir haben 0.1 SUI investiert
          profitLossPercentage: priceChange
        };
        
        // Logge signifikante Preisänderungen
        if (Math.abs(priceChange) > 3) {
          logPool(`Signifikante Preisänderung für ${pool.tokenSymbol}`, {
            poolId: pool.poolId,
            action: 'price_change',
            price: newPrice.toFixed(8)
          });
        }
      }
    });
  }
}

/**
 * Startet den Pool-Scanner
 */
function startPoolScanner() {
  isScanning = true;
  logInfo('Pool-Scanner gestartet - Suche nach neuen Pools...');
  scanForNewPools();
}

// Hilfsfunktionen für die Pool-Verarbeitung
function generateRandomPool() {
  const dexes = ['Cetus', 'BlueMove', 'Turbos', 'Kriya'];
  const symbols = ['SUI', 'USDC', 'USDT', 'ETH', 'BTC', 'WETH', 'WBTC', 'PEPE', 'DOGE', 'SHIB'];
  
  return {
    poolId: `0x${Math.random().toString(16).substring(2, 10)}`,
    coinA: {
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      name: `Token ${Math.floor(Math.random() * 1000)}`
    },
    coinB: {
      symbol: 'SUI',
      name: 'Sui'
    },
    liquidity: Math.random() * 1000,
    dex: dexes[Math.floor(Math.random() * dexes.length)],
    createdAt: Date.now() - Math.floor(Math.random() * 1000000000)
  };
}

function calculateRiskScore(pool: any, scamProbability: number): number {
  // Einfache Risikobewertung basierend auf Liquidität und Scam-Wahrscheinlichkeit
  const liquidityFactor = Math.min(1, pool.liquidity / 500);
  const riskScore = (1 - liquidityFactor) * 100 + scamProbability * 50;
  return riskScore;
}

function calculateQualityScore(pool: any): number {
  // Qualitätsbewertung basierend auf Liquidität und anderen Faktoren
  const liquidityFactor = Math.min(1, pool.liquidity / 1000);
  const qualityScore = liquidityFactor * 100;
  return qualityScore;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  return `${seconds}s`;
}

export async function scanForNewPools(
  debug = false,
  config = POOL_FILTER_CONFIG
): Promise<void> {
  let poolCount = 0;
  const stats = {
    totalPools: 0,
    ignoredPools: 0,
    acceptedPools: 0,
    lastPool: null as any
  };

  // Simuliere das Finden neuer Pools
  while (true) {
    try {
      const pool = generateRandomPool();
      stats.totalPools++;
      
      // Berechne Scam-Wahrscheinlichkeit
      const scamProbability = Math.random();
      const isHoneypot = await checkIsHoneyPot(pool);
      const riskScore = calculateRiskScore(pool, scamProbability);
      const qualityScore = calculateQualityScore(pool);
      
      // Prüfe, ob der Pool die Filterkriterien erfüllt
      let ignoreReasons = [];
      
      if (pool.liquidity < config.minLiquiditySUI) {
        ignoreReasons.push(`Zu niedrige Liquidität (${pool.liquidity.toFixed(2)} < ${config.minLiquiditySUI})`);
      }
      
      if (riskScore > config.maxRiskScore) {
        ignoreReasons.push(`Zu hoher Risiko-Score (${riskScore.toFixed(2)} > ${config.maxRiskScore})`);
      }
      
      if (isHoneypot) {
        ignoreReasons.push('Honeypot erkannt');
      }
      
      // Wenn der Pool ignoriert werden soll und Debug-Modus aktiv ist, logge die Gründe
      if (ignoreReasons.length > 0) {
        if (debug) {
          logger.warning(`Pool ignoriert: ${pool.coinA.symbol}/${pool.coinB.symbol}`, {
            reasons: ignoreReasons.join(', '),
            liquidity: `${pool.liquidity.toFixed(2)} SUI`,
            riskScore: riskScore.toFixed(2),
            qualityScore: qualityScore.toFixed(2)
          });
        }
        stats.ignoredPools++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Längere Verzögerung für ignorierte Pools
        continue;
      }
      
      // Pool erfüllt alle Kriterien
      stats.lastPool = pool;
      stats.acceptedPools++;
      
      // Nutze die Logger-Funktionen für neue Pools
      const poolInfo = `${getDexEmoji(pool.dex)} | Pools: ${stats.totalPools} | Akzeptiert: ${stats.acceptedPools} | Letzter Pool: ${pool.dex} (${formatTimeAgo(pool.createdAt)})`;
      logger.info('🔵 Neuer Pool erkannt', { poolInfo });
      
      // Speichere den Pool in CSV
      if (poolCount % 10 === 9) {
        logger.info('Pool in CSV gespeichert', { poolInfo });
      }
      
      // Zeige Statistiken nach jedem 5. Pool
      if (poolCount % 5 === 4) {
        displayStatistics(stats);
      }
      
      poolCount++;
      
      // Längere Verzögerung zwischen den Pools für bessere Lesbarkeit
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      logger.error('Fehler beim Scannen nach neuen Pools', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

function getDexEmoji(dex: string | undefined): string {
  switch(dex?.toLowerCase()) {
    case 'cetus': return '🌊';
    case 'bluemove': return '🔷';
    case 'turbos': return '🏎️';
    case 'kriya': return '🔮';
    default: return '🔴';
  }
}

/**
 * Zeigt Statistiken an
 * @param stats Statistiken
 */
function displayStatistics(stats: any): void {
  const scannerStatus = '🟢';
  const tradingStatus = stats.tradingAktiv ? '🟢' : '🔴';
  const autoSnipeStatus = '🔴';
  
  logger.info('📊 Scanner Statistik', {
    status: `Scanner: ${scannerStatus} | Trading: ${tradingStatus} | Auto-Snipe: ${autoSnipeStatus}`,
    pools: `Gesamt: ${stats.totalPools || 0} | Akzeptiert: ${stats.acceptedPools || 0} | Ignoriert: ${stats.ignoredPools || 0}`,
    lastPool: stats.lastPool ? `${stats.lastPool.dex} (${formatTimeAgo(stats.lastPool.createdAt)})` : 'Keiner'
  });
}

/**
 * Aktualisiert die Statistiken
 */
function updateStatistics(): void {
  // Berechne Laufzeit in Sekunden
  stats.laufzeitSekunden = Math.floor((Date.now() - startTime) / 1000);
  
  // Berechne Pools pro Minute
  const elapsedMinutes = (Date.now() - startTime) / 60000;
  if (elapsedMinutes > 0) {
    stats.poolsProMinute = (poolsFound / elapsedMinutes).toFixed(2);
  }
  
  // Aktualisiere Trading-Status
  stats.tradingAktiv = tradingActive;
}

/**
 * Generiert zufällige Pool-Daten für Demo-Zwecke
 * @returns Zufällige Pool-Daten
 */
async function generateRandomPoolData(): Promise<ParsedPoolData> {
  // Generiere eine zufällige Pool-ID
  const poolId = `0x${Math.random().toString(16).substring(2, 42)}`;
  
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
 * Formatiert eine Zeitangabe in Sekunden in ein lesbares Format
 * @param seconds Zeit in Sekunden
 * @returns Formatierte Zeit
 */
function formatAge(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  } else if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h`;
  } else {
    return `${Math.floor(seconds / 86400)}d`;
  }
}

/**
 * Generiert eine zufällige Verzögerung zwischen min und max
 * @param min Minimale Verzögerung in ms
 * @param max Maximale Verzögerung in ms
 * @returns Zufällige Verzögerung in ms
 */
function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Starte die Anwendung
main().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
}); 