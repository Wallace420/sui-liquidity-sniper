"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  ArrowRight, 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TransactionProps {
  className?: string;
}

export function Transaction({ className }: TransactionProps) {
  const [amount, setAmount] = useState<string>("0.1");
  const [slippage, setSlippage] = useState<number>(0.5);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedToken, setSelectedToken] = useState<string>("SUI");
  const [tokenPrice, setTokenPrice] = useState<number>(65.75);
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [gasPrice, setGasPrice] = useState<string>("1000");
  const [gasLimit, setGasLimit] = useState<string>("21000");
  const [activeTab, setActiveTab] = useState<string>("swap");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Simuliere Preisänderungen
  useEffect(() => {
    const interval = setInterval(() => {
      setTokenPrice(prev => {
        const change = (Math.random() * 2 - 1) * 0.5;
        return parseFloat((prev + change).toFixed(2));
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Erlaubt nur Zahlen und einen Dezimalpunkt
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };
  
  const handleSlippageChange = (value: number[]) => {
    setSlippage(value[0]);
  };
  
  const calculateUsdValue = () => {
    const amountNum = parseFloat(amount) || 0;
    return (amountNum * tokenPrice).toFixed(2);
  };
  
  const executeTransaction = () => {
    setLoading(true);
    setTransactionStatus("pending");
    setStatusMessage("Transaktion wird ausgeführt...");
    
    // Simuliere API-Aufruf
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% Erfolgsrate
      
      if (success) {
        setTransactionStatus("success");
        setStatusMessage("Transaktion erfolgreich abgeschlossen!");
      } else {
        setTransactionStatus("error");
        setStatusMessage("Transaktion fehlgeschlagen. Bitte versuchen Sie es erneut.");
      }
      
      setLoading(false);
      
      // Status nach 5 Sekunden zurücksetzen
      setTimeout(() => {
        setTransactionStatus("idle");
        setStatusMessage("");
      }, 5000);
    }, 2000);
  };
  
  const getStatusColor = () => {
    switch (transactionStatus) {
      case "pending":
        return "text-yellow-500";
      case "success":
        return "text-green-500";
      case "error":
        return "text-red-500";
      default:
        return "";
    }
  };
  
  const getStatusIcon = () => {
    switch (transactionStatus) {
      case "pending":
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };
  
  const tokens = [
    { value: "SUI", label: "SUI", price: 65.75 },
    { value: "ETH", label: "Ethereum", price: 3450.25 },
    { value: "BTC", label: "Bitcoin", price: 65432.10 },
    { value: "USDT", label: "Tether", price: 1.00 },
    { value: "USDC", label: "USD Coin", price: 1.00 },
  ];
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
        <div className="flex items-center">
          <Wallet className="mr-2 h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Transaktion</span>
        </div>
        <div className="flex items-center space-x-1">
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
      
      <div className="flex-1 p-4 flex flex-col">
        {showSettings ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Transaktionseinstellungen</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="gasPrice" className="text-xs">Gas-Preis (Gwei)</Label>
                  <Input 
                    id="gasPrice" 
                    value={gasPrice} 
                    onChange={(e) => setGasPrice(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="gasLimit" className="text-xs">Gas-Limit</Label>
                  <Input 
                    id="gasLimit" 
                    value={gasLimit} 
                    onChange={(e) => setGasLimit(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Transaktionspriorität</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <Button variant="outline" size="sm" className="text-xs">Niedrig</Button>
                    <Button variant="default" size="sm" className="text-xs">Mittel</Button>
                    <Button variant="outline" size="sm" className="text-xs">Hoch</Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Netzwerk</Label>
                  <Select defaultValue="mainnet">
                    <SelectTrigger className="h-8 text-sm mt-1">
                      <SelectValue placeholder="Netzwerk auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mainnet">Mainnet</SelectItem>
                      <SelectItem value="testnet">Testnet</SelectItem>
                      <SelectItem value="devnet">Devnet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="swap">Swap</TabsTrigger>
                <TabsTrigger value="snipe">Snipe</TabsTrigger>
                <TabsTrigger value="limit">Limit</TabsTrigger>
              </TabsList>
              
              <TabsContent value="swap" className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="amount" className="text-sm">Betrag</Label>
                    <span className="text-xs text-muted-foreground">
                      Balance: 1.245 {selectedToken}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      id="amount"
                      type="text"
                      value={amount}
                      onChange={handleAmountChange}
                      className="flex-1"
                    />
                    <Select value={selectedToken} onValueChange={setSelectedToken}>
                      <SelectTrigger className="w-[110px]">
                        <SelectValue placeholder="Token" />
                      </SelectTrigger>
                      <SelectContent>
                        {tokens.map(token => (
                          <SelectItem key={token.value} value={token.value}>
                            {token.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-right mt-1 text-muted-foreground">
                    ≈ ${calculateUsdValue()} USD
                  </div>
                </div>
                
                <div className="flex justify-center my-2">
                  <div className="bg-muted rounded-full p-1">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="receiveAmount" className="text-sm">Erhalten (geschätzt)</Label>
                    <span className="text-xs text-muted-foreground">
                      Balance: 0.00 USDC
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      id="receiveAmount"
                      type="text"
                      value={(parseFloat(amount || "0") * tokenPrice).toFixed(2)}
                      readOnly
                      className="flex-1"
                    />
                    <Select defaultValue="USDC">
                      <SelectTrigger className="w-[110px]">
                        <SelectValue placeholder="Token" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USDC">USDC</SelectItem>
                        <SelectItem value="USDT">USDT</SelectItem>
                        <SelectItem value="DAI">DAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs w-full flex items-center justify-between"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <span>Erweiterte Einstellungen</span>
                    {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                  
                  {showAdvanced && (
                    <div className="mt-3 space-y-3 p-3 bg-muted/20 rounded-md">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center">
                            <Label htmlFor="slippage" className="text-xs mr-1">Slippage-Toleranz</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Maximaler Preisunterschied, den Sie akzeptieren</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <span className="text-xs font-medium">{slippage.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Slider
                            id="slippage"
                            value={[slippage]}
                            min={0.1}
                            max={5}
                            step={0.1}
                            onValueChange={handleSlippageChange}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Gas-Preis</Label>
                          <div className="flex items-center mt-1">
                            <span className="text-xs">{gasPrice} Gwei</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Geschätzte Gebühr</Label>
                          <div className="flex items-center mt-1">
                            <span className="text-xs">≈ $1.25</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-2">
                  <Button 
                    className="w-full" 
                    onClick={executeTransaction}
                    disabled={loading || !amount || parseFloat(amount) <= 0}
                  >
                    {loading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Swap ausführen
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="snipe" className="space-y-4">
                <div className="p-4 border border-border/30 rounded-md">
                  <div className="text-center">
                    <h3 className="text-sm font-medium mb-2">Snipe-Modus</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Konfigurieren Sie Ihre Snipe-Parameter, um automatisch in neue Pools einzusteigen
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="poolAddress" className="text-xs">Pool-Adresse</Label>
                        <Input 
                          id="poolAddress" 
                          placeholder="0x..." 
                          className="h-8 text-sm mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="snipeAmount" className="text-xs">Snipe-Betrag</Label>
                        <Input 
                          id="snipeAmount" 
                          placeholder="0.1" 
                          className="h-8 text-sm mt-1"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Label className="text-xs">Auto-Sell aktivieren</Label>
                        <input type="checkbox" />
                      </div>
                      
                      <Button className="w-full">
                        Snipe konfigurieren
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="limit" className="space-y-4">
                <div className="p-4 border border-border/30 rounded-md">
                  <div className="text-center">
                    <h3 className="text-sm font-medium mb-2">Limit-Order</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Setzen Sie Limit-Orders, die automatisch ausgeführt werden, wenn der Preis erreicht wird
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="limitPrice" className="text-xs">Limit-Preis</Label>
                        <Input 
                          id="limitPrice" 
                          placeholder="0.00" 
                          className="h-8 text-sm mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="limitAmount" className="text-xs">Betrag</Label>
                        <Input 
                          id="limitAmount" 
                          placeholder="0.1" 
                          className="h-8 text-sm mt-1"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Label className="text-xs">Gültig bis</Label>
                        <Select defaultValue="24h">
                          <SelectTrigger className="w-[80px] h-7 text-xs">
                            <SelectValue placeholder="Dauer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1h">1 Stunde</SelectItem>
                            <SelectItem value="24h">24 Stunden</SelectItem>
                            <SelectItem value="7d">7 Tage</SelectItem>
                            <SelectItem value="30d">30 Tage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button className="w-full">
                        Limit-Order platzieren
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            {transactionStatus !== "idle" && (
              <div className={`mt-4 p-3 rounded-md border ${
                transactionStatus === "success" ? "border-green-500/30 bg-green-500/10" : 
                transactionStatus === "error" ? "border-red-500/30 bg-red-500/10" : 
                "border-yellow-500/30 bg-yellow-500/10"
              }`}>
                <div className="flex items-center">
                  <div className={`mr-2 ${getStatusColor()}`}>
                    {getStatusIcon()}
                  </div>
                  <span className="text-sm">{statusMessage}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="p-3 border-t border-border/30">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <div>Netzwerk: Mainnet</div>
          <div>Gas: {gasPrice} Gwei</div>
        </div>
      </div>
    </div>
  );
} 