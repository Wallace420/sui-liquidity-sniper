"use client";

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Slider } from '../../components/ui/slider';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export default function SettingsPage() {
  // Zustandsvariablen für die verschiedenen Einstellungen
  const [walletAddress, setWalletAddress] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [rpcUrl, setRpcUrl] = useState('https://sui-mainnet.public.blastapi.io');
  const [maxGasPrice, setMaxGasPrice] = useState(100);
  const [slippageTolerance, setSlippageTolerance] = useState(2.5);
  const [autoSell, setAutoSell] = useState(true);
  const [profitTarget, setProfitTarget] = useState(20);
  const [stopLoss, setStopLoss] = useState(10);
  const [maxBuyAmount, setMaxBuyAmount] = useState(0.5);
  const [minLiquidity, setMinLiquidity] = useState(10000);
  const [minRiskScore, setMinRiskScore] = useState(70);
  const [isLoading, setIsLoading] = useState(false);

  // Funktion zum Speichern der Einstellungen
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Hier würden wir normalerweise die Einstellungen an den Server senden
    console.log('Einstellungen gespeichert:', {
      walletAddress,
      privateKey: privateKey ? '***********' : '',
      rpcUrl,
      maxGasPrice,
      slippageTolerance,
      autoSell,
      profitTarget,
      stopLoss,
      maxBuyAmount,
      minLiquidity,
      minRiskScore
    });
    
    // Simuliere eine Verzögerung für die Speicherung
    setTimeout(() => {
      setIsLoading(false);
      // Hier könnte eine Erfolgsmeldung angezeigt werden
    }, 1000);
  };

  // Funktion zum Zurücksetzen der Einstellungen
  const handleResetSettings = () => {
    setWalletAddress('');
    setPrivateKey('');
    setRpcUrl('https://sui-mainnet.public.blastapi.io');
    setMaxGasPrice(100);
    setSlippageTolerance(2.5);
    setAutoSell(true);
    setProfitTarget(20);
    setStopLoss(10);
    setMaxBuyAmount(0.5);
    setMinLiquidity(10000);
    setMinRiskScore(70);
  };

  return (
    <div className="p-4 md:p-10 mx-auto max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Einstellungen</h1>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general">Allgemein</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="filters">Filter</TabsTrigger>
          <TabsTrigger value="advanced">Erweitert</TabsTrigger>
        </TabsList>
        
        <form onSubmit={handleSaveSettings}>
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Allgemeine Einstellungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="walletAddress">Wallet-Adresse</Label>
                  <Input 
                    id="walletAddress" 
                    value={walletAddress} 
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="privateKey">Private Key</Label>
                  <Input 
                    id="privateKey" 
                    type="password"
                    autocompleteAttribute="current-password"
                    value={privateKey} 
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Geben Sie Ihren privaten Schlüssel ein"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ihr privater Schlüssel wird sicher gespeichert und nur für Transaktionen verwendet.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rpcUrl">RPC URL</Label>
                  <Input 
                    id="rpcUrl" 
                    value={rpcUrl} 
                    onChange={(e) => setRpcUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trading">
            <Card>
              <CardHeader>
                <CardTitle>Trading-Einstellungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="maxGasPrice">Maximaler Gas-Preis (GWEI)</Label>
                    <span className="text-sm font-medium">{maxGasPrice}</span>
                  </div>
                  <Slider 
                    id="maxGasPrice"
                    min={10} 
                    max={500} 
                    step={10}
                    value={[maxGasPrice]} 
                    onValueChange={(value) => setMaxGasPrice(value[0])}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="slippageTolerance">Slippage-Toleranz (%)</Label>
                    <span className="text-sm font-medium">{slippageTolerance}%</span>
                  </div>
                  <Slider 
                    id="slippageTolerance"
                    min={0.1} 
                    max={10} 
                    step={0.1}
                    value={[slippageTolerance]} 
                    onValueChange={(value) => setSlippageTolerance(value[0])}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="maxBuyAmount">Maximaler Kaufbetrag (SUI)</Label>
                    <span className="text-sm font-medium">{maxBuyAmount} SUI</span>
                  </div>
                  <Slider 
                    id="maxBuyAmount"
                    min={0.1} 
                    max={10} 
                    step={0.1}
                    value={[maxBuyAmount]} 
                    onValueChange={(value) => setMaxBuyAmount(value[0])}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoSell">Automatischer Verkauf</Label>
                  <Switch 
                    id="autoSell" 
                    checked={autoSell} 
                    onCheckedChange={setAutoSell}
                  />
                </div>
                
                {autoSell && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="profitTarget">Gewinnziel (%)</Label>
                        <span className="text-sm font-medium">{profitTarget}%</span>
                      </div>
                      <Slider 
                        id="profitTarget"
                        min={5} 
                        max={100} 
                        step={5}
                        value={[profitTarget]} 
                        onValueChange={(value) => setProfitTarget(value[0])}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="stopLoss">Stop-Loss (%)</Label>
                        <span className="text-sm font-medium">-{stopLoss}%</span>
                      </div>
                      <Slider 
                        id="stopLoss"
                        min={5} 
                        max={50} 
                        step={5}
                        value={[stopLoss]} 
                        onValueChange={(value) => setStopLoss(value[0])}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="filters">
            <Card>
              <CardHeader>
                <CardTitle>Filter-Einstellungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="minLiquidity">Minimale Liquidität (USD)</Label>
                    <span className="text-sm font-medium">${minLiquidity.toLocaleString()}</span>
                  </div>
                  <Slider 
                    id="minLiquidity"
                    min={1000} 
                    max={100000} 
                    step={1000}
                    value={[minLiquidity]} 
                    onValueChange={(value) => setMinLiquidity(value[0])}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="minRiskScore">Minimaler Risiko-Score</Label>
                    <span className="text-sm font-medium">{minRiskScore}/100</span>
                  </div>
                  <Slider 
                    id="minRiskScore"
                    min={0} 
                    max={100} 
                    step={5}
                    value={[minRiskScore]} 
                    onValueChange={(value) => setMinRiskScore(value[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    Höhere Werte bedeuten sicherere Tokens, aber möglicherweise weniger Handelsmöglichkeiten.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <CardTitle>Erweiterte Einstellungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Diese Einstellungen sind für fortgeschrittene Benutzer gedacht. Ändern Sie diese nur, wenn Sie wissen, was Sie tun.
                </p>
                
                {/* Hier könnten weitere erweiterte Einstellungen hinzugefügt werden */}
                <div className="space-y-2">
                  <Label htmlFor="customSetting">Benutzerdefinierte Einstellung</Label>
                  <Input 
                    id="customSetting" 
                    placeholder="Benutzerdefinierter Wert"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <div className="flex justify-end gap-4 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleResetSettings}
            >
              Zurücksetzen
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? 'Wird gespeichert...' : 'Einstellungen speichern'}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
} 