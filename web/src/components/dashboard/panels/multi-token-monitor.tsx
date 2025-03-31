"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowDown, 
  ArrowUp, 
  BarChart2, 
  Plus, 
  ExternalLink, 
  Star, 
  Search,
  AlertCircle,
  Trash2
} from "lucide-react";

interface Token {
  id: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  address: string;
  network: string;
  favorite?: boolean;
}

interface MultiTokenMonitorProps {
  className?: string;
}

export const MultiTokenMonitor: React.FC<MultiTokenMonitorProps> = ({ className }) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  useEffect(() => {
    // Simuliere API-Aufruf
    const fetchTokens = async () => {
      setLoading(true);
      
      // Simulierte Verzögerung
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Demo-Daten mit realistischeren Werten
      const demoTokens: Token[] = [
        { 
          id: '1', 
          symbol: 'SUI', 
          name: 'Sui',
          price: 1.45, 
          priceChange24h: 5.2, 
          volume24h: 450000000,
          marketCap: 1450000000,
          address: '0x0000000000000000000000000000000000000000',
          network: 'Sui',
          favorite: true
        },
        { 
          id: '2', 
          symbol: 'USDC', 
          name: 'USD Coin',
          price: 1.00, 
          priceChange24h: 0.1, 
          volume24h: 35000000000,
          marketCap: 25000000000,
          address: '0xabc123def456',
          network: 'Sui'
        },
        { 
          id: '3', 
          symbol: 'WETH', 
          name: 'Wrapped Ethereum',
          price: 3250.75, 
          priceChange24h: -1.2, 
          volume24h: 25000000000,
          marketCap: 18500000000,
          address: '0xdef456ghi789',
          network: 'Sui'
        },
        { 
          id: '4', 
          symbol: 'USDT', 
          name: 'Tether',
          price: 1.00, 
          priceChange24h: 0.2, 
          volume24h: 20000000000,
          marketCap: 28000000000,
          address: '0xghi789jkl012',
          network: 'Sui'
        },
        { 
          id: '5', 
          symbol: 'WBTC', 
          name: 'Wrapped Bitcoin',
          price: 65432.10, 
          priceChange24h: 2.5, 
          volume24h: 15000000000,
          marketCap: 12500000000,
          address: '0xjkl012mno345',
          network: 'Sui'
        }
      ];
      
      setTokens(demoTokens);
      setLoading(false);
    };
    
    fetchTokens();
    
    // Simuliere realistischere Preisaktualisierungen
    const interval = setInterval(() => {
      setTokens(prev => prev.map(token => {
        // Realistischere Preisänderungen basierend auf Token-Typ
        let randomChange;
        
        if (token.symbol === 'USDC' || token.symbol === 'USDT') {
          // Stablecoins haben sehr kleine Preisänderungen
          randomChange = (Math.random() * 2 - 1) * 0.01;
        } else if (token.symbol === 'WETH' || token.symbol === 'WBTC') {
          // Größere Coins haben moderate Preisänderungen
          randomChange = (Math.random() * 2 - 1) * 0.3;
        } else {
          // Andere Coins können volatiler sein
          randomChange = (Math.random() * 2 - 1) * 0.5;
        }
        
        const newPrice = token.price * (1 + randomChange / 100);
        // Aktualisiere auch die 24h-Änderung, aber weniger drastisch
        const newPriceChange = token.priceChange24h + (randomChange / 20);
        
        return {
          ...token,
          price: parseFloat(newPrice.toFixed(6)),
          priceChange24h: parseFloat(newPriceChange.toFixed(2))
        };
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    if (price < 10) return price.toFixed(3);
    if (price < 1000) return price.toFixed(2);
    return price.toFixed(2);
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toString();
  };

  const handleTokenClick = (token: Token) => {
    setSelectedToken(selectedToken === token.id ? null : token.id);
  };

  const toggleFavorite = (tokenId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTokens(prev => prev.map(token => 
      token.id === tokenId ? { ...token, favorite: !token.favorite } : token
    ));
  };

  const filteredTokens = tokens.filter(token => 
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
    token.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`${className} h-full flex flex-col`}>
      <div className="p-3 border-b border-border/30 flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Token suchen..." 
            className="w-full h-8 pl-8 pr-2 text-sm bg-muted/30 border border-border/30 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 w-8 p-0"
          title="Token hinzufügen"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-sm text-muted-foreground">Lade Token-Daten...</p>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Keine Token gefunden</p>
            <p className="text-xs text-muted-foreground mt-1">Versuche einen anderen Suchbegriff oder füge neue Token hinzu.</p>
          </div>
        ) : (
          <div className="overflow-y-auto h-full">
            <div className="grid grid-cols-4 text-xs text-muted-foreground py-2 px-4 sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/30 z-10">
              <div className="col-span-1">Token</div>
              <div className="col-span-1 text-right">Preis</div>
              <div className="col-span-1 text-right">24h</div>
              <div className="col-span-1 text-right">Volumen (24h)</div>
            </div>
            
            <AnimatePresence>
              {filteredTokens.map((token) => (
                <motion.div
                  key={token.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`grid grid-cols-4 items-center py-3 px-4 hover:bg-muted/30 transition-colors border-b border-border/20 last:border-b-0 cursor-pointer ${selectedToken === token.id ? 'bg-muted/50' : ''}`}
                  onClick={() => handleTokenClick(token)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Token ${token.symbol} details`}
                  onKeyDown={(e) => e.key === 'Enter' && handleTokenClick(token)}
                >
                  <div className="col-span-1 flex items-center">
                    <button 
                      className="mr-1 focus:outline-none"
                      onClick={(e) => toggleFavorite(token.id, e)}
                      aria-label={token.favorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star className={`h-3 w-3 ${token.favorite ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                    </button>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs font-medium ${token.priceChange24h >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {token.symbol.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate flex items-center">
                        {token.symbol}
                        <span className="ml-1 text-xs text-muted-foreground">{token.network}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{token.name}</div>
                    </div>
                  </div>
                  
                  <div className="col-span-1 text-right font-medium text-sm whitespace-nowrap">
                    ${formatPrice(token.price)}
                  </div>
                  
                  <div className="col-span-1 text-right">
                    <div className={`inline-flex items-center justify-end px-1.5 py-0.5 rounded ${token.priceChange24h >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {token.priceChange24h >= 0 ? (
                        <ArrowUp className="h-3 w-3 mr-0.5" />
                      ) : (
                        <ArrowDown className="h-3 w-3 mr-0.5" />
                      )}
                      <span className="font-medium text-xs whitespace-nowrap">{Math.abs(token.priceChange24h).toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className="col-span-1 text-right text-muted-foreground text-xs whitespace-nowrap">
                    ${formatLargeNumber(token.volume24h)}
                  </div>
                  
                  {selectedToken === token.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="col-span-4 mt-2 pt-2 border-t border-border/30 grid grid-cols-2 gap-4"
                    >
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground">Token-Details</h4>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Name:</span>
                            <span>{token.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Symbol:</span>
                            <span>{token.symbol}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Adresse:</span>
                            <span className="truncate max-w-[120px]">{token.address}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Netzwerk:</span>
                            <span>{token.network}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground">Marktdaten</h4>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Preis:</span>
                            <span>${formatPrice(token.price)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">24h Änderung:</span>
                            <span className={token.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                              {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Volumen (24h):</span>
                            <span>${formatLargeNumber(token.volume24h)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Marktkapitalisierung:</span>
                            <span>${formatLargeNumber(token.marketCap)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 mt-2 flex justify-between">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://suiscan.xyz/mainnet/object/${token.address}`, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Token anzeigen
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Hier würde die Entfernen-Logik implementiert werden
                            console.log(`Removing token: ${token.symbol}`);
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Entfernen
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
      
      <div className="mt-auto p-3 bg-muted/30 border-t border-border/30">
        <div className="flex justify-between items-center text-xs">
          <div className="text-muted-foreground">
            {filteredTokens.length} Token
          </div>
          <div className="flex items-center">
            <Badge variant="outline" className="mr-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
              {tokens.filter(t => t.priceChange24h >= 0).length}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
              {tokens.filter(t => t.priceChange24h < 0).length}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}; 