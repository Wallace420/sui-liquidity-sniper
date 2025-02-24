import {  upsertTrade, getOpenTrades, updateTrade } from "../db/trade";
import { SUI, SUPPORTED_DEX } from "../chain/config";
import { ParsedPoolData } from "../chain/extractor";
import wait from "../utils/wait";
import { sendBuyMessage, sendErrorMessage, sendSellMessage, sendUpdateMessage } from "../telegram"
import { sell as sellDirectCetus } from "./dex/cetus";
import { scamProbability } from "./checkscam";
import { sellWithAgg } from ".";

let trades: any[] = []

const tradesRunning = new Set<string>();
const stopLoss: Map<string, number> = new Map();
const maxVariance: Map<string, number> = new Map();
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second

export type TradingInfo = {
  initialSolAmount: string,
  currentAmount: string,
  tokenToSell: string,
  tokenOnWallet: string,
  poolAddress: string,
  dex: SUPPORTED_DEX,
  suiIsA: boolean,
  scamProbability: number
}


async function tryAgg(_coinIn: string, _coinOut: string, amount: string) {
  let retries = 0;
  let txId: string | null = null;
  let lastError: Error | null = null;

  while (retries < MAX_RETRIES) {
    try {
      const tx = await sellWithAgg(_coinIn, amount);
      if (tx) {
        txId = tx;
        break;
      }
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${retries + 1}/${MAX_RETRIES} failed:`, error);
    }

    retries++;
    if (retries < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY}ms... (${retries}/${MAX_RETRIES})`);
      await wait(RETRY_DELAY);
    }
  }

  if (!txId && lastError) {
    throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
  }

  return txId;
}

export async function buyAction(digest: string, info: ParsedPoolData | null) {
  const { client } = SUI

  try {
    const trade = await client.getTransactionBlock({
      digest: digest,
      options: {
        showBalanceChanges: true
      }
    })
    const { balanceChanges } = trade

    if (!balanceChanges) return null;

    if (balanceChanges) {
      const suiBalance = balanceChanges.find((b: any) => b.coinType.endsWith("::SUI"))
      const tokenBalance = balanceChanges.find((b: any) => !b.coinType.endsWith("::SUI"))

      const scamChance = await scamProbability(info!)

      await upsertTrade({
        tokenAddress: tokenBalance!.coinType,
        tokenAmount: tokenBalance!.amount,
        buyDigest: digest,
        suiSpentAmount: Math.abs(Number(suiBalance!.amount)).toString(),
        dex: info?.dex || 'Cetus',
        poolAddress: info?.poolId,
        amountA: info?.amountA,
        amountB: info?.amountB,
        suiIsA: info?.coinA.endsWith("::SUI") === true,
        scamProbability: scamChance
      })

      sendBuyMessage({
        tokenAddress: tokenBalance!.coinType,
        tokenAmount: tokenBalance!.amount,
        buyDigest: digest,
        suiSpentAmount: Math.abs(Number(suiBalance!.amount)).toString(),
        dex: info?.dex || 'Cetus',
        poolAddress: info?.poolId,
        scamProbability: scamChance,
        sellAction: () => sellAction({
          initialSolAmount: '0',
          currentAmount: '0',
          tokenToSell: tokenBalance!.coinType,
          tokenOnWallet: tokenBalance!.amount,
          poolAddress: info?.poolId as string,
          dex: info?.dex || 'Cetus',
          suiIsA: info?.coinA.endsWith("::sui::SUI") === true,
          scamProbability: scamChance
        }),

      })
    }
  } catch (e) {
    console.log(e, "Error getting transaction block")
    await wait(1000)
    return buyAction(digest, info)
  }
}

export async function sellAction(TradingInfo: TradingInfo) {
  const { client } = SUI
  let tx: string | null = null

  console.log("SELL ACTION::", TradingInfo)

  switch (TradingInfo.dex) {
    case 'Cetus':
      tx = await sellDirectCetus(TradingInfo)
      //tx = await tryAgg(TradingInfo.tokenToSell, "2::sui::SUI", TradingInfo.tokenOnWallet)
      break

    case 'BlueMove':
      tx = await tryAgg(TradingInfo.tokenToSell, "2::sui::SUI", TradingInfo.tokenOnWallet)
      break

    default:
      break
  }

  if (tx) {
    const trade = await client.waitForTransaction({
      digest: tx,
      options: {
        showBalanceChanges: true
      },
      pollInterval: 1000,
      timeout: 100000
    })

    const { balanceChanges } = trade

    if (!balanceChanges) return null;

    if (balanceChanges) {
      const suiBalance = balanceChanges.find((b: any) => b.coinType.endsWith("::sui::SUI"))

      await updateTrade({
        poolAddress: TradingInfo.poolAddress,
        sellDigest: tx,
        suiReceivedAmount: Math.abs(Number(suiBalance!.amount)).toString(),
      })

      await sendSellMessage(tx, TradingInfo.poolAddress)
    }
  }
}


async function recoverPoolData(trade: any) {
  const { client } = SUI
  let response: any = null

  const data = await client.getObject({
    id: trade.poolAddress,
    options: {
      showContent: true
    }
  })

  switch (trade.dex) {
    case 'Cetus':
      //@ts-ignore
      const cetusCurrentData = data.data?.content.fields

      const cetusInfo = {
        initialSolAmount: trade.suiIsA ? trade.initialPoolAmountA : trade.initialPoolAmountB,
        currentAmount: trade.suiIsA ? cetusCurrentData.coin_a : cetusCurrentData.coin_b,
        tokenToSell: trade.tokenAddress,
        tokenOnWallet: trade.tokenAmount,
        poolAddress: trade.poolAddress,
        suiIsA: trade.suiIsA,
        dex: trade.dex,
        scamProbability: trade.scamProbability
      }

      response = cetusInfo
      break;

    case 'BlueMove':
      //@ts-ignore
      const blueMoveCurrentData = data.data?.content.fields

      const BlueMoveInfo = {
        initialSolAmount: trade.suiIsA ? trade.initialPoolAmountA : trade.initialPoolAmountB,
        currentAmount: trade.suiIsA ? blueMoveCurrentData.reserve_x : blueMoveCurrentData.reserve_y,
        tokenToSell: trade.tokenAddress,
        tokenOnWallet: trade.tokenAmount,
        poolAddress: trade.poolAddress,
        suiIsA: trade.suiIsA,
        dex: trade.dex,
        scamProbability: trade.scamProbability
      }

      response = BlueMoveInfo
      break;

    default:
      break;
  }

  return response
}


export async function runTrade() {
  console.log("Running trade")

  do {
    const openTrades = await getOpenTrades()

    if (openTrades.length > 0) {
      for (const trade of openTrades) {
        const info = await recoverPoolData(trade)

        performTrade(info)
        await wait(2000)
      }
    } else {
      await wait(2000)
      continue
    }

  } while (true)
}


async function performTrade(info: TradingInfo) {
  if (tradesRunning.has(info.tokenToSell)) {
    console.log(`Trade already running for ${info.tokenToSell}`);
    return;
  }

  try {
    tradesRunning.add(info.tokenToSell);
    console.log("PERFORM TRADE::", info);
    
    const variacao = ((Number(info.currentAmount) - Number(info.initialSolAmount)) / Number(info.initialSolAmount)) * 100;
    const max = maxVariance.get(info.tokenToSell) || -1;
    const stop = stopLoss.get(info.tokenToSell) || -10;

    // High scam probability - sell quickly
    if (info.scamProbability > 50) {
      console.log(`High scam probability (${info.scamProbability}%) detected for ${info.tokenToSell}`);
      try {
        await Promise.race([
          sellAction(info),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Sell timeout')), 20000))
        ]);
      } catch (e: any) {
        console.error('Emergency sell failed:', e);
        sendErrorMessage({ message: `Scam detected (${info.scamProbability}%), emergency sell failed: ${e?.message || 'Unknown error'}` });
      }
      return;
    }

    // Update max variance and stop loss
    if (variacao > max) {
      maxVariance.set(info.tokenToSell, variacao);
      if (variacao > 10) {
        const newStop = variacao - 10;
        stopLoss.set(info.tokenToSell, newStop);
        console.log(`Updated stop loss to ${newStop}% for ${info.tokenToSell}`);
      }
    }

    // Check sell conditions
    if (variacao < stop || variacao > 1) {
      console.log(`Selling ${info.tokenToSell} - Variation: ${variacao}%, Stop: ${stop}%, Max: ${max}%`);
      try {
        await sellAction(info);
      } catch (e: any) {
        console.error('Sell failed:', e);
        sendErrorMessage({ 
          message: `Sell failed for ${info.tokenToSell}: ${e?.message || 'Unknown error'}\nVariation: ${variacao}%\nStop: ${stop}%\nMax: ${max}%` 
        });
      }
      return;
    }

    sendUpdateMessage({
      tokenAddress: info.tokenToSell,
      variacao,
      max,
      stop
    });
    
  } catch (e: any) {
    console.error('Trade execution error:', e);
    sendErrorMessage({ message: `Trade error for ${info.tokenToSell}: ${e?.message || 'Unknown error'}` });
  } finally {
    tradesRunning.delete(info.tokenToSell);
  }
}
