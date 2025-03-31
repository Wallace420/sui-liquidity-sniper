"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Users, AlertCircle, TrendingUp, TrendingDown, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TokenHolderVisualizationProps {
  tokenAddress: string;
  className?: string;
}

interface HolderData {
  address: string;
  percentage: number;
}

interface TokenDistribution {
  whales: number;
  retail: number;
  team: number;
}

interface TokenHolderState {
  totalHolders: number;
  topHolders: HolderData[];
  distribution: TokenDistribution;
  loading: boolean;
  error: string | null;
}

export function TokenHolderVisualization({ tokenAddress, className }: TokenHolderVisualizationProps) {
  const [holderData, setHolderData] = useState<TokenHolderState>({
    totalHolders: 0,
    topHolders: [],
    distribution: {
      whales: 0,
      retail: 0,
      team: 0,
    },
    loading: true,
    error: null
  });
  
  useEffect(() => {
    // Simuliere API-Aufruf für Token-Holder-Daten
    const fetchHolderData = async () => {
      try {
        setHolderData(prev => ({ ...prev, loading: true, error: null }));
        
        // In einer echten Anwendung würdest du hier einen API-Aufruf machen
        // z.B. const response = await fetch(`/api/token/${tokenAddress}/holders`);
        
        // Simulierte Daten
        setTimeout(() => {
          setHolderData({
            totalHolders: 22,
            topHolders: [
              { address: "0x1234...5678", percentage: 15.3 },
              { address: "0xabcd...ef01", percentage: 12.7 },
              { address: "0x9876...5432", percentage: 8.2 },
              { address: "0x2468...1357", percentage: 5.6 },
              { address: "0x1357...2468", percentage: 4.1 },
            ],
            distribution: {
              whales: 45,
              retail: 35,
              team: 20,
            },
            loading: false,
            error: null
          });
        }, 1500);
      } catch (error) {
        console.error("Fehler beim Abrufen der Token-Holder-Daten:", error);
        setHolderData(prev => ({ 
          ...prev, 
          loading: false, 
          error: "Fehler beim Laden der Token-Holder-Daten. Bitte versuchen Sie es später erneut." 
        }));
      }
    };
    
    if (tokenAddress) {
      fetchHolderData();
    }
  }, [tokenAddress]);
  
  const getDistributionColor = (type: string): string => {
    switch (type) {
      case "whales":
        return "bg-blue-500";
      case "retail":
        return "bg-green-500";
      case "team":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };
  
  const getHolderRiskIndicator = () => {
    const { whales, team } = holderData.distribution;
    const concentrationRisk = whales + team;
    
    if (concentrationRisk > 70) {
      return {
        icon: <TrendingUp className="h-5 w-5 text-red-500" />,
        text: "Hohe Konzentration",
        color: "text-red-500"
      };
    } else if (concentrationRisk > 50) {
      return {
        icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
        text: "Mittlere Konzentration",
        color: "text-yellow-500"
      };
    } else {
      return {
        icon: <TrendingDown className="h-5 w-5 text-green-500" />,
        text: "Gute Verteilung",
        color: "text-green-500"
      };
    }
  };

  const renderDistributionBar = () => {
    const { whales, retail, team } = holderData.distribution;
    
    return (
      <div className="h-4 w-full rounded-full overflow-hidden bg-gray-700 flex">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${whales}%` }}
          transition={{ duration: 1 }}
          className={`${getDistributionColor("whales")}`}
        />
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${retail}%` }}
          transition={{ duration: 1, delay: 0.2 }}
          className={`${getDistributionColor("retail")}`}
        />
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${team}%` }}
          transition={{ duration: 1, delay: 0.4 }}
          className={`${getDistributionColor("team")}`}
        />
      </div>
    );
  };

  const renderTopHolders = () => {
    return holderData.topHolders.map((holder, index) => (
      <motion.div 
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="flex justify-between items-center text-sm py-1 border-b border-gray-700 last:border-0"
      >
        <div className="text-gray-400 truncate mr-2">{holder.address}</div>
        <div className="font-medium whitespace-nowrap">{holder.percentage.toFixed(1)}%</div>
      </motion.div>
    ));
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Users className="mr-2 h-5 w-5" />
          Token-Holder-Visualisierung
        </CardTitle>
      </CardHeader>
      <CardContent>
        {holderData.loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : holderData.error ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-red-500">{holderData.error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{holderData.totalHolders} Holder</div>
              <div className={`flex items-center ${getHolderRiskIndicator().color}`}>
                {getHolderRiskIndicator().icon}
                <span className="ml-1 text-sm">{getHolderRiskIndicator().text}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Verteilung</h4>
              {renderDistributionBar()}
              <div className="flex flex-wrap text-xs justify-between gap-y-1">
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full ${getDistributionColor("whales")} mr-1`}></div>
                  <span>Whales ({holderData.distribution.whales}%)</span>
                </div>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full ${getDistributionColor("retail")} mr-1`}></div>
                  <span>Retail ({holderData.distribution.retail}%)</span>
                </div>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full ${getDistributionColor("team")} mr-1`}></div>
                  <span>Team ({holderData.distribution.team}%)</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Top Holder</h4>
              <div className="max-h-[120px] overflow-y-auto pr-1 space-y-1">
                {renderTopHolders()}
              </div>
            </div>
            
            <div className="mt-4 text-xs text-muted-foreground flex items-start">
              <Shield className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
              <span>
                Diese Visualisierung zeigt die Verteilung der Token-Holder.
                Eine ausgewogene Verteilung deutet auf ein geringeres Manipulationsrisiko hin.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 