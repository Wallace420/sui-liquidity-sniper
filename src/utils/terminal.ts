import chalk from 'chalk';
import { ParsedPoolData, PoolStatus, TradeMetrics } from '../types/index.js';
import { TradingInfo } from '../trader/tradeStrategy.js';
import { Table } from 'console-table-printer';
import readline from 'readline';
import boxen from 'boxen';
import ora from 'ora';
import figlet from 'figlet';

// Spinner für Ladeanimationen
let spinner: ReturnType<typeof ora> | null = null;

// Terminal-Größe
let terminalWidth = process.stdout.columns || 80;
let terminalHeight = process.stdout.rows || 24;

// Aktualisiere Terminal-Größe bei Änderung
process.stdout.on('resize', () => {
  terminalWidth = process.stdout.columns || 80;
  terminalHeight = process.stdout.rows || 24;
});

// Readline-Interface für Benutzereingaben
let rl: readline.Interface | null = null;

// Kommandohistorie
const commandHistory: string[] = [];
let historyIndex = 0;

// Aktive Pools für die Anzeige
const activePools: Record<string, any> = {};

// Farbkodierung für Status
const getStatusColor = (status: string): any => {
  switch (status) {
    case 'watching': return chalk.cyan;
    case 'buying': return chalk.yellow;
    case 'bought': return chalk.green;
    case 'selling': return chalk.magenta;
    case 'sold': return chalk.blue;
    case 'failed': return chalk.red;
    default: return chalk.white;
  }
};

// Farbkodierung für Risikobewertung
const getRiskColor = (risk: number): any => {
  if (risk < 20) return chalk.green;
  if (risk < 40) return chalk.yellow;
  if (risk < 60) return chalk.hex('#FFA500'); // orange
  if (risk < 80) return chalk.red;
  return chalk.bgRed.white;
};

// Farbkodierung für Gewinn/Verlust
const getProfitColor = (profit: number): any => {
  if (profit > 0) return chalk.green;
  if (profit < 0) return chalk.red;
  return chalk.white;
};

/**
 * Zeigt einen formatierten Header für die Anwendung an
 */
export function displayHeader(): void {
  console.clear();
  console.log(
    chalk.cyan(
      figlet.textSync('SUI Sniper', { font: 'Standard', horizontalLayout: 'full' })
    )
  );
  console.log(
    boxen(chalk.bold('Entwickelt von DirtySanch3z'), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
    })
  );
  console.log('\n');
}

/**
 * Zeigt eine Tabelle mit aktiven Pools an
 * @param pools Liste der aktiven Pools
 */
export function displayActivePoolsTable(pools: PoolStatus[]): void {
  if (pools.length === 0) {
    console.log(chalk.yellow('Keine aktiven Pools gefunden.'));
    return;
  }

  const table = new Table({
    title: chalk.bold.cyan('Aktive Pools'),
    columns: [
      { name: 'symbol', title: 'Token', alignment: 'left' },
      { name: 'status', title: 'Status', alignment: 'center' },
      { name: 'liquidity', title: 'Liquidität', alignment: 'right' },
      { name: 'holders', title: 'Halter', alignment: 'right' },
      { name: 'age', title: 'Alter', alignment: 'center' },
      { name: 'entryPrice', title: 'Einstieg', alignment: 'right' },
      { name: 'currentPrice', title: 'Aktuell', alignment: 'right' },
      { name: 'profitLoss', title: 'G/V %', alignment: 'right' },
      { name: 'riskScore', title: 'Risiko', alignment: 'center' },
      { name: 'quality', title: 'Qualität', alignment: 'center' },
    ],
  });

  for (const pool of pools) {
    const statusColor = getStatusColor(pool.status);
    const plColor = (pool.profitLossPercentage || 0) >= 0 ? chalk.green : chalk.red;
    const riskColor = getRiskColor(pool.riskScore);
    
    // Berechne Qualitätsscore
    let qualityScore = 0;
    
    // Risikoscore (0-40 ist gut, 40-100 ist schlecht)
    qualityScore += Math.max(0, 100 - (pool.riskScore * 2.5));
    
    // Liquidität (bis zu 1000 SUI gibt Punkte)
    qualityScore += Math.min(30, (pool.liquidity || 0) / 33.33);
    
    // Halter (bis zu 1000 Halter gibt Punkte)
    qualityScore += Math.min(20, (pool.holders || 0) / 50);
    
    // Alter (bis zu 24h gibt Punkte)
    const ageInHours = pool.createdAt ? 
      (Date.now() - pool.createdAt.getTime()) / (1000 * 60 * 60) : 0;
    qualityScore += Math.min(20, ageInHours / 1.2);
    
    // Social Links
    qualityScore += Math.min(10, (pool.socialLinksCount || 0) * 2.5);
    
    qualityScore = qualityScore / 1.8; // Normalisieren auf 0-100
    
    // Berechne das Alter des Pools für die Anzeige
    let ageDisplay = 'N/A';
    if (pool.createdAt) {
      const ageInSeconds = (Date.now() - pool.createdAt.getTime()) / 1000;
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
    
    // Qualitätsfarbe
    let qualityColor;
    if (qualityScore >= 80) qualityColor = chalk.green;
    else if (qualityScore >= 60) qualityColor = chalk.cyan;
    else if (qualityScore >= 40) qualityColor = chalk.yellow;
    else if (qualityScore >= 20) qualityColor = chalk.hex('#FFA500'); // orange
    else qualityColor = chalk.red;

    table.addRow({
      symbol: pool.tokenSymbol,
      status: statusColor(pool.status),
      liquidity: pool.liquidity ? `${pool.liquidity.toFixed(1)} SUI` : '-',
      holders: pool.holders || '-',
      age: ageDisplay,
      entryPrice: pool.entryPrice ? `${pool.entryPrice.toFixed(6)}` : '-',
      currentPrice: pool.currentPrice ? `${pool.currentPrice.toFixed(6)}` : '-',
      profitLoss: pool.profitLossPercentage 
        ? plColor(`${pool.profitLossPercentage.toFixed(1)}%`) 
        : '-',
      riskScore: riskColor(`${pool.riskScore.toFixed(0)}%`),
      quality: qualityColor(`${qualityScore.toFixed(0)}%`),
    });
  }

  table.printTable();
  
  console.log(chalk.gray('Legende:'));
  console.log(`${chalk.gray('Status:')} ${chalk.cyan('watching')} | ${chalk.yellow('buying')} | ${chalk.green('bought')} | ${chalk.magenta('selling')} | ${chalk.blue('sold')} | ${chalk.red('failed')}`);
  console.log(`${chalk.gray('Risiko:')} ${chalk.green('0-20%')} (sehr gut) | ${chalk.yellow('20-40%')} (gut) | ${chalk.hex('#FFA500')('40-60%')} (mittel) | ${chalk.red('60-80%')} (hoch) | ${chalk.bgRed.white('80-100%')} (sehr hoch)`);
  console.log(`${chalk.gray('Qualität:')} ${chalk.green('80-100%')} (ausgezeichnet) | ${chalk.cyan('60-80%')} (sehr gut) | ${chalk.yellow('40-60%')} (gut) | ${chalk.hex('#FFA500')('20-40%')} (mäßig) | ${chalk.red('0-20%')} (schlecht)`);
}

/**
 * Zeigt detaillierte Informationen zu einem Pool an
 * @param pool Pool-Daten
 * @param status Pool-Status (optional)
 */
export function displayPoolDetails(pool: ParsedPoolData, status?: PoolStatus): void {
  console.log(
    boxen(
      `${chalk.bold.cyan('Pool Details')}\n\n` +
      `${chalk.bold('Token:')} ${pool.tokenName} (${pool.tokenSymbol})\n` +
      `${chalk.bold('Token Adresse:')} ${pool.tokenAddress}\n` +
      `${chalk.bold('Pool ID:')} ${pool.poolId}\n` +
      `${chalk.bold('DEX:')} ${pool.dexType}\n` +
      `${chalk.bold('Liquidität:')} ${pool.liquidity.sui.toFixed(2)} SUI / ${pool.liquidity.token.toFixed(0)} ${pool.tokenSymbol}\n` +
      `${chalk.bold('Erstellt am:')} ${pool.createdAt.toLocaleString()}\n\n` +
      
      (pool.socialLinks ? 
        `${chalk.bold.cyan('Social Links')}\n` +
        `${chalk.bold('Website:')} ${pool.socialLinks.website || 'N/A'}\n` +
        `${chalk.bold('Telegram:')} ${pool.socialLinks.telegram || 'N/A'}\n` +
        `${chalk.bold('Twitter:')} ${pool.socialLinks.twitter || 'N/A'}\n` +
        `${chalk.bold('Discord:')} ${pool.socialLinks.discord || 'N/A'}\n\n` : '') +
      
      (pool.metrics ? 
        `${chalk.bold.cyan('Metriken')}\n` +
        `${chalk.bold('Halter:')} ${pool.metrics.holders || 'N/A'}\n` +
        `${chalk.bold('Transaktionen:')} ${pool.metrics.transactions || 'N/A'}\n` +
        `${chalk.bold('Marktkapitalisierung:')} ${pool.metrics.marketCap ? `${pool.metrics.marketCap.toFixed(2)} SUI` : 'N/A'}\n` +
        `${chalk.bold('Voll verwässerter Wert:')} ${pool.metrics.fullyDilutedValue ? `${pool.metrics.fullyDilutedValue.toFixed(2)} SUI` : 'N/A'}\n\n` : '') +
      
      (status ? 
        `${chalk.bold.cyan('Handelsstatistiken')}\n` +
        `${chalk.bold('Status:')} ${getStatusColor(status.status)(status.status)}\n` +
        `${chalk.bold('Einstiegspreis:')} ${status.entryPrice ? `${status.entryPrice.toFixed(6)} SUI` : 'N/A'}\n` +
        `${chalk.bold('Aktueller Preis:')} ${status.currentPrice ? `${status.currentPrice.toFixed(6)} SUI` : 'N/A'}\n` +
        `${chalk.bold('G/V:')} ${status.profitLoss ? `${status.profitLoss.toFixed(4)} SUI` : 'N/A'}\n` +
        `${chalk.bold('G/V %:')} ${status.profitLossPercentage ? `${status.profitLossPercentage.toFixed(2)}%` : 'N/A'}\n` +
        `${chalk.bold('Risiko-Score:')} ${getRiskColor(status.riskScore)(`${status.riskScore.toFixed(0)}%`)}\n` +
        `${chalk.bold('Honeypot:')} ${status.isHoneypot ? chalk.red('Ja') : chalk.green('Nein')}\n` : ''),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );
}

/**
 * Zeigt eine Zusammenfassung der Sniping-Ergebnisse an
 * @param metrics Handelsmetriken
 */
export function displaySnipingSummary(metrics: TradeMetrics): void {
  const table = new Table({
    title: chalk.bold.cyan('Sniping Zusammenfassung'),
    columns: [
      { name: 'metric', title: 'Metrik', alignment: 'left' },
      { name: 'value', title: 'Wert', alignment: 'right' },
    ],
  });

  table.addRow({ metric: 'Aktive Pools', value: metrics.activePools });
  table.addRow({ metric: 'Erfolgreiche Trades', value: metrics.successfulTrades });
  table.addRow({ metric: 'Fehlgeschlagene Trades', value: metrics.failedTrades });
  table.addRow({ metric: 'Durchschnittlicher Gewinn', value: `${metrics.averageProfit.toFixed(4)} SUI` });
  table.addRow({ metric: 'Gesamtgewinn', value: `${metrics.totalProfit.toFixed(4)} SUI` });

  table.printTable();
}

/**
 * Zeigt eine Benachrichtigung über einen neuen Pool an
 * @param pool Pool-Daten
 * @param riskScore Risiko-Score
 * @param isHoneypot Ist der Pool ein Honeypot?
 */
export function displayNewPoolAlert(pool: ParsedPoolData, riskScore: number, isHoneypot: boolean): void {
  console.log(
    boxen(
      `${chalk.bold.yellow('⚠️ NEUER POOL ENTDECKT ⚠️')}\n\n` +
      `${chalk.bold('Token:')} ${pool.tokenName} (${pool.tokenSymbol})\n` +
      `${chalk.bold('DEX:')} ${pool.dexType}\n` +
      `${chalk.bold('Liquidität:')} ${pool.liquidity.sui.toFixed(2)} SUI\n` +
      `${chalk.bold('Risiko-Score:')} ${getRiskColor(riskScore)(`${riskScore.toFixed(0)}%`)}\n` +
      `${chalk.bold('Honeypot:')} ${isHoneypot ? chalk.red('Ja') : chalk.green('Nein')}\n\n` +
      `${chalk.bold('Befehle:')} ${chalk.cyan('details ' + pool.poolId)} für mehr Informationen\n` +
      `${chalk.bold('         ')} ${chalk.green('buy ' + pool.poolId + ' <amount>')} zum Kaufen`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'yellow',
      }
    )
  );
}

/**
 * Startet eine Ladeanimation
 * @param text Text, der während des Ladens angezeigt wird
 */
export function startSpinner(text: string): void {
  if (spinner) {
    spinner.stop();
  }
  spinner = ora(text).start();
}

/**
 * Stoppt die Ladeanimation
 * @param text Abschlusstext (optional)
 * @param type Typ der Nachricht (success, error, info, warn)
 */
export function stopSpinner(text?: string, type: 'success' | 'error' | 'info' | 'warn' = 'success'): void {
  if (!spinner) return;
  
  if (text) {
    if (type === 'success' && spinner.succeed) {
      spinner.succeed(text);
    } else if (type === 'error' && spinner.fail) {
      spinner.fail(text);
    } else if (type === 'info' && spinner.info) {
      spinner.info(text);
    } else if (type === 'warn' && spinner.warn) {
      spinner.warn(text);
    } else {
      spinner.stop();
    }
  } else {
    spinner.stop();
  }
  spinner = null;
}

/**
 * Zeigt eine Fehlermeldung an
 * @param message Fehlermeldung
 */
export function displayError(message: string): void {
  console.log(
    boxen(chalk.bold.red(message), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'red',
    })
  );
}

/**
 * Zeigt eine Erfolgsmeldung an
 * @param message Erfolgsmeldung
 */
export function displaySuccess(message: string): void {
  console.log(
    boxen(chalk.bold.green(message), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'green',
    })
  );
}

/**
 * Initialisiert die Benutzereingabe
 * @param onCommand Callback-Funktion für Befehle
 */
export function initializeUserInput(onCommand: (command: string) => void): void {
  if (rl) {
    rl.close();
  }

  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('sui-sniper> '),
    historySize: 50,
    removeHistoryDuplicates: true,
  });

  rl.prompt();

  rl.on('line', (line) => {
    const command = line.trim();
    if (command) {
      commandHistory.push(command);
      historyIndex = commandHistory.length;
      onCommand(command);
    }
    if (rl) {
      rl.prompt();
    }
  });

  rl.on('close', () => {
    console.log(chalk.yellow('Auf Wiedersehen!'));
    process.exit(0);
  });

  // Tastaturkürzel für Befehlshistorie
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  
  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
      process.exit(0);
    } else if (key.name === 'up') {
      if (historyIndex > 0) {
        historyIndex--;
        if (rl) {
          rl.write(null, { ctrl: true, name: 'u' });
          rl.write(commandHistory[historyIndex]);
        }
      }
    } else if (key.name === 'down') {
      if (historyIndex < commandHistory.length) {
        historyIndex++;
        if (rl) {
          rl.write(null, { ctrl: true, name: 'u' });
          if (commandHistory[historyIndex]) {
            rl.write(commandHistory[historyIndex]);
          }
        }
      }
    }
  });
  
  console.log(chalk.cyan('\nGeben Sie Befehle ein oder "help" für Hilfe:'));
  rl.prompt();
}

/**
 * Zeigt eine Hilfeübersicht an
 */
export function displayHelp(): void {
  console.log(
    boxen(
      `${chalk.bold.cyan('Verfügbare Befehle')}\n\n` +
      `${chalk.bold('help')} (h) - Zeigt diese Hilfe an\n` +
      `${chalk.bold('clear')} (c) - Löscht den Bildschirm\n` +
      `${chalk.bold('status')} (s) - Zeigt den aktuellen Status an\n` +
      `${chalk.bold('pools')} (p) - Zeigt alle aktiven Pools an\n` +
      `${chalk.bold('details <poolId>')} - Zeigt Details zu einem Pool an\n` +
      `${chalk.bold('buy <poolId> <amount>')} - Kauft Token aus einem Pool\n` +
      `${chalk.bold('sell <poolId> <amount>')} - Verkauft Token aus einem Pool\n` +
      `${chalk.bold('auto <on|off>')} (a/x) - Schaltet den Auto-Modus ein/aus\n` +
      `${chalk.bold('set <param> <value>')} - Setzt einen Parameter\n` +
      `${chalk.bold('risk')} (r) - Zeigt Risikoanalyse für alle Pools\n` +
      `${chalk.bold('filter')} (f) - Zeigt und ändert Filtereinstellungen\n` +
      `${chalk.bold('quickbuy')} (qb) - Kauft automatisch den besten Pool\n`
    )
  );
}