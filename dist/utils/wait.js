/**
 * Creates a promise that resolves after a specified delay.
 * This utility function is used to introduce controlled delays in the application.
 *
 * @param ms - The delay duration in milliseconds
 * @returns A promise that resolves after the specified delay
 */
function wait(ms) {
    // Input validation
    if (typeof ms !== 'number' || ms < 0) {
        throw new Error('Wait duration must be a non-negative number');
    }
    // Return a promise that resolves after the specified delay
    return new Promise(resolve => {
        const timeoutId = setTimeout(() => {
            resolve();
        }, ms);
        // Add error handling for potential timer issues
        timeoutId.unref?.();
    });
}
/**
 * Creates a promise that resolves after a random delay within a specified range.
 * Useful for adding jitter to prevent thundering herd problems.
 *
 * @param minMs - The minimum delay duration in milliseconds
 * @param maxMs - The maximum delay duration in milliseconds
 * @returns A promise that resolves with the calculated delay in milliseconds
 */
function waitWithJitter(minMs, maxMs) {
    // Input validation
    if (typeof minMs !== 'number' || typeof maxMs !== 'number') {
        throw new Error('Wait durations must be numbers');
    }
    if (minMs < 0 || maxMs < 0) {
        throw new Error('Wait durations must be non-negative');
    }
    if (minMs > maxMs) {
        throw new Error('Minimum wait duration cannot be greater than maximum');
    }
    // Calculate random delay within range
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return Promise.resolve(delay);
}
/**
 * Creates a promise that resolves with a delay calculated using exponential backoff.
 * Useful for retrying operations with increasing delays.
 *
 * @param baseMs - The base delay duration in milliseconds
 * @param attempt - The attempt number (0-based)
 * @param maxMs - The maximum delay duration in milliseconds
 * @returns A promise that resolves with the calculated delay in milliseconds
 */
function waitWithBackoff(baseMs, attempt, maxMs = 30000) {
    // Input validation
    if (typeof baseMs !== 'number' || typeof attempt !== 'number' || typeof maxMs !== 'number') {
        throw new Error('Parameters must be numbers');
    }
    if (baseMs < 0 || attempt < 0 || maxMs < 0) {
        throw new Error('Parameters must be non-negative');
    }
    // Calculate delay with exponential backoff and jitter
    const exponentialDelay = baseMs * Math.pow(2, attempt);
    const jitter = exponentialDelay * 0.2 * Math.random(); // 20% jitter
    const delay = Math.min(exponentialDelay + jitter, maxMs);
    return Promise.resolve(delay);
}
/**
 * Creates a promise that resolves after a delay or rejects if the delay exceeds a timeout.
 * Useful for operations that should not wait indefinitely.
 *
 * @param ms - The delay duration in milliseconds
 * @param timeout - The maximum time to wait before rejecting
 * @returns A promise that resolves after the delay or rejects on timeout
 */
function waitWithTimeout(ms, timeout) {
    // Input validation
    if (typeof ms !== 'number' || typeof timeout !== 'number') {
        throw new Error('Parameters must be numbers');
    }
    if (ms < 0 || timeout < 0) {
        throw new Error('Parameters must be non-negative');
    }
    return Promise.race([
        wait(ms),
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Wait operation timed out after ${timeout}ms`));
            }, timeout);
        })
    ]);
}
export { wait as default, waitWithBackoff, waitWithJitter, waitWithTimeout };
//# sourceMappingURL=wait.js.map