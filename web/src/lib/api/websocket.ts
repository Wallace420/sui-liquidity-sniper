/**
 * WebSocket-Hilfsklasse für die Verbindung zu Echtzeit-Daten
 * Implementiert Reconnect-Logik, Fehlerbehandlung und Heartbeats
 * Optimiert für Datenübertragung mit Komprimierung und Batching
 */

import React from 'react';
import { io, Socket } from 'socket.io-client';
import { caches } from '../cache';
import pako from 'pako'; // Für Komprimierung
import { createError, ErrorSeverity, withRetry, sleep } from '../error-handling';

// Typen für die Daten, die wir vom Server erhalten
export interface Pool {
  id: string;
  dex: string;
  token0: string;
  token1: string;
  liquidity: number;
  age: number;
  timestamp: string;
  riskScore: number;
  quality: number;
  // Erweiterte Risikobewertungsfelder
  honeypotRisk?: number;
  rugPullRisk?: number;
  volatility?: number;
  tokenSymbol?: string;
  tokenName?: string;
  tokenAddress?: string;
  volume24h?: number;
  priceChange24h?: number;
}

export interface Trade {
  id: string;
  poolId: string;
  token: string;
  amount: number;
  price: number;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  profit: number;
}

export interface Wallet {
  address: string;
  balance: number;
  transactions: number;
  lastTransaction: string;
}

export interface SystemStatus {
  poolHunting: boolean;
  autoSnipe: boolean;
  trading: boolean;
  uptime: number;
  poolsFound: number;
  lastUpdate: string;
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  enableCompression?: boolean;
  batchInterval?: number;
  onMessage?: (data: any) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  onError?: (error: Error) => void;
}

// Konfiguration für die Datenoptimierung
interface OptimizationConfig {
  enableCompression: boolean;
  batchInterval: number;
  batchSize: number;
  compressionThreshold: number; // Minimale Größe für Komprimierung in Bytes
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private status: WebSocketStatus = 'disconnected';
  private options: Required<WebSocketOptions>;
  private messageQueue: any[] = [];
  private optimizationConfig: OptimizationConfig;

  constructor(options: WebSocketOptions) {
    this.options = {
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      enableCompression: true,
      batchInterval: 100, // 100ms Batching-Intervall
      onMessage: () => {},
      onStatusChange: () => {},
      onError: () => {},
      ...options
    };

    this.optimizationConfig = {
      enableCompression: this.options.enableCompression,
      batchInterval: this.options.batchInterval,
      batchSize: 50, // Maximale Anzahl von Nachrichten pro Batch
      compressionThreshold: 1024 // 1KB
    };
  }

  /**
   * Verbindung zum WebSocket-Server herstellen
   */
  public async connect(): Promise<void> {
    if (this.ws) {
      this.disconnect();
    }

    try {
      this.setStatus('connecting');
      
      // Verbindung mit Retry-Mechanismus herstellen
      await withRetry(async () => {
        return new Promise<void>((resolve, reject) => {
          try {
            this.ws = new WebSocket(this.options.url);
            
            // Timeout für die Verbindung setzen
            const connectionTimeout = setTimeout(() => {
              reject(new Error('Verbindungs-Timeout'));
            }, 10000); // 10 Sekunden Timeout
            
            this.ws.onopen = (event) => {
              clearTimeout(connectionTimeout);
              this.handleOpen(event);
              resolve();
            };
            
            this.ws.onmessage = this.handleMessage.bind(this);
            this.ws.onerror = (event) => {
              clearTimeout(connectionTimeout);
              this.handleError(event);
              reject(new Error('WebSocket-Verbindungsfehler'));
            };
            this.ws.onclose = this.handleClose.bind(this);
          } catch (error) {
            reject(error);
          }
        });
      }, {
        context: 'WebSocket-Verbindung',
        retry: true,
        maxRetries: this.options.maxReconnectAttempts,
        retryDelay: this.options.reconnectInterval
      });
    } catch (error) {
      const wsError = createError(
        'Konnte keine Verbindung zum WebSocket-Server herstellen',
        error,
        { 
          context: 'WebSocket',
          severity: ErrorSeverity.ERROR
        }
      );
      
      this.options.onError(wsError);
      this.setStatus('error');
    }
  }

  /**
   * Verbindung zum WebSocket-Server trennen
   */
  public disconnect(): void {
    this.clearTimers();
    
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      
      this.ws = null;
    }
    
    this.setStatus('disconnected');
  }

  /**
   * Nachricht an den WebSocket-Server senden
   */
  public send(data: any): boolean {
    if (this.optimizationConfig.batchInterval > 0) {
      // Nachrichten für Batching in die Warteschlange stellen
      this.messageQueue.push(data);
      
      // Wenn dies die erste Nachricht ist, starte den Batch-Timer
      if (this.messageQueue.length === 1 && !this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.sendBatch();
        }, this.optimizationConfig.batchInterval);
      }
      
      // Wenn die Warteschlange voll ist, sofort senden
      if (this.messageQueue.length >= this.optimizationConfig.batchSize) {
        this.sendBatch();
      }
      
      return true;
    } else {
      // Direkt senden ohne Batching
      return this.sendImmediate(data);
    }
  }

  /**
   * Batch von Nachrichten senden
   */
  private sendBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.messageQueue.length === 0) {
      return;
    }
    
    // Kopiere die Warteschlange und leere sie
    const batch = [...this.messageQueue];
    this.messageQueue = [];
    
    // Sende den Batch
    this.sendImmediate({
      type: 'batch',
      messages: batch,
      count: batch.length,
      timestamp: Date.now()
    });
  }

  /**
   * Nachricht sofort senden ohne Batching
   */
  private sendImmediate(data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      let message: string;
      
      if (typeof data === 'string') {
        message = data;
      } else {
        message = JSON.stringify(data);
      }
      
      // Komprimiere große Nachrichten
      if (this.optimizationConfig.enableCompression && 
          message.length > this.optimizationConfig.compressionThreshold) {
        
        const compressed = this.compressData(message);
        
        // Sende komprimierte Daten mit Header
        this.ws.send(JSON.stringify({
          type: 'compressed',
          data: this.arrayBufferToBase64(compressed),
          originalSize: message.length,
          timestamp: Date.now()
        }));
      } else {
        // Sende unkomprimierte Daten
        this.ws.send(message);
      }
      
      return true;
    } catch (error) {
      this.options.onError(new Error(`Fehler beim Senden der Nachricht: ${error}`));
      return false;
    }
  }

  /**
   * Daten komprimieren
   */
  private compressData(data: string): Uint8Array {
    try {
      const uint8Array = new TextEncoder().encode(data);
      return pako.deflate(uint8Array);
    } catch (error) {
      console.error('Fehler bei der Komprimierung:', error);
      throw error;
    }
  }

  /**
   * Daten dekomprimieren
   */
  private decompressData(compressedData: Uint8Array): string {
    try {
      const decompressed = pako.inflate(compressedData);
      return new TextDecoder().decode(decompressed);
    } catch (error) {
      console.error('Fehler bei der Dekomprimierung:', error);
      throw error;
    }
  }

  /**
   * ArrayBuffer in Base64 konvertieren
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    const binary = Array.from(buffer).map(byte => String.fromCharCode(byte)).join('');
    return btoa(binary);
  }

  /**
   * Base64 in ArrayBuffer konvertieren
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  }

  /**
   * Aktuellen Status abrufen
   */
  public getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Verbindung neu herstellen
   */
  public reconnect(): void {
    this.clearTimers();
    
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.options.onError(new Error(`Maximale Anzahl an Reconnect-Versuchen (${this.options.maxReconnectAttempts}) erreicht`));
      this.setStatus('error');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.getExponentialBackoffDelay();
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Heartbeat senden, um die Verbindung aktiv zu halten
   */
  private sendHeartbeat(): void {
    this.send({ type: 'heartbeat', timestamp: Date.now() });
  }

  /**
   * Exponentiellen Backoff-Delay berechnen
   */
  private getExponentialBackoffDelay(): number {
    const baseDelay = this.options.reconnectInterval;
    const maxDelay = 30000; // 30 Sekunden maximaler Delay
    
    const delay = Math.min(
      maxDelay,
      baseDelay * Math.pow(2, this.reconnectAttempts - 1)
    );
    
    // Füge etwas Zufälligkeit hinzu, um "Thundering Herd"-Probleme zu vermeiden
    return delay + Math.random() * 1000;
  }

  /**
   * Timer löschen
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Status setzen und Event auslösen
   */
  private setStatus(status: WebSocketStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.options.onStatusChange(status);
    }
  }

  /**
   * Event-Handler für WebSocket-Verbindung
   */
  private handleOpen(event: Event): void {
    this.reconnectAttempts = 0;
    this.setStatus('connected');
    
    // Starte Heartbeat-Timer
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.options.heartbeatInterval);
  }

  /**
   * Event-Handler für WebSocket-Nachrichten
   */
  private handleMessage(event: MessageEvent): void {
    try {
      let data: any;
      
      if (typeof event.data === 'string') {
        // Versuche, die Daten als JSON zu parsen
        data = JSON.parse(event.data);
        
        // Prüfe, ob es sich um komprimierte Daten handelt
        if (data.type === 'compressed' && data.data) {
          const compressedData = this.base64ToArrayBuffer(data.data);
          const decompressedString = this.decompressData(compressedData);
          data = JSON.parse(decompressedString);
        } else if (data.type === 'batch' && Array.isArray(data.messages)) {
          // Verarbeite jede Nachricht im Batch einzeln
          data.messages.forEach((message: any) => {
            this.processMessage(message);
          });
          return; // Batch wurde verarbeitet
        }
      } else {
        // Binäre Daten (wahrscheinlich komprimiert)
        const decompressedString = this.decompressData(new Uint8Array(event.data as ArrayBuffer));
        data = JSON.parse(decompressedString);
      }
      
      this.processMessage(data);
    } catch (error) {
      const parseError = createError(
        'Fehler beim Parsen der WebSocket-Nachricht',
        error,
        {
          context: 'WebSocket',
          severity: ErrorSeverity.WARNING
        }
      );
      
      this.options.onError(parseError);
    }
  }

  /**
   * Verarbeite eine einzelne Nachricht
   */
  private processMessage(data: any): void {
    // Cache-Aktualisierung für verschiedene Datentypen
    if (data.type === 'pools' && Array.isArray(data.data)) {
      caches.pools.set('latest', data.data);
    } else if (data.type === 'trades' && Array.isArray(data.data)) {
      caches.trades.set('latest', data.data);
    } else if (data.type === 'tokenInfo' && data.tokenAddress) {
      caches.tokenInfo.set(data.tokenAddress, data.data);
    } else if (data.type === 'chartData' && data.symbol) {
      caches.chartData.set(`${data.symbol}:${data.interval}`, data.data);
    }
    
    // Nachricht an den Handler weiterleiten
    this.options.onMessage(data);
  }

  /**
   * Event-Handler für WebSocket-Fehler
   */
  private handleError(event: Event): void {
    const wsError = createError(
      'WebSocket-Fehler aufgetreten',
      event,
      {
        context: 'WebSocket',
        severity: ErrorSeverity.ERROR
      }
    );
    
    this.setStatus('error');
    this.options.onError(wsError);
    this.reconnect();
  }

  /**
   * Event-Handler für WebSocket-Verbindungsende
   */
  private handleClose(event: CloseEvent): void {
    this.clearTimers();
    
    // Nur loggen, wenn es kein normaler Verbindungsabbau war
    if (event.code !== 1000) {
      const closeError = createError(
        `WebSocket-Verbindung geschlossen: Code ${event.code}`,
        new Error(event.reason || 'Keine Begründung angegeben'),
        {
          context: 'WebSocket',
          severity: event.wasClean ? ErrorSeverity.INFO : ErrorSeverity.WARNING
        }
      );
      
      this.options.onError(closeError);
    }
    
    this.setStatus('disconnected');
    this.reconnect();
  }
}

/**
 * Factory-Funktion zum Erstellen einer WebSocketClient-Instanz
 */
export function createWebSocketClient(options: WebSocketOptions): WebSocketClient {
  return new WebSocketClient(options);
}

/**
 * Hook für die Verwendung von WebSockets in React-Komponenten
 */
export function useWebSocket(url: string, options: Omit<WebSocketOptions, 'url'> = {}): {
  status: WebSocketStatus;
  send: (data: any) => boolean;
  disconnect: () => void;
  reconnect: () => void;
  pools: Pool[];
  trades: Trade[];
  systemStatus: SystemStatus | null;
  error: Error | null;
} {
  const wsRef = React.useRef<WebSocketClient | null>(null);
  const [status, setStatus] = React.useState<WebSocketStatus>('disconnected');
  const [pools, setPools] = React.useState<Pool[]>([]);
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [systemStatus, setSystemStatus] = React.useState<SystemStatus | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  
  React.useEffect(() => {
    if (!url) return;
    
    // Prüfe, ob Daten im Cache sind
    const cachedPools = caches.pools.get<Pool[]>('latest');
    if (cachedPools) {
      setPools(cachedPools);
    }
    
    const cachedTrades = caches.trades.get<Trade[]>('latest');
    if (cachedTrades) {
      setTrades(cachedTrades);
    }
    
    wsRef.current = new WebSocketClient({
      url,
      ...options,
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        
        // Bei erfolgreicher Verbindung den Fehler zurücksetzen
        if (newStatus === 'connected') {
          setError(null);
        }
        
        options.onStatusChange?.(newStatus);
      },
      onMessage: (data) => {
        // Verarbeite verschiedene Nachrichtentypen
        if (data.type === 'pools' && Array.isArray(data.data)) {
          setPools(data.data);
        } else if (data.type === 'trades' && Array.isArray(data.data)) {
          setTrades(data.data);
        } else if (data.type === 'status') {
          setSystemStatus(data.data);
        } else if (data.type === 'error') {
          setError(new Error(data.message || 'Unbekannter Serverfehler'));
        }
        
        // Weiterleiten an benutzerdefinierten Handler
        options.onMessage?.(data);
      },
      onError: (err) => {
        setError(err);
        options.onError?.(err);
      }
    });
    
    wsRef.current.connect();
    
    return () => {
      wsRef.current?.disconnect();
    };
  }, [url]);
  
  const send = React.useCallback((data: any): boolean => {
    return wsRef.current?.send(data) || false;
  }, []);
  
  const disconnect = React.useCallback(() => {
    wsRef.current?.disconnect();
  }, []);
  
  const reconnect = React.useCallback(() => {
    setError(null);
    wsRef.current?.reconnect();
  }, []);
  
  return { 
    status, 
    send, 
    disconnect, 
    reconnect,
    pools,
    trades,
    systemStatus,
    error
  };
}

/**
 * Socket.io-Implementierung für Abwärtskompatibilität
 */
let socketIoInstance: Socket | null = null;

// Definiere die Basis-URL für die API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Verbindung zum Server herstellen
export const getSocketIo = (): Socket => {
  if (!socketIoInstance) {
    socketIoInstance = io(API_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketIoInstance.on('connect', () => {
      console.log('Verbunden mit dem Server');
    });
    
    socketIoInstance.on('disconnect', () => {
      console.log('Verbindung zum Server getrennt');
    });
    
    socketIoInstance.on('error', (error) => {
      console.error('Socket-Fehler:', error);
    });
  }
  
  return socketIoInstance;
};

// Hilfsfunktionen für die Socket.io-Ereignisse
export const subscribeToUpdates = (
  onPoolsUpdate: (pools: Pool[]) => void,
  onTradesUpdate: (trades: Trade[]) => void,
  onWalletsUpdate: (wallets: Wallet[]) => void,
  onStatusUpdate: (status: SystemStatus) => void
): () => void => {
  const socket = getSocketIo();
  
  socket.on('pools:update', onPoolsUpdate);
  socket.on('trades:update', onTradesUpdate);
  socket.on('wallets:update', onWalletsUpdate);
  socket.on('status:update', onStatusUpdate);
  
  // Anfrage für initiale Daten senden
  socket.emit('get:initial-data');
  
  // Cleanup-Funktion zurückgeben
  return () => {
    if (socket) {
      socket.off('pools:update', onPoolsUpdate);
      socket.off('trades:update', onTradesUpdate);
      socket.off('wallets:update', onWalletsUpdate);
      socket.off('status:update', onStatusUpdate);
    }
  };
};

// Funktionen zum Senden von Befehlen an den Server
export const togglePoolHunting = (): void => {
  getSocketIo().emit('action:toggle-pool-hunting');
};

export const toggleAutoSnipe = (): void => {
  getSocketIo().emit('action:toggle-auto-snipe');
};

export const toggleTrading = (): void => {
  getSocketIo().emit('action:toggle-trading');
};

export const snipePool = (poolId: string): void => {
  getSocketIo().emit('action:snipe-pool', { poolId });
};

export const sellToken = (tradeId: string): void => {
  getSocketIo().emit('action:sell-token', { tradeId });
};

// Verbindungsstatus-Funktionen für Socket.io
export const onConnect = (callback: () => void) => {
  const socketInstance = getSocketIo();
  socketInstance.on('connect', callback);
  return () => socketInstance.off('connect', callback);
};

export const onDisconnect = (callback: () => void) => {
  const socketInstance = getSocketIo();
  socketInstance.on('disconnect', callback);
  return () => socketInstance.off('disconnect', callback);
};

export const isConnected = () => {
  const socketInstance = getSocketIo();
  return socketInstance.connected;
}; 