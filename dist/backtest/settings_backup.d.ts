export declare const BACKTEST_SETTINGS: {
    BATCH_SIZE: number;
    CONCURRENT_REQUESTS: number;
    RETRY_ATTEMPTS: number;
    RETRY_DELAY: number;
    RISK_ADJUSTMENT: {
        BASE_FACTOR: number;
        LIQUIDITY_THRESHOLD: number;
        VOLATILITY_IMPACT: number;
        MIN_RISK_FACTOR: number;
        MAX_RISK_FACTOR: number;
        AGE_NORMALIZATION: number;
    };
    TRADING_COSTS: {
        BASE_COSTS: number;
        SIZE_DEPENDENT_COSTS: number;
        MARKET_IMPACT: number;
    };
    SCAM_THRESHOLDS: {
        SCORE_THRESHOLD: number;
        PROFIT_MARGIN_RISK: number;
        TIME_BASED_RISK: number;
        VOLUME_RISK: number;
        LIQUIDITY_DEPTH: number;
        TOKEN_AGE: number;
        HOLDER_COUNT: number;
        DEVELOPER_ACTIVITY: number;
        SOCIAL_MEDIA_PRESENCE: number;
        MARKET_CAP: number;
    };
    METRICS: {
        CACHE_SIZE: number;
        CACHE_CLEANUP_THRESHOLD: number;
    };
};
