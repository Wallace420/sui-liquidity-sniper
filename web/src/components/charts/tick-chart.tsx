"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Activity, AlertCircle, ArrowUpRight, ArrowDownRight, Info, Settings, RefreshCw, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface TickChartProps {
  symbol: string;
  className?: string;
  useRealData?: boolean;
  dataSource?: string;
}

interface TickData {
  price: number;
  volume: number;
  direction: "up" | "down" | "neutral";
  timestamp?: number;
}

interface ChartPoint {
  x: number;
  y: number;
}

interface TickState {
  lastPrice: number;
  priceChange: number;
  tickVolume: number;
  tickDirection: "up" | "down" | "neutral";
  recentTicks: TickData[];
  error: string | null;
}

export function TickChart({ 
  symbol = "BINANCE:ETHUSDT", 
  className,
  useRealData = false,
  dataSource = "websocket"
}: TickChartProps) {
  const [tickData, setTickData] = useState<TickState>({
    lastPrice: 65432.10,
    priceChange: 0.25,
    tickVolume: 0.12,
    tickDirection: "up",
    recentTicks: [],
    error: null
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1s");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  
  // Generiere initiale Chart-Daten
  useEffect(() => {
    const initialData = Array.from({ length: 100 }, (_, i) => ({
      x: Date.now() - (100 - i) * 100,
      y: 65432 + Math.random() * 10 - 5
    }));
    setChartData(initialData);
    
    // Generiere initiale Tick-Daten
    const initialTicks = Array.from({ length: 5 }, (_, i) => {
      const direction = Math.random() > 0.5 ? "up" as const : "down" as const;
      const basePrice = 65432.10;
      const priceChange = Math.random() * 0.5;
      return {
        price: direction === "up" ? basePrice + priceChange : basePrice - priceChange,
        volume: Math.random() * 0.2,
        direction,
        timestamp: Date.now() - (5 - i) * 100
      };
    });
    
    setTickData(prev => ({
      ...prev,
      recentTicks: initialTicks,
      lastPrice: initialTicks[initialTicks.length - 1].price,
      tickDirection: initialTicks[initialTicks.length - 1].direction
    }));
    
    setIsLoading(false);
  }, []);
  
  // Optimierte Zeichenfunktion mit Double Buffering für bessere Performance
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Stelle sicher, dass Canvas die richtige Größe hat
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Nur die Größe anpassen, wenn sie sich geändert hat
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      
      // Setze Canvas-Dimensionen auf CSS-Dimensionen
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }
    
    // Lösche vorherige Zeichnung
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Finde Min/Max für Y-Achse
    const prices = chartData.map(point => point.y);
    const minPrice = Math.min(...prices) - 0.5;
    const maxPrice = Math.max(...prices) + 0.5;
    const priceRange = maxPrice - minPrice;
    
    // Zeichne Hintergrund-Raster
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Horizontale Linien
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = rect.height - (i / gridLines) * rect.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
      
      // Zeichne Preis-Label
      const price = minPrice + (i / gridLines) * priceRange;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(price.toFixed(2), 5, y);
    }
    
    // Zeichne Chart-Linie
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 2;
    
    const timeRange = chartData[chartData.length - 1].x - chartData[0].x;
    
    chartData.forEach((point, i) => {
      const x = ((point.x - chartData[0].x) / timeRange) * rect.width;
      const y = rect.height - ((point.y - minPrice) / priceRange) * rect.height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Fülle Bereich unter der Linie
    ctx.lineTo(rect.width, rect.height);
    ctx.lineTo(0, rect.width);
    ctx.closePath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.fill();
    
    // Zeichne letzten Punkt
    const lastPoint = chartData[chartData.length - 1];
    const lastX = rect.width;
    const lastY = rect.height - ((lastPoint.y - minPrice) / priceRange) * rect.height;
    
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = tickData.tickDirection === "up" ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)';
    ctx.fill();
    
    // Zeichne aktuelle Preis-Linie
    ctx.beginPath();
    ctx.strokeStyle = tickData.tickDirection === "up" ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
    ctx.setLineDash([5, 3]);
    ctx.moveTo(0, lastY);
    ctx.lineTo(rect.width, lastY);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [chartData, tickData.tickDirection]);
  
  // WebSocket-Verbindung für Echtdaten
  useEffect(() => {
    if (!useRealData) return;
    
    try {
      // Hier würde die tatsächliche WebSocket-URL stehen
      const wsUrl = `wss://api.example.com/ticks/${symbol.replace(':', '/')}`;
      
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
          if (data && data.price && data.volume) {
            // Verarbeite eingehenden Tick
            const direction = data.price > tickData.lastPrice ? "up" as const : 
                             data.price < tickData.lastPrice ? "down" as const : 
                             "neutral" as const;
            
            const newTick: TickData = {
              price: data.price,
              volume: data.volume,
              direction,
              timestamp: Date.now()
            };
            
            // Aktualisiere Tick-Daten
            setTickData(prev => {
              const updatedTicks = [...prev.recentTicks, newTick].slice(-20);
              return {
                lastPrice: data.price,
                priceChange: parseFloat((((data.price - prev.lastPrice) / prev.lastPrice) * 100).toFixed(3)),
                tickVolume: data.volume,
                tickDirection: direction,
                recentTicks: updatedTicks,
                error: null
              };
            });
            
            // Aktualisiere Chart-Daten
            setChartData(prev => {
              const now = Date.now();
              const newData = [...prev, { x: now, y: data.price }];
              
              // Entferne alte Datenpunkte basierend auf dem ausgewählten Zeitfenster
              const timeWindow = selectedTimeframe === "1s" ? 10000 : 
                               selectedTimeframe === "5s" ? 50000 : 
                               selectedTimeframe === "15s" ? 150000 : 300000;
              
              return newData.filter(point => now - point.x < timeWindow);
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
  }, [symbol, useRealData, tickData.lastPrice]);
  
  // Simuliere Tick-Updates nur, wenn keine Echtdaten verwendet werden
  useEffect(() => {
    if (useRealData) return;
    
    const interval = setInterval(() => {
      // Generiere neuen Tick
      const lastPrice = tickData.lastPrice;
      const priceChange = (Math.random() * 0.5) - 0.25;
      const newPrice = lastPrice + priceChange;
      const direction = priceChange > 0 ? "up" as const : priceChange < 0 ? "down" as const : "neutral" as const;
      const volume = Math.random() * 0.2;
      
      // Aktualisiere Tick-Daten
      const newTick: TickData = {
        price: newPrice,
        volume,
        direction,
        timestamp: Date.now()
      };
      
      setTickData(prev => {
        const updatedTicks = [...prev.recentTicks, newTick].slice(-20);
        return {
          lastPrice: newPrice,
          priceChange: parseFloat((((newPrice - prev.lastPrice) / prev.lastPrice) * 100).toFixed(3)),
          tickVolume: volume,
          tickDirection: direction,
          recentTicks: updatedTicks,
          error: null
        };
      });
      
      // Aktualisiere Chart-Daten
      setChartData(prev => {
        const now = Date.now();
        const newData = [...prev, { x: now, y: newPrice }];
        
        // Entferne alte Datenpunkte, um die Performance zu verbessern
        const timeWindow = selectedTimeframe === "1s" ? 10000 : 
                          selectedTimeframe === "5s" ? 50000 : 
                          selectedTimeframe === "15s" ? 150000 : 300000;
        
        return newData.filter(point => now - point.x < timeWindow);
      });
    }, 100); // Aktualisiere alle 100ms für eine flüssige Animation
    
    return () => clearInterval(interval);
  }, [tickData.lastPrice, selectedTimeframe, useRealData]);
  
  // Zeichne Chart, wenn sich Daten ändern
  useEffect(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    
    animationFrameId.current = requestAnimationFrame(() => {
      drawChart();
    });
    
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [chartData, drawChart]);
  
  // Reagiere auf Fenstergrößenänderungen
  useEffect(() => {
    const handleResize = () => {
      drawChart();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [drawChart]);
  
  const handleRefresh = () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    // Simuliere Daten-Aktualisierung
    setTimeout(() => {
      const initialData = Array.from({ length: 100 }, (_, i) => ({
        x: Date.now() - (100 - i) * 100,
        y: 65432 + Math.random() * 10 - 5
      }));
      setChartData(initialData);
      
      const direction = Math.random() > 0.5 ? "up" as const : "down" as const;
      const newPrice = 65432 + (Math.random() * 10 - 5);
      
      setTickData({
        lastPrice: newPrice,
        priceChange: parseFloat((Math.random() * 0.5 - 0.25).toFixed(3)),
        tickVolume: Math.random() * 0.2,
        tickDirection: direction,
        recentTicks: Array.from({ length: 5 }, () => ({
          price: newPrice + (Math.random() * 0.5 - 0.25),
          volume: Math.random() * 0.2,
          direction: Math.random() > 0.5 ? "up" as const : "down" as const
        })),
        error: null
      });
      
      setIsLoading(false);
    }, 1000);
  };
  
  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    
    // Passe Chart-Daten an neuen Zeitrahmen an
    const now = Date.now();
    const timeWindow = timeframe === "1s" ? 10000 : 
                      timeframe === "5s" ? 50000 : 
                      timeframe === "15s" ? 150000 : 300000;
    
    setChartData(prev => prev.filter(point => now - point.x < timeWindow));
  };
  
  const getDirectionIcon = (direction: "up" | "down" | "neutral") => {
    if (direction === "up") {
      return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    } else if (direction === "down") {
      return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    }
    return null;
  };
  
  const getDirectionColor = (direction: "up" | "down" | "neutral") => {
    if (direction === "up") return "text-green-500";
    if (direction === "down") return "text-red-500";
    return "text-gray-500";
  };
  
  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };
  
  const formatVolume = (volume: number) => {
    return volume.toFixed(3);
  };
  
  const formatPriceChange = (change: number) => {
    return change > 0 ? `+${change.toFixed(3)}%` : `${change.toFixed(3)}%`;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-sm font-medium">
            {symbol}
          </CardTitle>
          <Badge variant={tickData.priceChange >= 0 ? "success" : "destructive"} className="text-xs">
            {tickData.priceChange >= 0 ? "+" : ""}{tickData.priceChange.toFixed(2)}%
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
            className="h-8 w-8" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : tickData.error ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-red-500">{tickData.error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className={`text-2xl font-bold ${getDirectionColor(tickData.tickDirection)}`}>
                  {formatPrice(tickData.lastPrice)}
                </span>
                <div className="ml-2 flex items-center">
                  {getDirectionIcon(tickData.tickDirection)}
                  <span className={`text-sm ${getDirectionColor(tickData.tickDirection)}`}>
                    {formatPriceChange(tickData.priceChange)}
                  </span>
                </div>
              </div>
              <div className="flex space-x-1">
                {["1s", "5s", "15s", "30s"].map((timeframe) => (
                  <Button
                    key={timeframe}
                    variant={selectedTimeframe === timeframe ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleTimeframeChange(timeframe)}
                  >
                    {timeframe}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="relative h-[200px] w-full">
              <canvas 
                ref={canvasRef} 
                className="w-full h-full"
                aria-label="Tick-Chart Visualisierung"
              />
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Letzte Ticks</h4>
              <div className="max-h-[120px] overflow-y-auto pr-1">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left pb-2">Preis</th>
                      <th className="text-right pb-2">Volumen</th>
                      <th className="text-right pb-2">Richtung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickData.recentTicks.slice().reverse().map((tick, index) => (
                      <tr key={index} className="border-t border-gray-800">
                        <td className="py-1">{formatPrice(tick.price)}</td>
                        <td className="text-right py-1">{formatVolume(tick.volume)}</td>
                        <td className="text-right py-1">
                          <span className={`inline-flex items-center ${getDirectionColor(tick.direction)}`}>
                            {getDirectionIcon(tick.direction)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {showSettings && (
              <div className="p-3 bg-gray-800 rounded-lg space-y-2">
                <h4 className="text-sm font-medium">Einstellungen</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    Daten exportieren
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    Ansicht anpassen
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
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