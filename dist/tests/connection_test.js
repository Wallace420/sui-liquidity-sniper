import { SUI } from '../chain/config.js';
import { logInfo, logError } from '../utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();
async function testConnection() {
    try {
        // Test 1: Basis-Verbindung
        logInfo('🔄 Teste Basis-Verbindung...');
        const latestCheckpoint = await SUI.client.getLatestCheckpointSequenceNumber();
        logInfo('✅ Basis-Verbindung erfolgreich', { latestCheckpoint });
        // Test 2: Load Balancing
        logInfo('🔄 Teste Load Balancing...');
        const promises = Array(5).fill(0).map(() => SUI.client.getLatestCheckpointSequenceNumber());
        await Promise.all(promises);
        logInfo('✅ Load Balancing funktioniert');
        // Test 3: Pool Events durch Checkpoint-Abfrage
        logInfo('🔄 Teste Pool-Event Erkennung...');
        const startCheckpoint = await SUI.client.getLatestCheckpointSequenceNumber();
        const endCheckpoint = BigInt(startCheckpoint) - BigInt(100); // Letzte 100 Checkpoints
        // Suche nach Pool-Events in den letzten 100 Checkpoints
        const events = await SUI.client.queryEvents({
            query: {
                TimeRange: {
                    startTime: endCheckpoint.toString(),
                    endTime: startCheckpoint
                }
            },
            limit: 50
        });
        logInfo('✅ Event-Abfrage erfolgreich', {
            eventsGefunden: events.data.length,
            startCheckpoint,
            endCheckpoint: endCheckpoint.toString()
        });
        // Analysiere gefundene Events
        const poolEvents = events.data.filter((event) => event.type.includes('factory::CreatePoolEvent') ||
            event.type.includes('swap::Created_Pool_Event'));
        if (poolEvents.length > 0) {
            logInfo('🎯 Pool-Events gefunden', {
                anzahl: poolEvents.length,
                beispielEvent: {
                    type: poolEvents[0].type,
                    timestamp: new Date(Number(poolEvents[0].timestampMs)).toISOString()
                }
            });
        }
        else {
            logInfo('ℹ️ Keine Pool-Events in den letzten 100 Checkpoints');
        }
    }
    catch (error) {
        logError('❌ Test fehlgeschlagen', {
            error: error instanceof Error ? error.message : 'Unbekannter Fehler',
            stack: error instanceof Error ? error.stack : undefined
        });
        process.exit(1);
    }
}
// Führe Test aus
logInfo('🚀 Starte Verbindungstest...');
testConnection().then(() => {
    logInfo('✅ Alle Tests abgeschlossen');
    process.exit(0);
}).catch(error => {
    logError('❌ Tests fehlgeschlagen', { error });
    process.exit(1);
});
//# sourceMappingURL=connection_test.js.map