"use client";

import React, { useState, useEffect, useRef } from 'react';
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
import { Badge } from '../ui/badge';
import { LineChart, AreaChart } from '../ui/charts';
import { motion, AnimatePresence } from 'framer-motion';
import { SecondChart } from "@/components/charts/second-chart";
import { TickChart } from "@/components/charts/tick-chart";
import { LiquidityPoolTopology } from "@/components/liquidity-pool-topology";
import { TokenHolderVisualization } from "@/components/token-holder-visualization";

// Neue Komponente für Live-Aktivitätsanzeige
const LiveActivityFeed = ({ pools, trades }: { pools: Pool[], trades: Trade[] }) => {
  const [activities, setActivities] = useState<Array<{
    id: string;
    type: 'pool' | 'trade';
    timestamp: Date;
    message: string;
    data: any;
  }>>([]);

  useEffect(() => {
    // Kombiniere Pools und Trades zu einer Aktivitätsliste
    const poolActivities = pools.slice(0, 5).map(pool => ({
      id: pool.id,
      type: 'pool' as const,
      timestamp: new Date(pool.timestamp),
      message: `Neuer ${pool.dex} Pool gefunden: ${pool.tokenSymbol || 'Unbekannter Token'}`,
      data: pool
    }));

    const tradeActivities = trades.slice(0, 5).map(trade => ({
      id: trade.id,
      type: 'trade' as const,
      timestamp: new Date(trade.timestamp),
      message: `${trade.status === 'completed' ? 'Handel abgeschlossen' : 'Neuer Handel'}: ${trade.token}`,
      data: trade
    }));

    // Kombiniere und sortiere nach Zeitstempel (neueste zuerst)
    const combined = [...poolActivities, ...tradeActivities]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    setActivities(combined);
  }, [pools, trades]);

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
      <AnimatePresence>
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="flex items-center p-2 rounded-md bg-background border border-border"
          >
            <div className={`w-2 h-2 rounded-full mr-3 ${activity.type === 'pool' ? 'bg-blue-500' : 'bg-green-500'}`} />
            <div className="flex-1">
              <p className="text-sm">{activity.message}</p>
              <p className="text-xs text-muted-foreground">
                {activity.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <Badge variant={activity.type === 'pool' ? 'default' : 'success'}>
              {activity.type === 'pool' ? 'Pool' : 'Trade'}
            </Badge>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Neue Komponente für Marktübersicht
const MarketOverview = ({ pools }: { pools: Pool[] }) => {
  // Berechne Markttrends basierend auf den Pools
  const totalLiquidity = pools.reduce((sum, pool) => sum + (pool.liquidity || 0), 0);
  const avgRisk = pools.length > 0 
    ? pools.reduce((sum, pool) => sum + pool.riskScore, 0) / pools.length 
    : 0;
  const positiveChange = pools.filter(p => (p.priceChange24h || 0) > 0).length;
  const negativeChange = pools.filter(p => (p.priceChange24h || 0) < 0).length;
  const marketSentiment = positiveChange > negativeChange ? 'Bullish' : 'Bearish';
  
  // Daten für das Chart
  const chartData = [
    { name: 'Bullish', value: positiveChange },
    { name: 'Bearish', value: negativeChange },
    { name: 'Neutral', value: pools.length - positiveChange - negativeChange }
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold leading-none tracking-tight">
          Marktübersicht
          <Badge 
            variant={marketSentiment === 'Bullish' ? 'success' : 'destructive'}
            className="ml-2"
          >
            {marketSentiment}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Gesamtliquidität</p>
            <p className="text-2xl font-bold">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'USD' }).format(totalLiquidity)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Durchschn. Risiko</p>
            <p className="text-2xl font-bold">{avgRisk.toFixed(1)}%</p>
          </div>
        </div>
        
        <div className="h-[150px]">
          {pools.length > 0 && (
            <AreaChart
              data={chartData}
              index="name"
              categories={["value"]}
              colors={["green", "red", "blue"]}
              valueFormatter={(value) => `${value} Pools`}
              showLegend={false}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Neue Komponente für Echtzeit-Benachrichtigungen
const RealTimeAlerts = ({ selectedPool }: { selectedPool: Pool | null }) => {
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    timestamp: Date;
  }>>([]);

  useEffect(() => {
    if (selectedPool) {
      // Simuliere Echtzeit-Benachrichtigungen basierend auf Pool-Daten
      if (selectedPool.riskScore > 70) {
        setAlerts(prev => [
          {
            id: `risk-${Date.now()}`,
            message: `Hohes Risiko bei ${selectedPool.tokenSymbol || 'Pool'} erkannt (${selectedPool.riskScore}%)`,
            type: 'error',
            timestamp: new Date()
          },
          ...prev
        ]);
      }
      
      if (selectedPool.liquidity > 10000) {
        setAlerts(prev => [
          {
            id: `liquidity-${Date.now()}`,
            message: `Hohe Liquidität bei ${selectedPool.tokenSymbol || 'Pool'} erkannt`,
            type: 'success',
            timestamp: new Date()
          },
          ...prev
        ]);
      }
    }
  }, [selectedPool]);

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
      {alerts.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          Keine Benachrichtigungen
        </div>
      ) : (
        <AnimatePresence>
          {alerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-3 rounded-md border ${
                alert.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                alert.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                'bg-blue-500/10 border-blue-500/20 text-blue-500'
              }`}
            >
              <div className="flex justify-between">
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs opacity-70">{alert.timestamp.toLocaleTimeString()}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};

interface EnhancedDashboardProps {
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
}

export function EnhancedDashboard({
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
  onMarkAsRead
}: EnhancedDashboardProps) {
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Funktion zum Scrollen zu einem bestimmten Abschnitt
  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePoolSelect = (pool: Pool) => {
    setSelectedPool(pool);
  };

  return (
    <div ref={dashboardRef} className="space-y-6">
      {/* Schnellzugriff-Navigation */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-2 -mx-2 rounded-lg border border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => scrollToSection('status')}
            className="text-xs"
          >
            Status
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => scrollToSection('pools')}
            className="text-xs"
          >
            Pools
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => scrollToSection('trades')}
            className="text-xs"
          >
            Trades
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => scrollToSection('wallets')}
            className="text-xs"
          >
            Wallets
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={status.poolHunting ? "success" : "outline"}>
            Pool Hunting: {status.poolHunting ? "An" : "Aus"}
          </Badge>
          <Badge variant={status.trading ? "success" : "outline"}>
            Trading: {status.trading ? "An" : "Aus"}
          </Badge>
        </div>
      </div>

      {/* Hauptbereich mit Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="analytics">Analyse</TabsTrigger>
          <TabsTrigger value="activity">Aktivität</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Status und Statistiken */}
          <div id="status" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusCard 
              status={status} 
              onTogglePoolHunting={onTogglePoolHunting}
              onToggleAutoSnipe={onToggleAutoSnipe}
              onToggleTrading={onToggleTrading}
              className="md:col-span-2"
            />
            <StatsCard stats={stats} />
          </div>
          
          {/* Pools und Risikobewertung */}
          <div id="pools" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <PoolsTable 
                pools={pools} 
                onSnipePool={onSnipePool} 
                onSelectPool={handlePoolSelect}
              />
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-semibold leading-none tracking-tight">
                  Risikobewertung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RiskAssessment pool={selectedPool} />
              </CardContent>
            </Card>
          </div>
          
          {/* Trades und Wallets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div id="trades" className="md:col-span-2">
              <TradesTable trades={trades} onSellToken={onSellToken} />
            </div>
            <div id="wallets">
              <WalletsCard wallets={wallets} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MarketOverview pools={pools} />
            
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-semibold leading-none tracking-tight">
                  Echtzeit-Benachrichtigungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RealTimeAlerts selectedPool={selectedPool} />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-semibold leading-none tracking-tight">
                Erweiterte Risikometriken
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPool ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 p-4 rounded-lg bg-muted/30">
                      <h3 className="font-medium">Honeypot-Analyse</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedPool.honeypotRisk && selectedPool.honeypotRisk > 50 
                          ? "Hohe Wahrscheinlichkeit eines Honeypots. Vorsicht geboten!" 
                          : "Keine Anzeichen für einen Honeypot erkannt."}
                      </p>
                      <div className="mt-2 flex items-center">
                        <span className="text-sm font-medium mr-2">Risiko:</span>
                        <span className={`text-sm font-bold ${
                          (selectedPool.honeypotRisk || 0) > 50 ? "text-red-500" : "text-green-500"
                        }`}>
                          {selectedPool.honeypotRisk || 0}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 p-4 rounded-lg bg-muted/30">
                      <h3 className="font-medium">Rug-Pull-Analyse</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedPool.rugPullRisk && selectedPool.rugPullRisk > 50 
                          ? "Erhöhtes Rug-Pull-Risiko. Vorsicht bei Investitionen!" 
                          : "Niedriges Rug-Pull-Risiko erkannt."}
                      </p>
                      <div className="mt-2 flex items-center">
                        <span className="text-sm font-medium mr-2">Risiko:</span>
                        <span className={`text-sm font-bold ${
                          (selectedPool.rugPullRisk || 0) > 50 ? "text-red-500" : "text-green-500"
                        }`}>
                          {selectedPool.rugPullRisk || 0}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 p-4 rounded-lg bg-muted/30">
                      <h3 className="font-medium">Volatilitätsanalyse</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedPool.volatility && selectedPool.volatility > 50 
                          ? "Hohe Volatilität. Erhöhtes Risiko und Chancen." 
                          : "Moderate Volatilität. Stabilere Preisentwicklung."}
                      </p>
                      <div className="mt-2 flex items-center">
                        <span className="text-sm font-medium mr-2">Volatilität:</span>
                        <span className={`text-sm font-bold ${
                          (selectedPool.volatility || 0) > 50 ? "text-yellow-500" : "text-green-500"
                        }`}>
                          {selectedPool.volatility || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-muted/30">
                    <h3 className="font-medium mb-2">Handlungsempfehlung</h3>
                    <p className="text-sm">
                      {selectedPool.riskScore > 70 
                        ? "Hohes Risiko: Nicht empfohlen für Investitionen." 
                        : selectedPool.riskScore > 40 
                          ? "Mittleres Risiko: Mit Vorsicht handeln und kleine Position wählen." 
                          : "Niedriges Risiko: Geeignet für Investitionen mit angemessener Position."}
                    </p>
                    
                    <div className="mt-4 flex space-x-2">
                      <Button 
                        variant={selectedPool.riskScore > 70 ? "destructive" : "default"}
                        size="sm"
                        onClick={() => onSnipePool(selectedPool.id)}
                      >
                        {selectedPool.riskScore > 70 ? "Riskant Snipen" : "Snipen"}
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                      >
                        Zur Watchlist hinzufügen
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Wählen Sie einen Pool aus, um detaillierte Risikometriken zu sehen
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-semibold leading-none tracking-tight">
                  Live-Aktivitäten
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LiveActivityFeed pools={pools} trades={trades} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-semibold leading-none tracking-tight">
                  Benachrichtigungen
                </CardTitle>
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
        </TabsContent>
      </Tabs>

      {/* Füge die Token-Holder-Visualisierung hinzu */}
      <div className="col-span-3 space-y-4">
        <TokenHolderVisualization tokenAddress="0x1234567890abcdef1234567890abcdef12345678" />
      </div>

      {/* Ersetze den vorhandenen Chart-Bereich im Dashboard */}
      <div className="col-span-6 space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <SecondChart symbol="BINANCE:BTCUSDT" interval="1S" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TickChart symbol="BINANCE:BTCUSDT" />
          <LiquidityPoolTopology poolAddress="0x1234567890abcdef1234567890abcdef12345678" />
        </div>
      </div>
    </div>
  );
} 