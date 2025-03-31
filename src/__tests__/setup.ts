/**
 * Jest-Setup-Datei
 * Enthält globale Konfigurationen und Mocks für Tests
 */

import dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Lade Umgebungsvariablen aus .env.test, falls vorhanden, sonst aus .env
dotenv.config({ path: '.env.test' });
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Globale Timeouts erhöhen für langsame Tests
jest.setTimeout(30000);

// Konsolenausgaben unterdrücken, außer bei Fehlern
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  // Fehler weiterhin ausgeben
  error: console.error,
};

// Mock für globale Fetch-API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
  })
) as jest.Mock;

// Mock für WebSocket
class MockWebSocket {
  url: string;
  onopen: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  readyState: number = 0;
  CONNECTING: number = 0;
  OPEN: number = 1;
  CLOSING: number = 2;
  CLOSED: number = 3;

  constructor(url: string) {
    this.url = url;
    // Simuliere erfolgreiche Verbindung nach 50ms
    setTimeout(() => {
      this.readyState = this.OPEN;
      if (this.onopen) {
        this.onopen({ target: this });
      }
    }, 50);
  }

  send(data: string): void {
    // Mock-Implementierung
  }

  close(): void {
    this.readyState = this.CLOSED;
    if (this.onclose) {
      this.onclose({ code: 1000, reason: 'Normal closure', wasClean: true });
    }
  }
}

// WebSocket global mock
global.WebSocket = MockWebSocket as any;

// Bereinigungsfunktion nach jedem Test
afterEach(() => {
  jest.clearAllMocks();
});

// Bereinigungsfunktion nach allen Tests
afterAll(() => {
  jest.restoreAllMocks();
}); 