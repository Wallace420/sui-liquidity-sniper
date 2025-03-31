"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart2, 
  Briefcase, 
  ChevronRight, 
  Compass, 
  Cpu, 
  Eye, 
  Flame, 
  Layers, 
  LineChart, 
  Settings, 
  Wallet 
} from "lucide-react";

type WorkspaceType = "sniping" | "analysis" | "portfolio";

interface ContextualSidebarProps {
  className?: string;
}

export const ContextualSidebar: React.FC<ContextualSidebarProps> = ({ className }) => {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType>("sniping");
  const [isExpanded, setIsExpanded] = useState(true);

  const handleWorkspaceChange = (workspace: WorkspaceType) => {
    setActiveWorkspace(workspace);
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const renderWorkspaceContent = () => {
    switch (activeWorkspace) {
      case "sniping":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Aktive Jagd</h3>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Flame className="h-4 w-4 text-orange-500 mr-2" />
                      <span className="text-sm font-medium">Pool-Erkennung</span>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Aktiv
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Suche nach neuen Liquiditätspools auf Sui-Netzwerk
                  </div>
                  <div className="mt-2 text-xs">
                    <span className="text-muted-foreground">Gefunden:</span> 128 Pools
                  </div>
                  <div className="mt-1 text-xs">
                    <span className="text-muted-foreground">Letzter Fund:</span> vor 2 Min.
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Automatisierung</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="justify-start h-auto py-2">
                  <Cpu className="h-4 w-4 mr-2 text-blue-500" />
                  <div className="text-left">
                    <div className="text-xs font-medium">Auto-Snipe</div>
                    <div className="text-xs text-muted-foreground">Aus</div>
                  </div>
                </Button>
                <Button variant="outline" size="sm" className="justify-start h-auto py-2">
                  <LineChart className="h-4 w-4 mr-2 text-green-500" />
                  <div className="text-left">
                    <div className="text-xs font-medium">Auto-Sell</div>
                    <div className="text-xs text-muted-foreground">Aus</div>
                  </div>
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Filter</h3>
              <Card>
                <CardContent className="p-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Min. Liquidität</span>
                    <Badge variant="outline" className="text-xs">$5,000</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Max. Risiko</span>
                    <Badge variant="outline" className="text-xs">50%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">DEXes</span>
                    <Badge variant="outline" className="text-xs">Alle</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-xs flex items-center justify-center">
                    <Settings className="h-3 w-3 mr-1" />
                    Filter anpassen
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      
      case "analysis":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Marktübersicht</h3>
              <Card>
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">SUI Preis</span>
                      <span className="text-xs font-medium">$1.45</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">24h Volumen</span>
                      <span className="text-xs font-medium">$1.2M</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Neue Pools (24h)</span>
                      <span className="text-xs font-medium">85</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Beobachtungsliste</h3>
              <Card>
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mr-2 text-[10px]">
                        S
                      </div>
                      <span className="text-xs font-medium">SUI</span>
                    </div>
                    <span className="text-xs text-green-500">+5.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mr-2 text-[10px]">
                        U
                      </div>
                      <span className="text-xs font-medium">USDC</span>
                    </div>
                    <span className="text-xs text-green-500">+0.1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mr-2 text-[10px]">
                        W
                      </div>
                      <span className="text-xs font-medium">WETH</span>
                    </div>
                    <span className="text-xs text-red-500">-1.2%</span>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-xs flex items-center justify-center">
                    <Eye className="h-3 w-3 mr-1" />
                    Alle anzeigen
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Analysetools</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="justify-start h-auto py-2">
                  <BarChart2 className="h-4 w-4 mr-2 text-purple-500" />
                  <div className="text-left">
                    <div className="text-xs font-medium">Token-Analyse</div>
                  </div>
                </Button>
                <Button variant="outline" size="sm" className="justify-start h-auto py-2">
                  <Layers className="h-4 w-4 mr-2 text-blue-500" />
                  <div className="text-left">
                    <div className="text-xs font-medium">Pool-Analyse</div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        );
      
      case "portfolio":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Wallet-Übersicht</h3>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      <Wallet className="h-3 w-3 mr-1" />
                      0x123...abc
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Gesamtwert</span>
                      <span className="text-xs font-medium">$1,250</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">SUI Bilanz</span>
                      <span className="text-xs font-medium">10 SUI</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Token</span>
                      <span className="text-xs font-medium">5</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Performance</h3>
              <Card>
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Trades gesamt</span>
                    <span className="text-xs font-medium">45</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Erfolgsrate</span>
                    <span className="text-xs font-medium">71%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Gewinn/Verlust</span>
                    <span className="text-xs font-medium text-green-500">+$2,850</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Bester Trade</span>
                    <span className="text-xs font-medium text-green-500">+24.5%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Aktionen</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="justify-start h-auto py-2">
                  <Briefcase className="h-4 w-4 mr-2 text-green-500" />
                  <div className="text-left">
                    <div className="text-xs font-medium">Portfolio</div>
                  </div>
                </Button>
                <Button variant="outline" size="sm" className="justify-start h-auto py-2">
                  <Compass className="h-4 w-4 mr-2 text-blue-500" />
                  <div className="text-left">
                    <div className="text-xs font-medium">Explorer</div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-2">
          <Button
            variant={activeWorkspace === "sniping" ? "default" : "outline"}
            size="sm"
            onClick={() => handleWorkspaceChange("sniping")}
            className="h-8"
          >
            <Flame className={`h-4 w-4 ${activeWorkspace === "sniping" ? "mr-1" : ""}`} />
            {isExpanded && activeWorkspace === "sniping" && "Sniping"}
          </Button>
          
          <Button
            variant={activeWorkspace === "analysis" ? "default" : "outline"}
            size="sm"
            onClick={() => handleWorkspaceChange("analysis")}
            className="h-8"
          >
            <BarChart2 className={`h-4 w-4 ${activeWorkspace === "analysis" ? "mr-1" : ""}`} />
            {isExpanded && activeWorkspace === "analysis" && "Analyse"}
          </Button>
          
          <Button
            variant={activeWorkspace === "portfolio" ? "default" : "outline"}
            size="sm"
            onClick={() => handleWorkspaceChange("portfolio")}
            className="h-8"
          >
            <Wallet className={`h-4 w-4 ${activeWorkspace === "portfolio" ? "mr-1" : ""}`} />
            {isExpanded && activeWorkspace === "portfolio" && "Portfolio"}
          </Button>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </Button>
      </div>
      
      <motion.div
        initial={false}
        animate={{ opacity: isExpanded ? 1 : 0, height: isExpanded ? "auto" : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        {renderWorkspaceContent()}
      </motion.div>
    </div>
  );
}; 