import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { logInfo, logError } from '../utils/logger.js';
import { ParsedPoolData } from '../types/index.js';

// Erstelle Express-App
const app = express();
const server = http.createServer(app);

// Konfiguriere CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));

// Konfiguriere JSON-Middleware
app.use(express.json());

// Erstelle Socket.io-Server
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Globale Variablen
let activePools: any[] = [];
let activeWallets: any[] = [];
let activeTrades: any[] = [];
let systemStatus = {
  poolHunting: false,
  trading: false,
  autoSniping: false,
  poolsFound: 0,
  uptime: 0,
  startTime: Date.now()
};

// Aktualisiere System-Status
function updateSystemStatus(newStatus: Partial<typeof systemStatus>) {
  systemStatus = {
    ...systemStatus,
    ...newStatus,
    uptime: (Date.now() - systemStatus.startTime) / 1000
  };
  
  // Sende aktuellen Status an alle verbundenen Clients
  io.emit('systemStatus', systemStatus);
}

// Lade Pools aus CSV-Datei
function loadPoolsFromCSV() {
  try {
    const csvPath = path.join(process.cwd(), 'pools.csv');
    if (!fs.existsSync(csvPath)) {
      return [];
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(Boolean);
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const pool: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        pool[header] = values[index];
      });
      
      // Konvertiere Timestamp zu Date
      if (pool.timestamp) {
        pool.timestamp = new Date(pool.timestamp).getTime();
        pool.age = (Date.now() - pool.timestamp) / 1000;
      }
      
      // Konvertiere numerische Werte
      ['liquidity', 'amountA', 'amountB', 'riskScore', 'buyTax', 'sellTax', 'holders'].forEach(key => {
        if (pool[key]) {
          pool[key] = parseFloat(pool[key]);
        }
      });
      
      // Konvertiere boolesche Werte
      ['isHoneypot', 'mintingEnabled', 'liquidityLocked'].forEach(key => {
        if (pool[key]) {
          pool[key] = pool[key] === 'true';
        }
      });
      
      return pool;
    });
  } catch (error) {
    logError('Fehler beim Laden der Pools aus CSV', { error: String(error) });
    return [];
  }
}

// API-Routen
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    ...systemStatus
  });
});

app.get('/api/pools', (req, res) => {
  // Lade Pools aus CSV-Datei
  const pools = loadPoolsFromCSV();
  res.json(pools);
});

app.get('/api/trades', (req, res) => {
  res.json(activeTrades);
});

app.get('/api/wallets', (req, res) => {
  res.json(activeWallets);
});

// POST-Route zum Starten/Stoppen des Pool-Scanners
app.post('/api/scanner/toggle', (req, res) => {
  const { action } = req.body;
  
  if (action === 'start') {
    // Hier würde die Logik zum Starten des Scanners stehen
    updateSystemStatus({ poolHunting: true });
    logInfo('Pool-Scanner über API gestartet');
    res.json({ success: true, message: 'Scanner gestartet' });
  } else if (action === 'stop') {
    // Hier würde die Logik zum Stoppen des Scanners stehen
    updateSystemStatus({ poolHunting: false });
    logInfo('Pool-Scanner über API gestoppt');
    res.json({ success: true, message: 'Scanner gestoppt' });
  } else {
    res.status(400).json({ success: false, message: 'Ungültige Aktion' });
  }
});

// POST-Route zum Aktivieren/Deaktivieren des Auto-Snipings
app.post('/api/autosnipe/toggle', (req, res) => {
  const { enabled } = req.body;
  
  updateSystemStatus({ autoSniping: enabled });
  logInfo(`Auto-Sniping über API ${enabled ? 'aktiviert' : 'deaktiviert'}`);
  res.json({ success: true, message: `Auto-Sniping ${enabled ? 'aktiviert' : 'deaktiviert'}` });
});

// POST-Route zum Ausführen eines manuellen Snipes
app.post('/api/snipe', (req, res) => {
  const { poolId, amount, slippage } = req.body;
  
  if (!poolId) {
    return res.status(400).json({ success: false, message: 'Pool-ID erforderlich' });
  }
  
  // Hier würde die Logik zum Ausführen eines Snipes stehen
  logInfo(`Manueller Snipe über API ausgeführt: ${poolId}`, { amount, slippage });
  res.json({ success: true, message: 'Snipe ausgeführt' });
});

// Socket.io-Events
io.on('connection', (socket) => {
  logInfo('Neuer Client verbunden', { socketId: socket.id });
  
  // Sende initiale Daten an den Client
  socket.emit('systemStatus', systemStatus);
  
  // Lade Pools aus CSV-Datei
  const pools = loadPoolsFromCSV();
  socket.emit('pools', pools);
  
  // Event-Handler für Client-Anfragen
  socket.on('startScanner', () => {
    updateSystemStatus({ poolHunting: true });
    logInfo('Pool-Scanner über Socket.io gestartet');
  });
  
  socket.on('stopScanner', () => {
    updateSystemStatus({ poolHunting: false });
    logInfo('Pool-Scanner über Socket.io gestoppt');
  });
  
  socket.on('toggleAutoSnipe', (enabled) => {
    updateSystemStatus({ autoSniping: enabled });
    logInfo(`Auto-Sniping über Socket.io ${enabled ? 'aktiviert' : 'deaktiviert'}`);
  });
  
  socket.on('snipe', ({ poolId, amount, slippage }) => {
    logInfo(`Manueller Snipe über Socket.io ausgeführt: ${poolId}`, { amount, slippage });
    // Hier würde die Logik zum Ausführen eines Snipes stehen
  });
  
  socket.on('disconnect', () => {
    logInfo('Client getrennt', { socketId: socket.id });
  });
});

// Funktion zum Starten des Servers
export function startApiServer(port = 3001) {
  server.listen(port, () => {
    logInfo(`API-Server gestartet auf Port ${port}`);
  });
  
  // Starte Intervall zur regelmäßigen Aktualisierung der Daten
  setInterval(() => {
    // Aktualisiere System-Status
    updateSystemStatus({});
    
    // Lade Pools aus CSV-Datei
    const pools = loadPoolsFromCSV();
    io.emit('pools', pools);
    
    // Simuliere Trades für Demo-Zwecke
    if (activeTrades.length > 0) {
      activeTrades = activeTrades.map(trade => {
        // Simuliere Preisänderungen
        const priceChange = (Math.random() * 2 - 1) * 5; // -5% bis +5%
        const newPrice = trade.currentPrice * (1 + priceChange / 100);
        
        return {
          ...trade,
          currentPrice: newPrice,
          profitLoss: (newPrice - trade.entryPrice) * trade.amount,
          profitLossPercentage: ((newPrice - trade.entryPrice) / trade.entryPrice) * 100
        };
      });
      
      io.emit('trades', activeTrades);
    }
  }, 5000); // Alle 5 Sekunden
  
  return server;
}

// Funktion zum Hinzufügen eines neuen Pools
export function addPool(pool: ParsedPoolData) {
  // Füge Pool zur Liste hinzu
  activePools.push(pool);
  
  // Aktualisiere System-Status
  updateSystemStatus({ poolsFound: systemStatus.poolsFound + 1 });
  
  // Sende Pool an alle verbundenen Clients
  io.emit('newPool', pool);
}

// Funktion zum Hinzufügen eines neuen Trades
export function addTrade(trade: any) {
  // Füge Trade zur Liste hinzu
  activeTrades.push(trade);
  
  // Sende Trade an alle verbundenen Clients
  io.emit('newTrade', trade);
  io.emit('trades', activeTrades);
}

// Funktion zum Aktualisieren eines Trades
export function updateTrade(tradeId: string, updates: any) {
  // Finde Trade in der Liste
  const index = activeTrades.findIndex(t => t.tradeId === tradeId);
  if (index >= 0) {
    // Aktualisiere Trade
    activeTrades[index] = {
      ...activeTrades[index],
      ...updates
    };
    
    // Sende aktualisierte Liste an alle verbundenen Clients
    io.emit('trades', activeTrades);
  }
}

// Exportiere Server-Instanz
export default server; 