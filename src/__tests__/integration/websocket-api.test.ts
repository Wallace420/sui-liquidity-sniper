/**
 * Integrationstests für die WebSocket-API
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { createSocketClient, delay, mockPools } from './test-helpers.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';

// Typdefinition für Socket.IO-Server
interface SocketServer extends Server {
  to: (room: string) => {
    emit: (event: string, data: unknown) => void;
  };
}

describe('WebSocket API Integration Tests', () => {
  let httpServer: ReturnType<typeof createServer>;
  // @ts-ignore - Ignoriere Typprobleme mit Socket.IO-Server
  let io: SocketServer;
  let client: any;
  const PORT = 3001;
  const URL = `http://localhost:${PORT}`;

  beforeEach((done) => {
    // Server erstellen
    const app = express();
    httpServer = createServer(app);
    // @ts-ignore - Ignoriere Typprobleme mit Socket.IO-Server
    io = new Server(httpServer) as SocketServer;

    // WebSocket-Endpunkte einrichten
    io.on('connection', (socket) => {
      // Verbindungsbestätigung
      socket.emit('connected', { status: 'connected' });

      // Preis-Updates
      socket.on('subscribe:prices', () => {
        socket.join('prices');
        socket.emit('subscribed', { channel: 'prices' });
      });

      // Pool-Abonnement
      socket.on('subscribe:pool', (poolId) => {
        socket.join(`pool:${poolId}`);
        socket.emit('subscribed', { channel: `pool:${poolId}` });
      });

      // Transaktions-Abonnement
      socket.on('subscribe:transactions', () => {
        socket.join('transactions');
        socket.emit('subscribed', { channel: 'transactions' });
      });

      // Komprimierte Daten
      socket.on('subscribe:compressed', () => {
        socket.join('compressed');
        socket.emit('subscribed', { channel: 'compressed' });
      });

      // Heartbeat
      socket.on('heartbeat', () => {
        socket.emit('heartbeat:response', { timestamp: Date.now() });
      });

      // Verbindung trennen
      socket.on('disconnect', () => {
        // Bereinigung
      });
    });

    // Server starten
    httpServer.listen(PORT, () => {
      done();
    });
  });

  afterEach((done) => {
    // Client trennen, wenn vorhanden
    if (client && client.connected) {
      client.disconnect();
    }

    // Server herunterfahren
    if (httpServer) {
      httpServer.close(() => {
        done();
      });
    } else {
      done();
    }
  });

  it('sollte eine Verbindung herstellen können', (done) => {
    client = createSocketClient(URL);
    
    client.on('connected', (data: { status: string }) => {
      expect(data.status).toBe('connected');
      expect(client.connected).toBe(true);
      done();
    });
  });

  it('sollte Preis-Updates erhalten können', (done) => {
    client = createSocketClient(URL);
    
    client.on('connected', () => {
      // Preis-Updates abonnieren
      client.emit('subscribe:prices');
    });

    client.on('subscribed', (data: { channel: string }) => {
      if (data.channel === 'prices') {
        // Simuliere ein Preis-Update vom Server
        io.to('prices').emit('price:update', {
          token: 'SUI',
          price: 1.25,
          change: 0.05
        });
      }
    });

    client.on('price:update', (data: { token: string; price: number; change: number }) => {
      expect(data.token).toBe('SUI');
      expect(data.price).toBe(1.25);
      expect(data.change).toBe(0.05);
      done();
    });
  });

  it('sollte einen bestimmten Pool abonnieren können', (done) => {
    client = createSocketClient(URL);
    const poolId = 'pool1';
    
    client.on('connected', () => {
      // Pool abonnieren
      client.emit('subscribe:pool', poolId);
    });

    client.on('subscribed', (data: { channel: string }) => {
      if (data.channel === `pool:${poolId}`) {
        // Simuliere ein Pool-Update vom Server
        io.to(`pool:${poolId}`).emit('pool:update', {
          id: poolId,
          liquidity: '1050000',
          volume24h: '520000'
        });
      }
    });

    client.on('pool:update', (data: { id: string; liquidity: string; volume24h: string }) => {
      expect(data.id).toBe(poolId);
      expect(data.liquidity).toBe('1050000');
      expect(data.volume24h).toBe('520000');
      done();
    });
  });

  it('sollte Transaktionsbenachrichtigungen erhalten können', (done) => {
    client = createSocketClient(URL);
    
    client.on('connected', () => {
      // Transaktionen abonnieren
      client.emit('subscribe:transactions');
    });

    client.on('subscribed', (data: { channel: string }) => {
      if (data.channel === 'transactions') {
        // Simuliere eine Transaktionsbenachrichtigung vom Server
        io.to('transactions').emit('transaction:new', {
          id: 'tx123',
          status: 'pending',
          from: '0xuser123',
          to: '0xpool1',
          amount: '1.5'
        });
      }
    });

    client.on('transaction:new', (data: { id: string; status: string }) => {
      expect(data.id).toBe('tx123');
      expect(data.status).toBe('pending');
      done();
    });
  });

  it('sollte Heartbeat-Nachrichten senden und empfangen können', (done) => {
    client = createSocketClient(URL);
    
    client.on('connected', () => {
      // Heartbeat senden
      client.emit('heartbeat');
    });

    client.on('heartbeat:response', (data: { timestamp: number }) => {
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('number');
      done();
    });
  });

  it('sollte automatisch wieder verbinden können nach Verbindungsverlust', (done) => {
    client = createSocketClient(URL);
    let reconnected = false;
    
    client.on('connected', async () => {
      if (!reconnected) {
        // Simuliere einen Verbindungsabbruch
        io.close();
        await delay(100);
        
        // Server neu starten
        // @ts-ignore - Ignoriere Typprobleme mit Socket.IO-Server
        io = new Server(httpServer) as SocketServer;
        io.on('connection', (socket) => {
          socket.emit('connected', { status: 'connected' });
        });
        
        httpServer.listen(PORT);
        reconnected = true;
      } else {
        // Zweite Verbindung nach Neustart
        done();
      }
    });
  });

  it('sollte komprimierte Daten abonnieren und empfangen können', (done) => {
    client = createSocketClient(URL);
    
    client.on('connected', () => {
      // Komprimierte Daten abonnieren
      client.emit('subscribe:compressed');
    });

    client.on('subscribed', (data: { channel: string }) => {
      if (data.channel === 'compressed') {
        // Simuliere komprimierte Daten vom Server
        const compressedData = Buffer.from(JSON.stringify(mockPools)).toString('base64');
        io.to('compressed').emit('data:compressed', {
          format: 'base64',
          data: compressedData
        });
      }
    });

    client.on('data:compressed', (data: { format: string; data: string }) => {
      expect(data.format).toBe('base64');
      
      // Dekomprimieren und überprüfen
      const decompressed = JSON.parse(Buffer.from(data.data, 'base64').toString());
      expect(Array.isArray(decompressed)).toBe(true);
      expect(decompressed.length).toBeGreaterThan(0);
      done();
    });
  });
}); 