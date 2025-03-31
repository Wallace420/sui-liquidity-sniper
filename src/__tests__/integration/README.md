# Integrationstests für SUI Liquidity Sniper

Diese Dokumentation beschreibt die Integrationstests für die SUI Liquidity Sniper API. Die Tests verwenden Jest und Supertest, um die API-Endpunkte zu testen.

## Einrichtung

Die Integrationstests sind mit Jest und Supertest implementiert. Um die Tests auszuführen, müssen folgende Voraussetzungen erfüllt sein:

1. Node.js und npm/yarn müssen installiert sein
2. Die Abhängigkeiten müssen installiert sein: `npm install` oder `yarn install`
3. Die `.env.test`-Datei muss konfiguriert sein

## Ausführung der Tests

Um die Integrationstests auszuführen, verwende folgenden Befehl:

```bash
npm test -- --testPathPattern=src/__tests__/integration
# oder
yarn test --testPathPattern=src/__tests__/integration
```

Um einen bestimmten Test auszuführen:

```bash
npm test -- --testPathPattern=src/__tests__/integration/pools-api.test.ts
# oder
yarn test --testPathPattern=src/__tests__/integration/pools-api.test.ts
```

## Teststruktur

Die Tests sind in verschiedene Dateien aufgeteilt, die jeweils einen bestimmten Bereich der API abdecken:

- `setup.ts`: Konfiguration und Hilfsfunktionen für die Tests
- `pools-api.test.ts`: Tests für die Pools-API
- `trading-api.test.ts`: Tests für die Trading-API
- `websocket-api.test.ts`: Tests für die WebSocket-API

## Testumgebung

Die Tests verwenden eine isolierte Testumgebung mit folgenden Eigenschaften:

1. **Isolierte Datenbank**: Die Tests verwenden eine separate Datenbank oder In-Memory-Datenbank
2. **Mocks für externe Dienste**: Externe Dienste werden gemockt, um die Tests unabhängig zu machen
3. **Eigener HTTP-Server**: Jeder Test startet einen eigenen HTTP-Server auf einem zufälligen Port

## Hilfsfunktionen

Die Datei `setup.ts` enthält Hilfsfunktionen für die Tests:

- `mockFetchSuccess(data)`: Erstellt einen Mock für eine erfolgreiche Fetch-Antwort
- `mockFetchError(status, message)`: Erstellt einen Mock für eine fehlgeschlagene Fetch-Antwort
- `delay(ms)`: Wartet für eine bestimmte Zeit

## Testbeispiele

### Pools-API

```typescript
describe('GET /api/pools', () => {
  it('sollte alle Pools zurückgeben', async () => {
    // Mock für die Fetch-Anfrage
    mockFetchSuccess(mockPools);
    
    // API-Anfrage
    const response = await request.get('/api/pools');
    
    // Überprüfungen
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].name).toBe('SUI-USDC');
  });
});
```

### Trading-API

```typescript
describe('POST /api/trading/swap', () => {
  it('sollte eine Transaktion ausführen', async () => {
    // Mock für die Fetch-Anfrage
    mockFetchSuccess(mockTransaction);
    
    // API-Anfrage
    const response = await request.post('/api/trading/swap').send({
      fromToken: 'SUI',
      toToken: 'USDC',
      amount: '1.5',
      slippage: 0.01,
      wallet: '0xuser123'
    });
    
    // Überprüfungen
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe('success');
  });
});
```

### WebSocket-API

```typescript
it('sollte eine Verbindung herstellen können', (done) => {
  client = createSocketClient();
  
  client.on('connect', () => {
    expect(client.connected).toBe(true);
    done();
  });
});
```

## Best Practices

Bei der Implementierung von Integrationstests sollten folgende Best Practices beachtet werden:

1. **Isolierte Tests**: Jeder Test sollte unabhängig von anderen Tests sein und seinen eigenen Zustand einrichten.

2. **Mocks für externe Dienste**: Verwende Mocks für externe Dienste, um die Tests unabhängig und zuverlässig zu machen.

3. **Klare Testbeschreibungen**: Verwende klare und beschreibende Testbeschreibungen, die den Zweck des Tests verdeutlichen.

4. **Vollständige Überprüfungen**: Überprüfe nicht nur den Status-Code, sondern auch den Inhalt der Antwort.

5. **Fehlerbehandlung testen**: Teste nicht nur den Erfolgsfall, sondern auch Fehlerfälle und Grenzfälle.

## Fehlerbehebung

### Häufige Probleme

1. **Tests schlagen fehl, weil der Server nicht startet**:
   - Überprüfe, ob die Portnummer nicht bereits verwendet wird
   - Stelle sicher, dass die Umgebungsvariablen korrekt konfiguriert sind

2. **Tests schlagen fehl, weil Mocks nicht funktionieren**:
   - Überprüfe, ob die Mocks korrekt konfiguriert sind
   - Stelle sicher, dass die gemockten Funktionen korrekt aufgerufen werden

3. **Tests schlagen fehl, weil Timeouts auftreten**:
   - Erhöhe den Timeout-Wert für langsame Tests
   - Überprüfe, ob asynchrone Operationen korrekt behandelt werden

## Erweiterung der Tests

Um neue Tests hinzuzufügen:

1. Erstelle eine neue `.test.ts`-Datei im `src/__tests__/integration`-Verzeichnis
2. Importiere die benötigten Funktionen aus `setup.ts`
3. Implementiere die Tests mit Jest und Supertest
4. Führe die Tests aus, um sicherzustellen, dass sie korrekt funktionieren 