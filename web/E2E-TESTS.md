# End-to-End Tests für SUI Liquidity Sniper

Diese Dokumentation beschreibt die End-to-End (E2E) Tests für die SUI Liquidity Sniper Webanwendung. Die Tests verwenden Cypress als Testing-Framework und decken die wichtigsten Benutzerworkflows ab.

## Einrichtung

Die E2E-Tests sind mit Cypress implementiert. Um die Tests auszuführen, müssen folgende Voraussetzungen erfüllt sein:

1. Node.js und npm/yarn müssen installiert sein
2. Die Abhängigkeiten müssen installiert sein: `npm install` oder `yarn install`

## Ausführung der Tests

Es gibt verschiedene Möglichkeiten, die Tests auszuführen:

### Interaktiver Modus

```bash
npm run cypress
# oder
yarn cypress
```

Dies öffnet die Cypress Test Runner UI, in der Tests interaktiv ausgeführt werden können.

### Headless-Modus

```bash
npm run cypress:headless
# oder
yarn cypress:headless
```

Dies führt alle Tests im Headless-Modus aus, was für CI/CD-Pipelines geeignet ist.

### Mit lokaler Entwicklungsumgebung

```bash
npm run e2e
# oder
yarn e2e
```

Dies startet den Entwicklungsserver und führt dann die Tests aus.

## Teststruktur

Die Tests sind in verschiedene Dateien aufgeteilt, die jeweils einen bestimmten Bereich der Anwendung abdecken:

- `dashboard.cy.ts`: Tests für die Dashboard-Seite
- `settings.cy.ts`: Tests für die Einstellungsseite
- `trading.cy.ts`: Tests für den Trading-Workflow

## Benutzerdefinierte Befehle

Wir haben einige benutzerdefinierte Cypress-Befehle implementiert, um häufige Aktionen zu vereinfachen:

- `cy.login(username, password)`: Meldet einen Benutzer an
- `cy.connectWallet()`: Simuliert die Verbindung einer Wallet
- `cy.waitForWebSocket()`: Wartet auf eine erfolgreiche WebSocket-Verbindung
- `cy.waitForData(dataTestId, timeout)`: Wartet auf das Laden von Daten

## Testdaten

Die Tests verwenden Fixture-Dateien für Testdaten:

- `pools.json`: Enthält Beispieldaten für Liquiditätspools

## Best Practices

Bei der Implementierung von E2E-Tests sollten folgende Best Practices beachtet werden:

1. **Verwende data-testid-Attribute**: Verwende `data-testid`-Attribute, um Elemente zu identifizieren, anstatt auf CSS-Klassen oder Text zu vertrauen, die sich häufiger ändern können.

2. **Isoliere Tests**: Jeder Test sollte unabhängig von anderen Tests sein und seinen eigenen Zustand einrichten.

3. **Verwende angemessene Timeouts**: Setze angemessene Timeouts für asynchrone Operationen, besonders wenn auf Netzwerkanfragen gewartet wird.

4. **Minimiere Abhängigkeiten von externen Diensten**: Verwende Mocks oder Fixtures für externe Dienste, um Tests zuverlässiger zu machen.

5. **Teste kritische Benutzerworkflows**: Konzentriere dich auf die wichtigsten Benutzerworkflows, anstatt jede kleine Funktion zu testen.

## Fehlerbehebung

### Häufige Probleme

1. **Tests schlagen fehl, weil Elemente nicht gefunden werden**:
   - Überprüfe, ob die `data-testid`-Attribute korrekt sind
   - Erhöhe den Timeout-Wert für langsame Operationen
   - Stelle sicher, dass die Anwendung korrekt läuft

2. **WebSocket-Verbindungsprobleme**:
   - Stelle sicher, dass der WebSocket-Server läuft
   - Überprüfe die Konfiguration in der Cypress-Umgebung

3. **Inkonsistente Testergebnisse**:
   - Stelle sicher, dass Tests isoliert sind und ihren eigenen Zustand einrichten
   - Verwende `cy.intercept()`, um Netzwerkanfragen zu kontrollieren

## Erweiterung der Tests

Um neue Tests hinzuzufügen:

1. Erstelle eine neue `.cy.ts`-Datei im `cypress/e2e`-Verzeichnis
2. Implementiere die Tests mit dem Cypress-API
3. Füge bei Bedarf neue Fixtures oder benutzerdefinierte Befehle hinzu

## CI/CD-Integration

Die E2E-Tests können in CI/CD-Pipelines integriert werden. Ein Beispiel für eine GitHub Actions-Konfiguration:

```yaml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  cypress-run:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Cypress tests
        uses: cypress-io/github-action@v5
        with:
          build: npm run build
          start: npm start
          wait-on: 'http://localhost:3000'
``` 