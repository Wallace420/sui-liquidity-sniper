import { SUI } from '../chain/config.js';
import { logError, logInfo } from '../utils/logger.js';
import { 
  SuiClient, 
  SuiEventFilter, 
  SuiTransactionBlockResponse, 
  SuiEvent, 
  TransactionEffects,
  ObjectOwner,
  SuiObjectResponse,
  SuiMoveObject,
  PaginatedCoins,
  TransactionFilter
} from '@mysten/sui/client';
import { Transaction, TransactionArgument } from '@mysten/sui/transactions';
import { ParsedPoolData } from '../chain/extractor.js';

// Konstanten für Scam-Erkennung
const SUSPICIOUS_THRESHOLDS = {
  MIN_LIQUIDITY: 0.1,
  MAX_CREATOR_TRADES: 10,
  MIN_TOKEN_AGE: 3600,
  SUSPICIOUS_RATIO: 5,
  MAX_SIMILAR_POOLS: 3,
  CACHE_TTL: 300000,
};

// Erweiterte Typen für Transaktionseffekte
interface ExtendedTransactionEffects extends TransactionEffects {
  status: {
    status: 'success' | 'failure';
    error?: string;
  };
  events?: Array<SuiEvent & { parsedJson?: Record<string, any> }>;
}

// Hilfsfunktion für Type Casting
function asExtendedEffects(effects: TransactionEffects | null | undefined): ExtendedTransactionEffects | null {
  if (!effects) return null;
  return effects as unknown as ExtendedTransactionEffects;
}

// Ersetze GetObjectDataResponse mit SuiObjectResponse
type GetObjectDataResponse = SuiObjectResponse;

interface TokenMetadata {
  decimals: number;
  name: string;
  symbol: string;
  description?: string;
  iconUrl?: string;
  verified?: boolean;
  createdAt?: number;
}

// Temporäre Typ-Definitionen bis SDK-Update
interface SuiTransactionBlockEffectsTemp {
  status: {
    status: 'success' | 'failure';
    error?: string;
  };
  events?: Array<SuiEvent & { parsedJson?: Record<string, any> }>;
}

interface SecurityCheckResult {
  isSecure: boolean;
  score: number;
  warnings: string[];
  details: {
    lpLocked: boolean;
    isHoneypot: boolean;
    hasOwnership: boolean;
    hasMintFunction: boolean;
    devWalletAge: number;
    devWalletTxCount: number;
    tokenHolders: number;
    poolLiquidity: number;
    ownershipRenounced: boolean;
    mintingEnabled: boolean;
    devWalletAnalysis: {
      previousScams: number;
      rugPullHistory: number;
      totalPools: number;
      averagePoolLifetime: number;
    };
    tokenAnalysis: {
      age: number;
      holders: number;
      transfers: number;
      suspiciousTransfers: number;
    };
    poolAnalysis: {
      liquidityScore: number;
      priceImpact: number;
      buyTax: number;
      sellTax: number;
      lpTokensLocked: boolean;
      lockDuration: number;
    };
  };
}

// Cache für Scam-Checks
const scamCheckCache = new Map<string, {
  probability: number;
  timestamp: number;
}>();

interface LPStatus {
  isLocked: boolean;
  lockDuration?: number;
}

interface DevWalletAnalysis {
  accountAge: number;
  transactionCount: number;
  previousScams: number;
  rugPulls: number;
  totalPools: number;
  averagePoolLifetime: number;
}

interface TokenAnalysis {
  age: number;
  holders: number;
  transfers: number;
  suspiciousTransfers: number;
}

interface PoolMetrics {
  liquidity: number;
  liquidityScore: number;
  priceImpact: number;
  buyTax: number;
  sellTax: number;
}

// Parameter-Typ für getAllCoins
interface ExtendedGetAllCoinsParams {
  owner: string;
  coinType?: string;
  cursor?: string;
  limit?: number;
}

export async function checkPoolSecurity(
  poolId: string,
  dex: string
): Promise<SecurityCheckResult> {
  try {
    // Führe alle Sicherheitsprüfungen parallel aus
    const [
      lpStatus,
      honeypotStatus,
      contractAnalysis,
      devWalletAnalysis,
      tokenAnalysis,
      poolMetrics
    ] = await Promise.all([
      checkLPStatus(poolId),
      checkHoneypot(poolId),
      analyzeContract(poolId),
      analyzeDevWallet(poolId),
      analyzeToken(poolId),
      analyzePoolMetrics(poolId)
    ]);

    // Berechne Sicherheitsscore
    const score = calculateSecurityScore(
      lpStatus,
      honeypotStatus,
      contractAnalysis,
      devWalletAnalysis,
      tokenAnalysis,
      poolMetrics
    );

    // Sammle Warnungen
    const warnings = collectWarnings(
      lpStatus,
      honeypotStatus,
      contractAnalysis,
      devWalletAnalysis,
      tokenAnalysis,
      poolMetrics
    );

    return {
      isSecure: score >= 80,
      score,
      warnings,
      details: {
        lpLocked: lpStatus.isLocked,
        isHoneypot: honeypotStatus.isHoneypot,
        hasOwnership: contractAnalysis.hasOwnership,
        hasMintFunction: contractAnalysis.hasMintFunction,
        devWalletAge: devWalletAnalysis.accountAge,
        devWalletTxCount: devWalletAnalysis.transactionCount,
        tokenHolders: tokenAnalysis.holders,
        poolLiquidity: poolMetrics.liquidity,
        ownershipRenounced: !contractAnalysis.hasOwnership,
        mintingEnabled: contractAnalysis.hasMintFunction,
        devWalletAnalysis: {
          previousScams: devWalletAnalysis.previousScams,
          rugPullHistory: devWalletAnalysis.rugPulls,
          totalPools: devWalletAnalysis.totalPools,
          averagePoolLifetime: devWalletAnalysis.averagePoolLifetime
        },
        tokenAnalysis: {
          age: tokenAnalysis.age,
          holders: tokenAnalysis.holders,
          transfers: tokenAnalysis.transfers,
          suspiciousTransfers: tokenAnalysis.suspiciousTransfers
        },
        poolAnalysis: {
          liquidityScore: poolMetrics.liquidityScore,
          priceImpact: poolMetrics.priceImpact,
          buyTax: poolMetrics.buyTax,
          sellTax: poolMetrics.sellTax,
          lpTokensLocked: lpStatus.isLocked,
          lockDuration: lpStatus.lockDuration || 0
        }
      }
    };
  } catch (error) {
    logError('Fehler bei der Pool-Sicherheitsprüfung', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      poolId,
      dex
    });

    throw error;
  }
}

async function getTokenMetadata(coinType: string): Promise<TokenMetadata | null> {
  try {
    const response = await SUI.client.getCoinMetadata({ coinType });
    if (!response) return null;

    return {
      decimals: response.decimals,
      name: response.name || 'Unknown',
      symbol: response.symbol || 'UNKNOWN',
      description: response.description || undefined,
      iconUrl: response.iconUrl || undefined,
      verified: false,
      createdAt: Date.now(),
    };
  } catch (error) {
    logError(`Fehler beim Abrufen der Token-Metadaten für ${coinType}`, {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
    return null;
  }
}

async function checkLPStatus(poolId: string): Promise<LPStatus> {
  try {
    const pool = await SUI.client.getObject({
      id: poolId,
      options: {
        showContent: true,
        showOwner: true
      }
    });

    if (!pool.data?.content || !pool.data?.owner) {
      throw new Error('Pool-Daten nicht gefunden');
    }

    // Typ-sichere Überprüfung des Owner-Status
    const owner = pool.data.owner as ObjectOwner;
    const isLocked = owner === 'Immutable';
    
    // Hole Lock-Dauer falls vorhanden
    let lockDuration = 0;
    if (isLocked) {
      const eventFilter = {
        MoveEventType: `${poolId}::lock::LockEvent`
      };
      
      const lockEvents = await SUI.client.queryEvents({
        query: eventFilter
      });
      
      if (lockEvents.data.length > 0 && lockEvents.data[0].parsedJson) {
        const eventData = lockEvents.data[0].parsedJson as { duration?: number };
        lockDuration = eventData.duration || 0;
      }
    }

    logInfo('LP Status überprüft', {
      poolId,
      isLocked,
      lockDuration
    });

    return { isLocked, lockDuration };
  } catch (error) {
    logError('Fehler beim LP Status Check', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      poolId
    });
    return { isLocked: false, lockDuration: 0 };
  }
}

async function checkHoneypot(poolId: string) {
  try {
    // Simuliere Test-Trades
    const isHoneypot = false; // TODO: Implementiere Honeypot Detection
    
    return { isHoneypot };
  } catch (error) {
    logError('Fehler beim Honeypot Check', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
    return { isHoneypot: true };
  }
}

async function analyzeContract(poolId: string) {
  try {
    // Prüfe Contract-Funktionen
    const hasOwnership = false; // TODO: Implementiere Ownership Check
    const hasMintFunction = false; // TODO: Implementiere Mint Function Check
    
    return { hasOwnership, hasMintFunction };
  } catch (error) {
    logError('Fehler bei der Vertragsanalyse', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
    return { hasOwnership: true, hasMintFunction: true };
  }
}

async function analyzeDevWallet(poolId: string): Promise<DevWalletAnalysis> {
  try {
    // Hole Pool-Creator
    const creationTx = await SUI.client.getObject({
      id: poolId,
      options: { showPreviousTransaction: true }
    });

    if (!creationTx.data?.previousTransaction) {
      throw new Error('Creation TX nicht gefunden');
    }

    const txResponse = await SUI.client.getTransactionBlock({
      digest: creationTx.data.previousTransaction,
      options: {
        showEffects: true,
        showInput: true
      }
    });

    const creator = txResponse.transaction?.data.sender;
    if (!creator) {
      throw new Error('Creator nicht gefunden');
    }

    // Analysiere Creator-Wallet
    const [accountInfo, transactions] = await Promise.all([
      SUI.client.getObject({ id: creator }),
      SUI.client.queryTransactionBlocks({
        filter: { FromAddress: creator },
        options: { showEffects: true }
      })
    ]);

    // Berechne Account-Alter
    const firstTx = transactions.data[transactions.data.length - 1];
    const accountAge = firstTx ? 
      (Date.now() - Number(firstTx.timestampMs)) / 1000 : 
      0;

    // Analysiere Transaktionen
    const rugPulls = transactions.data.filter(tx => {
      const effects = tx.effects as ExtendedTransactionEffects;
      return effects?.status.status === 'failure' &&
             effects?.status.error?.includes('insufficient_funds');
    }).length;

    const poolCreations = transactions.data.filter(tx => {
      const effects = tx.effects as ExtendedTransactionEffects;
      const events = effects?.events || [];
      return events.some((e: SuiEvent) => 
        e.type.includes('::pool::CreatePoolEvent') ||
        e.type.includes('::factory::CreatePoolEvent')
      );
    }).length;

    // Berechne durchschnittliche Pool-Lebensdauer
    const poolLifetimes = await Promise.all(
      transactions.data
        .filter(tx => {
          const effects = tx.effects as ExtendedTransactionEffects;
          const events = effects?.events || [];
          return events.some((e: SuiEvent) => e.type.includes('pool'));
        })
        .map(async tx => {
          const effects = tx.effects as ExtendedTransactionEffects;
          const events = effects?.events || [];
          const poolEvents = events.filter((e: SuiEvent) => e.type.includes('pool'));
          if (poolEvents.length === 0) return 0;
          
          const eventData = poolEvents[0].parsedJson as { pool_id?: string };
          const poolId = eventData.pool_id;
          if (!poolId) return 0;

          const pool = await SUI.client.getObject({ id: poolId });
          return pool.data ? 
            (Date.now() - Number(tx.timestampMs)) / 1000 : 
            0;
        })
    );

    const averagePoolLifetime = poolLifetimes.length > 0 ?
      poolLifetimes.reduce((a, b) => a + b, 0) / poolLifetimes.length :
      0;

    return {
      accountAge,
      transactionCount: transactions.data.length,
      previousScams: Math.min(rugPulls, transactions.data.length),
      rugPulls,
      totalPools: poolCreations,
      averagePoolLifetime
    };

  } catch (error) {
    logError('Fehler bei der Entwickler-Wallet Analyse', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
    return {
      accountAge: 0,
      transactionCount: 0,
      previousScams: 0,
      rugPulls: 0,
      totalPools: 0,
      averagePoolLifetime: 0
    };
  }
}

async function analyzeToken(poolId: string): Promise<TokenAnalysis> {
  try {
    const pool = await SUI.client.getObject({
      id: poolId,
      options: { showContent: true }
    });

    if (!pool.data?.content) {
      throw new Error('Pool-Daten nicht gefunden');
    }

    const content = pool.data.content as SuiMoveObject;
    const poolType = content.type;
    const tokenType = poolType.split('<')[1].split(',')[0].trim();

    // Hole Token-Transaktionen mit korrektem Filter
    const transactionFilter: TransactionFilter = {
      InputObject: tokenType
    };

    const tokenTxs = await SUI.client.queryTransactionBlocks({
      filter: transactionFilter,
      options: { showEffects: true }
    });

    // Berechne Token-Alter
    const firstTx = tokenTxs.data[tokenTxs.data.length - 1];
    const age = firstTx ? 
      (Date.now() - Number(firstTx.timestampMs)) / 1000 : 
      0;

    // Analysiere Transfers mit Typ-Sicherheit
    const transfers = tokenTxs.data.filter(tx => {
      const effects = asExtendedEffects(tx.effects);
      return effects?.status.status === 'success';
    }).length;

    // Identifiziere verdächtige Transfers
    const suspiciousTransfers = tokenTxs.data.filter(tx => {
      const effects = asExtendedEffects(tx.effects);
      if (!effects || effects.status.status !== 'success') return false;
      
      const moveEvents = effects.events?.filter(e => e.type.includes('::transfer::')) || [];
      
      return moveEvents.some(e => {
        const transferData = e.parsedJson as { amount?: string };
        return Number(transferData.amount || 0) > 1000000000;
      });
    }).length;

    // Hole Token-Holder mit korrekter Typisierung
    const holders = await SUI.client.getAllCoins({
      owner: poolId,
      coinType: tokenType
    } as ExtendedGetAllCoinsParams) as PaginatedCoins;

    logInfo('Token-Analyse abgeschlossen', {
      poolId,
      age,
      holders: holders.data.length,
      transfers,
      suspiciousTransfers
    });

    return {
      age,
      holders: holders.data.length,
      transfers,
      suspiciousTransfers
    };

  } catch (error) {
    logError('Fehler bei der Token-Analyse', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      poolId
    });
    return {
      age: 0,
      holders: 0,
      transfers: 0,
      suspiciousTransfers: 0
    };
  }
}

async function analyzePoolMetrics(poolId: string): Promise<PoolMetrics> {
  try {
    // Hole Pool-Details
    const pool = await SUI.client.getObject({
      id: poolId,
      options: { showContent: true }
    });

    if (!pool.data?.content) {
      throw new Error('Pool-Daten nicht gefunden');
    }

    const content = pool.data.content as any;
    
    // Berechne Liquidität
    const liquidity = Number(content.fields?.reserve_a || 0) + 
                     Number(content.fields?.reserve_b || 0);

    // Berechne Liquiditäts-Score (0-100)
    const liquidityScore = Math.min(100, (liquidity / 1000000000) * 10);

    // Berechne Preis-Impact für 1 SUI
    const reserveA = Number(content.fields?.reserve_a || 0);
    const reserveB = Number(content.fields?.reserve_b || 0);
    const priceImpact = reserveA > 0 ? 
      (1000000000 / reserveA) * 100 : 
      100;

    // Simuliere Buy/Sell für Tax-Berechnung
    const buyTax = await calculateTax(poolId, true);
    const sellTax = await calculateTax(poolId, false);

    return {
      liquidity,
      liquidityScore,
      priceImpact,
      buyTax,
      sellTax
    };

  } catch (error) {
    logError('Fehler bei der Pool-Metrik Analyse', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
    return {
      liquidity: 0,
      liquidityScore: 0,
      priceImpact: 100,
      buyTax: 100,
      sellTax: 100
    };
  }
}

async function calculateTax(poolId: string, isBuy: boolean): Promise<number> {
  try {
    // Simuliere Trade
    const testAmount = BigInt(1000000000); // 1 SUI
    const tx = new Transaction();
    
    // Setze Gas-Budget
    tx.setGasBudget(BigInt(100000000));

    if (isBuy) {
      const [coin] = tx.splitCoins(tx.gas, [testAmount]);
      tx.moveCall({
        target: `${poolId}::pool::swap_exact_input`,
        arguments: [coin, testAmount] as TransactionArgument[]
      });
    } else {
      // TODO: Implementiere Sell-Simulation
    }

    // Führe Dry-Run aus
    const dryRun = await SUI.client.dryRunTransactionBlock({
      transactionBlock: tx.serialize()
    });

    const effects = dryRun.effects as ExtendedTransactionEffects;
    
    // Berechne Tax aus Differenz
    const expectedOutput = Number(testAmount) * 0.997; // 0.3% Gebühr
    const actualOutput = effects?.status.status === 'success' ?
      Number(effects.events?.[0]?.parsedJson?.amount || 0) :
      0;
    
    return Math.max(0, ((expectedOutput - actualOutput) / expectedOutput) * 100);

  } catch (error) {
    return isBuy ? 100 : 100;
  }
}

function calculateSecurityScore(
  lpStatus: LPStatus,
  honeypotStatus: any,
  contractAnalysis: any,
  devWalletAnalysis: DevWalletAnalysis,
  tokenAnalysis: TokenAnalysis,
  poolMetrics: PoolMetrics
): number {
  let score = 100;

  // LP Status (20%)
  if (!lpStatus.isLocked) score -= 20;

  // Honeypot (30%)
  if (honeypotStatus.isHoneypot) score -= 30;

  // Contract Analysis (20%)
  if (contractAnalysis.hasOwnership) score -= 10;
  if (contractAnalysis.hasMintFunction) score -= 10;

  // Dev Wallet (10%)
  if (devWalletAnalysis.accountAge < 7 * 24 * 60 * 60) score -= 5;
  if (devWalletAnalysis.transactionCount < 10) score -= 5;

  // Token Analysis (10%)
  if (tokenAnalysis.holders < 100) score -= 10;

  // Pool Metrics (10%)
  if (poolMetrics.liquidity < SUSPICIOUS_THRESHOLDS.MIN_LIQUIDITY) score -= 10;

  return Math.max(0, score);
}

function collectWarnings(
  lpStatus: LPStatus,
  honeypotStatus: any,
  contractAnalysis: any,
  devWalletAnalysis: DevWalletAnalysis,
  tokenAnalysis: TokenAnalysis,
  poolMetrics: PoolMetrics
): string[] {
  const warnings: string[] = [];

  if (!lpStatus.isLocked) {
    warnings.push('LP Token sind nicht gesperrt');
  }

  if (honeypotStatus.isHoneypot) {
    warnings.push('Möglicher Honeypot erkannt');
  }

  if (contractAnalysis.hasOwnership) {
    warnings.push('Contract hat noch einen Owner');
  }

  if (contractAnalysis.hasMintFunction) {
    warnings.push('Mint-Funktion gefunden');
  }

  if (devWalletAnalysis.accountAge < 7 * 24 * 60 * 60) {
    warnings.push('Entwickler-Wallet ist weniger als 7 Tage alt');
  }

  if (devWalletAnalysis.transactionCount < 10) {
    warnings.push('Entwickler-Wallet hat weniger als 10 Transaktionen');
  }

  if (tokenAnalysis.holders < 100) {
    warnings.push('Weniger als 100 Token-Holder');
  }

  if (poolMetrics.liquidity < SUSPICIOUS_THRESHOLDS.MIN_LIQUIDITY) {
    warnings.push('Geringe Liquidität');
  }

  return warnings;
} 