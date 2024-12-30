import { SUI } from "./config";
import { SUPPORTED_DEX } from "./config";

export type ParsedPoolData = {
  coinA: string,
  coinB: string,
  amountA: string,
  amountB: string,
  poolId: string,
  liquidity: string,
  dex: SUPPORTED_DEX,
  creator?: string
}


export async function getTransactionInfo(digest: string, dex: SUPPORTED_DEX = 'Cetus') {
  const { client } = SUI;

  const tx = await client.getTransactionBlock({
    digest,
    options: {
      //showObjectChanges: true,
      showBalanceChanges: true,
      showEvents: true,
    }
  })

  return decomposeTransactionByDex(tx, dex)
}


export async function decomposeTransactionByDex(tx: any, dex: SUPPORTED_DEX = 'Cetus') {
  let formatedResponse: ParsedPoolData | null = null

  try {
    switch (dex) {
      case 'Cetus':
        const createEvent = tx.events.find((e: any) => e.type === '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::factory::CreatePoolEvent')
        const addLiquidityEvent = tx.events.find((e: any) => e.type === '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::pool::AddLiquidityEvent')

        let creator: undefined | string = undefined;
        const { parsedJson: parsedCreate } = createEvent
        const { parsedJson: parsedAdd } = addLiquidityEvent
        const balanceChanges = tx.balanceChanges

        if (balanceChanges) {
          const creatorBalance = balanceChanges.find((b: any) => b.coinType.endsWith("::sui::SUI") && Number(b.amount) < 0)
          if (creatorBalance) {
            creator = creatorBalance.owner.AddressOwner
          }
        }

        formatedResponse = {
          coinA: parsedCreate.coin_type_a,
          coinB: parsedCreate.coin_type_b,
          amountA: parsedAdd.amount_a,
          amountB: parsedAdd.amount_b,
          poolId: parsedCreate.pool_id,
          liquidity: parsedAdd.after_liquidity,
          dex: dex,
          creator
        }
        break

      case 'BlueMove':
        const createEventBlue = tx.events.find((e: any) => e.type === '0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Created_Pool_Event')

        const addLiquidityEventBlue = tx.events.find((e: any) => e.type === '0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Add_Liquidity_Pool')

        const { parsedJson: parsedCreateBlue } = createEventBlue
        const { parsedJson: parsedAddBlue } = addLiquidityEventBlue

        if(Number(parsedCreateBlue.lsp_balance) > 0){
          break
        }

        formatedResponse = {
          coinA:  parsedCreateBlue.token_x_name,
          coinB:  parsedCreateBlue.token_y_name,
          amountA: parsedAddBlue.token_x_amount_in,
          amountB: parsedAddBlue.token_y_amount_in,
          poolId: parsedCreateBlue.pool_id,
          liquidity: parsedAddBlue.lsp_balance,
          dex: dex,
          creator: parsedCreateBlue.creator
        }
        break

      default:
        break
    }
  } catch(e) {
    console.log(e)
  }

  return formatedResponse
}




