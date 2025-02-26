/**
 * Creates a promise that resolves after a specified delay.
 * This utility function is used to introduce controlled delays in the application.
 *
 * @param ms - The delay duration in milliseconds
 * @returns A promise that resolves after the specified delay
 */
declare function wait(ms: number): Promise<void>;
/**
 * Creates a promise that resolves after a random delay within a specified range.
 * Useful for adding jitter to prevent thundering herd problems.
 *
 * @param minMs - The minimum delay duration in milliseconds
 * @param maxMs - The maximum delay duration in milliseconds
 * @returns A promise that resolves with the calculated delay in milliseconds
 */
declare function waitWithJitter(minMs: number, maxMs: number): Promise<number>;
/**
 * Creates a promise that resolves with a delay calculated using exponential backoff.
 * Useful for retrying operations with increasing delays.
 *
 * @param baseMs - The base delay duration in milliseconds
 * @param attempt - The attempt number (0-based)
 * @param maxMs - The maximum delay duration in milliseconds
 * @returns A promise that resolves with the calculated delay in milliseconds
 */
declare function waitWithBackoff(baseMs: number, attempt: number, maxMs?: number): Promise<number>;
/**
 * Creates a promise that resolves after a delay or rejects if the delay exceeds a timeout.
 * Useful for operations that should not wait indefinitely.
 *
 * @param ms - The delay duration in milliseconds
 * @param timeout - The maximum time to wait before rejecting
 * @returns A promise that resolves after the delay or rejects on timeout
 */
declare function waitWithTimeout(ms: number, timeout: number): Promise<void>;
export { wait as default, waitWithBackoff, waitWithJitter, waitWithTimeout };
