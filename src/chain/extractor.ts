import { SUI, SUPPORTED_DEX } from "./config.js";
import { SuiTransactionBlockResponse, SuiEvent, SuiObjectResponse, PaginatedCoins } from "@mysten/sui/client";
import { logDebug, logError } from "../utils/logger.js";

// Constants
const CETUS_CREATE_EVENT = '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::factory::CreatePoolEvent';
const CETUS_ADD_LIQUIDITY_EVENT = '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::pool::AddLiquidityEvent';
const BLUEMOVE_CREATE_EVENT = '0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Created_Pool_Event';
const BLUEMOVE_ADD_LIQUIDITY_EVENT = '0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Add_Liquidity_Pool';

// Cache für Token-Metadaten
const tokenMetadataCache = new Map<string, TokenMetadata>();
const poolDataCache = new Map<string, ParsedPoolData>();

export interface ParsedPoolData {
  poolId: string;
  coinA: string;
  coinB: string;
  amountA: string | number;
  amountB: string | number;
  liquidity?: any;
  dex: string;
  creator?: string;
  tokenSymbol?: string;
  tokenName?: string;
  tokenAddress?: string;
  dexType?: 'Cetus' | 'BlueMove' | 'Turbos' | 'Kriya' | 'Unknown';
  createdAt?: Date;
  volume24h?: number;
  priceChange24h?: number;
  socialLinks?: {
    website?: string;
    telegram?: string;
    twitter?: string;
    discord?: string;
  };
  metrics?: {
    holders?: number;
    transactions?: number;
    marketCap?: number;
    fullyDilutedValue?: number;
    volume24h?: number;
    priceChange24h?: number;
    buyTax?: number;
    sellTax?: number;
    liquidityLocked?: boolean;
    lockDuration?: number;
  };
  analytics?: {
    priceHistory?: Array<{timestamp: number, price: number}>;
    volumeHistory?: Array<{timestamp: number, volume: number}>;
    holderDistribution?: Record<string, number>;
    tradingPairs?: string[];
  };
  security?: {
    riskScore?: number;
    isHoneypot?: boolean;
    rugPullRisk?: number;
    ownershipRenounced?: boolean;
    mintingEnabled?: boolean;
    previousScams?: number;
  };
}

interface TokenMetadata {
  decimals: number;
  name: string;
  symbol: string;
  description?: string;
  iconUrl?: string;
  verified?: boolean;
  createdAt?: number;
}

type EventWithParsedJson = SuiEvent & {
  parsedJson: Record<string, any>;
}

interface BalanceChange {
  coinType: string;
  amount: string;
  owner: {
    AddressOwner: string;
  };
}

export interface ExtractedTransactionInfo {
  inputAmount: number;
  outputAmount: number;
  timestamp: number;
  success: boolean;
  coinA: string;
  coinB: string;
  amountA: string;
  amountB: string;
  poolId: string;
  dex?: string;
  slippage?: number;
  gasFee?: number;
  priceImpact?: number;
}

/**
 * Holt detaillierte Informationen zu einer Transaktion
 * @param txDigest Transaktions-Hash
 * @param dex DEX-Name
 * @returns Extrahierte Transaktionsinformationen
 */
export async function getTransactionInfo(txDigest: string, dex: string): Promise<ExtractedTransactionInfo | null> {
  try {
    logDebug('Hole Transaktionsinformationen', { txDigest, dex });
    
    const tx = await SUI.client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showInput: true,
        showEvents: true,
        showBalanceChanges: true,
        showObjectChanges: true,
      }
    });

    if (!tx || !tx.events) {
      logError('Keine Transaktionsdaten gefunden', { txDigest });
      return null;
    }

    // Extrahiere Zeitstempel
    const timestamp = tx.timestampMs || Date.now();
    
    // Extrahiere Gebühren
    const gasFee = tx.effects?.gasUsed ? 
      (Number(tx.effects.gasUsed.computationCost) + 
       Number(tx.effects.gasUsed.storageCost) - 
       Number(tx.effects.gasUsed.storageRebate)) / 1e9 : 
      undefined;

    // Extrahiere Balance-Änderungen für Slippage-Berechnung
    const balanceChanges = tx.balanceChanges || [];
    const suiChanges = balanceChanges.filter(bc => bc.coinType === '0x2::sui::SUI');
    const inputAmount = suiChanges.reduce((sum, bc) => {
      const amount = Number(bc.amount);
      return amount < 0 ? sum + Math.abs(amount) : sum;
    }, 0) / 1e9;
    
    // Extrahiere Pool-Daten
    let poolData: ParsedPoolData | null = null;
    
    if (dex.toLowerCase() === 'cetus') {
      poolData = parseCetusPoolData(tx);
    } else if (dex.toLowerCase() === 'bluemove') {
      poolData = parseBlueMovePooData(tx);
    }
    
    if (!poolData) {
      // Fallback: Extrahiere Daten aus Events
      poolData = decomposeEventData(tx.events[0]);
    }
    
    if (!poolData) {
      logError('Konnte keine Pool-Daten extrahieren', { txDigest });
      return null;
    }
    
    // Berechne Output-Menge
    const outputAmount = Math.random() * inputAmount * 1.2; // Simuliert für Backtest
    
    // Berechne Slippage
    const expectedOutput = inputAmount * 1.1; // Simuliert für Backtest
    const slippage = ((expectedOutput - outputAmount) / expectedOutput) * 100;
    
    // Berechne Price Impact
    const priceImpact = Math.random() * 5; // Simuliert für Backtest
    
    return {
      inputAmount,
      outputAmount,
      timestamp: Number(timestamp),
      success: tx.effects?.status?.status === 'success',
      coinA: poolData.coinA,
      coinB: poolData.coinB,
      amountA: poolData.amountA.toString(),
      amountB: poolData.amountB.toString(),
      poolId: poolData.poolId,
      dex: poolData.dex,
      slippage,
      gasFee,
      priceImpact
    };
  } catch (error) {
    logError('Fehler beim Abrufen der Transaktionsinformationen', { 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      txDigest 
    });
    return null;
  }
}

/**
 * Findet ein Event eines bestimmten Typs in einer Liste von Events
 */
function findEvent(events: SuiEvent[], eventType: string): EventWithParsedJson | undefined {
  return events.find((e: SuiEvent) => e.type === eventType) as EventWithParsedJson | undefined;
}

/**
 * Findet den Creator aus Balance-Änderungen
 */
function findCreatorFromBalanceChanges(balanceChanges: BalanceChange[]): string | undefined {
  const creatorBalance = balanceChanges.find(
    (b) => b.coinType.endsWith("::sui::SUI") && Number(b.amount) < 0
  );
  return creatorBalance?.owner?.AddressOwner;
}

/**
 * Validiert, ob alle erforderlichen Felder in einem Objekt vorhanden sind
 */
function validateRequiredFields(data: Record<string, any>, fields: string[]): boolean {
  return fields.every(field => {
    const value = data[field];
    return value !== undefined && value !== null && value !== '';
  });
}

/**
 * Parst Pool-Daten von Cetus
 */
function parseCetusPoolData(tx: SuiTransactionBlockResponse): ParsedPoolData | null {
  try {
    const createEvent = findEvent(tx.events!, CETUS_CREATE_EVENT);
    const addLiquidityEvent = findEvent(tx.events!, CETUS_ADD_LIQUIDITY_EVENT);

    if (!createEvent?.parsedJson || !addLiquidityEvent?.parsedJson) {
      throw new Error('Missing required Cetus events');
    }

    const requiredCreateFields = ['coin_type_a', 'coin_type_b', 'pool_id'];
    const requiredAddFields = ['amount_a', 'amount_b', 'after_liquidity'];

    if (!validateRequiredFields(createEvent.parsedJson, requiredCreateFields) ||
        !validateRequiredFields(addLiquidityEvent.parsedJson, requiredAddFields)) {
      throw new Error('Missing required fields in Cetus events');
    }

    const creator = tx.balanceChanges ? 
      findCreatorFromBalanceChanges(tx.balanceChanges as BalanceChange[]) :
      undefined;

    // Extrahiere Token-Metadaten
    const coinTypeA = createEvent.parsedJson.coin_type_a;
    const coinTypeB = createEvent.parsedJson.coin_type_b;
    
    // Bestimme, welcher Coin SUI ist und welcher der Token
    const isSuiA = coinTypeA === '0x2::sui::SUI';
    const tokenType = isSuiA ? coinTypeB : coinTypeA;
    
    // Hole Token-Metadaten (asynchron im Hintergrund)
    fetchTokenMetadata(tokenType).catch(err => 
      logError('Fehler beim Abrufen der Token-Metadaten', { error: String(err), tokenType })
    );
    
    // Berechne Liquidität in SUI
    const amountA = addLiquidityEvent.parsedJson.amount_a;
    const amountB = addLiquidityEvent.parsedJson.amount_b;
    const suiAmount = isSuiA ? Number(amountA) : Number(amountB);
    const tokenAmount = isSuiA ? Number(amountB) : Number(amountA);
    
    // Hole Token-Metadaten aus dem Cache
    const tokenMetadata = tokenMetadataCache.get(tokenType);
    
    const poolData: ParsedPoolData = {
      coinA: createEvent.parsedJson.coin_type_a,
      coinB: createEvent.parsedJson.coin_type_b,
      amountA: addLiquidityEvent.parsedJson.amount_a,
      amountB: addLiquidityEvent.parsedJson.amount_b,
      poolId: createEvent.parsedJson.pool_id,
      liquidity: addLiquidityEvent.parsedJson.after_liquidity,
      dex: 'Cetus',
      dexType: 'Cetus',
      creator,
      tokenSymbol: tokenMetadata?.symbol,
      tokenName: tokenMetadata?.name,
      tokenAddress: tokenType,
      createdAt: tx.timestampMs ? new Date(Number(tx.timestampMs)) : new Date(),
      metrics: {
        holders: 0,
        transactions: 0,
        marketCap: 0,
        fullyDilutedValue: 0
      }
    };
    
    // Speichere im Cache
    poolDataCache.set(poolData.poolId, poolData);
    
    return poolData;
  } catch (error) {
    logError('Fehler beim Parsen der Cetus Pool-Daten', { 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
    return null;
  }
}

/**
 * Parst Pool-Daten von BlueMove
 */
function parseBlueMovePooData(tx: SuiTransactionBlockResponse): ParsedPoolData | null {
  try {
    const createEvent = findEvent(tx.events!, BLUEMOVE_CREATE_EVENT);
    const addLiquidityEvent = findEvent(tx.events!, BLUEMOVE_ADD_LIQUIDITY_EVENT);

    if (!createEvent?.parsedJson || !addLiquidityEvent?.parsedJson) {
      throw new Error('Missing required BlueMove events');
    }

    // Skip if LSP balance is positive
    if (Number(createEvent.parsedJson.lsp_balance) > 0) {
      return null;
    }

    const creator = tx.balanceChanges ? 
      findCreatorFromBalanceChanges(tx.balanceChanges as BalanceChange[]) :
      undefined;

    // Extrahiere Token-Metadaten
    const coinTypeA = createEvent.parsedJson.coin_a;
    const coinTypeB = createEvent.parsedJson.coin_b;
    
    // Bestimme, welcher Coin SUI ist und welcher der Token
    const isSuiA = coinTypeA === '0x2::sui::SUI';
    const tokenType = isSuiA ? coinTypeB : coinTypeA;
    
    // Hole Token-Metadaten (asynchron im Hintergrund)
    fetchTokenMetadata(tokenType).catch(err => 
      logError('Fehler beim Abrufen der Token-Metadaten', { error: String(err), tokenType })
    );
    
    // Berechne Liquidität in SUI
    const amountA = addLiquidityEvent.parsedJson.coin_a_amount;
    const amountB = addLiquidityEvent.parsedJson.coin_b_amount;
    const suiAmount = isSuiA ? Number(amountA) : Number(amountB);
    const tokenAmount = isSuiA ? Number(amountB) : Number(amountA);
    
    // Hole Token-Metadaten aus dem Cache
    const tokenMetadata = tokenMetadataCache.get(tokenType);

    const poolData: ParsedPoolData = {
      coinA: coinTypeA,
      coinB: coinTypeB,
      amountA: amountA,
      amountB: amountB,
      poolId: createEvent.parsedJson.pool_id,
      liquidity: {
        sui: suiAmount / 1e9,
        token: tokenAmount / Math.pow(10, tokenMetadata?.decimals || 9)
      },
      dex: 'BlueMove',
      dexType: 'BlueMove',
      creator,
      tokenSymbol: tokenMetadata?.symbol,
      tokenName: tokenMetadata?.name,
      tokenAddress: tokenType,
      createdAt: tx.timestampMs ? new Date(Number(tx.timestampMs)) : new Date(),
      metrics: {
        holders: 0,
        transactions: 0,
        marketCap: 0,
        fullyDilutedValue: 0
      }
    };
    
    // Speichere im Cache
    poolDataCache.set(poolData.poolId, poolData);
    
    return poolData;
  } catch (error) {
    logError('Fehler beim Parsen der BlueMove Pool-Daten', { 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
    return null;
  }
}

/**
 * Extrahiert Pool-Daten aus einem Event
 */
export function decomposeEventData(event: SuiEvent): ParsedPoolData | null {
  try {
    if (!event || !event.type) {
      return null;
    }

    // Bestimme DEX-Typ basierend auf Event-Typ
    let dexType: 'Cetus' | 'BlueMove' | 'Turbos' | 'Kriya' | 'Unknown' = 'Unknown';
    let dex = 'Unknown';
    
    if (event.type.includes('cetus') || event.type.includes('1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb')) {
      dexType = 'Cetus';
      dex = 'Cetus';
    } else if (event.type.includes('bluemove') || event.type.includes('b24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9')) {
      dexType = 'BlueMove';
      dex = 'BlueMove';
    } else if (event.type.includes('turbos')) {
      dexType = 'Turbos';
      dex = 'Turbos';
    } else if (event.type.includes('kriya')) {
      dexType = 'Kriya';
      dex = 'Kriya';
    }

    // Parse Event-Daten basierend auf DEX-Typ
    const parsedJson = (event as EventWithParsedJson).parsedJson || {};
    
    // Extrahiere gemeinsame Felder
    const poolId = parsedJson.pool_id || parsedJson.poolId || '';
    const coinA = parsedJson.coin_type_a || parsedJson.coin_a || parsedJson.coinTypeA || '';
    const coinB = parsedJson.coin_type_b || parsedJson.coin_b || parsedJson.coinTypeB || '';
    const amountA = parsedJson.amount_a || parsedJson.coin_a_amount || parsedJson.amountA || '0';
    const amountB = parsedJson.amount_b || parsedJson.coin_b_amount || parsedJson.amountB || '0';
    
    // Bestimme, welcher Coin SUI ist und welcher der Token
    const isSuiA = coinA === '0x2::sui::SUI';
    const tokenType = isSuiA ? coinB : coinA;
    
    // Hole Token-Metadaten (asynchron im Hintergrund)
    fetchTokenMetadata(tokenType).catch(err => 
      logError('Fehler beim Abrufen der Token-Metadaten', { error: String(err), tokenType })
    );
    
    // Berechne Liquidität in SUI
    const suiAmount = isSuiA ? Number(amountA) : Number(amountB);
    const tokenAmount = isSuiA ? Number(amountB) : Number(amountA);
    
    // Hole Token-Metadaten aus dem Cache
    const tokenMetadata = tokenMetadataCache.get(tokenType);

    const poolData: ParsedPoolData = {
      poolId,
      coinA,
      coinB,
      amountA,
      amountB,
      liquidity: {
        sui: suiAmount / 1e9,
        token: tokenAmount / Math.pow(10, tokenMetadata?.decimals || 9)
      },
      dex,
      dexType,
      tokenSymbol: tokenMetadata?.symbol,
      tokenName: tokenMetadata?.name,
      tokenAddress: tokenType,
      createdAt: event.timestampMs ? new Date(Number(event.timestampMs)) : new Date()
    };
    
    // Speichere im Cache
    if (poolId) {
      poolDataCache.set(poolId, poolData);
    }
    
    return poolData;
  } catch (error) {
    logError('Fehler beim Extrahieren der Event-Daten', { 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      eventType: event.type 
    });
    return null;
  }
  }

/**
 * Extrahiert Pool-Daten aus einer Transaktion basierend auf dem DEX
 */
export function decomposeTransactionByDex(tx: SuiTransactionBlockResponse, dex: SUPPORTED_DEX): ParsedPoolData | null {
  try {
    if (!tx || !tx.events || tx.events.length === 0) {
      return null;
    }

    switch (dex) {
      case 'Cetus':
        return parseCetusPoolData(tx);
      case 'BlueMove':
        return parseBlueMovePooData(tx);
      default:
        // Versuche, Daten aus dem ersten Event zu extrahieren
        return decomposeEventData(tx.events[0]);
    }
  } catch (error) {
    logError('Fehler beim Extrahieren der Transaktionsdaten', { 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      dex 
    });
    return null;
  }
}

/**
 * Holt Token-Metadaten und speichert sie im Cache
 */
async function fetchTokenMetadata(tokenType: string): Promise<TokenMetadata | null> {
  // Prüfe Cache
  if (tokenMetadataCache.has(tokenType)) {
    return tokenMetadataCache.get(tokenType) || null;
  }
  
  try {
    // Simuliere Metadaten-Abruf für den Backtest
    const metadata: TokenMetadata = {
      decimals: 9,
      name: `Token ${tokenType.substring(0, 8)}`,
      symbol: `TKN${tokenType.substring(0, 4)}`,
      description: 'Ein SUI Token',
      verified: Math.random() > 0.7,
      createdAt: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
    };
    
    // Speichere im Cache
    tokenMetadataCache.set(tokenType, metadata);
    
    return metadata;
  } catch (error) {
    logError('Fehler beim Abrufen der Token-Metadaten', { 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      tokenType 
    });
    return null;
  }
}

/**
 * Holt erweiterte Pool-Daten mit On-Chain-Analytics
 */
export async function getEnhancedPoolData(poolId: string): Promise<ParsedPoolData | null> {
  // Prüfe Cache
  if (poolDataCache.has(poolId)) {
    const cachedData = poolDataCache.get(poolId);
    
    // Wenn die Daten vollständig sind, gib sie zurück
    if (cachedData?.metrics?.holders && cachedData?.metrics?.transactions) {
      return cachedData;
    }
  }
  
  try {
    // Hole Basis-Pool-Daten
    const poolData = poolDataCache.get(poolId) || {
      poolId,
      coinA: '',
      coinB: '',
      amountA: '0',
      amountB: '0',
      dex: 'Unknown'
    };
    
    // Simuliere On-Chain-Analytics für den Backtest
    const holders = Math.floor(Math.random() * 1000) + 50;
    const transactions = Math.floor(Math.random() * 5000) + 100;
    const volume24h = Math.random() * 10000;
    const priceChange24h = (Math.random() * 40) - 20; // -20% bis +20%
    const buyTax = Math.random() * 5;
    const sellTax = Math.random() * 10;
    const liquidityLocked = Math.random() > 0.3;
    const lockDuration = liquidityLocked ? Math.floor(Math.random() * 365) + 30 : 0;
    
    // Simuliere Preis-Historie
    const priceHistory = [];
    const now = Date.now();
    const basePrice = Math.random() * 0.001;
    
    for (let i = 0; i < 24; i++) {
      const timestamp = now - (23 - i) * 60 * 60 * 1000;
      const volatility = Math.random() * 0.2 - 0.1; // -10% bis +10%
      const price = basePrice * (1 + volatility);
      priceHistory.push({ timestamp, price });
    }
    
    // Simuliere Volumen-Historie
    const volumeHistory = [];
    const baseVolume = Math.random() * 5000;
    
    for (let i = 0; i < 24; i++) {
      const timestamp = now - (23 - i) * 60 * 60 * 1000;
      const volatility = Math.random() * 1.5 + 0.5; // 0.5x bis 2x
      const volume = baseVolume * volatility;
      volumeHistory.push({ timestamp, volume });
    }
    
    // Simuliere Holder-Verteilung
    const holderDistribution: Record<string, number> = {
      'Top 1': Math.random() * 30 + 10, // 10-40%
      'Top 10': Math.random() * 20 + 20, // 20-40%
      'Top 50': Math.random() * 20 + 10, // 10-30%
      'Rest': Math.random() * 30 + 10 // 10-40%
    };
    
    // Simuliere Sicherheits-Metriken
    const riskScore = Math.floor(Math.random() * 100);
    const isHoneypot = Math.random() < 0.1;
    const rugPullRisk = Math.floor(Math.random() * 100);
    const ownershipRenounced = Math.random() > 0.7;
    const mintingEnabled = Math.random() < 0.3;
    const previousScams = Math.floor(Math.random() * 3);
    
    // Erweitere Pool-Daten
    const enhancedPoolData: ParsedPoolData = {
      ...poolData,
      metrics: {
        ...poolData.metrics,
        holders,
        transactions,
        volume24h,
        priceChange24h,
        buyTax,
        sellTax,
        liquidityLocked,
        lockDuration
      },
      analytics: {
        priceHistory,
        volumeHistory,
        holderDistribution,
        tradingPairs: ['SUI', 'USDC', 'USDT']
      },
      security: {
        riskScore,
        isHoneypot,
        rugPullRisk,
        ownershipRenounced,
        mintingEnabled,
        previousScams
      }
    };
    
    // Speichere im Cache
    poolDataCache.set(poolId, enhancedPoolData);
    
    return enhancedPoolData;
  } catch (error) {
    logError('Fehler beim Abrufen erweiterter Pool-Daten', { 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      poolId 
    });
    return null;
  }
}
