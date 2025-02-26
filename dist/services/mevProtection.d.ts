import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
/**
 * MEV Protection Configuration
 */
interface MEVProtectionConfig {
    maxGasBudget?: number;
    minGasPrice?: number;
    maxRetries?: number;
    priorityFee?: number;
    keypair: Ed25519Keypair;
}
/**
 * MEV Protection Service
 * Helps protect transactions from MEV attacks and ensures quick execution
 */
export declare class MEVProtection {
    private config;
    constructor(config: MEVProtectionConfig);
    /**
     * Optimize transaction for MEV protection
     */
    protectTransaction(tx: Transaction): Promise<Transaction>;
    /**
     * Execute transaction with MEV protection
     */
    executeProtectedTransaction(tx: Transaction): Promise<string>;
    /**
     * Check if transaction was frontrun
     */
    checkFrontrunning(txDigest: string): Promise<boolean>;
    /**
     * Get optimal gas settings based on network conditions
     */
    getOptimalGasSettings(): Promise<{
        gasPrice: number;
        gasBudget: number;
    }>;
}
export {};
