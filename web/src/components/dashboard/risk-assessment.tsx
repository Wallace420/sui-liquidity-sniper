"use client";

import React, { useState, useEffect } from 'react';
import { Pool } from '../../lib/socket';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';

export interface RiskAssessmentProps {
  pool: Pool | null;
}

export function RiskAssessment({ pool }: RiskAssessmentProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [riskData, setRiskData] = useState({
    riskScore: 0,
    quality: 0,
    honeypotRisk: 0,
    rugPullRisk: 0,
    volatility: 0
  });

  useEffect(() => {
    setIsMounted(true);
    
    if (pool) {
      setRiskData({
        riskScore: pool.riskScore || 0,
        quality: pool.quality || 0,
        honeypotRisk: pool.honeypotRisk || 0,
        rugPullRisk: pool.rugPullRisk || 0,
        volatility: pool.volatility || 0
      });
    }
  }, [pool]);

  const getColorForValue = (value: number, isRisk: boolean = true) => {
    if (isRisk) {
      // Für Risiko: Niedrig (grün) -> Hoch (rot)
      if (value < 30) return 'bg-green-500';
      if (value < 60) return 'bg-yellow-500';
      return 'bg-red-500';
    } else {
      // Für Qualität: Hoch (grün) -> Niedrig (rot)
      if (value > 70) return 'bg-green-500';
      if (value > 40) return 'bg-yellow-500';
      return 'bg-red-500';
    }
  };

  if (!pool) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mb-4">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <p className="text-lg font-medium">Kein Pool ausgewählt</p>
        <p className="text-sm text-muted-foreground mt-1">
          Wählen Sie einen Pool aus der Liste aus, um eine Risikobewertung zu sehen
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Gesamtrisiko</h3>
            <span className={cn(
              "text-sm font-bold",
              riskData.riskScore < 30 ? "text-green-500" : 
              riskData.riskScore < 60 ? "text-yellow-500" : 
              "text-red-500"
            )}>
              {isMounted ? riskData.riskScore : 0}%
            </span>
          </div>
          <Progress 
            value={isMounted ? riskData.riskScore : 0} 
            className="h-2"
            indicatorClassName={getColorForValue(riskData.riskScore)}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Qualität</h3>
            <span className={cn(
              "text-sm font-bold",
              riskData.quality > 70 ? "text-green-500" : 
              riskData.quality > 40 ? "text-yellow-500" : 
              "text-red-500"
            )}>
              {isMounted ? riskData.quality : 0}%
            </span>
          </div>
          <Progress 
            value={isMounted ? riskData.quality : 0} 
            className="h-2"
            indicatorClassName={getColorForValue(riskData.quality, false)}
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Risikofaktoren</h3>
        
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Honeypot-Risiko</span>
              <span className={cn(
                "text-xs font-medium",
                riskData.honeypotRisk < 30 ? "text-green-500" : 
                riskData.honeypotRisk < 60 ? "text-yellow-500" : 
                "text-red-500"
              )}>
                {isMounted ? riskData.honeypotRisk : 0}%
              </span>
            </div>
            <Progress 
              value={isMounted ? riskData.honeypotRisk : 0} 
              className="h-1.5"
              indicatorClassName={getColorForValue(riskData.honeypotRisk)}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Rug-Pull-Risiko</span>
              <span className={cn(
                "text-xs font-medium",
                riskData.rugPullRisk < 30 ? "text-green-500" : 
                riskData.rugPullRisk < 60 ? "text-yellow-500" : 
                "text-red-500"
              )}>
                {isMounted ? riskData.rugPullRisk : 0}%
              </span>
            </div>
            <Progress 
              value={isMounted ? riskData.rugPullRisk : 0} 
              className="h-1.5"
              indicatorClassName={getColorForValue(riskData.rugPullRisk)}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Volatilität</span>
              <span className={cn(
                "text-xs font-medium",
                riskData.volatility < 30 ? "text-green-500" : 
                riskData.volatility < 60 ? "text-yellow-500" : 
                "text-red-500"
              )}>
                {isMounted ? riskData.volatility : 0}%
              </span>
            </div>
            <Progress 
              value={isMounted ? riskData.volatility : 0} 
              className="h-1.5"
              indicatorClassName={getColorForValue(riskData.volatility)}
            />
          </div>
        </div>
      </div>
      
      <div className="pt-4 border-t">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-medium">{pool.tokenSymbol || 'Token'}</h3>
            <p className="text-xs text-muted-foreground">{pool.tokenName || pool.tokenAddress}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {pool.dex}
            </div>
            <div className={cn(
              "text-xs",
              pool.priceChange24h > 0 ? "text-green-500" : 
              pool.priceChange24h < 0 ? "text-red-500" : 
              "text-muted-foreground"
            )}>
              {pool.priceChange24h > 0 ? '+' : ''}{pool.priceChange24h}% (24h)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 