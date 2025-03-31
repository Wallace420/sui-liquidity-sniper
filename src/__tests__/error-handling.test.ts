/**
 * Unit-Tests für die Fehlerbehandlung
 */

import { jest } from '@jest/globals';
import { 
  createError, 
  ErrorSeverity, 
  logError, 
  reportError, 
  withRetry, 
  sleep, 
  fetchWithRetry 
} from '../utils/error-handling.js';

// Typdefinitionen für Tests
type AnyPromiseFn = any;

describe('Error Handling', () => {
  // Originale Konsolenmethoden speichern
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  beforeEach(() => {
    // Konsolenmethoden mocken
    console.error = jest.fn();
    console.warn = jest.fn();
    
    // Globale Fetch-Funktion mocken
    global.fetch = jest.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        status: 200,
        statusText: 'OK',
      })
    ) as unknown as typeof global.fetch;
  });
  
  afterEach(() => {
    // Konsolenmethoden wiederherstellen
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    
    // Mocks zurücksetzen
    jest.restoreAllMocks();
  });
  
  describe('createError', () => {
    test('sollte einen Fehler mit Kontext erstellen', () => {
      const error = createError('Test-Fehler', null, { 
        context: 'TestContext', 
        severity: ErrorSeverity.WARNING,
        silent: true
      });
      
      expect(error.message).toBe('Test-Fehler');
      expect(error.context).toBe('TestContext');
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.timestamp).toBeDefined();
      expect(console.error).not.toHaveBeenCalled(); // silent: true
    });
    
    test('sollte den ursprünglichen Fehler speichern', () => {
      const originalError = new Error('Original-Fehler');
      const error = createError('Wrapper-Fehler', originalError, { silent: true });
      
      expect(error.message).toBe('Wrapper-Fehler');
      expect(error.originalError).toBe(originalError);
      expect(error.stack).toContain('Original-Fehler');
    });
    
    test('sollte den Fehler loggen, wenn nicht silent', () => {
      const error = createError('Test-Fehler');
      
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('logError', () => {
    test('sollte den Fehler in der Konsole ausgeben', () => {
      const error = createError('Test-Fehler', null, { 
        context: 'TestContext', 
        severity: ErrorSeverity.ERROR,
        silent: true
      });
      
      logError(error);
      
      expect(console.error).toHaveBeenCalled();
      const consoleErrorMock = console.error as jest.Mock;
      const firstCall = consoleErrorMock.mock.calls[0][0];
      expect(firstCall).toContain('ERROR');
      expect(firstCall).toContain('TestContext');
      expect(firstCall).toContain('Test-Fehler');
    });
  });
  
  describe('reportError', () => {
    test('sollte den Fehler an den Berichtsdienst senden', () => {
      const error = createError('Test-Fehler', null, { silent: true });
      
      // Umgebungsvariable für Tests setzen
      const originalEnv = process.env.NEXT_PUBLIC_ENVIRONMENT;
      process.env.NEXT_PUBLIC_ENVIRONMENT = 'production';
      
      reportError(error);
      
      expect(console.warn).toHaveBeenCalled();
      
      // Umgebungsvariable wiederherstellen
      process.env.NEXT_PUBLIC_ENVIRONMENT = originalEnv;
    });
  });
  
  describe('withRetry', () => {
    beforeEach(() => {
      // setTimeout mocken, um Tests zu beschleunigen
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });
    });
    
    test('sollte die Funktion erfolgreich ausführen', async () => {
      // Erfolgreiche Funktion
      const mockFn: AnyPromiseFn = jest.fn().mockImplementation(() => Promise.resolve('success'));
      
      const result = await withRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
    
    test('sollte die Funktion wiederholen, wenn sie fehlschlägt', async () => {
      // Funktion, die zweimal fehlschlägt und dann erfolgreich ist
      const mockFn: AnyPromiseFn = jest.fn();
      
      // Erste zwei Aufrufe schlagen fehl
      (mockFn as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('Fehler 1')));
      (mockFn as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('Fehler 2')));
      
      // Dritter Aufruf erfolgreich
      (mockFn as jest.Mock).mockImplementation(() => Promise.resolve('success'));
      
      const result = await withRetry(mockFn, { 
        retry: true, 
        maxRetries: 3,
        retryDelay: 10,
        silent: true
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
    
    test('sollte nach maximalen Wiederholungen aufgeben', async () => {
      // Funktion, die immer fehlschlägt
      const mockFn: AnyPromiseFn = jest.fn().mockImplementation(() => 
        Promise.reject(new Error('Dauerhafter Fehler'))
      );
      
      await expect(withRetry(mockFn, { 
        retry: true, 
        maxRetries: 2,
        retryDelay: 10,
        silent: true
      })).rejects.toThrow();
      
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('fetchWithRetry', () => {
    beforeEach(() => {
      // setTimeout mocken, um Tests zu beschleunigen
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });
    });
    
    test('sollte fetch mit Retry-Mechanismus aufrufen', async () => {
      const result = await fetchWithRetry('https://example.com/api');
      
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/api', undefined);
      expect(result).toEqual({ data: 'test' });
    });
    
    test('sollte einen Fehler werfen, wenn fetch fehlschlägt', async () => {
      const fetchMock = global.fetch as jest.Mock;
      fetchMock.mockImplementation(() => 
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })
      );
      
      await expect(fetchWithRetry('https://example.com/api', undefined, {
        retry: true,
        maxRetries: 1,
        silent: true
      })).rejects.toThrow('HTTP-Fehler: 404 Not Found');
    });
  });
  
  describe('sleep', () => {
    test('sollte für die angegebene Zeit warten', async () => {
      jest.useFakeTimers();
      
      const promise = sleep(1000);
      
      jest.advanceTimersByTime(1000);
      
      await promise;
      
      jest.useRealTimers();
    });
  });
}); 