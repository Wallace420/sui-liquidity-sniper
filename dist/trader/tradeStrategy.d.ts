import { SUPPORTED_DEX } from "../chain/config.js";
import { ParsedPoolData } from "../chain/extractor.js";
export type TradingInfo = {
    initialSolAmount: string;
    currentAmount: string;
    tokenToSell: string;
    tokenOnWallet: string;
    poolAddress: string;
    dex: SUPPORTED_DEX;
    suiIsA: boolean;
    scamProbability: number;
};
export declare function buyAction(digest: string, info: ParsedPoolData | null): Promise<null | undefined>;
export declare function sellAction(tradingInfo: TradingInfo): Promise<void>;
export declare function runTrade(): Promise<never>;
