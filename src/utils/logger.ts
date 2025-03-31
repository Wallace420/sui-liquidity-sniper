import winston from 'winston';
import chalk from 'chalk';
import { Table } from 'console-table-printer';
import boxen from 'boxen';

// Erweiterte LogMetadata-Schnittstelle für Typensicherheit
export interface LogMetadata {
  [key: string]: any;
  error?: string;
  poolId?: string;
  dex?: string;
  coins?: { coinA?: string; coinB?: string };
  liquidity?: number;
  riskScore?: number;
  poolInfo?: string;
  timestamp?: string;
  age?: string;
  poolsFound?: number;
  runtime?: number;
  poolsPerMinute?: string;
  avgEventAge?: string;
  tradingEnabled?: boolean;
  poolHunting?: boolean;
  trading?: boolean;
  autoSniping?: boolean;
  checkpointStr?: string;
  errorCount?: number;
  maxErrors?: number;
  totalErrors?: number;
  timeWindowSec?: number;
  backoffTimeSec?: number;
  buyTxId?: string;
  sellTxId?: string;
}

// Konfiguration für verschiedene Log-Typen
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  pool: 3,
  trade: 4,
  debug: 5,
};

// Angepasstes Format für die Konsole mit verbesserter Strukturierung
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...rest }) => {
  // Extrahiere wichtige Daten für spezielle Formatierung
  const poolId = rest.poolId || '';
  const dex = rest.dex || '';
  const coins = rest.coins || {};
  const liquidity = rest.liquidity || 0;
  const riskScore = rest.riskScore || 0;
  const poolInfo = rest.poolInfo || '';
  
  // Verbesserte Formatierung mit Emojis
  const timestamp_str = timestamp ? `[${timestamp}] ` : '';
  const level_emoji = getLogLevelEmoji(level);
  
  // Spezielle Formatierung für Pool-Informationen
  if (poolInfo) {
    return `${timestamp_str}${level_emoji} ${message} ${poolInfo}`;
  }
  
  // Standardformatierung für andere Logs
  if (rest.metadata) {
    return `${timestamp_str}${level_emoji} ${message} ${JSON.stringify(rest.metadata)}`;
  }
  
  return `${timestamp_str}${level_emoji} ${message}`;
});

// Hilfsfunktion für Risiko-Farben
function getRiskColor(risk: number) {
  if (risk < 20) return (text: string) => chalk.green(text);
  if (risk < 40) return (text: string) => chalk.yellow(text);
  if (risk < 60) return (text: string) => chalk.hex('#FFA500')(text);
  if (risk < 80) return (text: string) => chalk.red(text);
  return (text: string) => chalk.bgRed.white(text);
}

// Hilfsfunktion für Qualitäts-Farben
function getQualityColor(score: number) {
  if (score > 80) return (text: string) => chalk.green(text);
  if (score > 60) return (text: string) => chalk.yellow(text);
  if (score > 40) return (text: string) => chalk.hex('#FFA500')(text);
  if (score > 20) return (text: string) => chalk.red(text);
  return (text: string) => chalk.bgRed.white(text);
}

// Hilfsfunktion für Profit-Formatierung
function formatProfit(profit: number) {
  if (profit > 0) {
    return chalk.green(`+${profit.toFixed(2)}%`);
  } else if (profit < 0) {
    return chalk.red(`${profit.toFixed(2)}%`);
  } else {
    return chalk.gray('0.00%');
  }
}

// Hilfsfunktion für Status-Formatierung
function formatStatus(status: string) {
  switch (status.toLowerCase()) {
    case 'success':
    case 'completed':
      return chalk.green('✓ ' + status);
    case 'pending':
    case 'running':
      return chalk.yellow('⟳ ' + status);
    case 'failed':
    case 'error':
      return chalk.red('✗ ' + status);
    default:
      return chalk.gray(status);
  }
}

// Erstelle Winston-Logger mit angepassten Levels
const logger = winston.createLogger({
  levels: LOG_LEVELS,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'HH:mm:ss'
    }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    consoleFormat
  ),
  transports: [
    new winston.transports.Console({
      level: 'debug'
    }),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'combined.log'
    })
  ]
});

// Füge benutzerdefinierte Log-Levels zu Winston hinzu
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  pool: 'cyan',
  trade: 'magenta',
  debug: 'gray'
});

// Exportiere Logger als Standard
export default logger;

// Exportiere Hilfsfunktionen für Tabellen und formatierte Ausgaben
export function displayPoolsTable(pools: any[]) {
  if (!pools || pools.length === 0) {
    console.log(chalk.yellow('Keine Pools gefunden.'));
    return;
  }

  const table = new Table({
    columns: [
      { name: 'dex', title: 'DEX', alignment: 'left' },
      { name: 'age', title: 'Alter', alignment: 'right' },
      { name: 'liquidity', title: 'Liquidität', alignment: 'right' },
      { name: 'risk', title: 'Risiko', alignment: 'center' },
      { name: 'token', title: 'Token', alignment: 'left' },
      { name: 'poolId', title: 'Pool ID', alignment: 'left' }
    ]
  });

  pools.forEach(pool => {
    const age = typeof pool.age === 'number' 
      ? formatAge(pool.age) 
      : (typeof pool.createdAt === 'object' ? formatAge((Date.now() - pool.createdAt.getTime()) / 1000) : 'Unbekannt');
    
    const riskScore = pool.riskScore || Math.floor(Math.random() * 100);
    const riskColor = getRiskColor(riskScore);
    
    const liquidityValue = pool.liquidity || Math.random() * 10000;
    const liquidityFormatted = formatLiquidity(liquidityValue);
    
    table.addRow({
      dex: getDexEmoji(pool.dex) + ' ' + pool.dex,
      age: age,
      liquidity: liquidityFormatted,
      risk: riskColor(`${riskScore}%`),
      token: pool.tokenSymbol || 'Unbekannt',
      poolId: truncateString(pool.poolId, 10)
    });
  });

  console.log(boxen(table.render(), {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    title: `${pools.length} Pools gefunden`,
    titleAlignment: 'center'
  }));
}

// Hilfsfunktion für Altersformatierung
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

// Hilfsfunktion für Liquiditätsformatierung
function formatLiquidity(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}

// Hilfsfunktion zum Kürzen von Strings
function truncateString(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength / 2) + '...' + str.substring(str.length - maxLength / 2);
}

// Exportiere Statistik-Anzeige
export function displayStats(stats: any) {
  console.log(boxen(
    `Pools gefunden: ${chalk.cyan(stats.poolsGefunden)}\n` +
    `Pools pro Minute: ${chalk.yellow(stats.poolsProMinute)}\n` +
    `Laufzeit: ${chalk.green(formatTime(stats.laufzeitSekunden))}\n` +
    `Trading: ${stats.tradingAktiv ? chalk.green('Aktiv') : chalk.red('Inaktiv')}\n` +
    `Erfolgreiche Trades: ${chalk.green(stats.erfolgreiche)}\n` +
    `Fehlgeschlagene: ${chalk.red(stats.fehlgeschlagene)}\n` +
    `Gesamtgewinn: ${formatProfit(stats.gesamtGewinn)}`,
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
      title: 'Statistiken',
      titleAlignment: 'center'
    }
  ));
}

// Hilfsfunktion für Zeitformatierung
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [
    hours > 0 ? `${hours}h` : '',
    minutes > 0 ? `${minutes}m` : '',
    `${secs}s`
  ].filter(Boolean).join(' ');
}

// Exportiere Warnungs-Anzeige
export function displayWarning(message: string) {
  console.log(boxen(message, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'yellow',
    backgroundColor: '#333',
    title: '⚠️ Warnung',
    titleAlignment: 'center'
  }));
}

// Exportiere Fehler-Anzeige
export function displayError(message: string) {
  console.log(boxen(message, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'red',
    backgroundColor: '#331111',
    title: '❌ Fehler',
    titleAlignment: 'center'
  }));
}

// Exportiere Erfolgs-Anzeige
export function displaySuccess(message: string) {
  console.log(boxen(message, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'green',
    backgroundColor: '#113311',
    title: '✅ Erfolg',
    titleAlignment: 'center'
  }));
}

// Exportiere Log-Funktionen
export const logError = (message: string, meta: LogMetadata = {}) => logger.error(message, { metadata: meta });
export const logWarn = (message: string, meta: LogMetadata = {}) => logger.warn(message, { metadata: meta });
export const logInfo = (message: string, meta: LogMetadata = {}) => logger.info(message, { metadata: meta });
export const logPool = (message: string, meta: LogMetadata = {}) => logger.log('pool', message, { metadata: meta });
export const logTrade = (message: string, meta: LogMetadata = {}) => logger.log('trade', message, { metadata: meta });
export const logDebug = (message: string, meta: LogMetadata = {}) => logger.debug(message, { metadata: meta });
export const logSystemStatus = (message: string, meta: LogMetadata = {}) => logger.info(`[SYSTEM] ${message}`, { metadata: meta });

// Hilfsfunktion für Risiko-Emojis
function getRiskEmoji(riskScore: number): string {
  if (riskScore < 20) return '🟢';
  if (riskScore < 40) return '🟡';
  if (riskScore < 60) return '🟠';
  if (riskScore < 80) return '🔴';
  return '💀';
}

// Hilfsfunktion für Liquiditäts-Emojis
function getLiquidityEmoji(liquidity: number): string {
  if (liquidity > 10000) return '💰';
  if (liquidity > 1000) return '💵';
  return '💸';
}

// Hilfsfunktion für Pool-Info-Formatierung
function formatPoolInfo(pool: any, stats: any): string {
  return `${getDexEmoji(pool.dex)} ${pool.dex} | ${formatLiquidity(pool.liquidity)} | ${getRiskEmoji(pool.riskScore)} ${pool.riskScore}%`;
}

// Hilfsfunktion für neue Pool-Logs
function logNewPool(pool: any, stats: any): void {
  logPool(`Neuer Pool gefunden: ${pool.tokenSymbol || 'Unbekannt'}`, { poolInfo: formatPoolInfo(pool, stats), poolId: pool.poolId });
}

// Hilfsfunktion für gespeicherte Pool-Logs
function logPoolSaved(pool: any, stats: any): void {
  logPool(`Pool gespeichert: ${pool.tokenSymbol || 'Unbekannt'}`, { poolInfo: formatPoolInfo(pool, stats), poolId: pool.poolId });
}

// Hilfsfunktion für DEX-Emojis
function getDexEmoji(dex: string): string {
  switch (dex?.toLowerCase()) {
    case 'cetus':
      return '🌊';
    case 'bluemove':
      return '🔵';
    case 'turbos':
      return '🏎️';
    case 'kriya':
      return '🧘';
    default:
      return '🔄';
  }
}

// Hilfsfunktion für Log-Level-Emojis
function getLogLevelEmoji(level: string): string {
  switch (level) {
    case 'error':
      return '❌';
    case 'warn':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    case 'pool':
      return '🔍';
    case 'trade':
      return '💱';
    case 'debug':
      return '🔧';
    default:
      return '📝';
  }
} 