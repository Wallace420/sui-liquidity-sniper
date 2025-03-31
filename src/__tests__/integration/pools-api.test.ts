/**
 * Integrationstests für die Pools-API
 */

import { jest } from '@jest/globals';
import { mockPools, mockFetchSuccess, mockFetchError } from './test-helpers.js';
import { app } from '../../server/app.js';
import request from 'supertest';

// Typdefinition für Pool-Objekte
interface Pool {
  id: string;
  name: string;
  address: string;
  token0: {
    symbol: string;
    address: string;
    decimals: number;
  };
  token1: {
    symbol: string;
    address: string;
    decimals: number;
  };
  liquidity: string;
  volume24h: string;
  fee: number;
}

describe('Pools API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/pools', () => {
    it('sollte alle Pools zurückgeben', async () => {
      // Mock für die Fetch-Anfrage
      mockFetchSuccess(mockPools);
      
      // API-Anfrage
      const response = await request(app).get('/api/pools');
      
      // Überprüfungen
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(mockPools.length);
      expect(response.body[0].name).toBe(mockPools[0].name);
    });

    it('sollte einen Fehler zurückgeben, wenn die Anfrage fehlschlägt', async () => {
      // Mock für die fehlgeschlagene Fetch-Anfrage
      mockFetchError(500, 'Internal Server Error');
      
      // API-Anfrage
      const response = await request(app).get('/api/pools');
      
      // Überprüfungen
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/pools/:id', () => {
    it('sollte einen Pool anhand der ID zurückgeben', async () => {
      const poolId = 'pool1';
      const pool = mockPools.find((p: Pool) => p.id === poolId);
      
      // Mock für die Fetch-Anfrage
      mockFetchSuccess(pool);
      
      // API-Anfrage
      const response = await request(app).get(`/api/pools/${poolId}`);
      
      // Überprüfungen
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', poolId);
      expect(response.body.name).toBe(pool?.name);
    });

    it('sollte 404 zurückgeben, wenn der Pool nicht gefunden wird', async () => {
      const poolId = 'nonexistent';
      
      // Mock für die Fetch-Anfrage
      mockFetchSuccess(null);
      
      // API-Anfrage
      const response = await request(app).get(`/api/pools/${poolId}`);
      
      // Überprüfungen
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('sollte einen Fehler zurückgeben, wenn die Anfrage fehlschlägt', async () => {
      const poolId = 'pool1';
      
      // Mock für die fehlgeschlagene Fetch-Anfrage
      mockFetchError(500, 'Internal Server Error');
      
      // API-Anfrage
      const response = await request(app).get(`/api/pools/${poolId}`);
      
      // Überprüfungen
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/pools/token/:tokenAddress', () => {
    it('sollte Pools für einen bestimmten Token zurückgeben', async () => {
      const tokenAddress = '0xsui';
      const filteredPools = mockPools.filter(
        (p: Pool) => p.token0.address === tokenAddress || p.token1.address === tokenAddress
      );
      
      // Mock für die Fetch-Anfrage
      mockFetchSuccess(filteredPools);
      
      // API-Anfrage
      const response = await request(app).get(`/api/pools/token/${tokenAddress}`);
      
      // Überprüfungen
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Überprüfe, ob alle zurückgegebenen Pools den Token enthalten
      response.body.forEach((pool: Pool) => {
        const hasToken = pool.token0.address === tokenAddress || pool.token1.address === tokenAddress;
        expect(hasToken).toBe(true);
      });
    });

    it('sollte ein leeres Array zurückgeben, wenn keine Pools für den Token gefunden werden', async () => {
      const tokenAddress = '0xnonexistent';
      
      // Mock für die Fetch-Anfrage
      mockFetchSuccess([]);
      
      // API-Anfrage
      const response = await request(app).get(`/api/pools/token/${tokenAddress}`);
      
      // Überprüfungen
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('sollte einen Fehler zurückgeben, wenn die Anfrage fehlschlägt', async () => {
      const tokenAddress = '0xsui';
      
      // Mock für die fehlgeschlagene Fetch-Anfrage
      mockFetchError(500, 'Internal Server Error');
      
      // API-Anfrage
      const response = await request(app).get(`/api/pools/token/${tokenAddress}`);
      
      // Überprüfungen
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/pools/pair/:token0Address/:token1Address', () => {
    it('sollte Pools für ein Tokenpaar zurückgeben', async () => {
      const token0Address = '0xsui';
      const token1Address = '0xusdc';
      const filteredPools = mockPools.filter(
        (p: Pool) => (p.token0.address === token0Address && p.token1.address === token1Address) ||
             (p.token0.address === token1Address && p.token1.address === token0Address)
      );
      
      // Mock für die Fetch-Anfrage
      mockFetchSuccess(filteredPools);
      
      // API-Anfrage
      const response = await request(app).get(`/api/pools/pair/${token0Address}/${token1Address}`);
      
      // Überprüfungen
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Überprüfe, ob alle zurückgegebenen Pools das Tokenpaar enthalten
      response.body.forEach((pool: Pool) => {
        const hasPair = 
          (pool.token0.address === token0Address && pool.token1.address === token1Address) ||
          (pool.token0.address === token1Address && pool.token1.address === token0Address);
        expect(hasPair).toBe(true);
      });
    });

    it('sollte ein leeres Array zurückgeben, wenn keine Pools für das Tokenpaar gefunden werden', async () => {
      const token0Address = '0xsui';
      const token1Address = '0xnonexistent';
      
      // Mock für die Fetch-Anfrage
      mockFetchSuccess([]);
      
      // API-Anfrage
      const response = await request(app).get(`/api/pools/pair/${token0Address}/${token1Address}`);
      
      // Überprüfungen
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('sollte einen Fehler zurückgeben, wenn die Anfrage fehlschlägt', async () => {
      const token0Address = '0xsui';
      const token1Address = '0xusdc';
      
      // Mock für die fehlgeschlagene Fetch-Anfrage
      mockFetchError(500, 'Internal Server Error');
      
      // API-Anfrage
      const response = await request(app).get(`/api/pools/pair/${token0Address}/${token1Address}`);
      
      // Überprüfungen
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/pools/:id/transactions', () => {
    it('sollte Transaktionen für einen Pool zurückgeben', async () => {
      // Mock-Transaktionen
      const mockTransactions = [
        { id: 'tx1', type: 'swap', amount: '100', timestamp: Date.now() - 3600000 },
        { id: 'tx2', type: 'add_liquidity', amount: '500', timestamp: Date.now() - 7200000 }
      ];
      
      // Mock für die Fetch-Anfrage
      mockFetchSuccess(mockTransactions);
      
      // API-Anfrage
      const response = await request.get('/api/pools/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef/transactions');
      
      // Überprüfungen
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].type).toBe('swap');
      expect(response.body[1].type).toBe('add_liquidity');
    });
    
    it('sollte Transaktionen nach Typ filtern können', async () => {
      // Mock-Transaktionen
      const mockTransactions = [
        { id: 'tx1', type: 'swap', amount: '100', timestamp: Date.now() - 3600000 },
        { id: 'tx2', type: 'add_liquidity', amount: '500', timestamp: Date.now() - 7200000 }
      ];
      
      // Mock für die Fetch-Anfrage
      mockFetchSuccess(mockTransactions);
      
      // API-Anfrage mit Typ-Filter
      const response = await request.get('/api/pools/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef/transactions?type=swap');
      
      // Überprüfungen
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe('swap');
    });
  });
}); 