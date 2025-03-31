import { SuiClient } from '@mysten/sui/client';
import { getFullnodeUrl } from '@mysten/sui/client';
import logger from '../utils/logger.js';
import { assessPoolRisk, RiskAssessment } from './risk-assessment.js';
import fs from 'fs';
import path from 'path';

// Schnittstelle für einen erkannten Pool
export interface DetectedPool {
  id: string;
  dex: string;
  token0: string;
  token1: string;
  liquidity: number;
  age: number;
  timestamp: string;
  riskScore: number;
  quality: number;
  // Erweiterte Risikobewertungsfelder
  honeypotRisk?: number;
  rugPullRisk?: number;
  volatility?: number;
  tokenSymbol?: string;
  tokenName?: string;
  tokenAddress?: string;
  volume24h?: number;
  priceChange24h?: number;
}

// Speichert die erkannten Pools
let detectedPools: DetectedPool[] = [];
const poolsFilePath = path.join(process.cwd(), 'data', 'pools.csv');

// Stellt sicher, dass das Verzeichnis existiert
function ensureDirectoryExists() {
  const dir = path.dirname(poolsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Initialisiert die Pool-Erkennung
 */
export function initPoolDetection() {
  ensureDirectoryExists();
  
  // Lade bestehende Pools, falls vorhanden
  if (fs.existsSync(poolsFilePath)) {
    try {
      const data = fs.readFileSync(poolsFilePath, 'utf8');
      const lines = data.split('\n').filter(line => line.trim());
      
      // Überspringe die Kopfzeile
      if (lines.length > 1) {
        detectedPools = lines.slice(1).map(line => {
          const [id, dex, token0, token1, liquidityStr, ageStr, timestamp, riskScoreStr, qualityStr] = line.split(',');
          return {
            id,
            dex,
            token0,
            token1,
            liquidity: parseFloat(liquidityStr),
            age: parseInt(ageStr),
            timestamp,
            riskScore: parseInt(riskScoreStr),
            quality: parseInt(qualityStr)
          };
        });
        
        logger.info(`${detectedPools.length} bestehende Pools geladen`);
      }
    } catch (error) {
      logger.error(`Fehler beim Laden der bestehenden Pools: ${error}`);
    }
  } else {
    // Erstelle die Datei mit Kopfzeile
    fs.writeFileSync(poolsFilePath, 'id,dex,token0,token1,liquidity,age,timestamp,riskScore,quality\n');
    logger.info('Neue Pools-Datei erstellt');
  }
}

/**
 * Erkennt einen neuen Pool und bewertet sein Risiko
 * 
 * @param client SUI Client
 * @param poolId ID des Pools
 * @param dex Name der DEX
 * @param token0 Erste Token-Adresse
 * @param token1 Zweite Token-Adresse
 * @param liquidity Liquidität des Pools
 * @returns Der erkannte Pool mit Risikobewertung
 */
export async function detectPool(
  client: SuiClient,
  poolId: string,
  dex: string,
  token0: string,
  token1: string,
  liquidity: number
): Promise<DetectedPool | null> {
  try {
    // Prüfe, ob der Pool bereits erkannt wurde
    if (detectedPools.some(p => p.id === poolId)) {
      return null;
    }
    
    logger.info(`Neuer Pool erkannt: ${poolId} auf ${dex}`);
    
    const timestamp = new Date().toISOString();
    const age = 0; // Neuer Pool, Alter = 0 Sekunden
    
    // Bestimme den Token für die Risikobewertung (normalerweise token1)
    const tokenAddress = token1;
    
    // Bewerte das Risiko des Pools
    const riskAssessment = await assessPoolRisk(client, poolId, dex, tokenAddress, liquidity, age);
    
    // Erstelle den erkannten Pool
    const pool: DetectedPool = {
      id: poolId,
      dex,
      token0,
      token1,
      liquidity,
      age,
      timestamp,
      riskScore: riskAssessment.riskScore,
      quality: riskAssessment.quality,
      honeypotRisk: riskAssessment.honeypotRisk,
      rugPullRisk: riskAssessment.rugPullRisk,
      volatility: riskAssessment.volatility,
      tokenSymbol: riskAssessment.tokenSymbol,
      tokenName: riskAssessment.tokenName,
      tokenAddress: riskAssessment.tokenAddress,
      volume24h: riskAssessment.volume24h,
      priceChange24h: riskAssessment.priceChange24h
    };
    
    // Füge den Pool zur Liste hinzu
    detectedPools.push(pool);
    
    // Speichere den Pool in der CSV-Datei
    const csvLine = `${pool.id},${pool.dex},${pool.token0},${pool.token1},${pool.liquidity},${pool.age},${pool.timestamp},${pool.riskScore},${pool.quality}\n`;
    fs.appendFileSync(poolsFilePath, csvLine);
    
    logger.info(`Pool ${poolId} erkannt und gespeichert (Risiko: ${pool.riskScore}, Qualität: ${pool.quality})`);
    
    return pool;
  } catch (error) {
    logger.error(`Fehler bei der Pool-Erkennung für ${poolId}: ${error}`);
    return null;
  }
}

/**
 * Aktualisiert das Alter aller Pools
 */
export function updatePoolAges() {
  const now = new Date();
  
  detectedPools = detectedPools.map(pool => {
    const poolDate = new Date(pool.timestamp);
    const ageInSeconds = Math.floor((now.getTime() - poolDate.getTime()) / 1000);
    
    return {
      ...pool,
      age: ageInSeconds
    };
  });
}

/**
 * Gibt alle erkannten Pools zurück
 * 
 * @returns Liste aller erkannten Pools
 */
export function getAllPools(): DetectedPool[] {
  return [...detectedPools];
}

/**
 * Gibt die neuesten Pools zurück
 * 
 * @param count Anzahl der Pools
 * @returns Liste der neuesten Pools
 */
export function getRecentPools(count: number = 10): DetectedPool[] {
  // Sortiere nach Zeitstempel (neueste zuerst)
  return [...detectedPools]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, count);
}

/**
 * Gibt Pools zurück, die in den letzten X Sekunden erkannt wurden
 * 
 * @param seconds Zeitraum in Sekunden
 * @returns Liste der Pools im angegebenen Zeitraum
 */
export function getPoolsInLastSeconds(seconds: number): DetectedPool[] {
  const cutoffTime = new Date(Date.now() - seconds * 1000);
  
  return detectedPools.filter(pool => {
    const poolDate = new Date(pool.timestamp);
    return poolDate >= cutoffTime;
  });
}

/**
 * Löscht alte Pools aus dem Speicher
 * 
 * @param maxAgeInSeconds Maximales Alter in Sekunden
 */
export function cleanupOldPools(maxAgeInSeconds: number = 86400) {
  const cutoffTime = new Date(Date.now() - maxAgeInSeconds * 1000);
  
  const initialCount = detectedPools.length;
  
  detectedPools = detectedPools.filter(pool => {
    const poolDate = new Date(pool.timestamp);
    return poolDate >= cutoffTime;
  });
  
  const removedCount = initialCount - detectedPools.length;
  if (removedCount > 0) {
    logger.info(`${removedCount} alte Pools gelöscht`);
  }
} 