import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { config } from 'dotenv'
import { initCetusSDK } from '@cetusprotocol/cetus-sui-clmm-sdk'


export type SUPPORTED_DEX = 'Cetus' | 'BlueMove' 


// pump migration accounts
export const MIGRATOR_MOVE_PUMP = "0x1937f2c5ce1cbab08893b63945c20cde349e4a7850eea317b965ff8da383c80e"

config()

const rpcUrl = getFullnodeUrl('mainnet')

const keypair = Ed25519Keypair.fromSecretKey(process.env.SUI_WALLET_SECRET_KEY as string)
const cetusClmmSDK = initCetusSDK({network: 'mainnet'})
const client = new SuiClient({ url: rpcUrl })

async function validateConnection() {
  console.log("Testing...")
  const publicKey = keypair.getPublicKey();
  const message = new TextEncoder().encode("Testing");
  const { signature } = await keypair.signPersonalMessage(message)

  const isValid = await publicKey.verifyPersonalMessage(message, signature);
  return isValid
}

export const SUI = {
  validateConnection,
  cetusClmmSDK,
  client,
}
 
