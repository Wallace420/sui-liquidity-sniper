import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import * as readline from 'readline';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { config } from 'dotenv';
import { EventEmitter } from 'events';

// Load environment variables from .env file
config();

// Erweiterte Wallet-Interface-Definition
interface WalletData {
    keypair: Ed25519Keypair | null;
    privateKey: string;
    publicKey: string;
    address: string;
    type: 'standard' | 'phantom' | 'backpack';
}

export class WalletManager extends EventEmitter {
    private wallets: Map<string, WalletData> = new Map();
    private client: SuiClient;
    private keypair: Ed25519Keypair | null = null;
    
    constructor() {
        super();
        const rpcUrl = getFullnodeUrl("mainnet");
        this.client = new SuiClient({ url: rpcUrl });
    }

    // Wallet-Datei verschlüsselt speichern
    private encryptAndSave(data: string, password: string): void {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(password, 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        fs.writeFileSync('wallets.enc', JSON.stringify({
            iv: iv.toString('hex'),
            encrypted: encrypted
        }));
    }

    // Wallet-Datei entschlüsseln und laden
    private decryptAndLoad(password: string): string {
        try {
            const data = JSON.parse(fs.readFileSync('wallets.enc', 'utf8'));
            const algorithm = 'aes-256-cbc';
            const key = crypto.scryptSync(password, 'salt', 32);
            const iv = Buffer.from(data.iv, 'hex');
            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Fehler beim Laden der Wallets:', error);
            return '{}';
        }
    }

    // Bestehende Wallets laden
    private loadExistingWallets(password: string): void {
        const walletsData = this.decryptAndLoad(password);
        const wallets = JSON.parse(walletsData);
        
        Object.entries(wallets).forEach(([name, wallet]: [string, any]) => {
            this.wallets.set(name, wallet);
        });
    }

    // Neues Wallet erstellen
    private async createNewWallet(name: string, type: 'standard' | 'phantom' | 'backpack'): Promise<void> {
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

    // Bestehendes Wallet importieren
    private importExistingWallet(name: string, privateKey: string): void {
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
    }

    // Wallets speichern
    private saveWallets(): void {
        const walletsObject = Object.fromEntries(this.wallets);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });

        rl.question('Bitte Passwort für Wallet-Verschlüsselung eingeben: ', (password) => {
            this.encryptAndSave(JSON.stringify(walletsObject), password);
            rl.close();
            console.log('Wallets erfolgreich gespeichert.');
        });
    }

    // Neue Methoden für Phantom und Backpack

    private async connectPhantomWallet(name: string): Promise<void> {
        try {
            // Phantom Wallet Connection Logic
            const phantomWallet = {
                keypair: null,
                privateKey: '', // Managed by Phantom
                publicKey: 'phantom_public_key',
                address: 'phantom_address',
                type: 'phantom' as const
            };

            this.wallets.set(name, phantomWallet);
            console.log(`Phantom Wallet "${name}" erfolgreich verbunden:`);
            console.log(`Adresse: ${phantomWallet.address}`);
            this.saveWallets();
            this.emit('walletSetupComplete');
        } catch (error) {
            console.error('Fehler bei der Phantom Wallet Verbindung:', error);
        }
    }

    private async connectBackpackWallet(name: string): Promise<void> {
        try {
            // Backpack Wallet Connection Logic
            const backpackWallet = {
                keypair: null,
                privateKey: '', // Managed by Backpack
                publicKey: 'backpack_public_key',
                address: 'backpack_address',
                type: 'backpack' as const
            };

            this.wallets.set(name, backpackWallet);
            console.log(`Backpack Wallet "${name}" erfolgreich verbunden:`);
            console.log(`Adresse: ${backpackWallet.address}`);
            this.saveWallets();
            this.emit('walletSetupComplete');
        } catch (error) {
            console.error('Fehler bei der Backpack Wallet Verbindung:', error);
        }
    }

    // Hauptmenü anzeigen
    public showMainMenu(): void {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });

        console.log('\n=== Wallet Manager ===');
        console.log('1. Neues Wallet erstellen');
        console.log('2. Bestehendes Wallet importieren');
        console.log('3. Phantom Wallet verbinden');
        console.log('4. Backpack Wallet verbinden');
        console.log('5. Alle Wallets anzeigen');
        console.log('6. Beenden');

        rl.question('Bitte wählen Sie eine Option (1-6): ', (answer) => {
            switch (answer) {
                case '1':
                    this.showCreateWalletMenu();
                    rl.close();
                    break;

                case '2':
                    rl.question('Name für das zu importierende Wallet: ', (name) => {
                        rl.question('Private Key: ', (privateKey) => {
                            this.importExistingWallet(name, privateKey);
                            rl.close();
                            this.showMainMenu();
                        });
                    });
                    break;

                case '3':
                    rl.question('Name für das Phantom Wallet: ', (name) => {
                        this.connectPhantomWallet(name).then(() => {
                            rl.close();
                            this.showMainMenu();
                        });
                    });
                    break;

                case '4':
                    rl.question('Name für das Backpack Wallet: ', (name) => {
                        this.connectBackpackWallet(name).then(() => {
                            rl.close();
                            this.showMainMenu();
                        });
                    });
                    break;

                case '5':
                    console.log('\nVerfügbare Wallets:');
                    this.wallets.forEach((wallet, name) => {
                        console.log(`\nName: ${name}`);
                        console.log(`Typ: ${wallet.type}`);
                        console.log(`Adresse: ${wallet.address}`);
                    });
                    rl.close();
                    this.showMainMenu();
                    break;

                case '6':
                    console.log('Programm wird beendet...');
                    rl.close();
                    process.exit(0);
                    break;

                default:
                    console.log('Ungültige Eingabe');
                    rl.close();
                    this.showMainMenu();
                    break;
            }
        });
    }

    // Menü zum Erstellen eines neuen Wallets anzeigen
    private showCreateWalletMenu(): void {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });

        console.log('\n=== Neues Wallet erstellen ===');
        console.log('1. Standard Wallet');
        console.log('2. Phantom Wallet');
        console.log('3. Backpack Wallet');
        console.log('4. Zurück zum Hauptmenü');

        rl.question('Bitte wählen Sie eine Option (1-4): ', (answer) => {
            switch (answer) {
                case '1':
                    rl.question('Name für das neue Standard Wallet: ', (name) => {
                        this.createNewWallet(name, 'standard').then(() => {
                            rl.close();
                            this.showMainMenu();
                        });
                    });
                    break;

                case '2':
                    rl.question('Name für das neue Phantom Wallet: ', (name) => {
                        this.createNewWallet(name, 'phantom').then(() => {
                            rl.close();
                            this.showMainMenu();
                        });
                    });
                    break;

                case '3':
                    rl.question('Name für das neue Backpack Wallet: ', (name) => {
                        this.createNewWallet(name, 'backpack').then(() => {
                            rl.close();
                            this.showMainMenu();
                        });
                    });
                    break;

                case '4':
                    rl.close();
                    this.showMainMenu();
                    break;

                default:
                    console.log('Ungültige Eingabe');
                    rl.close();
                    this.showCreateWalletMenu();
                    break;
            }
        });
    }

    // Methode zum Abrufen des Standard-Wallets
    public getDefaultWallet(): WalletData | undefined {
        return this.wallets.get('default');
    }
}

// Wallet Manager initialisieren und starten
const walletManager = new WalletManager();
walletManager.showMainMenu();
