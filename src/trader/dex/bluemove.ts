import { bcs } from '@mysten/sui/bcs';
import { SUI } from '../../chain/config.js';
import { logError, logInfo } from '../../utils/logger.js';
import { Transaction } from '@mysten/sui/transactions';

const BLUEMOVE_PACKAGE = '0x5d410b6ee23659c5824b751e4c11dae5c6b2cbab27c67f9f6ddf3df0fb42be60';
const BLUEMOVE_ROUTER = '0x94c9daa5a46579d19a0ab4e9d4778d651982adc4e7c7b2a0e7059bf3e5f50e7c';

export async function getBlueMovePools() {
  try {
    const events = await SUI.client.queryEvents({
      query: { 
        MoveEventType: `${BLUEMOVE_PACKAGE}::pool::CreatePoolEvent` 
      }
    });
    return events.data;
  } catch (error) {
    logError('Fehler beim Abrufen der BlueMove Pools', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
    return [];
  }
}

export async function createBlueMoveBuyTransaction(
  poolId: string,
  tokenAddress: string,
  amount: number
): Promise<Transaction> {
  try {
    const tx = new Transaction();
    tx.setGasBudget(100000000);

    // Erstelle Coin für SUI Input
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);

    // Hole Pool-Objekt
    const pool = await SUI.client.getObject({
      id: poolId,
      options: { showContent: true }
    });

    if (!pool.data?.content) {
      throw new Error('Pool nicht gefunden');
    }

    // Berechne Slippage (1%)
    const minOutput = Math.floor(amount * 0.99);

    // Swap-Funktion aufrufen
    tx.moveCall({
      target: `${BLUEMOVE_PACKAGE}::router::swap_exact_input`,
      arguments: [
        tx.object(BLUEMOVE_ROUTER),
        coin,
        tx.pure.u64(minOutput),
        tx.object(poolId)
      ]
    });

    return tx;

  } catch (error) {
    logError('Fehler beim Erstellen der BlueMove Transaktion', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      poolId,
      tokenAddress
    });
    throw error;
  }
}

export async function createBlueMoveSellTransaction(
  poolId: string,
  tokenAddress: string,
  amount: bigint
): Promise<Transaction> {
  try {
    const tx = new Transaction();
    tx.setGasBudget(100000000);

    // Hole Token-Objekt
    const tokens = await SUI.client.getCoins({
      owner: tokenAddress,
      coinType: tokenAddress
    });

    if (tokens.data.length === 0) {
      throw new Error('Keine Token zum Verkaufen gefunden');
    }

    // Berechne Slippage (1%)
    const minOutput = (amount * BigInt(99)) / BigInt(100);

    // Swap-Funktion aufrufen
    tx.moveCall({
      target: `${BLUEMOVE_PACKAGE}::router::swap_exact_output`,
      arguments: [
        tx.object(BLUEMOVE_ROUTER),
        tx.object(tokens.data[0].coinObjectId),
        tx.pure.u64(Number(minOutput)),
        tx.object(poolId)
      ]
    });

    return tx;

  } catch (error) {
    logError('Fehler beim Erstellen der BlueMove Verkaufs-Transaktion', {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      poolId,
      tokenAddress
    });
    throw error;
  }
} 