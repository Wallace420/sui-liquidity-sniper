import chalk from 'chalk';
import boxen from 'boxen';
import { Table } from 'console-table-printer';
import { clearScreenDown } from 'readline';

// Typen für Dashboard-Komponenten
export interface DashboardConfig {
  refreshRate: number;
  showPoolList: boolean;
  showTradeList: boolean;
  showWalletInfo: boolean;
  showRiskMetrics: boolean;
  compactMode: boolean;
}

export interface PoolData {
  poolId: string;
  dex: string;
  coinA: string;
  coinB: string;
  timestamp: number;
  liquidity?: number;
  volume24h?: number;
  priceChange24h?: number;
  tokenSymbol?: string;
  riskScore?: number;
  createdAt?: Date;
  age?: number;
}

export interface TradeData {
  tradeId: string;
  poolId: string;
  tokenSymbol: string;
  entryPrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
  status: 'pending' | 'bought' | 'selling' | 'sold' | 'failed';
  timestamp: number;
  amount: number;
  exitPrice?: number;
  exitTimestamp?: number;
}

export interface WalletInfo {
  address: string;
  balance: number;
  tokens: Array<{
    symbol: string;
    amount: number;
    value: number;
  }>;
  totalValue: number;
  pendingTransactions: number;
}

export interface RiskMetrics {
  overallRisk: number;
  marketConditions: 'bullish' | 'bearish' | 'neutral';
  scamProbability: number;
  rugPullRisk: number;
  honeypotRisk: number;
  volatilityIndex: number;
  liquidityRisk: number;
}

export interface SystemStatus {
  poolHunting: boolean;
  trading: boolean;
  autoSniping: boolean;
  poolsFound: number;
  lastPool?: {
    dex: string;
    age: string;
  };
  uptime: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

export interface OnChainAnalytics {
  totalPools: number;
  poolsLast24h: number;
  avgLiquidity: number;
  topDexes: Record<string, number>;
  avgPoolLifetime: number;
  totalVolume24h: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
  avgExecutionTime: number;
  topTokens: { symbol: string; volume: number; }[];
}

// Standardkonfiguration
const DEFAULT_CONFIG: DashboardConfig = {
  refreshRate: 5000,
  showPoolList: true,
  showTradeList: true,
  showWalletInfo: true,
  showRiskMetrics: true,
  compactMode: false
};

// Dashboard-Klasse
export class Dashboard {
  private pools: PoolData[] = [];
  private trades: TradeData[] = [];
  private walletInfo?: WalletInfo;
  private riskMetrics?: RiskMetrics;
  private systemStatus: SystemStatus = {
    poolHunting: false,
    trading: false,
    autoSniping: false,
    poolsFound: 0,
    uptime: 0
  };
  
  public config: DashboardConfig;
  private isRunning = false;
  private lastRenderTime = 0;
  private renderInterval: NodeJS.Timeout | null = null;
  private startTime: number;

  constructor(config: Partial<DashboardConfig> = {}) {
    this.startTime = Date.now();
    this.config = {
      refreshRate: config.refreshRate || 5000,
      showPoolList: config.showPoolList !== undefined ? config.showPoolList : true,
      showTradeList: config.showTradeList !== undefined ? config.showTradeList : true,
      showWalletInfo: config.showWalletInfo !== undefined ? config.showWalletInfo : true,
      showRiskMetrics: config.showRiskMetrics !== undefined ? config.showRiskMetrics : true,
      compactMode: config.compactMode !== undefined ? config.compactMode : false
    };
  }

  // Starte das Dashboard
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // Initialer Render
    this.render();
    
    // Starte Render-Intervall
    this.renderInterval = setInterval(() => {
      // Nur rendern, wenn genug Zeit vergangen ist (verhindert zu schnelle Updates)
      const now = Date.now();
      if (now - this.lastRenderTime >= this.config.refreshRate) {
        this.render();
        this.lastRenderTime = now;
      }
    }, this.config.refreshRate);
  }

  // Stoppe das Dashboard
  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    
    if (this.renderInterval) {
      clearInterval(this.renderInterval);
      this.renderInterval = null;
    }
  }

  // Aktualisiere Pools
  public updatePools(pools: PoolData[]): void {
    this.pools = pools;
  }

  // Aktualisiere Trades
  public updateTrades(trades: TradeData[]): void {
    this.trades = trades;
  }

  // Aktualisiere Wallet-Informationen
  public updateWalletInfo(walletInfo: WalletInfo): void {
    this.walletInfo = walletInfo;
  }

  // Aktualisiere Risikometriken
  public updateRiskMetrics(riskMetrics: RiskMetrics): void {
    this.riskMetrics = riskMetrics;
  }

  // Aktualisiere System-Status
  public updateSystemStatus(status: SystemStatus): void {
    this.systemStatus = status;
  }

  // Hole aktuelle Pools
  public getPools(): PoolData[] {
    return [...this.pools];
  }

  // Hole aktuelle Trades
  public getTrades(): TradeData[] {
    return [...this.trades];
  }

  // Rendere das Dashboard mit verbesserter Lesbarkeit
  public async render(): Promise<void> {
    return new Promise((resolve) => {
      // Verzögerung für bessere Lesbarkeit
      setTimeout(() => {
        try {
          // Aktualisiere Uptime
          this.systemStatus.uptime = (Date.now() - this.startTime) / 1000;
          
          // Lösche vorherige Ausgabe
          console.clear();
          
          // Rendere Header
          this.renderHeader();
          
          // Rendere Komponenten basierend auf Konfiguration
          if (this.config.showPoolList) {
            this.renderPoolList();
          }
          
          if (this.config.showTradeList) {
            this.renderTradeList();
          }
          
          if (this.config.showWalletInfo && this.walletInfo) {
            this.renderWalletInfo();
          }
          
          if (this.config.showRiskMetrics && this.riskMetrics) {
            this.renderRiskMetrics();
          }
          
          // Rendere Footer
          this.renderFooter();
          
          resolve();
        } catch (error) {
          console.error('Fehler beim Rendern des Dashboards:', error);
          resolve();
        }
      }, 500); // 500ms Verzögerung für bessere Lesbarkeit
    });
  }

  // Hilfsmethoden für Farbgebung
  private getQualityColor(quality: string): string {
    switch (quality.toLowerCase()) {
      case 'hoch':
        return chalk.green('Hoch');
      case 'mittel':
        return chalk.yellow('Mittel');
      case 'niedrig':
        return chalk.red('Niedrig');
      default:
        return chalk.gray('Unbekannt');
    }
  }

  private getTradeTypeColor(type: string): string {
    return type.toLowerCase() === 'kauf' ? chalk.green('Kauf') : chalk.red('Verkauf');
  }

  private getTradeStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'erfolg':
        return chalk.green('Erfolg');
      case 'ausstehend':
        return chalk.yellow('Ausstehend');
      case 'fehlgeschlagen':
        return chalk.red('Fehlgeschlagen');
      default:
        return chalk.gray(status);
    }
  }

  private getMarketConditionColor(condition: string): string {
    switch (condition.toLowerCase()) {
      case 'bullish':
        return chalk.green('Bullish');
      case 'neutral':
        return chalk.yellow('Neutral');
      case 'bearish':
        return chalk.red('Bearish');
      default:
        return chalk.gray(condition);
    }
  }

  private getRiskLevelColor(level: string): string {
    switch (level.toLowerCase()) {
      case 'niedrig':
        return chalk.green('Niedrig');
      case 'mittel':
        return chalk.yellow('Mittel');
      case 'hoch':
        return chalk.red('Hoch');
      default:
        return chalk.gray(level);
    }
  }

  private renderHeader(): void {
    console.log(chalk.bold.cyan('╔═════════════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║                           SUI LIQUIDITY SNIPER                              ║'));
    console.log(chalk.bold.cyan('╚═════════════════════════════════════════════════════════════════════════════╝'));
    console.log('');
  }

  private renderPoolList(): void {
    if (this.pools.length === 0) return;
    
    console.log(chalk.bold.green('╔═══════════════════════════════ AKTUELLE POOLS ════════════════════════════════╗'));
    console.log('║ ' + chalk.underline('ID'.padEnd(8)) + ' | ' + 
                      chalk.underline('Token'.padEnd(15)) + ' | ' + 
                      chalk.underline('Liquidität'.padEnd(12)) + ' | ' + 
                      chalk.underline('Alter'.padEnd(10)) + ' | ' + 
                      chalk.underline('Qualität'.padEnd(10)) + ' ║');
    
    // Zeige die neuesten 5 Pools
    const recentPools = this.pools.slice(-5);
    
    recentPools.forEach(pool => {
      const ageInMinutes = Math.floor((Date.now() - pool.timestamp) / 60000);
      const ageStr = ageInMinutes < 60 
        ? `${ageInMinutes}m` 
        : `${Math.floor(ageInMinutes / 60)}h ${ageInMinutes % 60}m`;
      
      console.log('║ ' + 
        pool.poolId.substring(0, 6).padEnd(8) + ' | ' + 
        (pool.tokenSymbol || 'Unbekannt').substring(0, 13).padEnd(15) + ' | ' + 
        (pool.liquidity?.toFixed(2) || '0.00').padEnd(12) + ' | ' + 
        ageStr.padEnd(10) + ' | ' + 
        this.getQualityColor(this.getPoolQuality(pool)).padEnd(10) + ' ║');
    });
    
    console.log(chalk.bold.green('╚═════════════════════════════════════════════════════════════════════════════╝'));
    console.log('');
  }

  private renderTradeList(): void {
    if (this.trades.length === 0) return;
    
    console.log(chalk.bold.blue('╔════════════════════════════════ TRADES ═══════════════════════════════════╗'));
    console.log('║ ' + chalk.underline('Typ'.padEnd(8)) + ' | ' + 
                      chalk.underline('Token'.padEnd(15)) + ' | ' + 
                      chalk.underline('Menge'.padEnd(10)) + ' | ' + 
                      chalk.underline('Preis'.padEnd(10)) + ' | ' + 
                      chalk.underline('Status'.padEnd(12)) + ' ║');
    
    // Zeige die neuesten 5 Trades
    const recentTrades = this.trades.slice(-5);
    
    recentTrades.forEach(trade => {
      console.log('║ ' + 
        this.getTradeTypeColor(trade.status === 'bought' ? 'kauf' : 'verkauf').padEnd(8) + ' | ' + 
        (trade.tokenSymbol || 'Unbekannt').substring(0, 13).padEnd(15) + ' | ' + 
        trade.amount.toFixed(4).padEnd(10) + ' | ' + 
        (trade.entryPrice || 0).toFixed(6).padEnd(10) + ' | ' + 
        this.getTradeStatusColor(trade.status).padEnd(12) + ' ║');
    });
    
    console.log(chalk.bold.blue('╚═════════════════════════════════════════════════════════════════════════════╝'));
    console.log('');
  }

  private renderWalletInfo(): void {
    if (!this.walletInfo) return;
    
    console.log(chalk.bold.yellow('╔═══════════════════════════ WALLET-INFORMATIONEN ═════════════════════════════╗'));
    console.log(`║ Adresse: ${chalk.green(this.walletInfo.address.substring(0, 10) + '...')}                                                  ║`);
    console.log(`║ Guthaben: ${chalk.green(this.walletInfo.balance.toFixed(4))} SUI                                                ║`);
    console.log(`║ Transaktionen: ${chalk.green(this.walletInfo.pendingTransactions.toString())}                                                        ║`);
    console.log(chalk.bold.yellow('╚═════════════════════════════════════════════════════════════════════════════╝'));
    console.log('');
  }

  private renderRiskMetrics(): void {
    if (!this.riskMetrics) return;
    
    console.log(chalk.bold.magenta('╔═══════════════════════════ RISIKO-METRIKEN ═══════════════════════════════╗'));
    console.log(`║ Marktbedingungen: ${this.getMarketConditionColor(this.riskMetrics.marketConditions)}                                                ║`);
    console.log(`║ Gesamtliquidität: ${chalk.green(this.riskMetrics.liquidityRisk.toFixed(2))} SUI                                         ║`);
    console.log(`║ 24h-Volumen: ${chalk.green(this.riskMetrics.volatilityIndex.toFixed(2))} SUI                                             ║`);
    console.log(`║ Aktive Pools: ${chalk.green(this.systemStatus.poolsFound.toString())}                                                        ║`);
    
    // Sichere Risikobewertung
    const riskLevel = this.riskMetrics.liquidityRisk < 40 
      ? 'niedrig' 
      : (this.riskMetrics.liquidityRisk < 70 ? 'mittel' : 'hoch');
    console.log(`║ Risikobewertung: ${this.getRiskLevelColor(riskLevel)}                                                  ║`);
    
    console.log(chalk.bold.magenta('╚═════════════════════════════════════════════════════════════════════════════╝'));
    console.log('');
  }

  private renderFooter(): void {
    const uptime = this.formatUptime(this.systemStatus.uptime);
    console.log(chalk.gray(`Laufzeit: ${uptime} | Pools: ${this.systemStatus.poolsFound} | Scanner: ${this.systemStatus.poolHunting ? 'Aktiv' : 'Inaktiv'} | Trading: ${this.systemStatus.trading ? 'Aktiviert' : 'Deaktiviert'}`));
  }

  private formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private getPoolQuality(pool: PoolData): 'hoch' | 'mittel' | 'niedrig' {
    if (!pool.riskScore) return 'mittel';
    if (pool.riskScore < 30) return 'hoch';
    if (pool.riskScore < 70) return 'mittel';
    return 'niedrig';
  }
}

// Hilfsfunktionen
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

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}

function formatProfit(profit: number): string {
  if (profit > 0) {
    return chalk.green(`+${profit.toFixed(2)} SUI`);
  } else if (profit < 0) {
    return chalk.red(`${profit.toFixed(2)} SUI`);
  } else {
    return chalk.gray('0.00 SUI');
  }
}

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

function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'bought':
      return chalk.blue('Gekauft');
    case 'selling':
      return chalk.yellow('Verkaufe');
    case 'sold':
      return chalk.green('Verkauft');
    case 'pending':
      return chalk.yellow('Ausstehend');
    case 'failed':
      return chalk.red('Fehlgeschlagen');
    default:
      return chalk.gray(status);
  }
}

function getRiskColor(risk: number) {
  if (risk < 20) return (text: string) => chalk.green(text);
  if (risk < 40) return (text: string) => chalk.yellow(text);
  if (risk < 60) return (text: string) => chalk.hex('#FFA500')(text);
  if (risk < 80) return (text: string) => chalk.red(text);
  return (text: string) => chalk.bgRed.white(text);
}

function truncateString(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength / 2) + '...' + str.substring(str.length - maxLength / 2);
}

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