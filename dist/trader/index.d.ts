import { SUPPORTED_DEX } from "../chain/config.js";
export declare function buyWithAgg(inCoin: string, outCoin: string, amount: string): Promise<string | null>;
export declare function sellWithAgg(inCoin: string, amount: string): Promise<string | null>;
export declare function trade(digest: string, dex?: SUPPORTED_DEX): Promise<void>;
