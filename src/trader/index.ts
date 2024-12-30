import { getSwapData } from "./agg";
import { getTransactionInfo } from "../chain/extractor";
import { SUPPORTED_DEX, SUI } from "../chain/config";
import { buy as buyDirectCetus } from "./dex/cetus";
import { buyAction } from "./tradeStrategy";
import { checkIsHoneyPot } from "./checkIsHoneyPot";
import { checkIsBlackListed } from "./checkscam";

export async function buyWithAgg(inCoin: string, outCoin: string, amount: string) {
  const { client } = SUI
  const swapInfo = await getSwapData(inCoin, outCoin, amount.toString())

  console.log(swapInfo)

  if (!swapInfo) return null

  const { tx } = swapInfo

  if (tx) {
    const txId = await client.signAndExecuteTransaction({ transaction: tx, signer: SUI.signer })
    console.log(txId)
    return txId.digest
  }

  return null
}

export async function sellWithAgg(inCoin: string, amount: string) {
  const { client } = SUI
  console.log("SELLWITHAGG::", inCoin, amount)
  const swapInfo = await getSwapData(inCoin, "2::sui::SUI", amount)

  if (!swapInfo) return null

  const { tx: txAgg } = swapInfo

  if (txAgg) {
    const txId = await client.signAndExecuteTransaction({ transaction: txAgg, signer: SUI.signer })
    console.log(txId)
    return  txId.digest
  }

  return null
}

async function tryAgg(_coinIn: string, _coinOut: string, amount: string) {
  let retries = 0
  let txId: string | null = null

  do {
    const tx = await buyWithAgg(_coinIn, _coinOut, amount)
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


export async function trade(digest: string, dex: SUPPORTED_DEX = 'Cetus') {
  const info = await getTransactionInfo(digest, dex)

  if (!info) return null;

  const a2b = info.coinA.endsWith("::sui::SUI") === true;
  const amount = 0.05 * Math.pow(10, 9)

  const _coinIn = a2b ? info.coinA : info.coinB
  const _coinOut = a2b ? info.coinB : info.coinA

  if (_coinIn.endsWith("::sui::SUI") === false) {
    console.log("Pool requires SUI")
    return null
  }

  const isHoneyPot = await checkIsHoneyPot(_coinOut)

  if (isHoneyPot) {
    console.log("Honey pot detected")
    return null
  }

  if(checkIsBlackListed(_coinOut)) {
    console.log("Blacklisted token")
    return null
  }

  let txId: string | null = null

  console.log("BUYING, START TRADE::", _coinIn, _coinOut, amount)
  if (Number(info[a2b ? 'amountA' : 'amountB']) / Math.pow(10, 9) >= 300) {
    switch (dex) {
      case 'Cetus':
        txId = await buyDirectCetus(info)
        await buyAction(txId, info)
        break;

      case 'BlueMove':
        txId = await tryAgg("0x2::sui::SUI", _coinOut, amount.toString())
        await buyAction(txId as string, info)
        break

      case 'SuiSwap':
        //txId = await tryAgg(_coinIn, _coinOut, amount.toString())
        break

      default:
        break;
    }
  } else {
    console.log("Pool too small")
  }
}
