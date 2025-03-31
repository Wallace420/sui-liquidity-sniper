"use client";

import React, { useEffect, useState } from 'react';
import { TradesTable } from '../../components/dashboard/trades-table';
import { 
  subscribeToUpdates, 
  sellToken,
  Trade
} from '../../lib/socket';

// Demo-Daten für die Entwicklung
const DEMO_TRADES: Trade[] = [
  { 
    id: '0xabc...123', 
    poolId: '0x123...abc', 
    token: '0xabc123', 
    amount: 0.5, 
    price: 100, 
    timestamp: new Date().toISOString(), 
    status: 'pending' as const,
    profit: 12
  },
  { 
    id: '0xdef...456', 
    poolId: '0x456...def', 
    token: '0xghi789', 
    amount: 0.3, 
    price: 200, 
    timestamp: new Date(Date.now() - 300000).toISOString(), 
    status: 'completed' as const,
    profit: -5
  },
  { 
    id: '0xghi...789', 
    poolId: '0x789...ghi', 
    token: '0xmno345', 
    amount: 1.2, 
    price: 150, 
    timestamp: new Date(Date.now() - 600000).toISOString(), 
    status: 'pending' as const,
    profit: 8.5
  },
  { 
    id: '0xjkl...012', 
    poolId: '0xabc...123', 
    token: '0xstu901', 
    amount: 0.8, 
    price: 75, 
    timestamp: new Date(Date.now() - 900000).toISOString(), 
    status: 'failed' as const,
    profit: 0
  },
];

export default function TradesPage() {
  // State für Daten
  const [trades, setTrades] = useState<Trade[]>(DEMO_TRADES);
  const [isConnected, setIsConnected] = useState(false);

  // Effekt für Socket.io-Verbindung
  useEffect(() => {
    // Abonniere Updates vom Server
    const unsubscribe = subscribeToUpdates(
      () => {}, // Wir ignorieren Pool-Updates auf dieser Seite
      (updatedTrades) => setTrades(updatedTrades),
      () => {}, // Wir ignorieren Wallet-Updates auf dieser Seite
      () => {}  // Wir ignorieren Status-Updates auf dieser Seite
    );

    // Cleanup-Funktion
    return () => {
      unsubscribe();
    };
  }, []);

  const handleSellToken = (tradeId: string) => {
    sellToken(tradeId);
    // Hier könnte eine Benachrichtigung angezeigt werden
    console.log(`Verkauf für Trade ${tradeId} gesendet`);
  };

  // Berechne Statistiken
  const totalTrades = trades.length;
  const pendingTrades = trades.filter(t => t.status === 'pending').length;
  const completedTrades = trades.filter(t => t.status === 'completed').length;
  const failedTrades = trades.filter(t => t.status === 'failed').length;
  const totalProfit = trades
    .filter(t => t.status === 'completed')
    .reduce((acc, trade) => acc + trade.profit, 0);

  return (
    <div className="p-4 md:p-10 mx-auto max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Trades</h1>
      
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Gesamtzahl Trades</div>
            <div className="text-2xl font-bold">{totalTrades}</div>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Ausstehend</div>
            <div className="text-2xl font-bold">{pendingTrades}</div>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Abgeschlossen</div>
            <div className="text-2xl font-bold">{completedTrades}</div>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Fehlgeschlagen</div>
            <div className="text-2xl font-bold">{failedTrades}</div>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Gesamtgewinn</div>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <TradesTable 
          trades={trades}
          onSellToken={handleSellToken}
        />
      </div>
    </div>
  );
} 