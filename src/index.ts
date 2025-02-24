import dotenv from 'dotenv';
import { walletManager, SUI } from './chain/config';
import { setupListeners } from './chain/monitor';
import { setSuiClient } from '@7kprotocol/sdk-ts';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { runTrade } from './trader/tradeStrategy';
import { EventEmitter } from 'events';
import readline from 'readline';

export declare interface WalletManager {
  on(event: 'walletSetupComplete', listener: () => void): this;
}

export interface WalletData {
  keypair: any;
  privateKey: string;
  publicKey: string;
  address: string;
  type: 'standard' | 'phantom' | 'backpack';
}

export class WalletManager extends EventEmitter {
  wallets: Map<string, WalletData> = new Map();

  constructor() {
    super();
  }

  async showMainMenu() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = (query: string): Promise<string> => {
      return new Promise(resolve => rl.question(query, resolve));
    };

    while (true) {
      console.log('\n=== Wallet Manager ===');
      console.log('1. Neues Wallet erstellen');
      console.log('2. Bestehendes Wallet importieren');
      console.log('3. Phantom Wallet verbinden');
      console.log('4. Backpack Wallet verbinden');
      console.log('5. Alle Wallets anzeigen');
      console.log('6. Beenden');

      const input = await askQuestion('Bitte wählen Sie eine Option (1-6): ');

      if (input === '6') {
        console.log('Programm beendet.');
        rl.close();
        process.exit(0);
      }

      await this.handleUserChoice(input);
    }
  }

  async handleUserChoice(input: string) {
    switch (input) {
      case '1':
        await this.showCreateWalletMenu();
        break;
      case '2':
        await this.importExistingWallet();
        break;
      case '3':
        await this.connectPhantomWallet();
        break;
      case '4':
        await this.connectBackpackWallet();
        break;
      case '5':
        this.showAllWallets();
        break;
      default:
        console.log('Ungültige Eingabe');
        break;
    }
  }

  async showCreateWalletMenu() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = (query: string): Promise<string> => {
      return new Promise(resolve => rl.question(query, resolve));
    };

    console.log('\n=== Neues Wallet erstellen ===');
    console.log('1. Standard Wallet');
    console.log('2. Phantom Wallet');
    console.log('3. Backpack Wallet');
    console.log('4. Zurück zum Hauptmenü');

    const input = await askQuestion('Bitte wählen Sie eine Option (1-4): ');

    switch (input) {
      case '1':
        const name = await askQuestion('Name für das neue Standard Wallet: ');
        await this.createNewWallet(name, 'standard');
        break;
      case '2':
        const phantomName = await askQuestion('Name für das neue Phantom Wallet: ');
        await this.createNewWallet(phantomName, 'phantom');
        break;
      case '3':
        const backpackName = await askQuestion('Name für das neue Backpack Wallet: ');
        await this.createNewWallet(backpackName, 'backpack');
        break;
      case '4':
        break;
      default:
        console.log('Ungültige Eingabe');
        break;
    }

    rl.close();
  }

  async importExistingWallet() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = (query: string): Promise<string> => {
      return new Promise(resolve => rl.question(query, resolve));
    };

    const name = await askQuestion('Name für das zu importierende Wallet: ');
    const privateKey = await askQuestion('Private Key: ');

    try {
      const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
      const publicKey = keypair.getPublicKey().toBase64();
      const address = keypair.getPublicKey().toSuiAddress();

      this.wallets.set(name, {
        keypair,
        privateKey,
        publicKey,
        address,
        type: 'standard'
      });

      console.log(`Wallet "${name}" erfolgreich importiert:`);
      console.log(`Adresse: ${address}`);
      this.saveWallets();
      this.emit('walletSetupComplete');
    } catch (error) {
      console.error('Fehler beim Import des Wallets:', error);
    }

    rl.close();
  }

  async connectPhantomWallet() {
    // Phantom Wallet Connection Logic
  }

  async connectBackpackWallet() {
    // Backpack Wallet Connection Logic
  }

  showAllWallets() {
    console.log('\nVerfügbare Wallets:');
    this.wallets.forEach((wallet, name) => {
      console.log(`\nName: ${name}`);
      console.log(`Typ: ${wallet.type}`);
      console.log(`Adresse: ${wallet.address}`);
    });
  }

  async createNewWallet(name: string, type: 'standard' | 'phantom' | 'backpack'): Promise<void> {
    let keypair: Ed25519Keypair | null = null;
    let privateKey: string;
    let publicKey: string;
    let address: string;

    if (type === 'standard') {
      keypair = new Ed25519Keypair();
      privateKey = Buffer.from(keypair.getSecretKey()).toString('hex');
      publicKey = keypair.getPublicKey().toBase64();
      address = keypair.getPublicKey().toSuiAddress();
    } else {
      // For phantom and backpack, we assume the keys are managed externally
      privateKey = '';
      publicKey = `${type}_public_key`;
      address = `${type}_address`;
    }

    this.wallets.set(name, {
      keypair,
      privateKey,
      publicKey,
      address,
      type
    });

    console.log(`Neues Wallet "${name}" vom Typ "${type}" erstellt:`);
    console.log(`Adresse: ${address}`);
    this.saveWallets();
    this.emit('walletSetupComplete');
  }

  getDefaultWallet(): WalletData | undefined {
    return this.wallets.get('default');
  }

  saveWallets(): void {
    // Implementation of saveWallets
  }
}

dotenv.config();

async function main() {
  console.log("🔍 DEBUG: Starte Wallet Setup...");

  await new Promise<void>((resolve) => {
    console.log("🔍 DEBUG: Zeige Wallet-Menü...");
    walletManager.showMainMenu();

    walletManager.once('walletSetupComplete', () => {
      console.log("✅ Wallet Setup abgeschlossen!");
      resolve();
    });
  });

  console.log("🔍 DEBUG: Lese Default Wallet...");
  const defaultWallet = walletManager.getDefaultWallet();
  if (!defaultWallet || !defaultWallet.keypair) {
    throw new Error("❌ Kein Wallet eingerichtet.");
  }

  console.log("🔍 DEBUG: Verbindung wird validiert...");
  SUI.signer = defaultWallet.keypair;

  const isValid = await SUI.validateConnection(defaultWallet.keypair);
  if (isValid) {
    console.log("✅ Verbindung erfolgreich!");
  } else {
    console.log("❌ Verbindung fehlgeschlagen!");
  }

  console.log("🔍 DEBUG: Setze SUI-Client...");
  setSuiClient(SUI.client);

  console.log("🔍 DEBUG: Starte Monitor...");
  await setupListeners();

  console.log("🔍 DEBUG: Starte Trading...");
  runTrade();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
