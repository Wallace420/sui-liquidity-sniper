/**
 * Fehlerbehandlungs-Utilities für die gesamte Anwendung
 * Implementiert einheitliche Fehlerbehandlung, Logging und Retry-Mechanismen
 */

// Typen für die Fehlerbehandlung
export interface ErrorOptions {
  context?: string;
  severity?: ErrorSeverity;
  retry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  silent?: boolean;
}

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface ErrorWithContext extends Error {
  context?: string;
  severity: ErrorSeverity;
  timestamp: number;
  originalError?: Error;
  retryCount?: number;
}

// Globale Konfiguration für die Fehlerbehandlung
const errorConfig = {
  defaultMaxRetries: 3,
  defaultRetryDelay: 1000,
  logErrors: true,
  reportErrors: process.env.NEXT_PUBLIC_ENVIRONMENT === 'production'
};

/**
 * Erstellt einen erweiterten Fehler mit Kontext
 */
export function createError(
  message: string,
  originalError?: Error | unknown,
  options: ErrorOptions = {}
): ErrorWithContext {
  const error = new Error(message) as ErrorWithContext;
  
  error.context = options.context;
  error.severity = options.severity || ErrorSeverity.ERROR;
  error.timestamp = Date.now();
  
  if (originalError instanceof Error) {
    error.originalError = originalError;
    error.stack = `${error.stack}\nCaused by: ${originalError.stack}`;
  } else if (originalError) {
    error.originalError = new Error(String(originalError));
  }
  
  // Logge den Fehler, wenn nicht silent
  if (errorConfig.logErrors && !options.silent) {
    logError(error);
  }
  
  return error;
}

/**
 * Loggt einen Fehler in der Konsole
 */
export function logError(error: ErrorWithContext): void {
  const { severity, context, timestamp, originalError } = error;
  const time = new Date(timestamp).toISOString();
  
  const contextStr = context ? `[${context}] ` : '';
  const severityStr = severity.toUpperCase();
  
  console.error(`${time} ${severityStr} ${contextStr}${error.message}`);
  
  if (originalError) {
    console.error('Ursprünglicher Fehler:', originalError);
  }
  
  if (error.stack) {
    console.error(error.stack);
  }
}

/**
 * Sendet einen Fehler an einen Fehlerberichtsdienst (z.B. Sentry)
 */
export function reportError(error: ErrorWithContext): void {
  if (!errorConfig.reportErrors) {
    return;
  }
  
  // Hier würde die Integration mit einem Fehlerberichtsdienst erfolgen
  // z.B. Sentry.captureException(error);
  
  console.warn('Fehler würde an Berichtsdienst gesendet werden:', error.message);
}

/**
 * Führt eine Funktion mit Retry-Mechanismus aus
 */
export async function withRetry<T = any>(
  fn: () => Promise<T>,
  options: ErrorOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? errorConfig.defaultMaxRetries;
  const retryDelay = options.retryDelay ?? errorConfig.defaultRetryDelay;
  let retryCount = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (err) {
      retryCount++;
      
      const error = createError(
        `Fehler bei Ausführung (Versuch ${retryCount}/${maxRetries})`,
        err,
        { ...options, silent: true }
      );
      
      error.retryCount = retryCount;
      
      if (!options.retry || retryCount >= maxRetries) {
        if (!options.silent) {
          logError(error);
        }
        throw error;
      }
      
      console.warn(`Wiederhole in ${retryDelay}ms (${retryCount}/${maxRetries})...`);
      await sleep(retryDelay);
    }
  }
}

/**
 * Hilfsfunktion für asynchrones Warten
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrapper für Fetch mit Retry-Mechanismus und Fehlerbehandlung
 */
export async function fetchWithRetry<T = any>(
  url: string,
  options?: RequestInit,
  retryOptions?: ErrorOptions
): Promise<T> {
  return withRetry(async () => {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP-Fehler: ${response.status} ${response.statusText}`);
    }
    
    return await response.json() as T;
  }, {
    context: 'API-Anfrage',
    retry: true,
    ...retryOptions
  });
}

/**
 * Globaler Fehlerhandler für unbehandelte Fehler
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window !== 'undefined') {
    // Unbehandelte Promise-Fehler
    window.addEventListener('unhandledrejection', (event) => {
      const error = createError(
        'Unbehandelter Promise-Fehler',
        event.reason,
        { severity: ErrorSeverity.ERROR }
      );
      
      reportError(error);
    });
    
    // Globale Fehler
    window.addEventListener('error', (event) => {
      const error = createError(
        'Unbehandelter Fehler',
        event.error || new Error(`${event.message} at ${event.filename}:${event.lineno}:${event.colno}`),
        { severity: ErrorSeverity.ERROR }
      );
      
      reportError(error);
    });
    
    console.info('Globale Fehlerhandler eingerichtet');
  }
} 