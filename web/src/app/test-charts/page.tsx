"use client";

import React, { useState } from "react";
import { SecondChart } from "@/components/charts/second-chart";
import { TickChart } from "@/components/charts/tick-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TestChartsPage() {
  const [useRealData, setUseRealData] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("BINANCE:BTCUSDT");
  const [selectedInterval, setSelectedInterval] = useState<"1S" | "5S" | "10S" | "30S" | "1" | "5">("1S");
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Chart-Komponenten Testseite</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Einstellungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-2">
              <Switch 
                id="use-real-data" 
                checked={useRealData} 
                onCheckedChange={setUseRealData} 
              />
              <Label htmlFor="use-real-data">Echtdaten verwenden</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger id="symbol">
                  <SelectValue placeholder="Symbol auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BINANCE:BTCUSDT">BINANCE:BTCUSDT</SelectItem>
                  <SelectItem value="BINANCE:ETHUSDT">BINANCE:ETHUSDT</SelectItem>
                  <SelectItem value="BINANCE:SOLUSDT">BINANCE:SOLUSDT</SelectItem>
                  <SelectItem value="BINANCE:SUIUSDT">BINANCE:SUIUSDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="interval">Intervall</Label>
              <Select 
                value={selectedInterval} 
                onValueChange={(value) => setSelectedInterval(value as any)}
              >
                <SelectTrigger id="interval">
                  <SelectValue placeholder="Intervall auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1S">1 Sekunde</SelectItem>
                  <SelectItem value="5S">5 Sekunden</SelectItem>
                  <SelectItem value="10S">10 Sekunden</SelectItem>
                  <SelectItem value="30S">30 Sekunden</SelectItem>
                  <SelectItem value="1">1 Minute</SelectItem>
                  <SelectItem value="5">5 Minuten</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Sekunden-Chart</h2>
          <div className="h-[500px]">
            <SecondChart 
              symbol={selectedSymbol} 
              interval={selectedInterval} 
              useRealData={useRealData}
            />
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Tick-Chart</h2>
          <div className="h-[500px]">
            <TickChart 
              symbol={selectedSymbol}
              useRealData={useRealData}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 