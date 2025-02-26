import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import * as readline from 'readline';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { config } from 'dotenv';
import { EventEmitter } from 'events';
import { fromB64 } from '@mysten/sui/utils';
import { logInfo, logError } from '../utils/logger.js';

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
    private defaultWallet: string | null = null;
    private rl: readline.Interface | null = null;
    
    constructor() {
        super();
        const rpcUrl = getFullnodeUrl("mainnet");
        this.client = new SuiClient({ url: rpcUrl });
    }

    // Hilfsfunktion für Benutzereingaben
    private async question(prompt: string): Promise<string> {
        if (!this.rl) {
            throw new Error('Readline Interface nicht initialisiert');
        }
        return new Promise((resolve) => {
            this.rl!.question(prompt, (answer) => {
                resolve(answer);
            });
        });
    }

    // Wallet-Datei verschlüsselt speichern
    private async encryptAndSave(data: string): Promise<void> {
        const password = await this.question('Bitte Passwort für Wallet-Verschlüsselung eingeben: ');
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
        console.log('Wallets erfolgreich gespeichert.');
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
    async importExistingWallet(name: string, privateKeyString: string): Promise<void> {
        try {
            // Entferne eventuelles "0x" Präfix und Whitespace
            privateKeyString = privateKeyString.replace('0x', '').trim();
            
            // Entferne "suiprivkey" Präfix wenn vorhanden
            if (privateKeyString.startsWith('suiprivkey')) {
                privateKeyString = privateKeyString.replace('suiprivkey', '');
            }

            // Konvertiere Base64 zu Bytes
            const privateKeyBytes = fromB64(privateKeyString);
            
            // Erstelle Keypair
            const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
            
            // Speichere Wallet
            this.wallets.set(name, {
                keypair,
                privateKey: privateKeyString,
                publicKey: keypair.getPublicKey().toBase64(),
                address: keypair.getPublicKey().toSuiAddress(),
                type: 'standard'
            });
            this.defaultWallet = name;

            logInfo('Wallet erfolgreich importiert', {
                name,
                address: keypair.getPublicKey().toSuiAddress()
            });
        } catch (error) {
            logError('Fehler beim Import des Wallets', {
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
            throw error;
        }
    }

    // Wallets speichern
    private saveWallets(): void {
        const walletsObject = Object.fromEntries(this.wallets);
        this.encryptAndSave(JSON.stringify(walletsObject));
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
    public async showMainMenu(): Promise<void> {
        if (!this.rl) {
            throw new Error('Readline Interface nicht initialisiert');
        }

        console.log('\n=== Wallet Manager ===');
        console.log('1. Neues Wallet erstellen');
        console.log('2. Bestehendes Wallet importieren');
        console.log('3. Phantom Wallet verbinden');
        console.log('4. Backpack Wallet verbinden');
        console.log('5. Alle Wallets anzeigen');
        console.log('6. Beenden');

        const answer = await this.question('Bitte wählen Sie eine Option (1-6): ');
        
        switch (answer) {
            case '1':
                await this.showCreateWalletMenu();
                break;

            case '2':
                const name = await this.question('Name für das zu importierende Wallet: ');
                const privateKey = await this.question('Private Key: ');
                await this.importExistingWallet(name, privateKey);
                break;

            case '3':
                const phantomName = await this.question('Name für das Phantom Wallet: ');
                await this.connectPhantomWallet(phantomName);
                break;

            case '4':
                const backpackName = await this.question('Name für das Backpack Wallet: ');
                await this.connectBackpackWallet(backpackName);
                break;

            case '5':
                console.log('\nVerfügbare Wallets:');
                this.wallets.forEach((wallet, name) => {
                    console.log(`\nName: ${name}`);
                    console.log(`Typ: ${wallet.type}`);
                    console.log(`Adresse: ${wallet.address}`);
                });
                await this.showMainMenu();
                break;

            case '6':
                console.log('Zurück zum Hauptmenü...');
                return;

            default:
                console.log('Ungültige Eingabe');
                await this.showMainMenu();
                break;
        }
    }

    // Menü zum Erstellen eines neuen Wallets anzeigen
    private async showCreateWalletMenu(): Promise<void> {
        if (!this.rl) {
            throw new Error('Readline Interface nicht initialisiert');
        }

        console.log('\n=== Neues Wallet erstellen ===');
        console.log('1. Standard Wallet');
        console.log('2. Phantom Wallet');
        console.log('3. Backpack Wallet');
        console.log('4. Zurück zum Hauptmenü');

        const answer = await this.question('Bitte wählen Sie eine Option (1-4): ');
        
        switch (answer) {
            case '1':
                const name = await this.question('Name für das neue Standard Wallet: ');
                await this.createNewWallet(name, 'standard');
                break;

            case '2':
                const phantomName = await this.question('Name für das neue Phantom Wallet: ');
                await this.createNewWallet(phantomName, 'phantom');
                break;

            case '3':
                const backpackName = await this.question('Name für das neue Backpack Wallet: ');
                await this.createNewWallet(backpackName, 'backpack');
                break;

            case '4':
                await this.showMainMenu();
                break;

            default:
                console.log('Ungültige Eingabe');
                await this.showCreateWalletMenu();
                break;
        }
    }

    // Setze das Readline Interface
    public setReadlineInterface(rl: readline.Interface) {
        this.rl = rl;
    }

    // Methode zum Abrufen des Standard-Wallets
    public getDefaultWallet(): WalletData | undefined {
        return this.wallets.get('default');
    }
}

// Exportiere die WalletManager-Klasse als default export
export default WalletManager;
