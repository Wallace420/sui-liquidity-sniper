"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, Flame, Shield, ExternalLink, Info } from "lucide-react";

interface Pool {
  id: string;
  dex: string;
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  liquidity: number;
  age: number;
  riskScore: number;
  quality: number;
}

interface PoolDetectionProps {
  className?: string;
}

export const PoolDetection: React.FC<PoolDetectionProps> = ({ className }) => {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);

  useEffect(() => {
    // Simuliere API-Aufruf
    const fetchPools = async () => {
      setLoading(true);
      
      // Simulierte Verzögerung
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Demo-Daten
      const demoPools: Pool[] = [
        { 
          id: '0x123...abc', 
          dex: 'Turbos', 
          tokenSymbol: 'DEMO',
          tokenName: 'Demo Token',
          tokenAddress: '0xabc123',
          liquidity: 5000, 
          age: 300, 
          riskScore: 25,
          quality: 75,
        },
        { 
          id: '0x456...def', 
          dex: 'Cetus', 
          tokenSymbol: 'TEST',
          tokenName: 'Test Token',
          tokenAddress: '0xghi789',
          liquidity: 12000, 
          age: 120, 
          riskScore: 45,
          quality: 55,
        },
        { 
          id: '0x789...ghi', 
          dex: 'BlueMove', 
          tokenSymbol: 'SAMPLE',
          tokenName: 'Sample Token',
          tokenAddress: '0xmno345',
          liquidity: 8000, 
          age: 45, 
          riskScore: 65,
          quality: 35,
        }
      ];
      
      setPools(demoPools);
      setLoading(false);
    };
    
    fetchPools();
    
    // Simuliere regelmäßige Updates
    const interval = setInterval(() => {
      // Zufällig einen neuen Pool hinzufügen
      if (Math.random() > 0.7) {
        const newPool: Pool = {
          id: `0x${Math.random().toString(16).substring(2, 10)}`, 
          dex: ['Turbos', 'Cetus', 'BlueMove'][Math.floor(Math.random() * 3)], 
          tokenSymbol: `TKN${Math.floor(Math.random() * 1000)}`,
          tokenName: `Token ${Math.floor(Math.random() * 1000)}`,
          tokenAddress: `0x${Math.random().toString(16).substring(2, 10)}`,
          liquidity: Math.floor(Math.random() * 20000) + 1000, 
          age: Math.floor(Math.random() * 300), 
          riskScore: Math.floor(Math.random() * 100),
          quality: Math.floor(Math.random() * 100),
        };
        
        setPools(prev => [newPool, ...prev.slice(0, 4)]);
      }
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (score: number) => {
    if (score < 30) return "text-green-500";
    if (score < 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getQualityColor = (score: number) => {
    if (score > 70) return "text-green-500";
    if (score > 40) return "text-yellow-500";
    return "text-red-500";
  };

  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSnipe = (pool: Pool) => {
    console.log(`Sniping pool: ${pool.tokenSymbol}`);
    // Hier würde die Snipe-Logik implementiert werden
  };

  const handlePoolSelect = (poolId: string) => {
    setSelectedPool(selectedPool === poolId ? null : poolId);
  };

  return (
    <div className={`${className} h-full flex flex-col`}>
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-sm text-muted-foreground">Suche nach neuen Liquiditätspools...</p>
          </div>
        ) : (
          <div className="space-y-0 overflow-y-auto h-full">
            <AnimatePresence>
              {pools.map((pool, index) => (
                <motion.div
                  key={pool.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`border-b border-border/30 p-4 relative hover:bg-muted/30 transition-colors cursor-pointer ${selectedPool === pool.id ? 'bg-muted/50' : ''}`}
                  onClick={() => handlePoolSelect(pool.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium flex items-center">
                        {pool.tokenSymbol}
                        <Badge variant="outline" className="ml-2 text-xs bg-blue-500/10 border-blue-500/30 text-blue-400">
                          {pool.dex}
                        </Badge>
                        {index === 0 && (
                          <Badge className="ml-2 text-xs bg-orange-500 text-white">
                            Neu
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center">
                        <span className="truncate max-w-[150px]">{pool.tokenName}</span>
                        <span className="mx-1">•</span>
                        <span className="truncate max-w-[100px]">{pool.tokenAddress}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 ml-1 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://suiscan.xyz/mainnet/object/${pool.tokenAddress}`, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-xs flex flex-col items-end">
                        <span className="font-medium text-muted-foreground">Liquidität</span>
                        <span className="font-medium">${pool.liquidity.toLocaleString('de-DE')}</span>
                      </div>
                      <div className="text-xs flex flex-col items-end">
                        <span className="font-medium text-muted-foreground">Alter</span>
                        <span className="font-medium">{pool.age}s</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${getRiskColor(pool.riskScore).replace('text-', 'bg-')}`}></div>
                        <span className={`text-xs font-medium ${getRiskColor(pool.riskScore)}`}>
                          Risiko: {pool.riskScore}%
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${getQualityColor(pool.quality).replace('text-', 'bg-')}`}></div>
                        <span className={`text-xs font-medium ${getQualityColor(pool.quality)}`}>
                          Qualität: {pool.quality}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{formatTimeLeft(30 - (index * 5))}</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="h-8 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSnipe(pool);
                        }}
                      >
                        Snipen
                      </Button>
                    </div>
                  </div>
                  
                  {selectedPool === pool.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-border/30"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground">Token-Details</h4>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Name:</span>
                              <span>{pool.tokenName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Symbol:</span>
                              <span>{pool.tokenSymbol}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Adresse:</span>
                              <span className="truncate max-w-[120px]">{pool.tokenAddress}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground">Pool-Details</h4>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">DEX:</span>
                              <span>{pool.dex}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pool-ID:</span>
                              <span className="truncate max-w-[120px]">{pool.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Erstellt vor:</span>
                              <span>{pool.age} Sekunden</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://suiscan.xyz/mainnet/object/${pool.id}`, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Pool anzeigen
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Hier würde die Analyse-Logik implementiert werden
                            console.log(`Analyzing pool: ${pool.tokenSymbol}`);
                          }}
                        >
                          <Info className="h-3 w-3 mr-1" />
                          Detailanalyse
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      <div className="mt-3 px-4 py-2 bg-muted/30 rounded-md">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center">
            <Flame className="h-3 w-3 text-orange-500 mr-1" />
            <span className="text-muted-foreground">Aktive Suche</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {pools.length} Pools gefunden
          </Badge>
        </div>
      </div>
    </div>
  );
}; 