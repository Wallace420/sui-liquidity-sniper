// Backup der Backtest-Einstellungen vom [DATUM]
export const BACKTEST_SETTINGS = {
    // Konfigurationskonstanten
    BATCH_SIZE: 10,
    CONCURRENT_REQUESTS: 3,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    // Risiko-Parameter
    RISK_ADJUSTMENT: {
        BASE_FACTOR: 1.0,
        LIQUIDITY_THRESHOLD: 10000,
        VOLATILITY_IMPACT: 0.2,
        MIN_RISK_FACTOR: 0.1,
        MAX_RISK_FACTOR: 1.0,
        AGE_NORMALIZATION: 24 * 60 * 60 * 1000 // 24h
    },
    // Handelskosten
    TRADING_COSTS: {
        BASE_COSTS: 0.3, // 0.3%
        SIZE_DEPENDENT_COSTS: 0.2, // Max 0.2% für kleine Trades
        MARKET_IMPACT: 0.1 // Quadratischer Marktimpact
    },
    // Scam-Detection
    SCAM_THRESHOLDS: {
        SCORE_THRESHOLD: 50,
        PROFIT_MARGIN_RISK: 0.5,
        TIME_BASED_RISK: 0.2,
        VOLUME_RISK: 0.3,
        LIQUIDITY_DEPTH: 0.2,
        TOKEN_AGE: 0.3,
        HOLDER_COUNT: 100,
        DEVELOPER_ACTIVITY: 0.2,
        SOCIAL_MEDIA_PRESENCE: 0.3,
        MARKET_CAP: 100000
    },
    // Performance-Metriken
    METRICS: {
        CACHE_SIZE: 1000,
        CACHE_CLEANUP_THRESHOLD: 500
    }
};
//# sourceMappingURL=settings_backup.js.map