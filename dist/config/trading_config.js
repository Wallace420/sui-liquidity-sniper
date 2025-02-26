export const LIVE_TRADING_CONFIG = {
    maxSlippagePercent: 1, // 1% maximaler Slippage
    minSecurityScore: 80, // Mindest-Sicherheitsscore von 80%
    maxGasPrice: 100000000, // Maximaler Gas-Preis in MIST
    // Kapital-Limits
    CAPITAL_LIMITS: {
        MAX_TRADE_AMOUNT: 1000000000, // 1 SUI
        MIN_TRADE_AMOUNT: 100000000, // 0.1 SUI
    },
    // Sicherheits-Checks
    SAFETY_CHECKS: {
        MIN_LIQUIDITY: 10000000000, // Mindest-Liquidität: 10 SUI
        MAX_PRICE_IMPACT: 5, // Maximaler Preiseinfluss: 5%
        MIN_TIME_SINCE_CREATION: 300, // Mindestzeit seit Pool-Erstellung: 5 Minuten
    },
    // Performance-Schwellenwerte
    PERFORMANCE_THRESHOLDS: {
        MIN_PROFIT_PERCENT: 0.5, // Mindestgewinn: 0.5%
        MAX_EXECUTION_TIME: 10000, // Maximale Ausführungszeit: 10 Sekunden
    }
};
//# sourceMappingURL=trading_config.js.map