import { prisma } from ".";

export const upsertTrade = async (data: any) => {
  return prisma.trade.create({
    data: {
      tokenAddress: data.tokenAddress,
      tokenAmount: data.tokenAmount,
      buyDigest: data.buyDigest,
      dex: data.dex,
      updatedAt: new Date(),
      suiSpentAmount: data.suiSpentAmount,
      poolAddress: data.poolAddress,
      initialPoolAmountA: data.amountA,
      initialPoolAmountB: data.amountB,
      suiIsA: data.suiIsA,
      scamProbability: data.scamProbability
    }
  })
}

export const updateTrade = async (data: any) => {
  return prisma.trade.update({
    where: {
      poolAddress: data.poolAddress
    },
    data: {
      sellDigest: data.sellDigest,
      suiReceivedAmount: data.suiReceivedAmount
    }
  })
}

export const getTrade = async (poolAddress: string) => {
  return prisma.trade.findUnique({
    where: {
      poolAddress
    }
  })
}

export const getTrades = async () => {
  return prisma.trade.findMany()
}

export const getOpenTrades = async () => {
  return prisma.trade.findMany({
    where: {
      sellDigest: null
    }
  })
}
