declare module '@7kprotocol/sdk-ts' {
  export function getQuote(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
  }): Promise<any>;

  export function buildTx(params: {
    quoteResponse: any;
    accountAddress: string;
    slippage: number;
    commission?: {
      partner: string;
      commissionBps: number;
    };
  }): Promise<{
    tx: any;
    coinOut: any;
  }>;
} 