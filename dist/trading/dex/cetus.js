import { SUI } from '../../chain/config.js';
import { logError } from '../../utils/logger.js';
import { Transaction } from '@mysten/sui/transactions';
const CETUS_PACKAGE = '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb';
const CETUS_ROUTER = '0xdee9::clob_v2::Pool<0x2::sui::SUI, CoinType>';
export async function getCetusPools() {
    try {
        const events = await SUI.client.queryEvents({
            query: {
                MoveEventType: `${CETUS_PACKAGE}::pool::PoolCreatedEvent`
            }
        });
        return events.data;
    }
    catch (error) {
        logError('Fehler beim Abrufen der Cetus Pools', {
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
        return [];
    }
}
export async function createCetusBuyTransaction(poolId, tokenAddress, amount) {
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
            target: `${CETUS_PACKAGE}::router::swap_exact_input`,
            arguments: [
                tx.object(CETUS_ROUTER),
                coin,
                tx.pure.u64(minOutput),
                tx.object(poolId)
            ]
        });
        return tx;
    }
    catch (error) {
        logError('Fehler beim Erstellen der Cetus Transaktion', {
            error: error instanceof Error ? error.message : 'Unbekannter Fehler',
            poolId,
            tokenAddress
        });
        throw error;
    }
}
export async function createCetusSellTransaction(poolId, tokenAddress, amount) {
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
            target: `${CETUS_PACKAGE}::router::swap_exact_output`,
            arguments: [
                tx.object(CETUS_ROUTER),
                tx.object(tokens.data[0].coinObjectId),
                tx.pure.u64(Number(minOutput)),
                tx.object(poolId)
            ]
        });
        return tx;
    }
    catch (error) {
        logError('Fehler beim Erstellen der Cetus Verkaufs-Transaktion', {
            error: error instanceof Error ? error.message : 'Unbekannter Fehler',
            poolId,
            tokenAddress
        });
        throw error;
    }
}
//# sourceMappingURL=cetus.js.map