import { PrismaClient } from '@prisma/client';
export interface IBacktestResult {
    totalTrades: number;
    successfulTrades: number;
    failedTrades: number;
    totalProfit: number;
    averageProfit: number;
    maxDrawdown: number;
    winRate: number;
    averageExecutionTime: number;
    scamDetectionAccuracy: number;
    gasUsed: number;
}
declare global {
    var prisma: PrismaClient | undefined;
}
export declare function runBacktest(startTime?: number, endTime?: number): Promise<IBacktestResult & {
    startTime: number;
    endTime: number;
}>;
