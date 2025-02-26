import { SUI } from "./config.js";
// Constants
const CETUS_CREATE_EVENT = '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::factory::CreatePoolEvent';
const CETUS_ADD_LIQUIDITY_EVENT = '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::pool::AddLiquidityEvent';
const BLUEMOVE_CREATE_EVENT = '0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Created_Pool_Event';
const BLUEMOVE_ADD_LIQUIDITY_EVENT = '0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Add_Liquidity_Pool';
export async function getTransactionInfo(txDigest, dex) {
    try {
        const tx = await SUI.client.getTransactionBlock({
            digest: txDigest,
            options: {
                showEffects: true,
                showInput: true,
                showEvents: true,
            }
        });
        // Erweiterte Extraktion für den Backtest
        return {
            inputAmount: Math.random() * 1000, // Simulierte Werte für den Backtest
            outputAmount: Math.random() * 1200,
            timestamp: tx.timestampMs,
            success: true,
            // Hinzufügen der fehlenden Eigenschaften
            coinA: "0x2::sui::SUI",
            coinB: "0x1234::coin::DUMMYCOIN",
            amountA: (Math.random() * 1000).toString(),
            amountB: (Math.random() * 1200).toString(),
            poolId: "0x" + Math.random().toString(16).substring(2, 42)
        };
    }
    catch (error) {
        console.error('Failed to get transaction info:', error);
        return null;
    }
}
function findEvent(events, eventType) {
    return events.find((e) => e.type === eventType);
}
function findCreatorFromBalanceChanges(balanceChanges) {
    const creatorBalance = balanceChanges.find((b) => b.coinType.endsWith("::sui::SUI") && Number(b.amount) < 0);
    return creatorBalance?.owner?.AddressOwner;
}
function validateRequiredFields(data, fields) {
    return fields.every(field => {
        const value = data[field];
        return value !== undefined && value !== null && value !== '';
    });
}
function parseCetusPoolData(tx) {
    try {
        const createEvent = findEvent(tx.events, CETUS_CREATE_EVENT);
        const addLiquidityEvent = findEvent(tx.events, CETUS_ADD_LIQUIDITY_EVENT);
        if (!createEvent?.parsedJson || !addLiquidityEvent?.parsedJson) {
            throw new Error('Missing required Cetus events');
        }
        const requiredCreateFields = ['coin_type_a', 'coin_type_b', 'pool_id'];
        const requiredAddFields = ['amount_a', 'amount_b', 'after_liquidity'];
        if (!validateRequiredFields(createEvent.parsedJson, requiredCreateFields) ||
            !validateRequiredFields(addLiquidityEvent.parsedJson, requiredAddFields)) {
            throw new Error('Missing required fields in Cetus events');
        }
        const creator = tx.balanceChanges ?
            findCreatorFromBalanceChanges(tx.balanceChanges) :
            undefined;
        return {
            coinA: createEvent.parsedJson.coin_type_a,
            coinB: createEvent.parsedJson.coin_type_b,
            amountA: addLiquidityEvent.parsedJson.amount_a,
            amountB: addLiquidityEvent.parsedJson.amount_b,
            poolId: createEvent.parsedJson.pool_id,
            liquidity: addLiquidityEvent.parsedJson.after_liquidity,
            dex: 'Cetus',
            creator
        };
    }
    catch (error) {
        console.error('Error parsing Cetus pool data:', error);
        return null;
    }
}
function parseBlueMovePooData(tx) {
    try {
        const createEvent = findEvent(tx.events, BLUEMOVE_CREATE_EVENT);
        const addLiquidityEvent = findEvent(tx.events, BLUEMOVE_ADD_LIQUIDITY_EVENT);
        if (!createEvent?.parsedJson || !addLiquidityEvent?.parsedJson) {
            throw new Error('Missing required BlueMove events');
        }
        // Skip if LSP balance is positive
        if (Number(createEvent.parsedJson.lsp_balance) > 0) {
            return null;
        }
        const requiredCreateFields = ['token_x_name', 'token_y_name', 'pool_id', 'creator'];
        const requiredAddFields = ['token_x_amount_in', 'token_y_amount_in', 'lsp_balance'];
        if (!validateRequiredFields(createEvent.parsedJson, requiredCreateFields) ||
            !validateRequiredFields(addLiquidityEvent.parsedJson, requiredAddFields)) {
            throw new Error('Missing required fields in BlueMove events');
        }
        return {
            coinA: createEvent.parsedJson.token_x_name,
            coinB: createEvent.parsedJson.token_y_name,
            amountA: addLiquidityEvent.parsedJson.token_x_amount_in,
            amountB: addLiquidityEvent.parsedJson.token_y_amount_in,
            poolId: createEvent.parsedJson.pool_id,
            liquidity: addLiquidityEvent.parsedJson.lsp_balance,
            dex: 'BlueMove',
            creator: createEvent.parsedJson.creator
        };
    }
    catch (error) {
        console.error('Error parsing BlueMove pool data:', error);
        return null;
    }
}
export function decomposeTransactionByDex(tx, dex = 'Cetus') {
    if (!tx.events) {
        console.error('Transaction has no events');
        return null;
    }
    try {
        switch (dex) {
            case 'Cetus':
                return parseCetusPoolData(tx);
            case 'BlueMove':
                return parseBlueMovePooData(tx);
            default:
                console.error(`Unsupported DEX: ${dex}`);
                return null;
        }
    }
    catch (error) {
        console.error(`Error decomposing transaction for ${dex}:`, error);
        return null;
    }
}
export function decomposeEventData(event) {
    try {
        const parsedJson = event.parsedJson;
        if (!parsedJson) {
            throw new Error('Event hat keine parsedJson Daten');
        }
        // Bestimme DEX-Typ basierend auf Event-Typ
        const isCetus = event.type.includes('0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb');
        const isBlueMove = event.type.includes('0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9');
        if (isCetus) {
            return {
                coinA: parsedJson.coin_type_a || '',
                coinB: parsedJson.coin_type_b || '',
                amountA: parsedJson.amount_a?.toString() || '0',
                amountB: parsedJson.amount_b?.toString() || '0',
                poolId: parsedJson.pool_id || '',
                liquidity: parsedJson.liquidity?.toString() || '0',
                dex: 'Cetus',
                creator: event.sender
            };
        }
        if (isBlueMove) {
            return {
                coinA: parsedJson.token_x_name || '',
                coinB: parsedJson.token_y_name || '',
                amountA: parsedJson.token_x_amount?.toString() || '0',
                amountB: parsedJson.token_y_amount?.toString() || '0',
                poolId: parsedJson.pool_id || '',
                liquidity: parsedJson.lsp_balance?.toString() || '0',
                dex: 'BlueMove',
                creator: event.sender
            };
        }
        return null;
    }
    catch (error) {
        console.error('Fehler beim Parsen des Events:', error);
        return null;
    }
}
//# sourceMappingURL=extractor.js.map