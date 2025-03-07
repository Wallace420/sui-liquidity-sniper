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
