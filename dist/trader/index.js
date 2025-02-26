import { getSwapData } from "./agg.js";
import { getTransactionInfo } from "../chain/extractor.js";
import { SUI } from "../chain/config.js";
import { buy as buyDirectCetus } from "./dex/cetus.js";
import { buyAction } from "./tradeStrategy.js";
// Gas-Optimierung basierend auf Reference Gas Price
const calculateGasForMysticeti = async () => {
    const baseGas = await SUI.client.getReferenceGasPrice();
    return Number(baseGas) * 0.8;
};
const initP2PTunnel = async (assets) => {
    return {
        lockAssets: async () => {
            // Assets in Tunnel sperren
            return await lockInTunnel(assets);
        },
        executeOffChain: async (operation) => {
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
const gasPriceManager = {
    calculateOptimalGas: async (congestion) => {
        const referenceGasPrice = await SUI.client.getReferenceGasPrice();
        return congestion ? Number(referenceGasPrice) * 5 : Number(referenceGasPrice);
    },
    priorityOrdering: true,
    sharedObjectCongestion: true
};
export async function buyWithAgg(inCoin, outCoin, amount) {
    const { client } = SUI;
    const swapInfo = await getSwapData(inCoin, outCoin, amount.toString());
    console.log(swapInfo);
    if (!swapInfo)
        return null;
    const { tx } = swapInfo;
    if (tx) {
        const txId = await client.signAndExecuteTransaction({ transaction: tx, signer: SUI.signer });
        console.log(txId);
        return txId.digest;
    }
    return null;
}
export async function sellWithAgg(inCoin, amount) {
    const { client } = SUI;
    console.log("SELLWITHAGG::", inCoin, amount);
    const swapInfo = await getSwapData(inCoin, "2::sui::SUI", amount);
    if (!swapInfo)
        return null;
    const { tx: txAgg } = swapInfo;
    if (txAgg) {
        const txId = await client.signAndExecuteTransaction({ transaction: txAgg, signer: SUI.signer });
        console.log(txId);
        return txId.digest;
    }
    return null;
}
async function tryAgg(_coinIn, _coinOut, amount) {
    let retries = 0;
    let txId = null;
    do {
        const tx = await buyWithAgg(_coinIn, _coinOut, amount);
        if (tx) {
            txId = tx;
            break;
        }
        else {
            console.log("Retrying...");
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    } while (retries++ < 3);
    return txId;
}
export async function trade(digest, dex = 'Cetus') {
    try {
        const info = await getTransactionInfo(digest, dex);
        if (!info || !info.coinA || !info.coinB || !info.amountA || !info.amountB || !info.poolId) {
            console.error("Unvollständige Pool-Daten:", info);
            return;
        }
        // Erstelle ein vollständiges ParsedPoolData-Objekt
        const poolData = {
            coinA: info.coinA,
            coinB: info.coinB,
            amountA: info.amountA,
            amountB: info.amountB,
            poolId: info.poolId,
            liquidity: '0', // Standardwert für Liquidität
            dex: dex // Setze den DEX-Typ explizit
        };
        const _coinIn = "0x2::sui::SUI";
        const _coinOut = poolData.coinB;
        const amount = BigInt(1 * 1e9); // 1 SUI
        const a2b = true;
        let txId = '';
        console.log("BUYING, START TRADE::", _coinIn, _coinOut, amount);
        if (Number(poolData[a2b ? 'amountA' : 'amountB']) / Math.pow(10, 9) >= 300) {
            switch (dex) {
                case 'Cetus':
                    const cetusTxId = await buyDirectCetus(poolData);
                    txId = typeof cetusTxId === 'string' ? cetusTxId : '';
                    if (txId) {
                        await buyAction(txId, poolData);
                    }
                    break;
                case 'BlueMove':
                    const bluemoveTxId = await tryAgg("0x2::sui::SUI", _coinOut, amount.toString());
                    txId = typeof bluemoveTxId === 'string' ? bluemoveTxId : '';
                    if (txId) {
                        await buyAction(txId, poolData);
                    }
                    break;
                default:
                    break;
            }
        }
        else {
            console.log("Pool too small");
        }
    }
    catch (error) {
        console.error("Trade error:", error);
    }
}
function lockInTunnel(assets) {
    throw new Error("Function not implemented.");
}
function processOffChain(operation) {
    throw new Error("Function not implemented.");
}
function syncToChain() {
    throw new Error("Function not implemented.");
}
function handleAssets(assets) {
    // ...existing code...
}
function handleOperation(operation) {
    // ...existing code...
}
function handleCongestion(congestion) {
    // ...existing code...
}
//# sourceMappingURL=index.js.map