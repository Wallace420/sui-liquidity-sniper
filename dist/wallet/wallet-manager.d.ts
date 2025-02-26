import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import * as readline from 'readline';
import { EventEmitter } from 'events';
interface WalletData {
    keypair: Ed25519Keypair | null;
    privateKey: string;
    publicKey: string;
    address: string;
    type: 'standard' | 'phantom' | 'backpack';
}
export declare class WalletManager extends EventEmitter {
    private wallets;
    private client;
    private keypair;
    private defaultWallet;
    private rl;
    constructor();
    private question;
    private encryptAndSave;
    private decryptAndLoad;
    private loadExistingWallets;
    private createNewWallet;
    importExistingWallet(name: string, privateKeyString: string): Promise<void>;
    private saveWallets;
    private connectPhantomWallet;
    private connectBackpackWallet;
    showMainMenu(): Promise<void>;
    private showCreateWalletMenu;
    setReadlineInterface(rl: readline.Interface): void;
    getDefaultWallet(): WalletData | undefined;
}
export default WalletManager;
