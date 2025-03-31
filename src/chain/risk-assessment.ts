import { ParsedPoolData } from './extractor.js';

export interface RiskAssessment {
  riskScore: number;
  honeypotRisk: number;
  rugPullRisk: number;
  volatility: number;
  quality: number;
  isHoneypot?: boolean;
  ownershipRenounced?: boolean;
  mintingEnabled?: boolean;
  liquidityLocked?: boolean;
  lockDuration?: number;
}

/**
 * Bewertet das Risiko eines Pools basierend auf verschiedenen Faktoren
 * 
 * @param pool Die Pool-Daten zur Bewertung
 * @returns Eine Risikobewertung mit Werten zwischen 0-100
 */
export function assessPoolRisk(pool: ParsedPoolData): RiskAssessment {
  // Standardwerte für die Risikobewertung
  const riskAssessment: RiskAssessment = {
    riskScore: 50,
    honeypotRisk: 0,
    rugPullRisk: 0,
    volatility: 0,
    quality: 50,
    isHoneypot: false,
    ownershipRenounced: false,
    mintingEnabled: true,
    liquidityLocked: false,
    lockDuration: 0
  };

  // Wenn keine Pool-Daten vorhanden sind, geben wir die Standardbewertung zurück
  if (!pool) return riskAssessment;

  // Honeypot-Risiko berechnen
  riskAssessment.honeypotRisk = calculateHoneypotRisk(pool);
  
  // Rug-Pull-Risiko berechnen
  riskAssessment.rugPullRisk = calculateRugPullRisk(pool);
  
  // Volatilität berechnen
  riskAssessment.volatility = calculateVolatility(pool);
  
  // Gesamtrisiko berechnen (gewichteter Durchschnitt)
  riskAssessment.riskScore = Math.round(
    (riskAssessment.honeypotRisk * 0.4) + 
    (riskAssessment.rugPullRisk * 0.4) + 
    (riskAssessment.volatility * 0.2)
  );
  
  // Qualität berechnen (invers zum Risiko, aber mit zusätzlichen Faktoren)
  riskAssessment.quality = calculateQuality(pool, riskAssessment);
  
  return riskAssessment;
}

/**
 * Berechnet das Honeypot-Risiko eines Pools
 */
function calculateHoneypotRisk(pool: ParsedPoolData): number {
  let risk = 50; // Standardrisiko
  
  // Wenn Sicherheitsinformationen vorhanden sind, verwenden wir diese
  if (pool.security) {
    if (pool.security.isHoneypot) {
      risk = 100;
    } else {
      // Verschiedene Faktoren berücksichtigen
      risk = pool.security.riskScore || risk;
    }
  } else {
    // Heuristische Bewertung basierend auf verfügbaren Daten
    
    // Wenn die Liquidität sehr niedrig ist, erhöhen wir das Risiko
    if (pool.liquidity && typeof pool.liquidity === 'number') {
      if (pool.liquidity < 1000) {
        risk += 20;
      } else if (pool.liquidity < 5000) {
        risk += 10;
      } else if (pool.liquidity > 50000) {
        risk -= 10;
      }
    }
    
    // Wenn der Pool sehr neu ist, erhöhen wir das Risiko
    if (pool.createdAt) {
      const ageInHours = (Date.now() - pool.createdAt.getTime()) / (1000 * 60 * 60);
      if (ageInHours < 1) {
        risk += 15;
      } else if (ageInHours < 24) {
        risk += 5;
      } else if (ageInHours > 168) { // Älter als eine Woche
        risk -= 10;
      }
    }
  }
  
  // Risiko auf 0-100 begrenzen
  return Math.max(0, Math.min(100, risk));
}

/**
 * Berechnet das Rug-Pull-Risiko eines Pools
 */
function calculateRugPullRisk(pool: ParsedPoolData): number {
  let risk = 50; // Standardrisiko
  
  // Wenn Sicherheitsinformationen vorhanden sind, verwenden wir diese
  if (pool.security) {
    risk = pool.security.rugPullRisk || risk;
    
    // Wenn die Ownership aufgegeben wurde, verringern wir das Risiko
    if (pool.security.ownershipRenounced) {
      risk -= 20;
    }
    
    // Wenn Minting aktiviert ist, erhöhen wir das Risiko
    if (pool.security.mintingEnabled) {
      risk += 15;
    }
  }
  
  // Wenn Metriken vorhanden sind, berücksichtigen wir diese
  if (pool.metrics) {
    // Wenn die Liquidität gesperrt ist, verringern wir das Risiko
    if (pool.metrics.liquidityLocked) {
      risk -= 15;
      
      // Je länger die Sperrzeit, desto geringer das Risiko
      if (pool.metrics.lockDuration) {
        if (pool.metrics.lockDuration > 180) { // Länger als 6 Monate
          risk -= 15;
        } else if (pool.metrics.lockDuration > 90) { // Länger als 3 Monate
          risk -= 10;
        } else if (pool.metrics.lockDuration > 30) { // Länger als 1 Monat
          risk -= 5;
        }
      }
    }
    
    // Wenn es hohe Steuern gibt, erhöhen wir das Risiko
    if (pool.metrics.buyTax && pool.metrics.buyTax > 5) {
      risk += pool.metrics.buyTax;
    }
    
    if (pool.metrics.sellTax && pool.metrics.sellTax > 5) {
      risk += pool.metrics.sellTax * 1.5; // Verkaufssteuern sind riskanter
    }
  }
  
  // Risiko auf 0-100 begrenzen
  return Math.max(0, Math.min(100, risk));
}

/**
 * Berechnet die Volatilität eines Pools
 */
function calculateVolatility(pool: ParsedPoolData): number {
  let volatility = 50; // Standardvolatilität
  
  // Wenn Preisänderungsdaten vorhanden sind, verwenden wir diese
  if (pool.priceChange24h) {
    const absChange = Math.abs(pool.priceChange24h);
    
    if (absChange > 50) {
      volatility = 100;
    } else if (absChange > 30) {
      volatility = 80;
    } else if (absChange > 20) {
      volatility = 70;
    } else if (absChange > 10) {
      volatility = 60;
    } else if (absChange < 2) {
      volatility = 30;
    } else if (absChange < 5) {
      volatility = 40;
    }
  }
  
  // Wenn Preisverlaufsdaten vorhanden sind, berechnen wir die Volatilität
  if (pool.analytics && pool.analytics.priceHistory && pool.analytics.priceHistory.length > 1) {
    const prices = pool.analytics.priceHistory.map(p => p.price);
    const mean = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum: number, price: number) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = (stdDev / mean) * 100;
    
    if (coefficientOfVariation > 50) {
      volatility = 100;
    } else if (coefficientOfVariation > 30) {
      volatility = 80;
    } else if (coefficientOfVariation > 20) {
      volatility = 70;
    } else if (coefficientOfVariation > 10) {
      volatility = 60;
    } else if (coefficientOfVariation < 2) {
      volatility = 30;
    } else if (coefficientOfVariation < 5) {
      volatility = 40;
    }
  }
  
  // Volatilität auf 0-100 begrenzen
  return Math.max(0, Math.min(100, volatility));
}

/**
 * Berechnet die Qualität eines Pools
 */
function calculateQuality(pool: ParsedPoolData, riskAssessment: RiskAssessment): number {
  // Basisqualität ist invers zum Risiko
  let quality = 100 - riskAssessment.riskScore;
  
  // Zusätzliche Faktoren berücksichtigen
  
  // Liquidität
  if (pool.liquidity && typeof pool.liquidity === 'number') {
    if (pool.liquidity > 100000) {
      quality += 10;
    } else if (pool.liquidity > 50000) {
      quality += 5;
    } else if (pool.liquidity < 1000) {
      quality -= 10;
    }
  }
  
  // Volumen
  if (pool.volume24h) {
    if (pool.volume24h > 100000) {
      quality += 10;
    } else if (pool.volume24h > 50000) {
      quality += 5;
    } else if (pool.volume24h < 1000) {
      quality -= 5;
    }
  }
  
  // Alter des Pools
  if (pool.createdAt) {
    const ageInDays = (Date.now() - pool.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > 30) {
      quality += 10;
    } else if (ageInDays > 7) {
      quality += 5;
    }
  }
  
  // Qualität auf 0-100 begrenzen
  return Math.max(0, Math.min(100, quality));
} 