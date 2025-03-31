/**
 * Setup für Integrationstests
 * Konfiguriert die Testumgebung für API-Integrationstests
 */

import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';
import { createServer, Server } from 'http';
import supertest from 'supertest';
import { app } from '../../server/app.js';
import express from 'express';
import { AddressInfo } from 'net';

// Lade die Test-Umgebungsvariablen
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Erstelle einen HTTP-Server für die Tests
const server = createServer(app);
export const request = supertest(server);

// Globale Mocks
global.fetch = jest.fn() as jest.Mock;

// Globale Timeouts für Tests erhöhen
jest.setTimeout(30000);

// Mock-Daten für Tests
export const mockPools = [
  {
    id: 'pool1',
    name: 'SUI-USDC',
    address: '0xpool1',
    token0: {
      symbol: 'SUI',
      address: '0xsui',
      decimals: 9
    },
    token1: {
      symbol: 'USDC',
      address: '0xusdc',
      decimals: 6
    },
    liquidity: '1000000',
    volume24h: '500000',
    fee: 0.003
  },
  {
    id: 'pool2',
    name: 'SUI-USDT',
    address: '0xpool2',
    token0: {
      symbol: 'SUI',
      address: '0xsui',
      decimals: 9
    },
    token1: {
      symbol: 'USDT',
      address: '0xusdt',
      decimals: 6
    },
    liquidity: '800000',
    volume24h: '400000',
    fee: 0.003
  }
];

export const mockTokens = [
  {
    symbol: 'SUI',
    name: 'Sui',
    address: '0xsui',
    decimals: 9,
    price: 1.25,
    change24h: 0.05
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xusdc',
    decimals: 6,
    price: 1.00,
    change24h: 0.001
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    address: '0xusdt',
    decimals: 6,
    price: 1.00,
    change24h: 0.002
  }
];

export const mockQuote = {
  inputAmount: '1.0',
  outputAmount: '1.25',
  price: 1.25,
  priceImpact: 0.001,
  route: [
    {
      poolAddress: '0xpool1',
      tokenIn: 'SUI',
      tokenOut: 'USDC'
    }
  ],
  estimatedGas: '0.00025',
  slippage: 0.01
};

export const mockTransaction = {
  id: 'tx1',
  status: 'success',
  hash: '0xtxhash123',
  timestamp: Date.now(),
  from: '0xuser123',
  to: '0xpool1',
  inputToken: {
    symbol: 'SUI',
    amount: '1.0'
  },
  outputToken: {
    symbol: 'USDC',
    amount: '1.25'
  },
  gas: '0.00025'
};

export const mockTransactions = [
  mockTransaction,
  {
    id: 'tx2',
    status: 'success',
    hash: '0xtxhash456',
    timestamp: Date.now() - 3600000, // 1 hour ago
    from: '0xuser123',
    to: '0xpool2',
    inputToken: {
      symbol: 'SUI',
      amount: '2.0'
    },
    outputToken: {
      symbol: 'USDT',
      amount: '2.5'
    },
    gas: '0.0003'
  }
];

// Vor allen Tests
beforeAll(async () => {
  // Starte den Server auf einem zufälligen Port
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      console.log(`Test server started on port ${(server.address() as any).port}`);
      resolve();
    });
  });
});

// Nach allen Tests
afterAll(async () => {
  // Schließe den Server
  await new Promise<void>((resolve) => {
    server.close(() => {
      console.log('Test server closed');
      resolve();
    });
  });
  
  // Bereinige alle Mocks
  jest.restoreAllMocks();
});

// Vor jedem Test
beforeEach(() => {
  // Setze Mocks zurück
  jest.clearAllMocks();
});

// Hilfsfunktionen für Tests

/**
 * Erstellt einen Mock für eine erfolgreiche Fetch-Antwort
 * @param data Die Daten, die zurückgegeben werden sollen
 */
export function mockFetchSuccess(data: any): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
    status: 200,
    statusText: 'OK'
  }) as unknown as typeof fetch;
}

/**
 * Erstellt einen Mock für eine fehlgeschlagene Fetch-Antwort
 * @param status Der HTTP-Status-Code
 * @param message Die Fehlermeldung
 */
export function mockFetchError(status: number, message: string): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: message }),
    status,
    statusText: message
  }) as unknown as typeof fetch;
}

/**
 * Wartet für eine bestimmte Zeit
 * @param ms Die Zeit in Millisekunden
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Erstellt einen Express-Server für Tests
 * @param app Die Express-App
 */
export function createTestServer(app: express.Application): Promise<{ server: Server, url: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address() as AddressInfo;
      const url = `http://localhost:${address.port}`;
      resolve({ server, url });
    });
  });
}

/**
 * Schließt einen Test-Server
 * @param server Der Server, der geschlossen werden soll
 */
export function closeTestServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Erstellt einen WebSocket-Client für Tests
 * @param url Die URL des WebSocket-Servers
 */
export function createSocketClient(url?: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const io = require('socket.io-client');
  return io(url || 'http://localhost:3000', {
    transports: ['websocket'],
    forceNew: true
  });
}

// Exportiere Supertest für einfachen Zugriff
export { request }; 