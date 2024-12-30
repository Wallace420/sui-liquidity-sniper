import { getQuote, buildTx } from "@7kprotocol/sdk-ts";
import { SUI } from "../chain/config";

const getSwapData = async (tokenIn: string, tokenOut: string, amountIn: string) => {
  const correctTokenIn = tokenIn.startsWith("0x") ? tokenIn : `0x${tokenIn}`
  const correctTokenOut = tokenOut.startsWith("0x") ? tokenOut : `0x${tokenOut}`

  console.log("GET QUOTE::", correctTokenIn, correctTokenOut, amountIn)

  try {
    const quote = await getQuote({
      tokenIn: correctTokenIn,
      tokenOut: correctTokenOut,
      amountIn
    })

    console.log("QUOTE::", quote)

    const txResult = await buildTx({
      quoteResponse: quote,
      accountAddress: SUI.signer.getPublicKey().toSuiAddress(),
      slippage: 0.15,
      commission: {
        partner: SUI.signer.getPublicKey().toSuiAddress(),
        commissionBps: 0
      },
    })

    console.log("TXRESULT::", txResult)

    const { tx, coinOut } = txResult

    return {
      tx,
      coinOut
    }
  } catch(e){
    console.log(e, "Error getting swap data")
    return null
  }

}


export { getSwapData }
