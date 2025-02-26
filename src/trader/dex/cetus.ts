import { ParsedPoolData } from "../../chain/extractor.js";
import { SUI } from "../../chain/config.js";
import { logError, logInfo } from '../../utils/logger.js';
// @ts-ignore: Keine Typdefinition für bn.js
import BN = require("bn.js");
import { adjustForSlippage, CalculateRatesResult, d, Percentage } from "@cetusprotocol/cetus-sui-clmm-sdk";
import { TradingInfo } from "../tradeStrategy.js";
import { Transaction } from '@mysten/sui/transactions';

// Konstanten
const CETUS_PACKAGE = '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb';
const CETUS_ROUTER = '0xdee9::clob_v2::Pool<0x2::sui::SUI, CoinType>';

export type QuoteType = {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  poolId: string;
};

/**
 * Holt alle Cetus Pools mit der SDK-Methode
 */
export async function getCetusPools() {
  const { cetusClmmSDK } = SUI;
  
  // Setze die Signer-Adresse, falls vorhanden
  if (SUI.signer) {
    cetusClmmSDK.senderAddress = SUI.signer.getPublicKey().toSuiAddress();
  }
  
  try {
    // Verwende die Pool-Methode der SDK
    const pools = await cetusClmmSDK.Pool.getPools();
    
    // Filtere Pools mit Liquidität und SUI
    const poolsWithLiquidity = pools.filter((pool) => {
      const sui = pool.coinTypeA.endsWith("::sui::SUI") ? pool.coinTypeA : pool.coinTypeB;
      
      if (!sui.endsWith("::sui::SUI")) return false;
      
      return Number(pool.liquidity) > 0 && pool.is_pause === false;
    });
    
    return poolsWithLiquidity;
  } catch (error) {
    logError("Fehler beim Abrufen der Cetus Pools", {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
    return [];
  }
}

/**
 * Alternative Methode zum Abrufen von Cetus Pools über Events
 */
export async function getCetusPoolsViaEvents() {
  try {
    const events = await SUI.client.queryEvents({
      query: { 
        MoveEventType: `${CETUS_PACKAGE}::pool::PoolCreatedEvent` 
      }
    });
    return events.data;
  } catch (error) {
    logError('Fehler beim Abrufen der Cetus Pools via Events', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
    return [];
  }
}

/**
 * Holt ein Quote für einen Pool
 */
export async function getQuote(pool: any) {
  const { cetusClmmSDK } = SUI;
  
  if (!SUI.signer) {
    throw new Error("SUI.signer is not initialized.");
  }
  
  // Setze die Signer-Adresse
  cetusClmmSDK.senderAddress = SUI.signer.getPublicKey().toSuiAddress();
  
  try {
    // Hole die Ticks für den Pool
    const swapTicks = await cetusClmmSDK.Pool.fetchTicks({
      pool_id: pool.poolAddress,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
    });
    
    const a2b = pool.coinTypeA.endsWith("::sui::SUI");
    
    // SUI QUANTITY (0.05 SUI)
    const amount = new BN(0.05 * Math.pow(10, 9));
    
    // Berechne die Raten
    const res = await cetusClmmSDK.Swap.calculateRates({
      decimalsA: 9,
      decimalsB: 9,
      a2b,
      byAmountIn: true,
      amount: amount,
      swapTicks,
      currentPool: pool,
    });
    
    return res;
  } catch (error) {
    logError("Fehler beim Abrufen des Quotes", {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
    throw error;
  }
}

/**
 * Kauft Token mit der Cetus SDK
 */
export async function buy(poolData: ParsedPoolData) {
  const { cetusClmmSDK, client } = SUI;
  
  if (!SUI.signer) {
    throw new Error("SUI.signer is not initialized.");
  }
  
  // Setze die Signer-Adresse
  cetusClmmSDK.senderAddress = SUI.signer.getPublicKey().toSuiAddress();
  
  try {
    // Hole den Pool
    const pool = await cetusClmmSDK.Pool.getPool(poolData.poolId);
    
    // Hole die Ticks für den Pool
    const swapTicks = await cetusClmmSDK.Pool.fetchTicks({
      pool_id: pool.poolAddress,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
    });
    
    const a2b = poolData.coinA.endsWith("::sui::SUI") === true;
    const byAmountIn = true;
    const slippage = Percentage.fromDecimal(d(10));
    
    // SUI QUANTITY (0.05 SUI)
    const amountIn = new BN(0.05 * Math.pow(10, 9));
    logInfo("Kaufbetrag", { amount: amountIn.toString() });
    
    // Berechne die Raten
    const res = await cetusClmmSDK.Swap.calculateRates({
      decimalsA: 9,
      decimalsB: 9,
      a2b,
      byAmountIn: true,
      amount: amountIn,
      swapTicks,
      currentPool: pool,
    });
    
    logInfo("Berechnete Raten", {
      estimatedAmountIn: Number(res.estimatedAmountIn.toString()) / Math.pow(10, 9),
      estimatedAmountOut: Number(res.estimatedAmountOut.toString()) / Math.pow(10, 9),
      estimatedEndSqrtPrice: res.estimatedEndSqrtPrice.toString(),
      estimatedFeeAmount: res.estimatedFeeAmount.toString(),
      isExceed: res.isExceed,
      extraComputeLimit: res.extraComputeLimit,
      amount: res.amount.toString(),
      aToB: res.aToB,
      byAmountIn: res.byAmountIn,
    });
    
    // Führe Preswap durch
    const preSwap = await cetusClmmSDK.Swap.preswap({
      pool: pool,
      currentSqrtPrice: pool.current_sqrt_price,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      decimalsA: 9,
      decimalsB: 9,
      amount: amountIn.toString(),
      byAmountIn,
      a2b,
    });
    
    logInfo("Preswap Ergebnis", { preSwap });
    
    if (!preSwap) {
      throw new Error("Preswap failed");
    }
    
    const toAmount = byAmountIn ? preSwap.estimatedAmountOut : preSwap.estimatedAmountIn;
    const amountLimit = adjustForSlippage(new BN(toAmount), slippage, !byAmountIn);
    
    // Erstelle die Swap-Transaktion
    const swapPayload = await cetusClmmSDK.Swap.createSwapTransactionPayload({
      pool_id: pool.poolAddress,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      a2b,
      by_amount_in: byAmountIn,
      amount: preSwap.amount,
      amount_limit: amountLimit.toString(),
    });
    
    logInfo("Swap Payload", { swapPayload });
    
    // Signiere und führe die Transaktion aus
    const tx = await client.signAndExecuteTransaction({
      transaction: swapPayload as any,
      signer: SUI.signer
    });
    
    if (tx) {
      logInfo("Transaktion erfolgreich", { tx: tx.digest });
      return tx.digest;
    }
    
    return tx;
  } catch (error) {
    logError("Fehler beim Kauf", {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      poolId: poolData.poolId
    });
    throw error;
  }
}

/**
 * Verkauft Token mit der Cetus SDK
 */
export async function sell(sellData: TradingInfo) {
  const { cetusClmmSDK, client } = SUI;
  
  if (!SUI.signer) {
    throw new Error("SUI.signer is not initialized.");
  }
  
  // Setze die Signer-Adresse
  cetusClmmSDK.senderAddress = SUI.signer.getPublicKey().toSuiAddress();
  
  try {
    // Hole den Pool
    const pool = await cetusClmmSDK.Pool.getPool(sellData.poolAddress);
    
    // Hole die Ticks für den Pool
    const swapTicks = await cetusClmmSDK.Pool.fetchTicks({
      pool_id: pool.poolAddress,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
    });
    
    const a2b = !sellData.suiIsA;
    const byAmountIn = true;
    const slippage = Percentage.fromDecimal(d(10));
    
    const amountIn = new BN(sellData.tokenOnWallet.toString());
    logInfo("Verkaufsbetrag", { amount: amountIn.toString() });
    
    const coin = sellData.suiIsA ? pool.coinTypeB : pool.coinTypeA;
    const correctCoin = coin.startsWith("0x") ? coin : `0x${coin}`;
    
    const coinMetadata = await client.getCoinMetadata({ coinType: correctCoin });
    
    // Berechne die Raten
    const res = await cetusClmmSDK.Swap.calculateRates({
      decimalsA: sellData.suiIsA ? 9 : coinMetadata!.decimals,
      decimalsB: sellData.suiIsA ? coinMetadata!.decimals : 9,
      a2b,
      byAmountIn: true,
      amount: amountIn,
      swapTicks,
      currentPool: pool,
    });
    
    logInfo("Berechnete Verkaufsraten", {
      estimatedAmountIn: Number(res.estimatedAmountIn.toString()) / Math.pow(10, coinMetadata!.decimals),
      estimatedAmountOut: Number(res.estimatedAmountOut.toString()) / Math.pow(10, 9),
      estimatedEndSqrtPrice: res.estimatedEndSqrtPrice.toString(),
      estimatedFeeAmount: res.estimatedFeeAmount.toString(),
      isExceed: res.isExceed,
      extraComputeLimit: res.extraComputeLimit,
      amount: res.amount.toString(),
      aToB: res.aToB,
      byAmountIn: res.byAmountIn,
    });
    
    // Führe Preswap durch
    const preSwap = await cetusClmmSDK.Swap.preswap({
      pool: pool,
      currentSqrtPrice: pool.current_sqrt_price,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      decimalsA: 9,
      decimalsB: 9,
      amount: amountIn.toString(),
      byAmountIn,
      a2b,
    });
    
    logInfo("Preswap Verkauf", { preSwap });
    
    if (!preSwap) {
      throw new Error("Preswap failed");
    }
    
    const toAmount = byAmountIn ? preSwap.estimatedAmountOut : preSwap.estimatedAmountIn;
    const amountLimit = adjustForSlippage(new BN(toAmount), slippage, !byAmountIn);
    
    // Erstelle die Swap-Transaktion
    const swapPayload = await cetusClmmSDK.Swap.createSwapTransactionPayload({
      pool_id: pool.poolAddress,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      a2b,
      by_amount_in: byAmountIn,
      amount: preSwap.amount,
      amount_limit: amountLimit.toString(),
    });
    
    logInfo("Swap Verkauf Payload", { swapPayload });
    
    // Signiere und führe die Transaktion aus
    const tx = await client.signAndExecuteTransaction({
      transaction: swapPayload as any,
      signer: SUI.signer
    });
    
    if (tx) {
      logInfo("Verkaufstransaktion erfolgreich", { tx: tx.digest });
      return tx.digest;
    }
    
    return tx;
  } catch (error) {
    logError("Fehler beim Verkauf", {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      poolAddress: sellData.poolAddress,
      // Verwende den Token-Typ aus dem Pool, falls tokenAddress nicht in TradingInfo existiert
      tokenType: sellData.suiIsA ? "Token B" : "Token A"
    });
    throw error;
  }
}

/**
 * Erstellt eine Transaktion zum Kauf von Token mit der Transaction API
 */
export async function createCetusBuyTransaction(
  poolId: string,
  tokenAddress: string,
  amount: number
): Promise<Transaction> {
  try {
    const tx = new Transaction();
    tx.setGasBudget(100000000);

    // Erstelle Coin für SUI Input
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);

    // Hole Pool-Objekt
    const pool = await SUI.client.getObject({
      id: poolId,
      options: { showContent: true }
    });

    if (!pool.data?.content) {
      throw new Error('Pool nicht gefunden');
    }

    // Berechne Slippage (1%)
    const minOutput = Math.floor(amount * 0.99);

    // Swap-Funktion aufrufen
    tx.moveCall({
      target: `${CETUS_PACKAGE}::router::swap_exact_input`,
      arguments: [
        tx.object(CETUS_ROUTER),
        coin,
        tx.pure.u64(minOutput),
        tx.object(poolId)
      ]
    });

    return tx;

  } catch (error) {
    logError('Fehler beim Erstellen der Cetus Transaktion', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      poolId,
      tokenAddress
    });
    throw error;
  }
}

/**
 * Erstellt eine Transaktion zum Verkauf von Token mit der Transaction API
 */
export async function createCetusSellTransaction(
  poolId: string,
  tokenAddress: string,
  amount: bigint
): Promise<Transaction> {
  try {
    const tx = new Transaction();
    tx.setGasBudget(100000000);

    // Hole Token-Objekt
    const tokens = await SUI.client.getCoins({
      owner: tokenAddress,
      coinType: tokenAddress
    });

    if (tokens.data.length === 0) {
      throw new Error('Keine Token zum Verkaufen gefunden');
    }

    // Berechne Slippage (1%)
    const minOutput = (amount * BigInt(99)) / BigInt(100);

    // Swap-Funktion aufrufen
    tx.moveCall({
      target: `${CETUS_PACKAGE}::router::swap_exact_output`,
      arguments: [
        tx.object(CETUS_ROUTER),
        tx.object(tokens.data[0].coinObjectId),
        tx.pure.u64(Number(minOutput)),
        tx.object(poolId)
      ]
    });

    return tx;

  } catch (error) {
    logError('Fehler beim Erstellen der Cetus Verkaufs-Transaktion', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      poolId,
      tokenAddress
    });
    throw error;
  }
}
