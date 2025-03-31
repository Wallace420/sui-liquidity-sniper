"use client";

import React, { useEffect, useState } from 'react';
import { PoolsTable } from '../../components/dashboard/pools-table';
import { 
  subscribeToUpdates, 
  snipePool,
  Pool
} from '../../lib/socket';

// Demo-Daten für die Entwicklung
const DEMO_POOLS: Pool[] = [
  { 
    id: '0x123...abc', 
    dex: 'Turbos', 
    token0: '0xabc123', 
    token1: '0xdef456', 
    liquidity: 5000, 
    age: 300, 
    timestamp: new Date().toISOString(), 
    riskScore: 25,
    quality: 75,
    tokenSymbol: 'TURBO',
    tokenName: 'Turbo Token',
    tokenAddress: '0xabc123',
    volume24h: 12500,
    priceChange24h: 5.2
  },
  { 
    id: '0x456...def', 
    dex: 'Cetus', 
    token0: '0xghi789', 
    token1: '0xjkl012', 
    liquidity: 3500, 
    age: 600, 
    timestamp: new Date(Date.now() - 600000).toISOString(), 
    riskScore: 40,
    quality: 60,
    tokenSymbol: 'CTS',
    tokenName: 'Cetus Token',
    tokenAddress: '0xghi789',
    volume24h: 8750,
    priceChange24h: -2.8
  },
  { 
    id: '0x789...ghi', 
    dex: 'BlueMove', 
    token0: '0xmno345', 
    token1: '0xpqr678', 
    liquidity: 7800, 
    age: 1200, 
    timestamp: new Date(Date.now() - 1200000).toISOString(), 
    riskScore: 15,
    quality: 85,
    tokenSymbol: 'BLUE',
    tokenName: 'Blue Token',
    tokenAddress: '0xmno345',
    volume24h: 18900,
    priceChange24h: 12.5
  },
  { 
    id: '0xabc...123', 
    dex: 'Kriya', 
    token0: '0xstu901', 
    token1: '0xvwx234', 
    liquidity: 2200, 
    age: 1800, 
    timestamp: new Date(Date.now() - 1800000).toISOString(), 
    riskScore: 60,
    quality: 40,
    tokenSymbol: 'KRY',
    tokenName: 'Kriya Token',
    tokenAddress: '0xstu901',
    volume24h: 4500,
    priceChange24h: -8.3
  },
];

export default function PoolsPage() {
  // State für Daten
  const [pools, setPools] = useState<Pool[]>(DEMO_POOLS);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Effekt für Socket.io-Verbindung
  useEffect(() => {
    // Abonniere Updates vom Server
    const unsubscribe = subscribeToUpdates(
      (updatedPools) => setPools(updatedPools),
      () => {}, // Wir ignorieren Trade-Updates auf dieser Seite
      () => {}, // Wir ignorieren Wallet-Updates auf dieser Seite
      () => {}  // Wir ignorieren Status-Updates auf dieser Seite
    );

    // Cleanup-Funktion
    return () => {
      unsubscribe();
    };
  }, []);

  const handleSnipePool = (poolId: string) => {
    snipePool(poolId);
    // Hier könnte eine Benachrichtigung angezeigt werden
    console.log(`Snipe für Pool ${poolId} gesendet`);
  };

  return (
    <div className="p-4 md:p-10 mx-auto max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Pools</h1>
      
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Gesamtzahl Pools</div>
            <div className="text-2xl font-bold">{pools.length}</div>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Durchschnittliche Liquidität</div>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'USD'
              }).format(pools.reduce((acc, pool) => acc + pool.liquidity, 0) / pools.length)}
            </div>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Neuester Pool</div>
            <div className="text-2xl font-bold">{pools.length > 0 ? pools[0].dex : '-'}</div>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="text-sm font-medium text-muted-foreground">Pools mit hohem Risiko</div>
            <div className="text-2xl font-bold">{pools.filter(p => p.riskScore > 50).length}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <PoolsTable 
          pools={pools}
          onSnipePool={handleSnipePool}
          onSelectPool={setSelectedPool}
        />
      </div>
    </div>
  );
} 