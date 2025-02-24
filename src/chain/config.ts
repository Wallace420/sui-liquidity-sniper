import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { config } from 'dotenv';
import { initCetusSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { WalletManager } from '../wallet/wallet-manager';

export type SUPPORTED_DEX = 'Cetus' | 'BlueMove';

// pump migration accounts
export const MIGRATOR_MOVE_PUMP = "0x1937f2c5ce1cbab08893b63945c20cde349e4a7850eea317b965ff8da383c80e";

config();

// RPC configuration with fallback and load balancing
const RPC_ENDPOINTS = [
  getFullnodeUrl('mainnet'),
  'https://sui-mainnet.public.blastapi.io',
  'https://sui-mainnet-rpc.allthatnode.com'
];

let currentRpcIndex = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function getWorkingRPC() {
  for (let i = 0; i < RPC_ENDPOINTS.length * MAX_RETRIES; i++) {
    const rpcUrl = RPC_ENDPOINTS[currentRpcIndex];
    try {
      const tempClient = new SuiClient({ url: rpcUrl });
      await tempClient.getLatestCheckpointSequenceNumber();
      return rpcUrl;
    } catch (e) {
      console.warn(`RPC ${rpcUrl} failed, trying next...`);
      currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error('All RPC endpoints failed');
}

// Initialize client with default RPC, will be updated after finding working RPC
let client = new SuiClient({ url: RPC_ENDPOINTS[0] });
let cetusClmmSDK = initCetusSDK({network: 'mainnet'});

// Update client and SDK with working RPC
getWorkingRPC().then(rpcUrl => {
  console.log(`Using RPC endpoint: ${rpcUrl}`);
  client = new SuiClient({ url: rpcUrl });
  cetusClmmSDK = initCetusSDK({network: 'mainnet'});
}).catch(error => {
  console.error('Failed to find working RPC:', error);
  process.exit(1);
});

// Latenzoptimierung für Mysticeti
const suiConfig = {
  consensusTimeout: 300, // Reduced from 500ms
  maxRetries: 3,        // Increased from 2
  validateCertificates: false,
  batchSize: 50,        // Added batch size for transaction grouping
  concurrentRequests: 5 // Added concurrent request limit
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
