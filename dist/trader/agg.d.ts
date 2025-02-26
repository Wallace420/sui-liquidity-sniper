declare const getSwapData: (tokenIn: string, tokenOut: string, amountIn: string) => Promise<{
    tx: any;
    coinOut: any;
} | null>;
export { getSwapData };
