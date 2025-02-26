import { SUI } from '../chain/config.js';
import { logError } from '../utils/logger.js';
export async function checkIsHoneypot(coin) {
    try {
        const correctCoin = coin.startsWith("0x") ? coin : `0x${coin}`;
        const packageId = coin.split('::')[0];
        // Hole Token-Metadaten
        const metadata = await SUI.client.getCoinMetadata({ coinType: correctCoin });
        if (!metadata) {
            return {
                isHoneypot: true,
                reason: 'Token-Metadaten nicht gefunden'
            };
        }
        // Hole Move-Module
        const moveModules = await SUI.client.getNormalizedMoveModulesByPackage({ package: packageId });
        if (!moveModules) {
            return {
                isHoneypot: true,
                reason: 'Move-Module nicht gefunden'
            };
        }
        // Überprüfe Module auf verdächtige Funktionen
        const suspiciousFunctions = [];
        const moduleName = correctCoin.split('::')[1];
        const functionName = correctCoin.split('::')[2];
        // Überprüfe erstes Modul
        if (moveModules[moduleName]) {
            const { exposedFunctions } = moveModules[moduleName];
            // Liste verdächtiger Funktionen
            const honeypotIndicators = [
                'migrate_regulated_currency_to_v2',
                'freeze',
                'pause',
                'blacklist',
                'block',
                'restrict',
                'limit'
            ];
            // Überprüfe auf verdächtige Funktionen
            for (const func of Object.keys(exposedFunctions)) {
                if (honeypotIndicators.some(indicator => func.toLowerCase().includes(indicator))) {
                    suspiciousFunctions.push(func);
                }
            }
        }
        // Überprüfe zweites Modul
        if (moveModules[functionName]) {
            const { exposedFunctions } = moveModules[functionName];
            // Überprüfe auf verdächtige Funktionen
            for (const func of Object.keys(exposedFunctions)) {
                if (func === 'migrate_regulated_currency_to_v2') {
                    suspiciousFunctions.push(func);
                }
            }
        }
        // Bewerte Ergebnis
        if (suspiciousFunctions.length > 0) {
            return {
                isHoneypot: true,
                reason: 'Verdächtige Funktionen gefunden',
                suspiciousFunctions
            };
        }
        // Zusätzliche Sicherheitsprüfungen
        const additionalChecks = await performAdditionalChecks(correctCoin);
        if (additionalChecks.isHoneypot) {
            return additionalChecks;
        }
        return {
            isHoneypot: false
        };
    }
    catch (error) {
        logError('Fehler bei der Honeypot-Erkennung', {
            error: error instanceof Error ? error.message : 'Unbekannter Fehler',
            coin
        });
        return {
            isHoneypot: true,
            reason: 'Fehler bei der Überprüfung'
        };
    }
}
async function performAdditionalChecks(coin) {
    try {
        // Hole Token-Besitzer
        const owners = await SUI.client.getOwnedObjects({
            owner: coin,
            options: { showType: true }
        });
        // Prüfe auf verdächtige Besitzverhältnisse
        if (owners.data.length === 1) {
            return {
                isHoneypot: true,
                reason: 'Token hat nur einen Besitzer'
            };
        }
        // Prüfe auf verdächtige Transaktionen
        const transactions = await SUI.client.queryTransactionBlocks({
            filter: {
                InputObject: coin
            },
            options: {
                showEffects: true,
                showInput: true
            }
        });
        // Analysiere Transaktionsmuster
        if (transactions.data.length < 5) {
            return {
                isHoneypot: true,
                reason: 'Zu wenige Transaktionen'
            };
        }
        // Prüfe auf verdächtige Effekte
        const suspiciousEffects = transactions.data.some(tx => {
            const effects = tx.effects;
            if (!effects)
                return false;
            // Prüfe auf geblockte oder fehlgeschlagene Transaktionen
            return effects.status.status === 'failure';
        });
        if (suspiciousEffects) {
            return {
                isHoneypot: true,
                reason: 'Verdächtige Transaktionseffekte gefunden'
            };
        }
        return {
            isHoneypot: false
        };
    }
    catch (error) {
        logError('Fehler bei zusätzlichen Honeypot-Checks', {
            error: error instanceof Error ? error.message : 'Unbekannter Fehler',
            coin
        });
        return {
            isHoneypot: true,
            reason: 'Fehler bei zusätzlichen Prüfungen'
        };
    }
}
//# sourceMappingURL=honeypot_detection.js.map