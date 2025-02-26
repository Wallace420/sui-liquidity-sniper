import { SuiClient } from '@mysten/sui/client';

export const LIVE_TRADING_CONFIG = {
  // Kapital-Management
  CAPITAL_LIMITS: {
    TOTAL_CAPITAL: 50, // Gesamtkapital in SUI
    MAX_TRADE_AMOUNT: 0.5, // Maximaler Betrag pro Trade in SUI
    MIN_TRADE_AMOUNT: 0.3, // Minimaler Betrag pro Trade in SUI
    DAILY_TRADE_LIMIT: 5, // Maximale Anzahl Trades pro Tag
    MAX_DAILY_LOSS: 2.5, // Maximaler täglicher Verlust in SUI (5%)
    MAX_POSITION_LOSS: 0.25, // Stop-Loss pro Position in SUI (50% des Trades)
  },

  // Performance-Grenzen
  PERFORMANCE_THRESHOLDS: {
    MIN_LIQUIDITY: 100, // Minimale Liquidität im Pool
    MAX_PRICE_IMPACT: 2.0, // Maximaler Preiseinfluss in %
    MIN_PROFIT_THRESHOLD: 5.0, // Minimaler erwarteter Profit in %
    MAX_LATENCY: 100, // Maximale akzeptable Latenz in ms
  },

  // Sicherheits-Checks
  SAFETY_CHECKS: {
    SCAM_SCORE_THRESHOLD: 20, // Konservativerer Schwellenwert für Scam-Detection
    MIN_POOL_AGE: 0, // Minimales Alter des Pools in Sekunden (für erste Tests)
    REQUIRED_CONFIRMATIONS: 1, // Erforderliche Bestätigungen
    MAX_SLIPPAGE: 1.0, // Maximaler Slippage in %
  },

  // Monitoring
  MONITORING: {
    LOG_LEVEL: 'debug',
    PERFORMANCE_TRACKING: true,
    ALERT_ON_ERRORS: true,
    TRACK_POSITION: true, // Position in der TX-Reihenfolge tracken
  },

  // Netzwerk-Einstellungen
  NETWORK: {
    MAX_CONCURRENT_REQUESTS: 5,
    REQUEST_TIMEOUT: 2000, // ms
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY: 100, // ms
  },

  // Trading-Logik
  TRADING: {
    PRIORITIZE_SPEED: true, // Geschwindigkeit über Profit
    TOP_POSITION_TARGET: 5, // Ziel: Unter den ersten 5 TXs sein
    AUTO_ADJUST_GAS: true, // Gas automatisch anpassen für schnellere Ausführung
  }
};

// Testnet vs Mainnet Konfiguration
export const NETWORK_CONFIG = {
  MAINNET: {
    RPC_URL: 'https://fullnode.mainnet.sui.io:443',
    WS_URL: 'wss://fullnode.mainnet.sui.io:443',
  },
  TESTNET: {
    RPC_URL: 'https://fullnode.testnet.sui.io:443',
    WS_URL: 'wss://fullnode.testnet.sui.io:443',
  }
};

// Initialisiere Client basierend auf Environment
const isTestnet = process.env.NETWORK_ENV === 'testnet';
export const NETWORK_CLIENT = new SuiClient({ 
  url: isTestnet ? NETWORK_CONFIG.TESTNET.RPC_URL : NETWORK_CONFIG.MAINNET.RPC_URL 
}); 