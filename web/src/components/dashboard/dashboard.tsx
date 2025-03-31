"use client";

import React from 'react';
import { PoolsTable } from './pools-table';
import { TradesTable } from './trades-table';
import { WalletsCard } from './wallets-card';
import { Notifications } from './notifications';
import { StatsCard } from './stats-card';
import { StatusCard } from './status-card';
import { RiskAssessment } from './risk-assessment';
import { Pool, Trade, Wallet, SystemStatus } from '../../lib/socket';
import { Notification } from './notifications';
import { Stats } from './stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';

interface DashboardProps {
  pools: Pool[];
  trades: Trade[];
  wallets: Wallet[];
  notifications: Notification[];
  stats: Stats;
  status: SystemStatus;
  onTogglePoolHunting: () => void;
  onToggleAutoSnipe: () => void;
  onToggleTrading: () => void;
  onSnipePool: (poolId: string) => void;
  onSellToken: (tradeId: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onMarkAsRead: (id: string) => void;
  onSelectPool: (pool: Pool) => void;
}

export function Dashboard({
  pools,
  trades,
  wallets,
  notifications,
  stats,
  status,
  onTogglePoolHunting,
  onToggleAutoSnipe,
  onToggleTrading,
  onSnipePool,
  onSellToken,
  onMarkAllAsRead,
  onClearAll,
  onMarkAsRead,
  onSelectPool
}: DashboardProps) {
  const [selectedPool, setSelectedPool] = React.useState<Pool | null>(null);

  const handlePoolSelect = (pool: Pool) => {
    setSelectedPool(pool);
    onSelectPool(pool);
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Überwachen und verwalten Sie Ihre Liquidity Sniper Aktivitäten
          </p>
        </div>
        
        <StatusCard 
          status={status} 
          onTogglePoolHunting={onTogglePoolHunting}
          onToggleAutoSnipe={onToggleAutoSnipe}
          onToggleTrading={onToggleTrading}
          className="w-full md:w-auto"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard stats={stats} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Pools & Trades */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="pools" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="pools">Pools</TabsTrigger>
                <TabsTrigger value="trades">Trades</TabsTrigger>
              </TabsList>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onTogglePoolHunting()}
                >
                  {status.poolHunting ? 'Hunting pausieren' : 'Hunting starten'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onToggleAutoSnipe()}
                >
                  {status.autoSnipe ? 'Auto-Snipe aus' : 'Auto-Snipe an'}
                </Button>
              </div>
            </div>
            
            <TabsContent value="pools" className="mt-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Verfügbare Pools</CardTitle>
                </CardHeader>
                <CardContent>
                  <PoolsTable 
                    pools={pools} 
                    onSnipePool={onSnipePool} 
                    onSelectPool={handlePoolSelect}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="trades" className="mt-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Ihre Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <TradesTable 
                    trades={trades} 
                    onSellToken={onSellToken} 
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Risk Assessment */}
          {selectedPool && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Risikobewertung</CardTitle>
              </CardHeader>
              <CardContent>
                <RiskAssessment pool={selectedPool} />
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Right Column - Wallets & Notifications */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Wallets</CardTitle>
            </CardHeader>
            <CardContent>
              <WalletsCard wallets={wallets} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Benachrichtigungen</CardTitle>
            </CardHeader>
            <CardContent>
              <Notifications 
                notifications={notifications}
                onMarkAllAsRead={onMarkAllAsRead}
                onClearAll={onClearAll}
                onMarkAsRead={onMarkAsRead}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <Button size="icon" className="rounded-full h-12 w-12 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14"></path>
            <path d="M5 12h14"></path>
          </svg>
          <span className="sr-only">Neuer Trade</span>
        </Button>
        <Button size="icon" variant="outline" className="rounded-full h-12 w-12 shadow-lg bg-background">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12"></path>
            <path d="m8 11 4 4 4-4"></path>
            <path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"></path>
          </svg>
          <span className="sr-only">Einstellungen</span>
        </Button>
      </div>
    </div>
  );
} 