import { prisma } from "./index.js";
import { v4 as uuidv4 } from 'uuid';
export const upsertTrade = async (data) => {
    return prisma.trade.create({
        data: {
            id: uuidv4(),
            tokenAddress: data.tokenAddress,
            tokenAmount: data.tokenAmount,
            buyDigest: data.buyDigest,
            dex: data.dex,
            suiSpentAmount: data.suiSpentAmount,
            poolAddress: data.poolAddress,
            amountA: data.initialPoolAmountA || data.amountA,
            amountB: data.initialPoolAmountB || data.amountB,
            suiIsA: data.suiIsA || false,
            scamProbability: data.scamProbability || 0,
            timestamp: new Date()
        }
    });
};
export const updateTrade = async (data) => {
    // Finde zuerst den Trade anhand der poolAddress
    const trade = await prisma.trade.findFirst({
        where: {
            poolAddress: data.poolAddress
        }
    });
    if (!trade) {
        throw new Error(`Trade mit poolAddress ${data.poolAddress} nicht gefunden`);
    }
    // Aktualisiere den Trade anhand seiner ID
    return prisma.trade.update({
        where: {
            id: trade.id
        },
        data: {
            sellDigest: data.sellDigest,
            suiReceivedAmount: data.suiReceivedAmount
        }
    });
};
export const getTrade = async (poolAddress) => {
    return prisma.trade.findFirst({
        where: {
            poolAddress
        }
    });
};
export const getTrades = async () => {
    return prisma.trade.findMany();
};
export const getOpenTrades = async () => {
    return prisma.trade.findMany({
        where: {
            sellDigest: null
        }
    });
};
//# sourceMappingURL=trade.js.map