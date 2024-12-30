import {  upsertTrade, getOpenTrades, updateTrade } from "../db/trade";
import { SUI, SUPPORTED_DEX } from "../chain/config";
import { ParsedPoolData } from "../chain/extractor";
import wait from "../utils/wait";
import { sendBuyMessage, sendErrorMessage, sendSellMessage, sendUpdateMessage } from "../telegram"
import { sell as sellDirectCetus } from "./dex/cetus";
import { scamProbability } from "./checkscam";
import { sellWithAgg } from ".";

let trades: any[] = []

const tradesRunning = new Set<string>()
const stopLoss: Map<string, number> = new Map()
const maxVariance: Map<string, number> = new Map()

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
  let retries = 0
  let txId: string | null = null

  do {
    const tx = await sellWithAgg(_coinIn, amount)
    if (tx) {
      txId = tx
      break
    } else {
      console.log("Retrying...")
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
  } while (retries++ < 3)

  return txId
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
  console.log("PERFORM TRADE::", info)
  let variacao = ((Number(info.currentAmount) - Number(info.initialSolAmount)) / Number(info.initialSolAmount)) * 100

  const max = maxVariance.get(info.tokenToSell) || -1
  const stop = stopLoss.get(info.tokenToSell) || -10

  if (info.scamProbability > 50) {
    try {
      await wait(15000)
      await sellAction(info)
    } catch (e) {
      sendErrorMessage({ message: "Scam detected, but could not sell, sell by your own" })
    }
  }

  if (variacao > max) {
    maxVariance.set(info.tokenToSell, variacao)
  }

  if (max > 10) {
    stopLoss.set(info.tokenToSell, max - 10)
  }

  if (variacao < stop) {
    // sellAction
    try {
      await sellAction(info)
    }catch(e){
      return runTrade()
    }
  }

  if (variacao > 1) {
    try {
      await sellAction(info)
    }catch(e){
      console.log(e)
      return runTrade()
    }
  }

  console.log(variacao, max, stop)

  sendUpdateMessage({
    tokenAddress: info.tokenToSell,
    variacao,
    max,
    stop
  })
}

