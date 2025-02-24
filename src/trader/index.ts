import { getSwapData } from "./agg";
import { getTransactionInfo } from "../chain/extractor";
import { SUPPORTED_DEX, SUI } from "../chain/config";
import { buy as buyDirectCetus } from "./dex/cetus";
import { buyAction } from "./tradeStrategy";
import { checkIsHoneyPot } from "./checkIsHoneyPot";
import { checkIsBlackListed } from "./checkscam";
import { Assets, Operation, Congestion } from '../types'; // Adjust the import path and types as needed

// Gas-Optimierung basierend auf Reference Gas Price
const calculateGasForMysticeti = async () => {
  const baseGas = await SUI.client.getReferenceGasPrice();
  return Number(baseGas) * 0.8;
};

// Programmable P2P Tunnels für Echtzeit-Trading
interface P2PTunnel {
  lockAssets: () => Promise<void>;
  executeOffChain: (operation: Operation) => Promise<void>;
  settleTunnel: () => Promise<void>;
}

const initP2PTunnel = async (assets: Assets): Promise<P2PTunnel> => {
  return {
    lockAssets: async () => {
      // Assets in Tunnel sperren
      return await lockInTunnel(assets);
    },
    executeOffChain: async (operation: Operation) => {
      // Ausführung ohne Blockchain-Latenz
      return await processOffChain(operation);
    },
    settleTunnel: async () => {
      // Finale State-Synchronisation zur Chain
      return await syncToChain();
    }
  };
};

// Steamm Configuration
const steammConfig = {
  bankFeature: {
    idleLiquidity: true,
    yieldOptimization: true
  },
  quotationModels: {
    constantProduct: true,
    stable: true,
    dynamicFee: true
  }
};

// Gas Price Manager
interface GasPriceManager {
  calculateOptimalGas: (congestion: Congestion) => Promise<number>;
  priorityOrdering: boolean;
  sharedObjectCongestion: boolean;
}

const gasPriceManager: GasPriceManager = {
  calculateOptimalGas: async (congestion: Congestion): Promise<number> => {
    const referenceGasPrice = await SUI.client.getReferenceGasPrice();
    return congestion ? Number(referenceGasPrice) * 5 : Number(referenceGasPrice);
  },
  priorityOrdering: true,
  sharedObjectCongestion: true
};

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

      default:
        break;
    }
  } else {
    console.log("Pool too small")
  }
}
function lockInTunnel(assets: any) {
  throw new Error("Function not implemented.");
}

function processOffChain(operation: any) {
  throw new Error("Function not implemented.");
}

function syncToChain() {
  throw new Error("Function not implemented.");
}

function handleAssets(assets: Assets) {
  // ...existing code...
}

function handleOperation(operation: Operation) {
  // ...existing code...
}

function handleCongestion(congestion: Congestion) {
  // ...existing code...
}

