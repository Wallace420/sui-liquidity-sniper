"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Droplet, AlertTriangle, Shield, TrendingUp, RefreshCw, ExternalLink, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface LiquidityPoolTopologyProps {
  poolAddress: string;
  className?: string;
}

interface Token {
  symbol: string;
  percentage: number;
  color: string;
}

interface PoolDataState {
  stability: number; // 0-100
  depth: number; // 0-100
  security: number; // 0-100
  riskFactors: string[];
  loading: boolean;
  error: string | null;
  tokens: Token[];
}

export function LiquidityPoolTopology({ poolAddress, className }: LiquidityPoolTopologyProps) {
  const [poolData, setPoolData] = useState<PoolDataState>({
    stability: 0,
    depth: 0,
    security: 0,
    riskFactors: [],
    loading: true,
    error: null,
    tokens: [
      { symbol: "ETH", percentage: 50, color: "#627EEA" },
      { symbol: "USDT", percentage: 50, color: "#26A17B" }
    ]
  });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const drawTopology = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || poolData.loading) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Stelle sicher, dass Canvas die richtige Größe hat
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    // Setze Canvas-Dimensionen auf CSS-Dimensionen
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    // Lösche vorherige Zeichnung
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Zeichne Topologie
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxRadius = Math.min(centerX, centerY) * 0.8;
    
    // Zeichne Verbindungslinien
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < poolData.tokens.length; i++) {
      for (let j = i + 1; j < poolData.tokens.length; j++) {
        const angle1 = (i / poolData.tokens.length) * Math.PI * 2;
        const angle2 = (j / poolData.tokens.length) * Math.PI * 2;
        
        const x1 = centerX + Math.cos(angle1) * maxRadius;
        const y1 = centerY + Math.sin(angle1) * maxRadius;
        const x2 = centerX + Math.cos(angle2) * maxRadius;
        const y2 = centerY + Math.sin(angle2) * maxRadius;
        
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
    }
    ctx.stroke();
    
    // Zeichne Token-Kreise
    poolData.tokens.forEach((token, i) => {
      const angle = (i / poolData.tokens.length) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * maxRadius;
      const y = centerY + Math.sin(angle) * maxRadius;
      const radius = 20 + (token.percentage / 10);
      
      // Zeichne Kreis
      ctx.beginPath();
      ctx.fillStyle = token.color;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Zeichne Token-Symbol
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(token.symbol, x, y);
    });
    
    // Zeichne Pool im Zentrum
    ctx.beginPath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('POOL', centerX, centerY);
  }, [poolData]);
  
  useEffect(() => {
    // Simuliere API-Aufruf für Pool-Topologie-Daten
    const fetchPoolData = async () => {
      try {
        setPoolData(prev => ({ ...prev, loading: true, error: null }));
        
        // In einer echten Anwendung würdest du hier einen API-Aufruf machen
        // z.B. const response = await fetch(`/api/pool/${poolAddress}/topology`);
        
        // Simulierte Daten
        setTimeout(() => {
          setPoolData({
            stability: 75,
            depth: 60,
            security: 85,
            riskFactors: ["Hohe Konzentration bei Top-Holdern", "Neue Liquidität"],
            loading: false,
            error: null,
            tokens: [
              { symbol: "ETH", percentage: 50, color: "#627EEA" },
              { symbol: "USDT", percentage: 50, color: "#26A17B" }
            ]
          });
        }, 1500);
      } catch (error) {
        console.error("Fehler beim Abrufen der Pool-Topologie-Daten:", error);
        setPoolData(prev => ({ 
          ...prev, 
          loading: false, 
          error: "Fehler beim Laden der Pool-Topologie-Daten. Bitte versuchen Sie es später erneut." 
        }));
      }
    };
    
    if (poolAddress) {
      fetchPoolData();
    }
  }, [poolAddress]);
  
  // Zeichne Topologie, wenn sich Daten ändern oder Komponente neu gerendert wird
  useEffect(() => {
    if (!poolData.loading && !poolData.error) {
      drawTopology();
    }
    
    // Füge Event-Listener für Fenstergrößenänderungen hinzu
    const handleResize = () => {
      drawTopology();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [poolData, drawTopology]);
  
  const getMetricColor = (value: number): string => {
    if (value >= 70) return "text-green-500";
    if (value >= 40) return "text-yellow-500";
    return "text-red-500";
  };
  
  const getMetricIcon = (metric: string, value: number) => {
    if (metric === "stability") {
      return <TrendingUp className={`h-5 w-5 ${getMetricColor(value)}`} />;
    } else if (metric === "depth") {
      return <Droplet className={`h-5 w-5 ${getMetricColor(value)}`} />;
    } else if (metric === "security") {
      return <Shield className={`h-5 w-5 ${getMetricColor(value)}`} />;
    }
    return null;
  };
  
  const handleRefresh = () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    // Simuliere Aktualisierung
    setTimeout(() => {
      setPoolData(prev => ({
        ...prev,
        stability: Math.floor(Math.random() * 100),
        depth: Math.floor(Math.random() * 100),
        security: Math.floor(Math.random() * 100)
      }));
      setIsRefreshing(false);
    }, 1000);
  };
  
  const handleExternalLink = () => {
    window.open(`https://explorer.sui.io/object/${poolAddress}`, '_blank');
  };
  
  const toggleDetails = () => {
    setShowDetails(prev => !prev);
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            <Droplet className="mr-2 h-5 w-5" />
            Liquiditätspool-Topologie
          </CardTitle>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={handleRefresh}
              disabled={isRefreshing || poolData.loading}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={handleExternalLink}
              disabled={poolData.loading}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {poolData.loading ? (
          <div className="flex justify-center items-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : poolData.error ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-red-500">{poolData.error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative h-[200px] w-full">
              <canvas 
                ref={canvasRef} 
                className="w-full h-full"
                aria-label="Liquiditätspool-Topologie Visualisierung"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-2 bg-gray-800 rounded-lg">
                <div className="flex items-center mb-1">
                  {getMetricIcon("stability", poolData.stability)}
                  <span className="ml-1 text-xs">Stabilität</span>
                </div>
                <div className={`text-lg font-bold ${getMetricColor(poolData.stability)}`}>
                  {poolData.stability}%
                </div>
              </div>
              <div className="flex flex-col items-center p-2 bg-gray-800 rounded-lg">
                <div className="flex items-center mb-1">
                  {getMetricIcon("depth", poolData.depth)}
                  <span className="ml-1 text-xs">Tiefe</span>
                </div>
                <div className={`text-lg font-bold ${getMetricColor(poolData.depth)}`}>
                  {poolData.depth}%
                </div>
              </div>
              <div className="flex flex-col items-center p-2 bg-gray-800 rounded-lg">
                <div className="flex items-center mb-1">
                  {getMetricIcon("security", poolData.security)}
                  <span className="ml-1 text-xs">Sicherheit</span>
                </div>
                <div className={`text-lg font-bold ${getMetricColor(poolData.security)}`}>
                  {poolData.security}%
                </div>
              </div>
            </div>
            
            {poolData.riskFactors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                    Risikofaktoren
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                    onClick={toggleDetails}
                  >
                    {showDetails ? "Weniger" : "Mehr"} anzeigen
                  </Button>
                </div>
                <AnimatePresence>
                  {showDetails && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1 overflow-hidden"
                    >
                      {poolData.riskFactors.map((factor, index) => (
                        <div key={index} className="flex items-start">
                          <div className="h-2 w-2 rounded-full bg-yellow-500 mt-1.5 mr-2"></div>
                          <span className="text-xs">{factor}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            <div className="mt-4 text-xs text-muted-foreground flex items-start">
              <Info className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
              <span>
                Diese Visualisierung zeigt die Struktur und Beziehungen des Liquiditätspools.
                Höhere Werte bei Stabilität, Tiefe und Sicherheit deuten auf einen gesünderen Pool hin.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 