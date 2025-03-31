import React from "react";
import { TokenHolderVisualization } from "@/components/token-holder-visualization";

export default function TestVisualizationPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Token-Holder-Visualisierung Testseite</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Beispiel 1: Standard-Token</h2>
          <TokenHolderVisualization 
            tokenAddress="0x1234567890abcdef1234567890abcdef12345678" 
          />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Beispiel 2: Anderer Token</h2>
          <TokenHolderVisualization 
            tokenAddress="0xabcdef1234567890abcdef1234567890abcdef12" 
          />
        </div>
      </div>
    </div>
  );
} 