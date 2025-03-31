/**
 * Integrationstests für die Trading-API
 */

import { jest } from '@jest/globals';
import { mockQuote, mockTransaction, mockTransactions, mockFetchSuccess, mockFetchError } from './test-helpers.js';
import { app } from '../../server/app.js';
import request from 'supertest';

// Typdefinitionen für die Tests
interface Quote {
  inputAmount: string;
  outputAmount: string;
  price: number;
  priceImpact: number;
  route: Array<{
    poolAddress: string;
    tokenIn: string;
    tokenOut: string;
  }>;
  estimatedGas: string;
  slippage: number;
}

interface Transaction {
  id: string;
  status: string;
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  inputToken: {
    symbol: string;
    amount: string;
  };
  outputToken: {
    symbol: string;
    amount: string;
  };
  gas: string;
}

describe('Trading API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/trading/quote', () => {
    it('sollte ein Preisangebot zurückgeben', async () => {
      // Mock für die Fetch-Anfrage
      mockFetchSuccess(mockQuote);
      
      // API-Anfrage
      const response = await request(app)
        .get('/api/trading/quote')
        .query({
          fromToken: 'SUI',
          toToken: 'USDC',
          amount: '1.0',
          slippage: '0.01'
        });
      
      // Überprüfungen
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('inputAmount', mockQuote.inputAmount);
      expect(response.body).toHaveProperty('outputAmount', mockQuote.outputAmount);
      expect(response.body).toHaveProperty('price', mockQuote.price);
    });

    it('sollte einen Fehler zurückgeben, wenn Parameter fehlen', async () => {
      // API-Anfrage ohne erforderliche Parameter
      const response = await request(app)
        .get('/api/trading/quote')
        .query({
          fromToken: 'SUI',
          // toToken fehlt
          amount: '1.0'
        });
      
      // Überprüfungen
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('sollte einen Fehler zurückgeben, wenn die Anfrage fehlschlägt', async () => {
      // Mock für die fehlgeschlagene Fetch-Anfrage
      mockFetchError(500, 'Internal Server Error');
      
      // API-Anfrage
      const response = await request(app)
        .get('/api/trading/quote')
        .query({
          fromToken: 'SUI',
          toToken: 'USDC',
          amount: '1.0',
          slippage: '0.01'
        });
      
      // Überprüfungen
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/trading/swap', () => {
    it('sollte eine Transaktion ausführen', async () => {
      // Mock für die Fetch-Anfrage
      mockFetchSuccess(mockTransaction);
      
      // API-Anfrage
      const response = await request(app)
        .post('/api/trading/swap')
        .send({
          fromToken: 'SUI',
          toToken: 'USDC',
          amount: '1.0',
          slippage: 0.01,
          wallet: '0xuser123'
        });
      
      // Überprüfungen
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', mockTransaction.id);
      expect(response.body).toHaveProperty('status', mockTransaction.status);
      expect(response.body).toHaveProperty('hash', mockTransaction.hash);
    });

    it('sollte einen Fehler zurückgeben, wenn Parameter fehlen', async () => {
      // API-Anfrage ohne erforderliche Parameter
      const response = await request(app)
        .post('/api/trading/swap')
        .send({
          fromToken: 'SUI',
          // toToken fehlt
          amount: '1.0',
          wallet: '0xuser123'
        });
      
      // Überprüfungen
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('sollte einen Fehler zurückgeben, wenn keine Wallet angegeben ist', async () => {
      // API-Anfrage ohne Wallet
      const response = await request(app)
        .post('/api/trading/swap')
        .send({
          fromToken: 'SUI',
          toToken: 'USDC',
          amount: '1.0',
          slippage: 0.01
          // wallet fehlt
        });
      
      // Überprüfungen
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('wallet');
    });

    it('sollte einen Fehler zurückgeben, wenn die Transaktion fehlschlägt', async () => {
      // Mock für die fehlgeschlagene Fetch-Anfrage
      mockFetchError(500, 'Transaction failed');
      
      // API-Anfrage
      const response = await request(app)
        .post('/api/trading/swap')
        .send({
          fromToken: 'SUI',
          toToken: 'USDC',
          amount: '1.0',
          slippage: 0.01,
          wallet: '0xuser123'
        });
      
      // Überprüfungen
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/trading/transactions', () => {
    it('sollte Transaktionen für eine Wallet zurückgeben', async () => {
      // Mock für die Fetch-Anfrage
      mockFetchSuccess(mockTransactions);
      
      // API-Anfrage
      const response = await request(app)
        .get('/api/trading/transactions')
        .query({
          wallet: '0xuser123'
        });
      
      // Überprüfungen
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(mockTransactions.length);
      expect(response.body[0]).toHaveProperty('id', mockTransactions[0].id);
    });

    it('sollte einen Fehler zurückgeben, wenn keine Wallet angegeben ist', async () => {
      // API-Anfrage ohne Wallet
      const response = await request(app)
        .get('/api/trading/transactions');
      
      // Überprüfungen
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('wallet');
    });

    it('sollte Transaktionen nach Token filtern können', async () => {
      // Mock für die Fetch-Anfrage
      mockFetchSuccess(mockTransactions.filter(tx => 
        tx.inputToken.symbol === 'SUI' || tx.outputToken.symbol === 'SUI'
      ));
      
      // API-Anfrage mit Token-Filter
      const response = await request(app)
        .get('/api/trading/transactions')
        .query({
          wallet: '0xuser123',
          token: 'SUI'
        });
      
      // Überprüfungen
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Überprüfe, ob alle zurückgegebenen Transaktionen den Token enthalten
      response.body.forEach((tx: Transaction) => {
        const hasToken = tx.inputToken.symbol === 'SUI' || tx.outputToken.symbol === 'SUI';
        expect(hasToken).toBe(true);
      });
    });

    it('sollte einen Fehler zurückgeben, wenn die Anfrage fehlschlägt', async () => {
      // Mock für die fehlgeschlagene Fetch-Anfrage
      mockFetchError(500, 'Internal Server Error');
      
      // API-Anfrage
      const response = await request(app)
        .get('/api/trading/transactions')
        .query({
          wallet: '0xuser123'
        });
      
      // Überprüfungen
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 