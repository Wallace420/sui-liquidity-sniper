import { SUI } from "../chain/config"

export async function checkIsHoneyPot(coin: string) {
  const correctCoin = coin.startsWith("0x") ? coin : `0x${coin}`

  const packageId = coin.split('::')[0]
  const { client } = SUI

  const _coin = await client.getCoinMetadata({ coinType: correctCoin })
  if (_coin) {
    const moveModule = await client.getNormalizedMoveModulesByPackage({ package: packageId })

    if (moveModule) {
      const _f = moveModule[correctCoin.split('::')[1]]
      const _f2 = moveModule[correctCoin.split('::')[2]]

      if (_f) {
        const { exposedFunctions } = _f
        if (exposedFunctions.migrate_regulated_currency_to_v2) return true;
      }

      if(_f2) {
        const { exposedFunctions } = _f2
        if (exposedFunctions.migrate_regulated_currency_to_v2) return true;
      }
    }
  }

  return false;
}
