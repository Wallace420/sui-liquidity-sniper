<<<<<<< HEAD
import winston from 'winston';
export interface LogMetadata {
    [key: string]: any;
    error?: string;
    poolId?: string;
    dex?: string;
    coins?: {
        coinA?: string;
        coinB?: string;
    };
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
declare const logger: winston.Logger;
export default logger;
export declare function displayPoolsTable(pools: any[]): void;
export declare function displayStats(stats: any): void;
export declare function displayWarning(message: string): void;
export declare function displayError(message: string): void;
export declare function displaySuccess(message: string): void;
export declare const logError: (message: string, meta?: LogMetadata) => winston.Logger;
export declare const logWarn: (message: string, meta?: LogMetadata) => winston.Logger;
export declare const logInfo: (message: string, meta?: LogMetadata) => winston.Logger;
export declare const logPool: (message: string, meta?: LogMetadata) => winston.Logger;
export declare const logTrade: (message: string, meta?: LogMetadata) => winston.Logger;
export declare const logDebug: (message: string, meta?: LogMetadata) => winston.Logger;
export declare const logSystemStatus: (message: string, meta?: LogMetadata) => winston.Logger;
=======
import * as winston from 'winston';
declare const logger: winston.Logger;
export declare function logInfo(message: string, data?: any): void;
export declare function logError(message: string, data?: any): void;
export declare function logPerformance(message: string, duration: number, data?: any): void;
export declare function logWarning(message: string, data?: any): void;
export declare function logDebug(message: string, data?: any): void;
export declare function logTransaction(txHash: string, data?: any): void;
export declare function logPoolEvent(eventType: string, data?: any): void;
export declare function logSystemStatus(status: string, data?: any): void;
export { logger };
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
