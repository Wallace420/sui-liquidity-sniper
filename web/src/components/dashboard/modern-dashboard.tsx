"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  AlertTriangle, 
  BarChart2, 
  Clock, 
  Droplet, 
  Layers, 
  Maximize2, 
  Minimize2, 
  Plus, 
  Save, 
  Settings, 
  Zap,
  Maximize,
  Minimize,
  Move,
  ChevronDown,
  ChevronUp
} from "lucide-react";

// Importiere die Chart-Komponenten mit korrekten Pfaden
import { SecondChart } from "@/components/charts/second-chart";
import { TickChart } from "@/components/charts/tick-chart";
import { LiquidityPoolTopology } from "@/components/liquidity-pool-topology";
import { TokenHolderVisualization } from "@/components/dashboard/panels/token-holder-visualization";

// Importiere die Panel-Komponenten
import { PoolDetection } from "@/components/dashboard/panels/pool-detection";
import { MultiTokenMonitor } from "@/components/dashboard/panels/multi-token-monitor";
import { Transaction } from "@/components/dashboard/panels/transaction";
import { ContextualSidebar } from "@/components/dashboard/sidebar/contextual-sidebar";

// Definiere die Layouts
const LAYOUTS = {
  DEFAULT: "default",
  WIDE_LEFT: "wideLeft",
  WIDE_RIGHT: "wideRight",
  FOCUS_CHARTS: "focusCharts",
  FOCUS_TRADING: "focusTrading",
  CUSTOM: "custom"
};

// Hauptkomponente für das moderne Dashboard
export function ModernDashboard() {
  const [activeWorkspace, setActiveWorkspace] = useState("sniping");
  const [selectedTokenIndex, setSelectedTokenIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNewPoolAlert, setShowNewPoolAlert] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isTabletView, setIsTabletView] = useState(false);
  const [currentLayout, setCurrentLayout] = useState(LAYOUTS.DEFAULT);
  const [showLayoutOptions, setShowLayoutOptions] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const layoutOptionsRef = useRef<HTMLDivElement>(null);
  const [useRealData, setUseRealData] = useState(false);
  const [dataConnectionStatus, setDataConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("disconnected");

  // Überprüfe die Bildschirmgröße
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 768);
      setIsTabletView(window.innerWidth >= 768 && window.innerWidth < 1280);
      
      // Automatisch Sidebar ausblenden bei kleinen Bildschirmen
      if (window.innerWidth < 1280) {
        setSidebarVisible(false);
      } else {
        setSidebarVisible(true);
      }
    };
    
    // Initial check
    checkScreenSize();
    
    // Add event listener
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Schließe Layout-Optionen beim Klicken außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (layoutOptionsRef.current && !layoutOptionsRef.current.contains(event.target as Node) && showLayoutOptions) {
        setShowLayoutOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLayoutOptions]);

  // Simuliere das Erscheinen einer neuen Pool-Benachrichtigung
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNewPoolAlert(true);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, []);

  // Simuliere Verbindungsstatus-Updates
  useEffect(() => {
    if (useRealData) {
      setDataConnectionStatus("connecting");
      const timer = setTimeout(() => {
        // In einer echten Anwendung würde dies auf tatsächlichen WebSocket-Status reagieren
        setDataConnectionStatus(Math.random() > 0.3 ? "connected" : "disconnected");
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      setDataConnectionStatus("disconnected");
    }
  }, [useRealData]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const togglePanelExpansion = (panelId: string) => {
    if (expandedPanel === panelId) {
      setExpandedPanel(null);
    } else {
      setExpandedPanel(panelId);
    }
  };

  const changeLayout = (layout: string) => {
    setCurrentLayout(layout);
    setShowLayoutOptions(false);
  };

  // Komponente für einen anpassbaren Panel
  const ResizablePanel = ({ 
    id, 
    children, 
    className = "", 
    title = "",
    defaultHeight = "auto",
    collapsible = false
  }: { 
    id: string; 
    children: React.ReactNode; 
    className?: string; 
    title?: string;
    defaultHeight?: string;
    collapsible?: boolean;
  }) => {
    const isExpanded = expandedPanel === id;
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    const toggleCollapse = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsCollapsed(!isCollapsed);
    };
    
    return (
      <div 
        className={`relative group ${className} ${isExpanded ? 'col-span-12 row-span-2 z-10' : ''} 
                   transition-all duration-300 bg-background/95 border border-border/40 rounded-lg overflow-hidden`}
        style={{ height: isCollapsed ? '42px' : defaultHeight }}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/40">
            <h3 className="text-sm font-medium">{title}</h3>
            <div className="flex items-center space-x-1">
              {collapsible && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 hover:bg-muted rounded-full"
                  onClick={toggleCollapse}
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )}
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted rounded-full"
                onClick={() => togglePanelExpansion(id)}
              >
                {isExpanded ? (
                  <Minimize className="h-3 w-3" />
                ) : (
                  <Maximize className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        )}
        {!isCollapsed && children}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background dark">
      {/* Kopfzeile */}
      <header className="border-b border-border p-3 flex justify-between items-center bg-background/95 backdrop-blur-sm">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2 md:hidden" 
            onClick={toggleSidebar}
          >
            <Layers className="h-5 w-5" />
          </Button>
          <Droplet className="h-6 w-6 text-primary mr-2" />
          <h1 className="text-xl font-bold">SUI Liquidity Sniper</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center mr-4">
            <span className="text-sm mr-2">Echtdaten:</span>
            <Button 
              variant={useRealData ? "default" : "outline"} 
              size="sm" 
              onClick={() => setUseRealData(!useRealData)}
              className="relative"
            >
              {useRealData ? "An" : "Aus"}
              {useRealData && (
                <span 
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    dataConnectionStatus === "connected" ? "bg-green-500" : 
                    dataConnectionStatus === "connecting" ? "bg-yellow-500" : "bg-red-500"
                  }`}
                />
              )}
            </Button>
          </div>
          
          <div className="relative" ref={layoutOptionsRef}>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowLayoutOptions(!showLayoutOptions)}
              className="flex items-center"
            >
              <Layers className="h-4 w-4 mr-2" />
              Layout
            </Button>
            
            {showLayoutOptions && (
              <>
                <div 
                  className="fixed inset-0 bg-black/20 z-[90]" 
                  onClick={() => setShowLayoutOptions(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-[100]">
                  <div className="p-2">
                    <button 
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md"
                      onClick={() => changeLayout(LAYOUTS.DEFAULT)}
                    >
                      Standard
                    </button>
                    <button 
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md"
                      onClick={() => changeLayout(LAYOUTS.WIDE_LEFT)}
                    >
                      Breite linke Spalte
                    </button>
                    <button 
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md"
                      onClick={() => changeLayout(LAYOUTS.WIDE_RIGHT)}
                    >
                      Breite rechte Spalte
                    </button>
                    <button 
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md"
                      onClick={() => changeLayout(LAYOUTS.FOCUS_CHARTS)}
                    >
                      Fokus auf Charts
                    </button>
                    <button 
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md"
                      onClick={() => changeLayout(LAYOUTS.FOCUS_TRADING)}
                    >
                      Trading-Ansicht
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" className="md:flex hidden items-center">
            <Settings className="h-4 w-4 mr-2" />
            Einstellungen
          </Button>
          <Button variant="outline" size="sm" className="md:hidden">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>
      
      {/* Hauptbereich mit Seitenleiste und Inhalt */}
      <div className="flex flex-1 overflow-hidden">
        {/* Seitenleiste */}
        <AnimatePresence>
          {sidebarVisible && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-r border-border h-full overflow-hidden"
            >
              <ContextualSidebar className="p-4 h-full overflow-y-auto" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Hauptinhalt */}
        <div className="flex-1 overflow-auto p-4 bg-background/80">
          {isMobileView ? (
            // Mobile Layout - Einzelne Spalte
            <div className="flex flex-col space-y-4">
              <ResizablePanel 
                id="poolDetection" 
                title="Pool-Erkennung" 
                defaultHeight="calc(100vh - 300px)"
                collapsible
              >
                <PoolDetection className="h-full" />
              </ResizablePanel>
              
              <ResizablePanel 
                id="secondChart" 
                title="Second Chart"
                defaultHeight="calc(100vh - 300px)"
                collapsible
              >
                <SecondChart 
                  symbol="BINANCE:BTCUSDT" 
                  interval="1S"
                  className="h-full" 
                  useRealData={useRealData}
                />
              </ResizablePanel>
              
              <ResizablePanel 
                id="transaction" 
                title="Transaktion"
                defaultHeight="calc(100vh - 300px)"
                collapsible
              >
                <Transaction className="h-full" />
              </ResizablePanel>
              
              <ResizablePanel 
                id="tokenMonitor" 
                title="Token-Monitor"
                defaultHeight="calc(100vh - 300px)"
                collapsible
              >
                <MultiTokenMonitor className="h-full" />
              </ResizablePanel>
              
              <ResizablePanel 
                id="tickChart" 
                title="Tick Chart"
                defaultHeight="calc(100vh - 300px)"
                collapsible
              >
                <TickChart 
                  symbol="BINANCE:ETHUSDT" 
                  className="h-full" 
                  useRealData={useRealData}
                />
              </ResizablePanel>
              
              <ResizablePanel 
                id="liquidityPool" 
                title="Liquiditätspool-Topologie"
                defaultHeight="calc(100vh - 300px)"
                collapsible
              >
                <LiquidityPoolTopology 
                  poolAddress="0x123...abc"
                  className="h-full"
                />
              </ResizablePanel>
              
              <ResizablePanel 
                id="tokenHolder" 
                title="Token-Holder-Visualisierung"
                defaultHeight="calc(100vh - 300px)"
                collapsible
              >
                <TokenHolderVisualization 
                  tokenAddress="0x456...def"
                  className="h-full"
                />
              </ResizablePanel>
            </div>
          ) : (
            // Desktop und Tablet Layout mit festen Spalten
            <div className="grid grid-cols-12 gap-4">
              {/* Linke Spalte */}
              <div className="col-span-3 flex flex-col space-y-4">
                <ResizablePanel 
                  id="poolDetection" 
                  title="Pool-Erkennung"
                  defaultHeight="calc(50vh - 4rem)"
                  collapsible
                >
                  <PoolDetection className="h-full" />
                </ResizablePanel>
                
                <ResizablePanel 
                  id="tokenMonitor" 
                  title="Token-Monitor"
                  defaultHeight="calc(50vh - 4rem)"
                  collapsible
                >
                  <MultiTokenMonitor className="h-full" />
                </ResizablePanel>
              </div>
              
              {/* Mittlere Spalte */}
              <div className="col-span-6 flex flex-col space-y-4">
                {/* Sekunden-Chart */}
                <ResizablePanel 
                  id="second-chart" 
                  className={`${currentLayout === LAYOUTS.WIDE_LEFT || currentLayout === LAYOUTS.FOCUS_CHARTS ? 'col-span-8' : 'col-span-6'}`}
                  title="Sekunden-Chart"
                  defaultHeight="400px"
                  collapsible
                >
                  <div className="h-full">
                    <SecondChart 
                      symbol="BINANCE:BTCUSDT" 
                      interval="1S" 
                      useRealData={useRealData}
                    />
                  </div>
                </ResizablePanel>
                
                {/* Untere Charts */}
                <div className="grid grid-cols-2 gap-4">
                  <ResizablePanel 
                    id="tick-chart" 
                    className={`${currentLayout === LAYOUTS.WIDE_RIGHT || currentLayout === LAYOUTS.FOCUS_CHARTS ? 'col-span-6' : 'col-span-6'}`}
                    title="Tick-Chart"
                    defaultHeight="400px"
                    collapsible
                  >
                    <div className="h-full">
                      <TickChart 
                        symbol="BINANCE:ETHUSDT" 
                        useRealData={useRealData}
                      />
                    </div>
                  </ResizablePanel>
                  
                  <ResizablePanel 
                    id="liquidityPool" 
                    title="Liquiditätspool-Topologie"
                    defaultHeight="calc(50vh - 4rem)"
                    collapsible
                  >
                    <LiquidityPoolTopology 
                      poolAddress="0x123...abc"
                      className="h-full"
                    />
                  </ResizablePanel>
                </div>
              </div>
              
              {/* Rechte Spalte */}
              <div className="col-span-3 flex flex-col space-y-4">
                <ResizablePanel 
                  id="transaction" 
                  title="Transaktion"
                  defaultHeight="calc(50vh - 4rem)"
                  collapsible
                >
                  <Transaction className="h-full" />
                </ResizablePanel>
                
                <ResizablePanel 
                  id="tokenHolder" 
                  title="Token-Holder-Visualisierung"
                  defaultHeight="calc(50vh - 4rem)"
                  collapsible
                >
                  <TokenHolderVisualization 
                    tokenAddress="0x456...def"
                    className="h-full"
                  />
                </ResizablePanel>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Floating Action Button für neue Pools */}
      <AnimatePresence>
        {showNewPoolAlert && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 z-[100]"
          >
            <Button 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
              onClick={() => setShowNewPoolAlert(false)}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Neuer Pool entdeckt! Jetzt ansehen
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Statusleiste */}
      <footer className="border-t border-border p-2 flex justify-between items-center bg-background/95 backdrop-blur-sm text-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-2 ${
              dataConnectionStatus === "connected" ? "bg-green-500" : 
              dataConnectionStatus === "connecting" ? "bg-yellow-500" : "bg-muted"
            }`} />
            <span>
              {dataConnectionStatus === "connected" ? "Verbunden" : 
               dataConnectionStatus === "connecting" ? "Verbinde..." : "Offline"}
            </span>
          </div>
          <div>Latenz: {useRealData ? "45ms" : "0ms"}</div>
        </div>
        <div>SUI Liquidity Sniper v0.1.0</div>
      </footer>
    </div>
  );
} 