import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Pool, formatDuration, formatCurrency, shortenAddress } from '../../lib/socket';
import { RiskAssessment } from './risk-assessment';

// Erweiterte Pool-Schnittstelle für zusätzliche Risikobewertungsfelder
interface ExtendedPool extends Pool {
  honeypotRisk?: number;
  rugPullRisk?: number;
  volatility?: number;
  tokenSymbol?: string;
  tokenName?: string;
  tokenAddress?: string;
  volume24h?: number;
  priceChange24h?: number;
}

interface PoolsTableProps {
  pools: Pool[];
  onSnipePool: (poolId: string) => void;
  onSelectPool?: (pool: Pool) => void;
}

export function PoolsTable({ pools, onSnipePool, onSelectPool }: PoolsTableProps) {
  const [expandedPoolId, setExpandedPoolId] = useState<string | null>(null);
  
  const togglePoolDetails = (poolId: string) => {
    setExpandedPoolId(expandedPoolId === poolId ? null : poolId);
    const pool = pools.find(p => p.id === poolId);
    if (pool && onSelectPool) onSelectPool(pool);
  };
  
  const renderRiskBadge = (riskScore: number) => {
    let color = '';
    let text = '';
    
    if (riskScore < 30) {
      color = 'bg-green-500/20 text-green-500';
      text = 'Niedrig';
    } else if (riskScore < 60) {
      color = 'bg-yellow-500/20 text-yellow-500';
      text = 'Mittel';
    } else {
      color = 'bg-red-500/20 text-red-500';
      text = 'Hoch';
    }
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
        {text} ({riskScore}%)
      </span>
    );
  };
  
  const renderQualityBadge = (quality: number) => {
    let color = '';
    let text = '';
    
    if (quality > 70) {
      color = 'bg-green-500/20 text-green-500';
      text = 'Hoch';
    } else if (quality > 40) {
      color = 'bg-yellow-500/20 text-yellow-500';
      text = 'Mittel';
    } else {
      color = 'bg-red-500/20 text-red-500';
      text = 'Niedrig';
    }
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
        {text} ({quality}%)
      </span>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold leading-none tracking-tight">
          Neueste Pools
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pools.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Keine Pools gefunden.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground text-sm">DEX</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground text-sm">Pool-ID</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground text-sm">Liquidität</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground text-sm">Alter</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground text-sm">Risiko</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground text-sm">Qualität</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground text-sm">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((pool) => (
                  <React.Fragment key={pool.id}>
                    <tr className="border-b border-border hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-3">{pool.dex}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center">
                          <span className="font-mono">{shortenAddress(pool.id)}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-2 h-6 w-6 p-0" 
                            onClick={() => togglePoolDetails(pool.id)}
                          >
                            <span className="sr-only">Details</span>
                            {expandedPoolId === pool.id ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            )}
                          </Button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">{formatCurrency(pool.liquidity)}</td>
                      <td className="py-3 px-3 text-center">{formatDuration(pool.age)}</td>
                      <td className="py-3 px-3 text-center">{renderRiskBadge(pool.riskScore)}</td>
                      <td className="py-3 px-3 text-center">{renderQualityBadge(pool.quality)}</td>
                      <td className="py-3 px-3 text-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => onSnipePool(pool.id)}
                        >
                          Snipe
                        </Button>
                      </td>
                    </tr>
                    {expandedPoolId === pool.id && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <div className="p-4 bg-muted/5 border-b border-border">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <h4 className="font-medium text-sm">Pool-Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Token:</span>
                                    <span>{pool.tokenSymbol || 'Unbekannt'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Token-Adresse:</span>
                                    <span>{shortenAddress(pool.tokenAddress || 'Unbekannt')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">24h-Volumen:</span>
                                    <span>{formatCurrency(pool.volume24h || 0)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">24h-Preisänderung:</span>
                                    <span className={pool.priceChange24h && pool.priceChange24h > 0 ? 'text-green-500' : 'text-red-500'}>
                                      {pool.priceChange24h ? `${pool.priceChange24h > 0 ? '+' : ''}${pool.priceChange24h.toFixed(2)}%` : '0%'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <h4 className="font-medium text-sm">Risikobewertung</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Honeypot-Risiko:</span>
                                    <span>{pool.honeypotRisk ? `${pool.honeypotRisk}%` : 'Unbekannt'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Rug-Pull-Risiko:</span>
                                    <span>{pool.rugPullRisk ? `${pool.rugPullRisk}%` : 'Unbekannt'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Volatilität:</span>
                                    <span>{pool.volatility ? `${pool.volatility}%` : 'Unbekannt'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 