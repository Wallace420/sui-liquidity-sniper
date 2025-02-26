import winston from 'winston';
import chalk from 'chalk';
import { Table } from 'console-table-printer';
import boxen from 'boxen';

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
function getRiskColor(risk) {
  const riskNum = Number(risk);
  if (riskNum < 20) return (text) => chalk.green(text);
  if (riskNum < 40) return (text) => chalk.yellow(text);
  if (riskNum < 60) return (text) => chalk.hex('#FFA500')(text);
  if (riskNum < 80) return (text) => chalk.red(text);
  return (text) => chalk.bgRed.white(text);
}

// Hilfsfunktion für Qualitätsscore-Farben
function getQualityColor(score) {
  const qualityNum = Number(score);
  if (qualityNum > 80) return (text) => chalk.green(text);
  if (qualityNum > 60) return (text) => chalk.cyan(text);
  if (qualityNum > 40) return (text) => chalk.yellow(text);
  if (qualityNum > 20) return (text) => chalk.hex('#FFA500')(text);
  return (text) => chalk.red(text);
}

// Hilfsfunktion für Gewinn/Verlust-Formatierung
function formatProfit(profit) {
  const profitNum = Number(profit);
  if (isNaN(profitNum)) return profit;
  
  if (profitNum > 0) {
    return chalk.green(`+${profitNum.toFixed(4)} SUI`);
  } else if (profitNum < 0) {
    return chalk.red(`${profitNum.toFixed(4)} SUI`);
  }
  return chalk.white(`${profitNum.toFixed(4)} SUI`);
}

// Hilfsfunktion für Status-Formatierung
function formatStatus(status) {
  switch (status.toLowerCase()) {
    case 'success':
    case 'succeeded':
    case 'bought':
    case 'sold':
      return chalk.green(status);
    case 'failed':
    case 'error':
      return chalk.red(status);
    case 'pending':
    case 'buying':
    case 'selling':
      return chalk.yellow(status);
    case 'watching':
      return chalk.cyan(status);
    default:
      return status;
  }
}

// Erstelle den Logger mit verbesserter Formatierung
const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    consoleFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ],
});

// JSDoc-Typdefinitionen für bessere IDE-Unterstützung
/**
 * @typedef {Object} PoolData
 * @property {string} [tokenSymbol]
 * @property {string} [tokenName]
 * @property {string} [dexType]
 * @property {Object} [liquidity]
 * @property {number} [liquidity.sui]
 * @property {number} [liquidity.token]
 * @property {number} [riskScore]
 * @property {boolean} [isHoneypot]
 * @property {string} [poolId]
 * @property {string} [status]
 * @property {number} [holders]
 * @property {string} [age]
 * @property {number} [socialLinksCount]
 */

/**
 * @typedef {Object} StatsData
 * @property {number} [poolsGefunden]
 * @property {string} [poolsProMinute]
 * @property {number} [laufzeitSekunden]
 * @property {boolean} [tradingAktiv]
 * @property {number} [erfolgreiche]
 * @property {number} [fehlgeschlagene]
 * @property {number} [gesamtGewinn]
 */

/**
 * @typedef {Object} LogMetadata
 * @property {string} [poolId]
 * @property {string} [tokenSymbol]
 * @property {string} [tokenName]
 * @property {string} [dex]
 * @property {Object} [coins]
 * @property {string} [coins.coinA]
 * @property {string} [coins.coinB]
 * @property {number} [liquidity]
 * @property {number} [riskScore]
 * @property {string} [action]
 * @property {string|number} [amount]
 * @property {string|number} [price]
 * @property {string|number} [profit]
 * @property {string} [status]
 * @property {string} [error]
 * @property {string} [reason]
 * @property {string} [txId]
 * @property {number} [holders]
 * @property {string} [age]
 * @property {boolean} [isHoneypot]
 * @property {string} [poolInfo]
 * @property {boolean} [poolHunting]
 * @property {string} [checkpoint]
 * @property {string} [timestamp]
 * @property {number} [poolsGefunden]
 * @property {number} [backoffTime]
 * @property {number} [totalErrors]
 * @property {string} [reasons]
 */

// Erweiterte Funktionen für bessere Benutzerausgabe

/**
 * Zeigt eine Tabelle mit aktiven Pools an
 * @param {PoolData[]} pools - Liste der Pools
 */
export function displayPoolsTable(pools) {
  if (!pools || pools.length === 0) {
    console.log(boxen(chalk.yellow('Keine aktiven Pools gefunden.'), 
      { padding: 1, margin: 0, borderStyle: 'round', borderColor: 'yellow' }));
    return;
  }
  
  const table = new Table({
    title: chalk.bold.cyan('AKTIVE POOLS'),
    columns: [
      { name: 'symbol', title: 'TOKEN', alignment: 'left' },
      { name: 'dex', title: 'DEX', alignment: 'left' },
      { name: 'liquidity', title: 'LIQUIDITÄT', alignment: 'right' },
      { name: 'risk', title: 'RISIKO', alignment: 'center' },
      { name: 'holders', title: 'HALTER', alignment: 'right' },
      { name: 'age', title: 'ALTER', alignment: 'right' },
      { name: 'status', title: 'STATUS', alignment: 'center' },
      { name: 'profit', title: 'G/V', alignment: 'right' },
    ],
  });
  
  pools.forEach(pool => {
    const riskLevel = pool.riskScore || 0;
    let riskColor = 'green';
    
    if (riskLevel > 60) riskColor = 'red';
    else if (riskLevel > 40) riskColor = 'yellow';
    else if (riskLevel > 20) riskColor = 'cyan';
    
    // Berechne das Alter des Pools
    let ageDisplay = 'N/A';
    if (pool.createdAt) {
      const ageInSeconds = (Date.now() - new Date(pool.createdAt).getTime()) / 1000;
      if (ageInSeconds < 60) {
        ageDisplay = `${Math.floor(ageInSeconds)}s`;
      } else if (ageInSeconds < 3600) {
        ageDisplay = `${Math.floor(ageInSeconds / 60)}m`;
      } else if (ageInSeconds < 86400) {
        ageDisplay = `${Math.floor(ageInSeconds / 3600)}h`;
      } else {
        ageDisplay = `${Math.floor(ageInSeconds / 86400)}d`;
      }
    }
    
    // Status-Farbe
    let statusColor = 'cyan';
    if (pool.status === 'bought' || pool.status === 'sold') statusColor = 'green';
    else if (pool.status === 'buying' || pool.status === 'selling') statusColor = 'yellow';
    else if (pool.status === 'failed') statusColor = 'red';
    
    // Gewinn/Verlust
    let profitDisplay = '-';
    let profitColor = 'white';
    
    if (pool.profitLossPercentage !== undefined) {
      profitDisplay = `${pool.profitLossPercentage.toFixed(1)}%`;
      profitColor = pool.profitLossPercentage >= 0 ? 'green' : 'red';
    }
    
    table.addRow({
      symbol: pool.tokenSymbol || '?',
      dex: pool.dexType || '?',
      liquidity: pool.liquidity?.sui ? `${pool.liquidity.sui.toFixed(2)} SUI` : (pool.liquidity ? `${pool.liquidity.toFixed(2)} SUI` : '?'),
      risk: `${riskLevel}%`,
      holders: pool.holders || 'N/A',
      age: ageDisplay,
      status: pool.status || 'watching',
      profit: profitDisplay,
    }, {
      color: pool.isHoneypot ? 'red' : (statusColor === 'green' ? 'green' : riskColor)
    });
  });
  
  console.log(boxen(table.render(), { padding: 1, margin: 0, borderStyle: 'round', borderColor: 'cyan' }));
  
  // Legende
  console.log(boxen(
    `${chalk.bold('LEGENDE')}\n\n` +
    `${chalk.bold('Status:')} ${chalk.cyan('watching')} | ${chalk.yellow('buying/selling')} | ${chalk.green('bought/sold')} | ${chalk.red('failed')}\n` +
    `${chalk.bold('Risiko:')} ${chalk.green('0-20%')} (sehr gut) | ${chalk.cyan('20-40%')} (gut) | ${chalk.yellow('40-60%')} (mittel) | ${chalk.red('60-100%')} (hoch)`,
    { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'gray' }
  ));
}

/**
 * Zeigt eine Box mit Statistiken an
 * @param {StatsData} stats - Statistiken
 */
export function displayStats(stats) {
  const runtime = stats.laufzeitSekunden || 0;
  let runtimeDisplay = '';
  
  if (runtime < 60) {
    runtimeDisplay = `${runtime}s`;
  } else if (runtime < 3600) {
    runtimeDisplay = `${Math.floor(runtime / 60)}m ${runtime % 60}s`;
  } else {
    runtimeDisplay = `${Math.floor(runtime / 3600)}h ${Math.floor((runtime % 3600) / 60)}m`;
  }
  
  const content = boxen(
    `${chalk.bold.cyan('STATISTIKEN')}\n\n` +
    `${chalk.bold('Pools gefunden:')} ${chalk.white(stats.poolsGefunden || 0)}\n` +
    `${chalk.bold('Pools pro Minute:')} ${chalk.white(stats.poolsProMinute || '0.00')}\n` +
    `${chalk.bold('Laufzeit:')} ${chalk.white(runtimeDisplay)}\n` +
    `${chalk.bold('Trading aktiv:')} ${stats.tradingAktiv ? chalk.green('Ja') : chalk.red('Nein')}\n` +
    (stats.erfolgreiche !== undefined ? `${chalk.bold('Erfolgreiche Trades:')} ${chalk.green(stats.erfolgreiche)}\n` : '') +
    (stats.fehlgeschlagene !== undefined ? `${chalk.bold('Fehlgeschlagene Trades:')} ${chalk.red(stats.fehlgeschlagene)}\n` : '') +
    (stats.gesamtGewinn !== undefined ? `${chalk.bold('Gesamtgewinn:')} ${formatProfit(stats.gesamtGewinn)}\n` : ''),
    { padding: 1, margin: 0, borderStyle: 'round', borderColor: 'cyan' }
  );
  
  console.log(content);
}

/**
 * Zeigt eine Warnung in einer Box an
 * @param {string} message - Warnungsmeldung
 */
export function displayWarning(message) {
  console.log(boxen(chalk.yellow.bold(message), {
    padding: 1,
    margin: 0,
    borderStyle: 'round',
    borderColor: 'yellow',
  }));
}

/**
 * Zeigt einen Fehler in einer Box an
 * @param {string} message - Fehlermeldung
 */
export function displayError(message) {
  console.log(boxen(chalk.red.bold(message), {
    padding: 1,
    margin: 0,
    borderStyle: 'round',
    borderColor: 'red',
  }));
}

/**
 * Zeigt eine Erfolgsmeldung in einer Box an
 * @param {string} message - Erfolgsmeldung
 */
export function displaySuccess(message) {
  console.log(boxen(chalk.green.bold(message), {
    padding: 1,
    margin: 0,
    borderStyle: 'round',
    borderColor: 'green',
  }));
}

/**
 * Loggt eine Fehlermeldung
 * @param {string} message - Fehlermeldung
 * @param {LogMetadata} meta - Zusätzliche Metadaten
 */
export const logError = (message, meta = {}) => logger.error(message, meta);

/**
 * Loggt eine Warnung
 * @param {string} message - Warnungsmeldung
 * @param {LogMetadata} meta - Zusätzliche Metadaten
 */
export const logWarn = (message, meta = {}) => logger.warn(message, meta);

/**
 * Loggt eine Informationsmeldung
 * @param {string} message - Informationsmeldung
 * @param {LogMetadata} meta - Zusätzliche Metadaten
 */
export const logInfo = (message, meta = {}) => logger.info(message, meta);

/**
 * Loggt eine Pool-Meldung
 * @param {string} message - Pool-Meldung
 * @param {LogMetadata} meta - Zusätzliche Metadaten
 */
export const logPool = (message, meta = {}) => logger.log('pool', message, meta);

/**
 * Loggt eine Trade-Meldung
 * @param {string} message - Trade-Meldung
 * @param {LogMetadata} meta - Zusätzliche Metadaten
 */
export const logTrade = (message, meta = {}) => logger.log('trade', message, meta);

/**
 * Loggt eine Debug-Meldung
 * @param {string} message - Debug-Meldung
 * @param {LogMetadata} meta - Zusätzliche Metadaten
 */
export const logDebug = (message, meta = {}) => logger.debug(message, meta);

// Exportiere für Kompatibilität mit älteren Importen
export const logWarning = logWarn;
export const logPoolEvent = logPool;
export const logTransaction = logTrade;
export const logSystemStatus = (message, meta = {}) => logger.info(`[SYSTEM] ${message}`, meta);

// Exportiere den Logger für erweiterte Anwendungsfälle
export default logger;

/**
 * Gibt ein Emoji basierend auf dem Risiko-Score zurück
 * @param {number} riskScore - Risiko-Score (0-100)
 * @returns {string} Emoji
 */
function getRiskEmoji(riskScore) {
  if (riskScore === undefined || riskScore === null) return '❓';
  if (riskScore < 20) return '🟢'; // Sehr niedriges Risiko
  if (riskScore < 40) return '🟡'; // Niedriges Risiko
  if (riskScore < 60) return '🟠'; // Mittleres Risiko
  if (riskScore < 80) return '🔴'; // Hohes Risiko
  return '💀'; // Sehr hohes Risiko
}

/**
 * Gibt ein Emoji basierend auf der Liquidität zurück
 * @param {number} liquidity - Liquidität in SUI
 * @returns {string} Emoji
 */
function getLiquidityEmoji(liquidity) {
  if (liquidity === undefined || liquidity === null) return '❓';
  if (liquidity < 100) return '💧'; // Sehr niedrige Liquidität
  if (liquidity < 500) return '🌊'; // Niedrige Liquidität
  if (liquidity < 1000) return '🌊🌊'; // Mittlere Liquidität
  if (liquidity < 5000) return '🌊🌊🌊'; // Hohe Liquidität
  return '🌊🌊🌊🌊'; // Sehr hohe Liquidität
}

function formatPoolInfo(pool, stats) {
  const dexEmoji = getDexEmoji(pool.dex);
  const ageFormatted = formatTimeAgo(pool.createdAt || Date.now());
  
  return `${dexEmoji} | Pools: ${stats.totalPools} | Letzter Pool: ${pool.dex} (${ageFormatted})`;
}

function logNewPool(pool, stats) {
  logInfo('🔵 Neuer Pool erkannt', {
    poolInfo: formatPoolInfo(pool, stats)
  });
}

function logPoolSaved(pool, stats) {
  logInfo('Pool in CSV gespeichert', {
    poolInfo: formatPoolInfo(pool, stats)
  });
}

function getDexEmoji(dex) {
  switch(dex?.toLowerCase()) {
    case 'cetus': return '🌊';
    case 'bluemove': return '🔷';
    case 'turbos': return '🏎️';
    case 'kriya': return '🔮';
    default: return '🔴';
  }
}

// Füge Emojis für Log-Level hinzu
function getLogLevelEmoji(level) {
  switch (level) {
    case 'error': return '❌';
    case 'warn': return '⚠️';
    case 'info': return 'ℹ️';
    case 'pool': return '🔵';
    case 'trade': return '💰';
    case 'debug': return '🔍';
    default: return '';
  }
} 