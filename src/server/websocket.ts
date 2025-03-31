import { Server } from 'socket.io';
import http from 'http';
import logger from '../utils/logger.js';
import { DetectedPool, getRecentPools } from '../chain/pool-detection.js';
import Trade from '../chain/trading';
import Wallet from '../chain/wallet';

// Schnittstelle für den Systemstatus
interface SystemStatus {
  poolHunting: boolean;
  autoSnipe: boolean;
  trading: boolean;
  uptime: number;
  poolsFound: number;
  lastUpdate: string;
}

// Globale Variablen
let io: Server;
let systemStatus: SystemStatus = {
  poolHunting: false,
  autoSnipe: false,
  trading: false,
  uptime: 0,
  poolsFound: 0,
  lastUpdate: new Date().toISOString()
};

/**
 * Initialisiert den WebSocket-Server
 * 
 * @param server HTTP-Server
 */
export function initWebSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  
  io.on('connection', (socket) => {
    logger.info(`Neue WebSocket-Verbindung: ${socket.id}`);
    
    // Sende initiale Daten bei Verbindung
    socket.on('get:initial-data', () => {
      sendInitialData(socket);
    });
    
    // Aktionen vom Client
    socket.on('action:toggle-pool-hunting', () => {
      systemStatus.poolHunting = !systemStatus.poolHunting;
      logger.info(`Pool-Hunting ${systemStatus.poolHunting ? 'aktiviert' : 'deaktiviert'}`);
      broadcastStatus();
    });
    
    socket.on('action:toggle-auto-snipe', () => {
      systemStatus.autoSnipe = !systemStatus.autoSnipe;
      logger.info(`Auto-Snipe ${systemStatus.autoSnipe ? 'aktiviert' : 'deaktiviert'}`);
      broadcastStatus();
    });
    
    socket.on('action:toggle-trading', () => {
      systemStatus.trading = !systemStatus.trading;
      logger.info(`Trading ${systemStatus.trading ? 'aktiviert' : 'deaktiviert'}`);
      broadcastStatus();
    });
    
    socket.on('action:snipe-pool', (data) => {
      const { poolId } = data;
      logger.info(`Snipe-Anfrage für Pool: ${poolId}`);
      // Hier würde die Snipe-Logik aufgerufen werden
    });
    
    socket.on('action:sell-token', (data) => {
      const { tradeId } = data;
      logger.info(`Verkaufs-Anfrage für Trade: ${tradeId}`);
      // Hier würde die Verkaufs-Logik aufgerufen werden
    });
    
    socket.on('disconnect', () => {
      logger.info(`WebSocket-Verbindung getrennt: ${socket.id}`);
    });
  });
  
  logger.info('WebSocket-Server initialisiert');
}

/**
 * Sendet initiale Daten an einen Client
 * 
 * @param socket Socket.io-Socket
 */
function sendInitialData(socket: any) {
  // Sende die neuesten Pools
  const recentPools = getRecentPools(20);
  socket.emit('pools:update', recentPools);
  
  // Sende leere Listen für Trades und Wallets (würden in einer vollständigen Implementierung gefüllt)
  socket.emit('trades:update', []);
  socket.emit('wallets:update', []);
  
  // Sende den aktuellen Systemstatus
  socket.emit('status:update', systemStatus);
  
  logger.info(`Initiale Daten an Client ${socket.id} gesendet`);
}

/**
 * Aktualisiert die Uptime im Systemstatus
 * 
 * @param uptimeSeconds Uptime in Sekunden
 */
export function updateUptime(uptimeSeconds: number) {
  systemStatus.uptime = uptimeSeconds;
  systemStatus.lastUpdate = new Date().toISOString();
  broadcastStatus();
}

/**
 * Sendet den Systemstatus an alle verbundenen Clients
 */
function broadcastStatus() {
  if (io) {
    io.emit('status:update', systemStatus);
  }
}

/**
 * Sendet eine Liste von Pools an alle verbundenen Clients
 * 
 * @param pools Liste der Pools
 */
export function broadcastPools(pools: DetectedPool[]) {
  if (io) {
    io.emit('pools:update', pools);
    
    // Aktualisiere den Systemstatus
    systemStatus.poolsFound = pools.length;
    systemStatus.lastUpdate = new Date().toISOString();
    broadcastStatus();
  }
}

/**
 * Sendet eine Liste von Trades an alle verbundenen Clients
 * 
 * @param trades Liste der Trades
 */
export function broadcastTrades(trades: Trade[]) {
  if (io) {
    io.emit('trades:update', trades);
  }
}

/**
 * Sendet eine Liste von Wallets an alle verbundenen Clients
 * 
 * @param wallets Liste der Wallets
 */
export function broadcastWallets(wallets: Wallet[]) {
  if (io) {
    io.emit('wallets:update', wallets);
  }
} 