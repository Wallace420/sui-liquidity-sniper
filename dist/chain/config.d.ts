import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
export declare const MIGRATOR_MOVE_PUMP: string;
export type SUPPORTED_DEX = 'Cetus' | 'BlueMove';
export declare const SUI: {
    client: SuiClient;
    signer: Ed25519Keypair;
    cetusClmmSDK: import("@cetusprotocol/cetus-sui-clmm-sdk").CetusClmmSDK;
};
