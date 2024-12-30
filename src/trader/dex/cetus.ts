import { ParsedPoolData } from "../../chain/extractor";
import { SUI } from "../../chain/config";
import BN from "bn.js"
import { adjustForSlippage, CalculateRatesResult, d, Percentage } from "@cetusprotocol/cetus-sui-clmm-sdk";
import { TradingInfo } from "../tradeStrategy";
import { Pool } from "@cetusprotocol/cetus-sui-clmm-sdk";

export type QuoteType = {
  tokenIn: string
  tokenOut: string
  amountIn: string
  poolId: string
}

export async function getCetusPools() {
  const { cetusClmmSDK } = SUI

  const { Pool } = cetusClmmSDK

  const pools = await Pool.getPools()

  const poolsWithLiquidity = pools.filter(pool => {
    const sui = pool.coinTypeA.endsWith("::sui::SUI") ? pool.coinTypeA : pool.coinTypeB

    if(!sui.endsWith("::sui::SUI")) return false

    return Number(pool.liquidity) > 0 && pool.is_pause === false
  })

  return poolsWithLiquidity
}


export async function getQuote(pool: Pool) {
  const { cetusClmmSDK } = SUI

  const { Pool, Swap } = cetusClmmSDK

  Swap.sdk.senderAddress = SUI.signer.getPublicKey().toSuiAddress()

  const swapTicks = await Pool.fetchTicks({
    pool_id: pool.poolAddress,
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB
  })

  const a2b = pool.coinTypeA.endsWith("::sui::SUI");

  const amount = 0.05 * Math.pow(10, 9)
  const amountIn = new BN(amount)

  const res = Swap.calculateRates({
    decimalsA: 9,
    decimalsB: 9,
    a2b,
    byAmountIn: true,
    amount: amountIn,
    swapTicks,
    currentPool: pool
  })

  return res
}


export async function buy(poolData: ParsedPoolData) {
  const { cetusClmmSDK, client } = SUI

  const { Pool, Swap } = cetusClmmSDK

  const pool = await Pool.getPool(poolData.poolId)

  Swap.sdk.senderAddress = SUI.signer.getPublicKey().toSuiAddress()

  const swapTicks = await Pool.fetchTicks({
    pool_id: pool.poolAddress,
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB
  })

  const a2b = poolData.coinA.endsWith("::sui::SUI") === true;
  const byAmountIn = true
  const slippage = Percentage.fromDecimal(d(10))

  const amount = 0.05 * Math.pow(10, 9)
  console.log(amount)
  const amountIn = new BN(amount)

  const res = Swap.calculateRates({
    decimalsA: 9,
    decimalsB: 9,
    a2b,
    byAmountIn: true,
    amount: amountIn,
    swapTicks,
    currentPool: pool
  })


  console.log('calculateRates###res###', {
    estimatedAmountIn: res.estimatedAmountIn.toString() / Math.pow(10, 9),
    estimatedAmountOut: res.estimatedAmountOut.toString() / Math.pow(10, 9),
    estimatedEndSqrtPrice: res.estimatedEndSqrtPrice.toString(),
    estimatedFeeAmount: res.estimatedFeeAmount.toString(),
    isExceed: res.isExceed,
    extraComputeLimit: res.extraComputeLimit,
    amount: res.amount.toString(),
    aToB: res.aToB,
    byAmountIn: res.byAmountIn,
  })

  const preSwap: any = await Swap.preswap({
    pool: pool,
    currentSqrtPrice: pool.current_sqrt_price,
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB,
    decimalsA: 9,
    decimalsB: 9,
    amount: amountIn,
    byAmountIn,
    a2b,
  })

  console.log(preSwap)
  const toAmount = byAmountIn ? preSwap.estimatedAmountOut : preSwap.estimatedAmountIn
  const amountLimit = adjustForSlippage(new BN(toAmount), slippage, !byAmountIn)

  const swapPayload = await Swap.createSwapTransactionPayload(
    {
      pool_id: pool.poolAddress,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      a2b,
      by_amount_in: byAmountIn,
      amount: preSwap.amount,
      amount_limit: amountLimit.toString(),
    }
  )

  console.log('swapPayload: ', swapPayload)

  const tx = await client.signAndExecuteTransaction({ transaction: swapPayload, signer: SUI.signer })

  if (tx) {
    console.log('tx: ', tx)
    return tx.digest
  }


  return tx
}


export async function sell(sellData: TradingInfo) {
  const { cetusClmmSDK, client } = SUI

  const { Pool, Swap } = cetusClmmSDK

  const pool = await Pool.getPool(sellData.poolAddress)

  Swap.sdk.senderAddress = SUI.signer.getPublicKey().toSuiAddress()

  const swapTicks = await Pool.fetchTicks({
    pool_id: pool.poolAddress,
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB
  })

  const a2b = !sellData.suiIsA;
  const byAmountIn = true
  const slippage = Percentage.fromDecimal(d(10))

  const amount = sellData.tokenOnWallet
  console.log(amount)
  const amountIn = new BN(amount.toString())

  const coin = sellData.suiIsA ? pool.coinTypeB : pool.coinTypeA
  const correctCoin = coin.startsWith("0x") ? coin : `0x${coin}`

  const coinMetadata = await client.getCoinMetadata({ coinType: correctCoin })

  const res = Swap.calculateRates({
    decimalsA: sellData.suiIsA ? 9 : coinMetadata!.decimals,
    decimalsB: sellData.suiIsA ? coinMetadata!.decimals : 9,
    a2b,
    byAmountIn: true,
    amount: amountIn,
    swapTicks,
    currentPool: pool
  })


  console.log('calculateRates###res###', {
    estimatedAmountIn: res.estimatedAmountIn.toString() / Math.pow(10, coinMetadata!.decimals),
    estimatedAmountOut: res.estimatedAmountOut.toString() / Math.pow(10, 9),
    estimatedEndSqrtPrice: res.estimatedEndSqrtPrice.toString(),
    estimatedFeeAmount: res.estimatedFeeAmount.toString(),
    isExceed: res.isExceed,
    extraComputeLimit: res.extraComputeLimit,
    amount: res.amount.toString(),
    aToB: res.aToB,
    byAmountIn: res.byAmountIn,
  })

  const preSwap: any = await Swap.preswap({
    pool: pool,
    currentSqrtPrice: pool.current_sqrt_price,
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB,
    decimalsA: 9,
    decimalsB: 9,
    amount: amountIn,
    byAmountIn,
    a2b,
  })

  console.log(preSwap)
  const toAmount = byAmountIn ? preSwap.estimatedAmountOut : preSwap.estimatedAmountIn
  const amountLimit = adjustForSlippage(new BN(toAmount), slippage, !byAmountIn)

  const swapPayload = await Swap.createSwapTransactionPayload(
    {
      pool_id: pool.poolAddress,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      a2b,
      by_amount_in: byAmountIn,
      amount: preSwap.amount,
      amount_limit: amountLimit.toString(),
    }
  )

  console.log('swapPayload: ', swapPayload)

  const tx = await client.signAndExecuteTransaction({ transaction: swapPayload, signer: SUI.signer })

  if (tx) {
    console.log('tx: ', tx)
    return tx.digest
  }


  return tx
}
