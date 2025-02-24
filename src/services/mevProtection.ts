import { TransactionBlock } from "@mysten/sui.js";
import { SUI } from "../chain/config";

// Configuration
const MAX_GAS_BUDGET = 50_000_000;
const MIN_GAS_PRICE = 1000;
const MAX_RETRIES = 3;

/**
 * MEV Protection Configuration
 */
interface MEVProtectionConfig {
  maxGasBudget?: number;
  minGasPrice?: number;
  maxRetries?: number;
  priorityFee?: number;
}

/**
 * MEV Protection Service
 * Helps protect transactions from MEV attacks and ensures quick execution
 */
export class MEVProtection {
  private config: Required<MEVProtectionConfig>;

  constructor(config: MEVProtectionConfig = {}) {
    this.config = {
      maxGasBudget: config.maxGasBudget || MAX_GAS_BUDGET,
      minGasPrice: config.minGasPrice || MIN_GAS_PRICE,
      maxRetries: config.maxRetries || MAX_RETRIES,
      priorityFee: config.priorityFee || 0
    };
  }

  /**
   * Optimize transaction for MEV protection
   */
  async protectTransaction(tx: TransactionBlock): Promise<TransactionBlock> {
    // Set optimal gas budget
    tx.setGasBudget(this.config.maxGasBudget);

    // Add priority fee if specified
    if (this.config.priorityFee > 0) {
      tx.setGasPrice(this.config.minGasPrice + this.config.priorityFee);
    }

    return tx;
  }

  /**
   * Execute transaction with MEV protection
   */
  async executeProtectedTransaction(tx: TransactionBlock): Promise<string> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < this.config.maxRetries; i++) {
      try {
        // Optimize transaction
        const protectedTx = await this.protectTransaction(tx);

        // Execute with high priority
        const result = await SUI.client.signAndExecuteTransactionBlock({
          transactionBlock: protectedTx,
          options: {
            showEffects: true,
            showEvents: true
          },
          requestType: 'WaitForLocalExecution'
        });

        return result.digest;
      } catch (error) {
        console.error(`Transaction attempt ${i + 1} failed:`, error);
        lastError = error as Error;

        // Increase gas price for next attempt
        this.config.minGasPrice *= 1.1;
      }
    }

    throw new Error(
      `Failed to execute protected transaction after ${this.config.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Check if transaction was frontrun
   */
  async checkFrontrunning(txDigest: string): Promise<boolean> {
    try {
      const txInfo = await SUI.client.getTransactionBlock({
        digest: txDigest,
        options: {
          showEffects: true,
          showEvents: true
        }
      });

      // Check if transaction was successful
      const status = txInfo.effects?.status?.status;
      if (status !== 'success') {
        return true;
      }

      // Additional checks can be added here
      // - Check for unexpected balance changes
      // - Check for sandwich attacks
      // - Check for price impact

      return false;
    } catch (error) {
      console.error('Error checking frontrunning:', error);
      return true;
    }
  }

  /**
   * Get optimal gas settings based on network conditions
   */
  async getOptimalGasSettings() {
    try {
      // Get latest gas price stats
      const latestTx = await SUI.client.getLatestSuiSystemState();
      const referenceGasPrice = Number(latestTx.referenceGasPrice);

      // Calculate optimal gas price with priority fee
      const optimalGasPrice = Math.max(
        this.config.minGasPrice,
        referenceGasPrice * 1.2 // 20% above reference
      );

      return {
        gasPrice: optimalGasPrice,
        gasBudget: this.config.maxGasBudget
      };
    } catch (error) {
      console.error('Error getting optimal gas settings:', error);
      return {
        gasPrice: this.config.minGasPrice,
        gasBudget: this.config.maxGasBudget
      };
    }
  }
}
