import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { formatCurrency, formatNumber } from '../../lib/utils';

export interface Stats {
  totalPools: number;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
  averageProfit: number;
  highestProfit: number;
  totalVolume: number;
}

interface StatsCardProps {
  stats: Stats;
}

export function StatsCard({ stats }: StatsCardProps) {
  const successRate = stats.totalTrades > 0 
    ? (stats.successfulTrades / stats.totalTrades) * 100 
    : 0;
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold leading-none tracking-tight">
          Statistiken
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Gefundene Pools */}
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="text-sm font-medium text-muted-foreground">Gefundene Pools</div>
            <div className="text-xl font-bold mt-1">{formatNumber(stats.totalPools)}</div>
          </div>
          
          {/* Trades */}
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="text-sm font-medium text-muted-foreground">Trades</div>
            <div className="text-xl font-bold mt-1">{formatNumber(stats.totalTrades)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.successfulTrades} erfolgreich / {stats.failedTrades} fehlgeschlagen
            </div>
          </div>
          
          {/* Erfolgsrate */}
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="text-sm font-medium text-muted-foreground">Erfolgsrate</div>
            <div className="text-xl font-bold mt-1">{successRate.toFixed(1)}%</div>
          </div>
          
          {/* Gesamtvolumen */}
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="text-sm font-medium text-muted-foreground">Gesamtvolumen</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(stats.totalVolume)}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {/* Gesamtgewinn */}
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="text-sm font-medium text-muted-foreground">Gesamtgewinn</div>
            <div className={`text-xl font-bold mt-1 ${stats.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(stats.totalProfit)}
            </div>
          </div>
          
          {/* Durchschnittlicher Gewinn */}
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="text-sm font-medium text-muted-foreground">Durchschn. Gewinn</div>
            <div className={`text-xl font-bold mt-1 ${stats.averageProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.averageProfit.toFixed(2)}%
            </div>
          </div>
          
          {/* Höchster Gewinn */}
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="text-sm font-medium text-muted-foreground">Höchster Gewinn</div>
            <div className="text-xl font-bold mt-1 text-green-500">
              {stats.highestProfit.toFixed(2)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 