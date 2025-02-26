import { SuiClient } from '@mysten/sui/client';
export declare const LIVE_TRADING_CONFIG: {
    CAPITAL_LIMITS: {
        TOTAL_CAPITAL: number;
        MAX_TRADE_AMOUNT: number;
        MIN_TRADE_AMOUNT: number;
        DAILY_TRADE_LIMIT: number;
        MAX_DAILY_LOSS: number;
        MAX_POSITION_LOSS: number;
    };
    PERFORMANCE_THRESHOLDS: {
        MIN_LIQUIDITY: number;
        MAX_PRICE_IMPACT: number;
        MIN_PROFIT_THRESHOLD: number;
        MAX_LATENCY: number;
    };
    SAFETY_CHECKS: {
        SCAM_SCORE_THRESHOLD: number;
        MIN_POOL_AGE: number;
        REQUIRED_CONFIRMATIONS: number;
        MAX_SLIPPAGE: number;
    };
    MONITORING: {
        LOG_LEVEL: string;
        PERFORMANCE_TRACKING: boolean;
        ALERT_ON_ERRORS: boolean;
        TRACK_POSITION: boolean;
    };
    NETWORK: {
        MAX_CONCURRENT_REQUESTS: number;
        REQUEST_TIMEOUT: number;
        RETRY_ATTEMPTS: number;
        RETRY_DELAY: number;
    };
    TRADING: {
        PRIORITIZE_SPEED: boolean;
        TOP_POSITION_TARGET: number;
        AUTO_ADJUST_GAS: boolean;
    };
};
export declare const NETWORK_CONFIG: {
    MAINNET: {
        RPC_URL: string;
        WS_URL: string;
    };
    TESTNET: {
        RPC_URL: string;
        WS_URL: string;
    };
};
export declare const NETWORK_CLIENT: SuiClient;
