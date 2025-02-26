import { prisma } from "./index.js";
import { v4 as uuidv4 } from 'uuid';

// Definiere einen Typ für die Trade-Daten
interface TradeData {
  tokenAddress: string;
  tokenAmount: string;
  buyDigest: string;
  dex: string;
  suiSpentAmount: string;
  poolAddress?: string;
  initialPoolAmountA?: string;
  initialPoolAmountB?: string;
  amountA?: string; // Für Kompatibilität mit älterem Code
  amountB?: string; // Für Kompatibilität mit älterem Code
  suiIsA?: boolean;
  scamProbability?: number;
  sellDigest?: string;
  suiReceivedAmount?: string;
}

export const upsertTrade = async (data: TradeData) => {
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
  })
}

interface UpdateTradeData {
  poolAddress: string;
  sellDigest: string;
  suiReceivedAmount: string;
}

export const updateTrade = async (data: UpdateTradeData) => {
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
  })
}

export const getTrade = async (poolAddress: string) => {
  return prisma.trade.findFirst({
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
