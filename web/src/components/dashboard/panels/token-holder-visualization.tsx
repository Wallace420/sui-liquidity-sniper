"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  PieChart, 
  Settings, 
  RefreshCw, 
  Users, 
  Wallet, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TokenHolder {
  address: string;
  percentage: number;
  tokens: number;
  value: number;
  isContract: boolean;
  isLocked: boolean;
  tag?: string;
}

interface TokenHolderVisualizationProps {
  className?: string;
  tokenAddress?: string;
}

export function TokenHolderVisualization({ 
  className,
  tokenAddress = "0x123...abc" 
}: TokenHolderVisualizationProps) {
  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [selectedHolder, setSelectedHolder] = useState<TokenHolder | null>(null);
  const [tokenInfo, setTokenInfo] = useState({
    name: "SUI Liquidity Token",
    symbol: "SLT",
    circulatingSupply: 1000000,
    totalSupply: 1000000,
    decimals: 18
  });
  const [showDetails, setShowDetails] = useState<boolean>(true);
  const [riskScore, setRiskScore] = useState<number>(65); // 0-100, höher = riskanter
  
  // Simuliere API-Aufruf zum Laden der Token-Holder
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Simuliere Netzwerkverzögerung
      setTimeout(() => {
        // Demo-Daten für Token-Holder
        const demoHolders: TokenHolder[] = [
          {
            address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
            percentage: 28.5,
            tokens: 285000,
            value: 142500,
            isContract: true,
            isLocked: false,
            tag: "Uniswap V2: Router"
          },
          {
            address: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
            percentage: 15.2,
            tokens: 152000,
            value: 76000,
            isContract: true,
            isLocked: true,
            tag: "Liquidity Pool"
          },
          {
            address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
            percentage: 12.7,
            tokens: 127000,
            value: 63500,
            isContract: false,
            isLocked: false,
            tag: "Whale"
          },
          {
            address: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52",
            percentage: 8.3,
            tokens: 83000,
            value: 41500,
            isContract: false,
            isLocked: false
          },
          {
            address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
            percentage: 7.1,
            tokens: 71000,
            value: 35500,
            isContract: false,
            isLocked: false,
            tag: "Team"
          },
          {
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            percentage: 5.4,
            tokens: 54000,
            value: 27000,
            isContract: false,
            isLocked: true,
            tag: "Founder"
          },
          {
            address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            percentage: 4.2,
            tokens: 42000,
            value: 21000,
            isContract: false,
            isLocked: false
          },
          {
            address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
            percentage: 3.8,
            tokens: 38000,
            value: 19000,
            isContract: false,
            isLocked: false
          }
        ];
        
        setHolders(demoHolders);
        setRiskScore(calculateConcentrationRisk(demoHolders));
        setLoading(false);
      }, 1500);
    };
    
    loadData();
  }, [tokenAddress]);
  
  const handleRefresh = () => {
    setLoading(true);
    
    // Simuliere API-Aufruf
    setTimeout(() => {
      // Aktualisiere die bestehenden Daten mit zufälligen Änderungen
      const updatedHolders = holders.map(holder => ({
        ...holder,
        percentage: Math.max(0.1, holder.percentage + (Math.random() * 2 - 1)),
        tokens: Math.floor(holder.tokens * (1 + (Math.random() * 0.1 - 0.05))),
        value: Math.floor(holder.value * (1 + (Math.random() * 0.1 - 0.05)))
      }));
      
      // Sortiere nach Prozentsatz
      updatedHolders.sort((a, b) => b.percentage - a.percentage);
      
      setHolders(updatedHolders);
      setRiskScore(calculateConcentrationRisk(updatedHolders));
      setLoading(false);
    }, 1000);
  };
  
  const calculateConcentrationRisk = (holderList: TokenHolder[]): number => {
    const nonLiquidityHolders = holderList.filter(h => !h.tag?.includes("Liquidity Pool"));
    const top3Concentration = nonLiquidityHolders.slice(0, 3).reduce((sum, h) => sum + h.percentage, 0);
    
    // Risikobewertung: 0-100, wobei 100 das höchste Risiko darstellt
    // Wenn die Top-3-Halter mehr als 50% besitzen, ist das Risiko hoch
    return Math.min(100, Math.floor((top3Concentration / 50) * 100));
  };
  
  const getAddressDisplay = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  const getRiskColor = (score: number) => {
    if (score < 30) return "text-green-500";
    if (score < 70) return "text-yellow-500";
    return "text-red-500";
  };
  
  const getHolderRowClass = (holder: TokenHolder) => {
    if (selectedHolder?.address === holder.address) {
      return "bg-blue-500/10 border-blue-500/30";
    }
    return "hover:bg-muted/50";
  };
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
        <div className="flex items-center">
          <PieChart className="mr-2 h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Token-Verteilung</span>
        </div>
        <div className="flex items-center space-x-1">
          <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400">
            {tokenInfo.symbol}
          </Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-muted rounded-full"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
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
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
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
      </div>
      
      {showDetails && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
          <div className="flex items-center">
            <div className="flex items-center mr-4">
              <Users className="h-4 w-4 mr-1 text-blue-500" />
              <span className="text-xs">Holder: {holders.length}</span>
            </div>
            <div className="flex items-center">
              <Wallet className="h-4 w-4 mr-1 text-blue-500" />
              <span className="text-xs">Umlauf: {tokenInfo.circulatingSupply.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center">
                    <AlertTriangle className={`h-4 w-4 mr-1 ${getRiskColor(riskScore)}`} />
                    <span className={`text-xs ${getRiskColor(riskScore)}`}>
                      Risiko: {riskScore}/100
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Konzentration der Top-Holder</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
      
      <div className="flex-1 p-0 flex flex-col">
        {showSettings ? (
          <div className="flex-1 p-4 bg-muted/10">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Visualisierungseinstellungen</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input type="checkbox" id="excludeLiquidity" className="mr-2" defaultChecked />
                    <label htmlFor="excludeLiquidity" className="text-xs">Liquidity Pools ausschließen</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="highlightContracts" className="mr-2" defaultChecked />
                    <label htmlFor="highlightContracts" className="text-xs">Verträge hervorheben</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="showTags" className="mr-2" defaultChecked />
                    <label htmlFor="showTags" className="text-xs">Tags anzeigen</label>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Anzeigeoptionen</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="default" size="sm" className="text-xs">Kreisdiagramm</Button>
                  <Button variant="outline" size="sm" className="text-xs">Balkendiagramm</Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Aktualisierungsintervall</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="text-xs">Manuell</Button>
                  <Button variant="default" size="sm" className="text-xs">5 Min</Button>
                  <Button variant="outline" size="sm" className="text-xs">15 Min</Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col md:flex-row">
              {/* Visualisierung */}
              <div className="w-full md:w-1/2 p-4 flex items-center justify-center">
                <div className="relative w-full h-full flex items-center justify-center">
                  {loading ? (
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="relative w-40 h-40">
                      {/* Simuliertes Kreisdiagramm */}
                      <div className="absolute inset-0 rounded-full border-8 border-blue-500/70"></div>
                      <div className="absolute inset-0 rounded-full border-8 border-transparent border-t-red-500/70 border-r-red-500/70 rotate-[45deg]"></div>
                      <div className="absolute inset-0 rounded-full border-8 border-transparent border-b-green-500/70 rotate-[180deg]"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Top 3 Holder</p>
                          <p className="text-lg font-medium">
                            {holders.slice(0, 3).reduce((sum, h) => sum + h.percentage, 0).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Holder-Liste */}
              <div className="w-full md:w-1/2 border-t md:border-t-0 md:border-l border-border/30 overflow-auto max-h-[300px] md:max-h-none">
                <div className="sticky top-0 bg-background/80 backdrop-blur-sm px-3 py-2 border-b border-border/30 flex justify-between items-center">
                  <span className="text-xs font-medium">Top Holder</span>
                  <span className="text-xs font-medium">Anteil</span>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {holders.map((holder, index) => (
                      <div 
                        key={holder.address}
                        className={`px-3 py-2 flex justify-between items-center cursor-pointer ${getHolderRowClass(holder)}`}
                        onClick={() => setSelectedHolder(holder)}
                      >
                        <div className="flex items-center">
                          <div className="w-5 text-xs text-muted-foreground">{index + 1}</div>
                          <div>
                            <div className="flex items-center">
                              <span className="text-xs">{getAddressDisplay(holder.address)}</span>
                              {holder.isContract && (
                                <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
                                  Contract
                                </Badge>
                              )}
                            </div>
                            {holder.tag && (
                              <span className="text-[10px] text-muted-foreground">{holder.tag}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium">{holder.percentage.toFixed(1)}%</div>
                          <div className="text-[10px] text-muted-foreground">
                            {holder.tokens.toLocaleString()} Tokens
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Ausgewählter Holder Details */}
            {selectedHolder && (
              <div className="p-3 border-t border-border/30 bg-muted/10">
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-1">{getAddressDisplay(selectedHolder.address)}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground cursor-pointer" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedHolder.tag && (
                        <Badge variant="outline" className="mr-2 h-5 text-[10px]">
                          {selectedHolder.tag}
                        </Badge>
                      )}
                      {selectedHolder.isContract && (
                        <Badge variant="outline" className="mr-2 h-5 text-[10px]">
                          Contract
                        </Badge>
                      )}
                      {selectedHolder.isLocked && (
                        <Badge variant="outline" className="h-5 text-[10px] bg-green-500/10 text-green-500 border-green-500/30">
                          Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{selectedHolder.percentage.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedHolder.tokens.toLocaleString()} Tokens
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ≈ ${selectedHolder.value.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 