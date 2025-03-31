import chalk from 'chalk';
// Standardkonfiguration
const DEFAULT_CONFIG = {
    refreshRate: 5000,
    showPoolList: true,
    showTradeList: true,
    showWalletInfo: true,
    showRiskMetrics: true,
    compactMode: false
};
// Dashboard-Klasse
export class Dashboard {
    pools = [];
    trades = [];
    walletInfo;
    riskMetrics;
    systemStatus = {
        poolHunting: false,
        trading: false,
        autoSniping: false,
        poolsFound: 0,
        uptime: 0
    };
    config;
    isRunning = false;
    lastRenderTime = 0;
    renderInterval = null;
    startTime;
    constructor(config = {}) {
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
    start() {
        if (this.isRunning)
            return;
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
    stop() {
        if (!this.isRunning)
            return;
        this.isRunning = false;
        if (this.renderInterval) {
            clearInterval(this.renderInterval);
            this.renderInterval = null;
        }
    }
    // Aktualisiere Pools
    updatePools(pools) {
        this.pools = pools;
    }
    // Aktualisiere Trades
    updateTrades(trades) {
        this.trades = trades;
    }
    // Aktualisiere Wallet-Informationen
    updateWalletInfo(walletInfo) {
        this.walletInfo = walletInfo;
    }
    // Aktualisiere Risikometriken
    updateRiskMetrics(riskMetrics) {
        this.riskMetrics = riskMetrics;
    }
    // Aktualisiere System-Status
    updateSystemStatus(status) {
        this.systemStatus = status;
    }
    // Hole aktuelle Pools
    getPools() {
        return [...this.pools];
    }
    // Hole aktuelle Trades
    getTrades() {
        return [...this.trades];
    }
    // Rendere das Dashboard mit verbesserter Lesbarkeit
    async render() {
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
                }
                catch (error) {
                    console.error('Fehler beim Rendern des Dashboards:', error);
                    resolve();
                }
            }, 500); // 500ms Verzögerung für bessere Lesbarkeit
        });
    }
    // Hilfsmethoden für Farbgebung
    getQualityColor(quality) {
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
    getTradeTypeColor(type) {
        return type.toLowerCase() === 'kauf' ? chalk.green('Kauf') : chalk.red('Verkauf');
    }
    getTradeStatusColor(status) {
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
    getMarketConditionColor(condition) {
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
    getRiskLevelColor(level) {
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
    renderHeader() {
        console.log(chalk.bold.cyan('╔═════════════════════════════════════════════════════════════════════════════╗'));
        console.log(chalk.bold.cyan('║                           SUI LIQUIDITY SNIPER                              ║'));
        console.log(chalk.bold.cyan('╚═════════════════════════════════════════════════════════════════════════════╝'));
        console.log('');
    }
    renderPoolList() {
        if (this.pools.length === 0)
            return;
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
    renderTradeList() {
        if (this.trades.length === 0)
            return;
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
    renderWalletInfo() {
        if (!this.walletInfo)
            return;
        console.log(chalk.bold.yellow('╔═══════════════════════════ WALLET-INFORMATIONEN ═════════════════════════════╗'));
        console.log(`║ Adresse: ${chalk.green(this.walletInfo.address.substring(0, 10) + '...')}                                                  ║`);
        console.log(`║ Guthaben: ${chalk.green(this.walletInfo.balance.toFixed(4))} SUI                                                ║`);
        console.log(`║ Transaktionen: ${chalk.green(this.walletInfo.pendingTransactions.toString())}                                                        ║`);
        console.log(chalk.bold.yellow('╚═════════════════════════════════════════════════════════════════════════════╝'));
        console.log('');
    }
    renderRiskMetrics() {
        if (!this.riskMetrics)
            return;
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
    renderFooter() {
        const uptime = this.formatUptime(this.systemStatus.uptime);
        console.log(chalk.gray(`Laufzeit: ${uptime} | Pools: ${this.systemStatus.poolsFound} | Scanner: ${this.systemStatus.poolHunting ? 'Aktiv' : 'Inaktiv'} | Trading: ${this.systemStatus.trading ? 'Aktiviert' : 'Deaktiviert'}`));
    }
    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    getPoolQuality(pool) {
        if (!pool.riskScore)
            return 'mittel';
        if (pool.riskScore < 30)
            return 'hoch';
        if (pool.riskScore < 70)
            return 'mittel';
        return 'niedrig';
    }
}
// Hilfsfunktionen
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
function formatCurrency(value) {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`;
    }
    else if (value >= 1000) {
        return `$${(value / 1000).toFixed(2)}K`;
    }
    else {
        return `$${value.toFixed(2)}`;
    }
}
function formatProfit(profit) {
    if (profit > 0) {
        return chalk.green(`+${profit.toFixed(2)} SUI`);
    }
    else if (profit < 0) {
        return chalk.red(`${profit.toFixed(2)} SUI`);
    }
    else {
        return chalk.gray('0.00 SUI');
    }
}
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return [
        hours > 0 ? `${hours}h` : '',
        minutes > 0 ? `${minutes}m` : '',
        `${secs}s`
    ].filter(Boolean).join(' ');
}
function formatStatus(status) {
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
function getRiskColor(risk) {
    if (risk < 20)
        return (text) => chalk.green(text);
    if (risk < 40)
        return (text) => chalk.yellow(text);
    if (risk < 60)
        return (text) => chalk.hex('#FFA500')(text);
    if (risk < 80)
        return (text) => chalk.red(text);
    return (text) => chalk.bgRed.white(text);
}
function truncateString(str, maxLength) {
    if (!str)
        return '';
    if (str.length <= maxLength)
        return str;
    return str.substring(0, maxLength / 2) + '...' + str.substring(str.length - maxLength / 2);
}
function getDexEmoji(dex) {
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
//# sourceMappingURL=dashboard.js.map