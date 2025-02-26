import { prisma } from "../db/index.js";
import { SUI, MIGRATOR_MOVE_PUMP } from "./config.js";
import { getTransactionInfo } from "./extractor.js";
import { trade } from "../trader/index.js";
import wait, { waitWithBackoff } from '../utils/wait.js';
import { logError, logInfo, logWarning, logPerformance } from '../utils/logger.js';
// Performance tuning constants
const POLLING_INTERVAL_MS = 25; // Base polling interval
const MAX_CONCURRENT_JOBS = 5; // Maximum parallel jobs
const ERROR_RETRY_DELAY = 500; // Base retry delay
const MAX_ERROR_RETRIES = 5; // Maximum retry attempts
const MAX_BACKOFF_DELAY = 10000; // Maximum backoff delay
const HEALTH_CHECK_INTERVAL = 30000; // Health check interval
const BATCH_SIZE = 50; // Event batch size
const QUERY_TIMEOUT = 5000; // Query timeout in ms
// Enhanced tracking for monitoring and performance
const activeJobs = new Set();
const errorCounts = new Map();
const jobStats = new Map();
// Health monitoring
let isHealthy = true;
const EVENTS_TO_TRACK = [
    {
        type: "BlueMove::CreatePoolEvent",
        filter: { MoveEventType: "0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Created_Pool_Event" },
        callback: async (events, type) => {
            const event = events[0];
            if (!event)
                return;
            const timestampThreshold = Date.now() - 5000;
            const { creator } = event.parsedJson;
            if (Number(event.timestampMs) > timestampThreshold && creator === MIGRATOR_MOVE_PUMP) {
                const startTime = Date.now();
                try {
                    const transactionInfo = await getTransactionInfo(event.id.txDigest, 'BlueMove');
                    logInfo('Processing BlueMove pool creation', { transactionInfo });
                    await trade(event.id.txDigest, 'BlueMove');
                    logPerformance('BlueMove pool processing', Date.now() - startTime);
                }
                catch (error) {
                    logError('Failed to process BlueMove pool', {
                        error: error instanceof Error ? error.message : 'Unknown error',
                        txDigest: event.id.txDigest
                    });
                }
            }
            else {
                logInfo('Skipping non-realtime BlueMove event', {
                    timestamp: event.timestampMs,
                    creator
                });
            }
        }
    },
    {
        type: "Cetus::CreatePoolEvent",
        filter: { MoveEventType: "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::factory::CreatePoolEvent" },
        callback: async (events, type) => {
            const event = events[0];
            if (!event)
                return;
            const timestampThreshold = Date.now() - 5000;
            if (Number(event.timestampMs) > timestampThreshold) {
                const startTime = Date.now();
                try {
                    const transactionInfo = await getTransactionInfo(event.id.txDigest, 'Cetus');
                    logInfo('Processing Cetus pool creation', { transactionInfo });
                    await trade(event.id.txDigest, 'Cetus');
                    logPerformance('Cetus pool processing', Date.now() - startTime);
                }
                catch (error) {
                    logError('Failed to process Cetus pool', {
                        error: error instanceof Error ? error.message : 'Unknown error',
                        txDigest: event.id.txDigest
                    });
                }
            }
            else {
                logInfo('Skipping non-realtime Cetus event', {
                    timestamp: event.timestampMs
                });
            }
        }
    }
];
// Health check function
function checkHealth() {
    const now = Date.now();
    let allHealthy = true;
    for (const [jobType, stats] of jobStats.entries()) {
        const timeSinceLastExecution = now - stats.lastExecutionTime;
        const successRate = stats.successfulExecutions / stats.totalExecutions;
        if (timeSinceLastExecution > HEALTH_CHECK_INTERVAL * 2 || successRate < 0.8) {
            logWarning(`Health check warning`, {
                jobType,
                timeSinceLastExecution,
                successRate,
                stats
            });
            allHealthy = false;
        }
    }
    isHealthy = allHealthy;
    return allHealthy;
}
// Start health monitoring
setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
const executeEventJob = async (client, tracker, cursor) => {
    if (activeJobs.size >= MAX_CONCURRENT_JOBS) {
        return { cursor, hasNextPage: false };
    }
    const jobId = `${tracker.type}-${Date.now()}`;
    const startTime = Date.now();
    activeJobs.add(jobId);
    // Initialize or update job stats
    if (!jobStats.has(tracker.type)) {
        jobStats.set(tracker.type, {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0,
            lastExecutionTime: startTime
        });
    }
    try {
        // Add timeout to query
        const queryPromise = client.queryEvents({
            query: tracker.filter,
            cursor,
            order: 'ascending'
        });
        const { data, hasNextPage, nextCursor } = await Promise.race([
            queryPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT))
        ]);
        if (data.length > 0) {
            try {
                await tracker.callback(data, tracker.type);
                errorCounts.delete(tracker.type);
                tracker.consecutiveFailures = 0;
                tracker.lastSuccessTime = Date.now();
                // Update success stats
                const stats = jobStats.get(tracker.type);
                stats.successfulExecutions++;
                stats.totalExecutions++;
                stats.lastExecutionTime = Date.now();
                const executionTime = Date.now() - startTime;
                stats.averageExecutionTime = (stats.averageExecutionTime + executionTime) / 2;
                logPerformance(`Event job execution: ${tracker.type}`, executionTime);
            }
            catch (error) {
                logError(`Callback error`, {
                    jobType: tracker.type,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                tracker.consecutiveFailures = (tracker.consecutiveFailures || 0) + 1;
                // Update error stats
                const stats = jobStats.get(tracker.type);
                stats.failedExecutions++;
                stats.totalExecutions++;
                stats.lastExecutionTime = Date.now();
                const currentErrors = (errorCounts.get(tracker.type) || 0) + 1;
                errorCounts.set(tracker.type, currentErrors);
                if (currentErrors >= MAX_ERROR_RETRIES) {
                    throw new Error(`Max retries exceeded for ${tracker.type}`);
                }
                return {
                    cursor,
                    hasNextPage: true,
                    error: error,
                    timestamp: Date.now()
                };
            }
        }
        if (nextCursor && data.length > 0) {
            await saveLatestCursor(tracker, nextCursor);
            return {
                cursor: nextCursor,
                hasNextPage,
                timestamp: Date.now()
            };
        }
        return {
            cursor,
            hasNextPage: false,
            timestamp: Date.now()
        };
    }
    catch (error) {
        logError(`Job execution failed`, {
            jobId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Update error stats
        const stats = jobStats.get(tracker.type);
        stats.failedExecutions++;
        stats.totalExecutions++;
        stats.lastExecutionTime = Date.now();
        return {
            cursor,
            hasNextPage: false,
            error: error,
            timestamp: Date.now()
        };
    }
    finally {
        activeJobs.delete(jobId);
    }
};
const saveLatestCursor = async (tracker, cursor) => {
    try {
        const data = {
            eventSeq: cursor.eventSeq,
            txDigest: cursor.txDigest
        };
        await prisma.cursor.upsert({
            where: { id: tracker.type },
            update: data,
            create: { ...data, id: tracker.type }
        });
    }
    catch (error) {
        logError('Failed to save cursor', {
            tracker: tracker.type,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
const getLatestCursor = async (tracker) => {
    try {
        return await prisma.cursor.findUnique({
            where: { id: tracker.type }
        });
    }
    catch (error) {
        logError('Failed to get cursor', {
            tracker: tracker.type,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return undefined;
    }
};
const runEventJob = async (client, tracker, cursor) => {
    if (tracker.isRunning) {
        return;
    }
    tracker.isRunning = true;
    try {
        const result = await executeEventJob(client, tracker, cursor);
        if (result.error) {
            logError(`Event job error`, {
                jobType: tracker.type,
                error: result.error.message
            });
            const delayMs = await waitWithBackoff(ERROR_RETRY_DELAY, tracker.errorCount || 0, MAX_BACKOFF_DELAY);
            await wait(delayMs);
        }
        // Dynamic polling interval based on activity and health
        let interval = result.hasNextPage ? 0 : POLLING_INTERVAL_MS;
        // Adjust interval based on system health
        if (!isHealthy) {
            interval = Math.max(interval, POLLING_INTERVAL_MS * 2);
        }
        // Add jitter to prevent thundering herd
        interval += Math.random() * (interval * 0.1);
        await wait(interval);
        tracker.isRunning = false;
        runEventJob(client, tracker, result.cursor);
    }
    catch (error) {
        logError(`Fatal event job error`, {
            jobType: tracker.type,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        tracker.isRunning = false;
        tracker.lastError = error;
        const delayMs = await waitWithBackoff(ERROR_RETRY_DELAY, tracker.errorCount || 0, MAX_BACKOFF_DELAY);
        tracker.errorCount = (tracker.errorCount || 0) + 1;
        await wait(delayMs);
        runEventJob(client, tracker, cursor);
    }
};
const getLastestCursorOnInit = async (client) => {
    try {
        await Promise.all(EVENTS_TO_TRACK.map(async (event) => {
            const { data } = await client.queryEvents({
                query: event.filter,
                order: 'descending'
            });
            if (data[0]?.id) {
                await saveLatestCursor(event, data[0].id);
            }
        }));
    }
    catch (error) {
        logError('Failed to initialize cursors', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
export const setupListeners = async () => {
    try {
        await getLastestCursorOnInit(SUI.client);
        await Promise.all(EVENTS_TO_TRACK.map(async (event) => {
            const cursor = await getLatestCursor(event);
            runEventJob(SUI.client, event, cursor);
        }));
        logInfo('Event listeners setup complete', {
            trackedEvents: EVENTS_TO_TRACK.map(e => e.type)
        });
    }
    catch (error) {
        logError('Failed to setup listeners', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
};
//# sourceMappingURL=monitor.js.map