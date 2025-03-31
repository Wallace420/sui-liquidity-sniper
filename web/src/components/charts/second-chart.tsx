"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  Zap, 
  Settings, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  LineChart,
  CandlestickChart,
  BarChart
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SecondChartProps {
  symbol: string;
  className?: string;
  interval?: "1S" | "5S" | "10S" | "30S" | "1" | "5";
  useRealData?: boolean;
  dataSource?: string;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function SecondChart({ 
  symbol = "BINANCE:BTCUSDT", 
  interval = "1S", 
  className,
  useRealData = false,
  dataSource = "websocket"
}: SecondChartProps) {
  const [chartType, setChartType] = useState<"candles" | "line" | "bars">("candles");
  const [selectedInterval, setSelectedInterval] = useState<string>(interval);
  const [microIndicators, setMicroIndicators] = useState({
    momentum: 0.75, // -1 bis 1
    buyPressure: 0.65, // 0 bis 1
    sellPressure: 0.35, // 0 bis 1
    volatility: 0.45, // 0 bis 1
    lastPrice: 65432.10,
    priceChange: 0.75,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showIndicators, setShowIndicators] = useState(true);
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [lineData, setLineData] = useState<{x: number, y: number}[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  
  // Generiere initiale Chart-Daten
  useEffect(() => {
    generateChartData(selectedInterval);
  }, [selectedInterval]);
  
  // Verbesserte Generierung von Chart-Daten
  const generateChartData = useCallback((intervalType: string) => {
    // Generiere Kerzen-Daten
    const basePrice = 65432.10;
    const volatilityFactor = intervalType === "1S" ? 5 : 
                            intervalType === "5S" ? 10 : 
                            intervalType === "10S" ? 15 : 
                            intervalType === "30S" ? 20 : 
                            intervalType === "1" ? 30 : 50;
    
    const candleCount = 30;
    const now = Date.now();
    const intervalMs = intervalType === "1S" ? 1000 : 
                      intervalType === "5S" ? 5000 : 
                      intervalType === "10S" ? 10000 : 
                      intervalType === "30S" ? 30000 : 
                      intervalType === "1" ? 60000 : 300000;
    
    let lastClose = basePrice;
    const newCandleData: CandleData[] = [];
    const newLineData: {x: number, y: number}[] = [];
    
    for (let i = 0; i < candleCount; i++) {
      const time = now - (candleCount - i) * intervalMs;
      const changePercent = (Math.random() * 2 - 1) * volatilityFactor / 1000;
      const open = lastClose;
      const close = open * (1 + changePercent);
      const high = Math.max(open, close) * (1 + Math.random() * volatilityFactor / 2000);
      const low = Math.min(open, close) * (1 - Math.random() * volatilityFactor / 2000);
      const volume = Math.random() * 10 + 1;
      
      newCandleData.push({
        time,
        open,
        high,
        low,
        close,
        volume
      });
      
      newLineData.push({
        x: time,
        y: close
      });
      
      lastClose = close;
    }
    
    setCandleData(newCandleData);
    setLineData(newLineData);
  }, []);
  
  // WebSocket-Verbindung für Echtdaten
  useEffect(() => {
    if (!useRealData) return;
    
    try {
      // Hier würde die tatsächliche WebSocket-URL stehen
      const wsUrl = `wss://api.example.com/charts/${symbol.replace(':', '/')}/${selectedInterval}`;
      
      const ws = new WebSocket(wsUrl);
      webSocketRef.current = ws;
      
      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        console.log(`WebSocket verbunden: ${wsUrl}`);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.candles)) {
            // Verarbeite eingehende Kerzen-Daten
            const newCandles = data.candles.map((candle: any) => ({
              time: candle.time,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume
            }));
            
            setCandleData(prev => {
              // Behalte nur die neuesten Kerzen
              const combined = [...prev, ...newCandles];
              return combined.slice(-30); // Behalte maximal 30 Kerzen
            });
            
            // Aktualisiere auch Line-Daten
            const newLines = newCandles.map((candle: any) => ({
              x: candle.time,
              y: candle.close
            }));
            
            setLineData(prev => {
              const combined = [...prev, ...newLines];
              return combined.slice(-30);
            });
          }
        } catch (error) {
          console.error("Fehler beim Parsen der WebSocket-Daten:", error);
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket-Fehler:", error);
        setConnectionError("Verbindungsfehler aufgetreten");
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        console.log("WebSocket geschlossen");
        setIsConnected(false);
      };
      
      return () => {
        ws.close();
        webSocketRef.current = null;
      };
    } catch (error) {
      console.error("Fehler beim Einrichten der WebSocket-Verbindung:", error);
      setConnectionError(`Verbindungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }, [symbol, selectedInterval, useRealData]);
  
  // Simuliere Daten-Updates nur, wenn keine Echtdaten verwendet werden
  useEffect(() => {
    if (useRealData) return;
    
    const interval = setInterval(() => {
      // Generiere realistische Änderungen
      const momentumChange = (Math.random() * 2 - 1) * 0.1;
      const buyPressureChange = (Math.random() * 2 - 1) * 0.05;
      const sellPressureChange = (Math.random() * 2 - 1) * 0.05;
      const volatilityChange = (Math.random() * 2 - 1) * 0.03;
      const priceChange = (Math.random() * 2 - 1) * 0.5;
      
      setMicroIndicators(prev => {
        // Berechne neue Werte mit Begrenzungen
        const newMomentum = Math.max(-1, Math.min(1, prev.momentum + momentumChange));
        const newBuyPressure = Math.max(0, Math.min(1, prev.buyPressure + buyPressureChange));
        const newSellPressure = Math.max(0, Math.min(1, prev.sellPressure + sellPressureChange));
        const newVolatility = Math.max(0, Math.min(1, prev.volatility + volatilityChange));
        const newPrice = prev.lastPrice * (1 + priceChange / 100);
        
        return {
          momentum: parseFloat(newMomentum.toFixed(2)),
          buyPressure: parseFloat(newBuyPressure.toFixed(2)),
          sellPressure: parseFloat(newSellPressure.toFixed(2)),
          volatility: parseFloat(newVolatility.toFixed(2)),
          lastPrice: parseFloat(newPrice.toFixed(2)),
          priceChange: parseFloat((prev.priceChange + priceChange / 10).toFixed(2)),
        };
      });
      
      // Aktualisiere Chart-Daten mit einem neuen Candle
      if (candleData.length > 0) {
        const lastCandle = candleData[candleData.length - 1];
        const intervalMs = selectedInterval === "1S" ? 1000 : 
                          selectedInterval === "5S" ? 5000 : 
                          selectedInterval === "10S" ? 10000 : 
                          selectedInterval === "30S" ? 30000 : 
                          selectedInterval === "1" ? 60000 : 300000;
        
        const time = lastCandle.time + intervalMs;
        const changePercent = (Math.random() * 2 - 1) * 0.1;
        const open = lastCandle.close;
        const close = open * (1 + changePercent);
        const high = Math.max(open, close) * (1 + Math.random() * 0.05);
        const low = Math.min(open, close) * (1 - Math.random() * 0.05);
        const volume = Math.random() * 10 + 1;
        
        const newCandle: CandleData = {
          time,
          open,
          high,
          low,
          close,
          volume
        };
        
        setCandleData(prev => {
          const newData = [...prev.slice(1), newCandle];
          return newData;
        });
        
        setLineData(prev => {
          const newData = [...prev.slice(1), { x: time, y: close }];
          return newData;
        });
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [candleData, selectedInterval, useRealData]);
  
  // Optimierte Zeichenfunktion mit WebGL-Beschleunigung
  useEffect(() => {
    if (chartRef.current && (candleData.length > 0 || lineData.length > 0)) {
      const canvas = document.createElement('canvas');
      canvas.width = chartRef.current.clientWidth;
      canvas.height = chartRef.current.clientHeight;
      chartRef.current.innerHTML = '';
      chartRef.current.appendChild(canvas);
      
      // Für diesen Prototyp verwenden wir Canvas 2D
      // WebGL-Implementierung würde in einer separaten Funktion erfolgen
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Berechne min/max für Skalierung
        let min = Infinity;
        let max = -Infinity;
        
        if (chartType === "candles") {
          candleData.forEach(candle => {
            min = Math.min(min, candle.low);
            max = Math.max(max, candle.high);
          });
        } else {
          lineData.forEach(point => {
            min = Math.min(min, point.y);
            max = Math.max(max, point.y);
          });
        }
        
        // Füge etwas Padding hinzu
        const range = max - min;
        min = min - range * 0.05;
        max = max + range * 0.05;
        
        // Zeichne Hintergrund
        ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Zeichne Raster
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
        ctx.lineWidth = 0.5;
        
        // Horizontale Linien
        for (let i = 0; i <= 4; i++) {
          const y = (i / 4) * canvas.height;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
          
          // Preisanzeige
          const price = max - (i / 4) * (max - min);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = '10px sans-serif';
          ctx.fillText(price.toFixed(2), 5, y - 5);
        }
        
        // Vertikale Linien
        for (let i = 0; i <= 6; i++) {
          const x = (i / 6) * canvas.width;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        
        if (chartType === "candles") {
          // Zeichne Kerzen
          const candleWidth = canvas.width / candleData.length * 0.8;
          
          candleData.forEach((candle, i) => {
            const x = (i / (candleData.length - 1)) * canvas.width;
            const openY = canvas.height - ((candle.open - min) / (max - min)) * canvas.height;
            const closeY = canvas.height - ((candle.close - min) / (max - min)) * canvas.height;
            const highY = canvas.height - ((candle.high - min) / (max - min)) * canvas.height;
            const lowY = canvas.height - ((candle.low - min) / (max - min)) * canvas.height;
            
            // Zeichne Docht
            ctx.beginPath();
            ctx.moveTo(x, highY);
            ctx.lineTo(x, lowY);
            ctx.strokeStyle = candle.close >= candle.open ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Zeichne Körper
            ctx.fillStyle = candle.close >= candle.open ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
            const bodyHeight = Math.abs(closeY - openY);
            const bodyY = Math.min(closeY, openY);
            ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
          });
        } else if (chartType === "line") {
          // Zeichne Linie
          ctx.strokeStyle = microIndicators.priceChange >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          lineData.forEach((point, i) => {
            const x = (i / (lineData.length - 1)) * canvas.width;
            const y = canvas.height - ((point.y - min) / (max - min)) * canvas.height;
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          
          ctx.stroke();
          
          // Fülle Bereich unter der Linie
          const lastPoint = lineData[lineData.length - 1];
          const lastX = canvas.width;
          const lastY = canvas.height - ((lastPoint.y - min) / (max - min)) * canvas.height;
          
          ctx.lineTo(lastX, canvas.height);
          ctx.lineTo(0, canvas.height);
          ctx.closePath();
          
          ctx.fillStyle = microIndicators.priceChange >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
          ctx.fill();
        } else if (chartType === "bars") {
          // Zeichne Balken
          const barWidth = canvas.width / candleData.length * 0.6;
          
          candleData.forEach((candle, i) => {
            const x = (i / (candleData.length - 1)) * canvas.width;
            const openY = canvas.height - ((candle.open - min) / (max - min)) * canvas.height;
            const closeY = canvas.height - ((candle.close - min) / (max - min)) * canvas.height;
            const highY = canvas.height - ((candle.high - min) / (max - min)) * canvas.height;
            const lowY = canvas.height - ((candle.low - min) / (max - min)) * canvas.height;
            
            // Zeichne Balken
            ctx.beginPath();
            ctx.moveTo(x, highY);
            ctx.lineTo(x, lowY);
            ctx.strokeStyle = candle.close >= candle.open ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Zeichne Open-Tick
            ctx.beginPath();
            ctx.moveTo(x - barWidth / 2, openY);
            ctx.lineTo(x, openY);
            ctx.stroke();
            
            // Zeichne Close-Tick
            ctx.beginPath();
            ctx.moveTo(x, closeY);
            ctx.lineTo(x + barWidth / 2, closeY);
            ctx.stroke();
          });
        }
      }
    }
  }, [candleData, lineData, chartType, microIndicators.priceChange]);
  
  const getMomentumColor = () => {
    if (microIndicators.momentum > 0.5) return "text-green-500";
    if (microIndicators.momentum < -0.5) return "text-red-500";
    return "text-yellow-500";
  };
  
  const getMomentumIcon = () => {
    if (microIndicators.momentum > 0.3) return <TrendingUp className={`h-5 w-5 ${getMomentumColor()}`} />;
    if (microIndicators.momentum < -0.3) return <TrendingDown className={`h-5 w-5 ${getMomentumColor()}`} />;
    return <BarChart2 className={`h-5 w-5 ${getMomentumColor()}`} />;
  };

  const handleRefresh = () => {
    setIsLoading(true);
    
    // Simuliere API-Aufruf
    setTimeout(() => {
      generateChartData(selectedInterval);
      setIsLoading(false);
    }, 1000);
  };

  const handleIntervalChange = (newInterval: string) => {
    setSelectedInterval(newInterval);
    setShowSettings(false);
    setIsLoading(true);
    
    // Simuliere Datenänderung bei Intervallwechsel
    setTimeout(() => {
      generateChartData(newInterval);
      setIsLoading(false);
    }, 800);
  };

  const getChartTypeIcon = () => {
    switch (chartType) {
      case "candles":
        return <CandlestickChart className="h-4 w-4 mr-2" />;
      case "line":
        return <LineChart className="h-4 w-4 mr-2" />;
      case "bars":
        return <BarChart className="h-4 w-4 mr-2" />;
      default:
        return <CandlestickChart className="h-4 w-4 mr-2" />;
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-sm font-medium">
            {symbol}
          </CardTitle>
          <Badge variant={microIndicators.priceChange >= 0 ? "success" : "destructive"} className="text-xs">
            {microIndicators.priceChange >= 0 ? "+" : ""}{microIndicators.priceChange.toFixed(2)}%
          </Badge>
        </div>
        
        <div className="flex items-center space-x-1">
          {useRealData && (
            <Badge 
              variant={isConnected ? "outline" : "destructive"} 
              className="text-xs mr-2"
            >
              {isConnected ? "Live" : "Offline"}
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-muted rounded-full"
            onClick={() => setShowIndicators(!showIndicators)}
          >
            {showIndicators ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-muted rounded-full"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-muted rounded-full"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      {showIndicators && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
          <div className="flex items-center">
            <div className="flex items-center mr-4">
              {getMomentumIcon()}
              <span className="ml-1 text-sm">Momentum</span>
            </div>
            <div className="flex items-center">
              <Zap className={`h-4 w-4 ${microIndicators.volatility > 0.6 ? "text-orange-500" : "text-blue-500"}`} />
              <span className="ml-1 text-sm">Volatilität: {(microIndicators.volatility * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
              <span className="text-xs">{(microIndicators.buyPressure * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-red-500 mr-1"></div>
              <span className="text-xs">{(microIndicators.sellPressure * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 p-0 flex flex-col">
        {showSettings ? (
          <div className="flex-1 p-4 bg-muted/10">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Chart-Typ</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={chartType === "candles" ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs"
                    onClick={() => setChartType("candles")}
                  >
                    <CandlestickChart className="h-3 w-3 mr-1" />
                    Kerzen
                  </Button>
                  <Button 
                    variant={chartType === "line" ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs"
                    onClick={() => setChartType("line")}
                  >
                    <LineChart className="h-3 w-3 mr-1" />
                    Linie
                  </Button>
                  <Button 
                    variant={chartType === "bars" ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs"
                    onClick={() => setChartType("bars")}
                  >
                    <BarChart className="h-3 w-3 mr-1" />
                    Balken
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Zeitintervall</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={selectedInterval === "1S" ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs"
                    onClick={() => handleIntervalChange("1S")}
                  >
                    1s
                  </Button>
                  <Button 
                    variant={selectedInterval === "5S" ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs"
                    onClick={() => handleIntervalChange("5S")}
                  >
                    5s
                  </Button>
                  <Button 
                    variant={selectedInterval === "10S" ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs"
                    onClick={() => handleIntervalChange("10S")}
                  >
                    10s
                  </Button>
                  <Button 
                    variant={selectedInterval === "30S" ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs"
                    onClick={() => handleIntervalChange("30S")}
                  >
                    30s
                  </Button>
                  <Button 
                    variant={selectedInterval === "1" ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs"
                    onClick={() => handleIntervalChange("1")}
                  >
                    1m
                  </Button>
                  <Button 
                    variant={selectedInterval === "5" ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs"
                    onClick={() => handleIntervalChange("5")}
                  >
                    5m
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Indikatoren</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input type="checkbox" id="volume" className="mr-2" defaultChecked />
                    <label htmlFor="volume" className="text-xs">Volumen anzeigen</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="momentum" className="mr-2" defaultChecked />
                    <label htmlFor="momentum" className="text-xs">Momentum-Indikator</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="pressure" className="mr-2" defaultChecked />
                    <label htmlFor="pressure" className="text-xs">Kauf-/Verkaufsdruck</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative flex flex-col">
            <div className="flex-1 flex items-center justify-center bg-muted/10 relative">
              <div className="w-full h-full p-2">
                <div 
                  ref={chartRef} 
                  className="w-full h-full rounded-md overflow-hidden"
                ></div>
              </div>
              
              {/* Preis-Anzeige */}
              <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-md px-3 py-1.5 border border-border/30">
                <div className="flex flex-col items-end">
                  <span className="text-lg font-medium">
                    ${microIndicators.lastPrice.toFixed(2)}
                  </span>
                  <span className={`text-xs ${microIndicators.priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {microIndicators.priceChange >= 0 ? '+' : ''}{microIndicators.priceChange}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Volumen-Anzeige */}
            <div className="h-16 border-t border-border/30 bg-muted/10 p-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Volumen</span>
                <span className="text-xs">24h: 12,345 BTC</span>
              </div>
              <div className="h-6 bg-muted/20 rounded-sm overflow-hidden relative">
                <div 
                  className="absolute inset-y-0 left-0 bg-green-500/30"
                  style={{ width: `${microIndicators.buyPressure * 100}%` }}
                ></div>
                <div 
                  className="absolute inset-y-0 right-0 bg-red-500/30"
                  style={{ width: `${microIndicators.sellPressure * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {connectionError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="bg-card p-4 rounded-md shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-2">Verbindungsfehler</h3>
            <p className="text-sm text-muted-foreground mb-4">{connectionError}</p>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => {
                // Verbindung neu aufbauen
                setConnectionError(null);
                if (webSocketRef.current) {
                  webSocketRef.current.close();
                  webSocketRef.current = null;
                }
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Neu verbinden
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
} 