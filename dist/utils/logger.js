import * as winston from 'winston';
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});
export function logInfo(message, data) {
    logger.info(message, data);
}
export function logError(message, data) {
    logger.error(message, data);
}
export function logPerformance(message, duration, data) {
    logger.info(`Performance: ${message}`, { duration, ...data });
}
export function logWarning(message, data) {
    logger.warn(message, data);
}
export function logDebug(message, data) {
    logger.debug(message, data);
}
export function logTransaction(txHash, data) {
    logger.info(`Transaction: ${txHash}`, data);
}
export function logPoolEvent(eventType, data) {
    logger.info(`Pool Event: ${eventType}`, data);
}
export function logSystemStatus(status, data) {
    logger.info(`System Status: ${status}`, data);
}
export { logger };
//# sourceMappingURL=logger.js.map