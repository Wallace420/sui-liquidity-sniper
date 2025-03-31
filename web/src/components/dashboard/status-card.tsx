"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { SystemStatus } from '../../lib/socket';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';

export interface StatusCardProps {
  status: SystemStatus;
  onTogglePoolHunting: () => void;
  onToggleAutoSnipe: () => void;
  onToggleTrading: () => void;
  className?: string;
}

export function StatusCard({ 
  status, 
  onTogglePoolHunting, 
  onToggleAutoSnipe, 
  onToggleTrading,
  className
}: StatusCardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [formattedUptime, setFormattedUptime] = useState('');
  const [formattedLastUpdate, setFormattedLastUpdate] = useState('');

  useEffect(() => {
    setIsMounted(true);
    
    // Formatiere die Uptime
    const days = Math.floor(status.uptime / 86400);
    const hours = Math.floor((status.uptime % 86400) / 3600);
    const minutes = Math.floor((status.uptime % 3600) / 60);
    
    let uptimeString = '';
    if (days > 0) uptimeString += `${days}d `;
    if (hours > 0 || days > 0) uptimeString += `${hours}h `;
    uptimeString += `${minutes}m`;
    
    setFormattedUptime(uptimeString);
    
    // Formatiere den letzten Update-Zeitpunkt
    const lastUpdate = new Date(status.lastUpdate);
    setFormattedLastUpdate(lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [status]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold leading-none tracking-tight">
          System-Status
          <Badge 
            variant={status.poolHunting && status.trading ? "success" : status.poolHunting || status.trading ? "warning" : "destructive"}
            className="ml-2"
          >
            {status.poolHunting && status.trading 
              ? 'Aktiv' 
              : status.poolHunting || status.trading 
                ? 'Teilweise aktiv' 
                : 'Inaktiv'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="pool-hunting" className="cursor-pointer">Pool Hunting</Label>
              <Switch 
                id="pool-hunting" 
                checked={status.poolHunting} 
                onCheckedChange={onTogglePoolHunting} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-snipe" className="cursor-pointer">Auto-Snipe</Label>
              <Switch 
                id="auto-snipe" 
                checked={status.autoSnipe} 
                onCheckedChange={onToggleAutoSnipe} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="trading" className="cursor-pointer">Trading</Label>
              <Switch 
                id="trading" 
                checked={status.trading} 
                onCheckedChange={onToggleTrading} 
              />
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uptime:</span>
              <span className="font-medium">
                {isMounted ? formattedUptime : '...'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pools gefunden:</span>
              <span className="font-medium">{status.poolsFound}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Letztes Update:</span>
              <span className="font-medium">
                {isMounted ? formattedLastUpdate : '...'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-6">
          <Button 
            variant={status.poolHunting ? "destructive" : "default"} 
            size="sm"
            onClick={onTogglePoolHunting}
          >
            {status.poolHunting ? "Pool-Suche stoppen" : "Pool-Suche starten"}
          </Button>
          <Button 
            variant={status.autoSnipe ? "destructive" : "default"} 
            size="sm"
            onClick={onToggleAutoSnipe}
          >
            {status.autoSnipe ? "Auto-Snipe deaktivieren" : "Auto-Snipe aktivieren"}
          </Button>
          <Button 
            variant={status.trading ? "destructive" : "default"} 
            size="sm"
            onClick={onToggleTrading}
          >
            {status.trading ? "Trading stoppen" : "Trading starten"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 