import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { config } from 'dotenv';
import { initCetusSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { WalletManager } from '../wallet/wallet-manager';

export type SUPPORTED_DEX = 'Cetus' | 'BlueMove';

// pump migration accounts
export const MIGRATOR_MOVE_PUMP = "0x1937f2c5ce1cbab08893b63945c20cde349e4a7850eea317b965ff8da383c80e";

config();

const rpcUrl = getFullnodeUrl('mainnet');

const cetusClmmSDK = initCetusSDK({network: 'mainnet'});
const client = new SuiClient({ url: rpcUrl });

// Latenzoptimierung für Mysticeti
const suiConfig = {
  consensusTimeout: 500,
  maxRetries: 2,
  validateCertificates: false
};

// Babylon Configuration
const babylonConfig = {
  lbtcToken: "0x...", // LBTC Token Adresse
  tvl: "5.3B",
  liquidityThreshold: "1.8B"
};

async function validateConnection(keypair: any) {
  console.log("Testing...");
  const publicKey = keypair.getPublicKey();
  const message = new TextEncoder().encode("Testing");
  const { signature } = await keypair.signPersonalMessage(message);

  const isValid = await publicKey.verifyPersonalMessage(message, signature);
  return isValid;
}

export const SUI = {
  validateConnection,
  cetusClmmSDK,
  client,
  signer: null as any, // Add signer property
};

export const walletManager = new WalletManager();

