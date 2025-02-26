type NetworkType = 'mainnet' | 'testnet' | 'devnet';
export declare function getFaucetHost(network: NetworkType): string;
export declare function requestSuiFromFaucetV0({ host, recipient }: {
    host: string;
    recipient: string;
}): Promise<boolean>;
export {};
