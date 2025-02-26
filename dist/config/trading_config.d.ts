interface TradingConfig {
    maxSlippagePercent: number;
    minSecurityScore: number;
    maxGasPrice: number;
    CAPITAL_LIMITS: {
        MAX_TRADE_AMOUNT: number;
        MIN_TRADE_AMOUNT: number;
    };
    SAFETY_CHECKS: {
        MIN_LIQUIDITY: number;
        MAX_PRICE_IMPACT: number;
        MIN_TIME_SINCE_CREATION: number;
    };
    PERFORMANCE_THRESHOLDS: {
        MIN_PROFIT_PERCENT: number;
        MAX_EXECUTION_TIME: number;
    };
}
export declare const LIVE_TRADING_CONFIG: TradingConfig;
export {};
