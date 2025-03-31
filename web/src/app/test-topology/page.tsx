import React from "react";
import { LiquidityPoolTopology } from "@/components/liquidity-pool-topology";

export default function TestTopologyPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Liquiditätspool-Topologie Testseite</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Beispiel 1: Standard-Pool</h2>
          <LiquidityPoolTopology 
            poolAddress="0x1234567890abcdef1234567890abcdef12345678" 
          />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Beispiel 2: Anderer Pool</h2>
          <LiquidityPoolTopology 
            poolAddress="0xabcdef1234567890abcdef1234567890abcdef12" 
          />
        </div>
      </div>
    </div>
  );
} 