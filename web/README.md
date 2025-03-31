# SUI Liquidity Sniper Frontend

Diese Anwendung ist das Frontend für das SUI Liquidity Sniper Projekt, eine Next.js-Anwendung zur Überwachung und Interaktion mit Liquiditätspools auf der SUI-Blockchain.

## Funktionen

- Echtzeit-Überwachung von Liquiditätspools
- Trading-Charts mit technischen Indikatoren
- Token-Analyse und Risikobewertung
- Ausführung von Transaktionen
- Visualisierung von Liquiditätspools

## Voraussetzungen

- Node.js 18.x oder höher
- npm 9.x oder höher
- Git

## Lokale Entwicklung

1. Repository klonen:
   ```bash
   git clone https://github.com/yourusername/sui-liquidity-sniper.git
   cd sui-liquidity-sniper
   ```

2. Abhängigkeiten installieren:
   ```bash
   npm install
   cd web
   npm install
   ```

3. Entwicklungsserver starten:
   ```bash
   npm run dev
   ```

4. Öffnen Sie [http://localhost:3000](http://localhost:3000) in Ihrem Browser.

## Umgebungsvariablen

Alle Umgebungsvariablen werden jetzt in einer einzigen `.env`-Datei im Hauptverzeichnis des Projekts verwaltet. Diese Datei enthält sowohl Backend- als auch Frontend-Konfigurationen.

Die Frontend-spezifischen Variablen beginnen mit `NEXT_PUBLIC_`:

```
# API-KONFIGURATION
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001

# UMGEBUNG
NEXT_PUBLIC_ENVIRONMENT=development

# FEATURE-FLAGS
NEXT_PUBLIC_ENABLE_REAL_DATA=false
NEXT_PUBLIC_ENABLE_WALLET_CONNECT=false
NEXT_PUBLIC_ENABLE_TRANSACTIONS=false

# BLOCKCHAIN-KONFIGURATION
NEXT_PUBLIC_SUI_NETWORK=mainnet
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.mainnet.sui.io
```

## WebSocket-Verbindung

Die Anwendung verwendet eine einheitliche WebSocket-Implementierung in `src/lib/api/websocket.ts`. Diese bietet:

- Eine native WebSocket-Verbindung
- Socket.io-Kompatibilität für ältere Komponenten
- React-Hooks für einfache Integration in Komponenten

Beispiel für die Verwendung des WebSocket-Hooks:

```typescript
import { useWebSocket } from '@/lib/api/websocket';

function MyComponent() {
  const { 
    isConnected, 
    pools, 
    trades, 
    wallets, 
    systemStatus,
    sendMessage 
  } = useWebSocket();

  // Verwenden Sie die WebSocket-Daten in Ihrer Komponente
  return (
    <div>
      <p>Verbindungsstatus: {isConnected ? 'Verbunden' : 'Getrennt'}</p>
      <p>Anzahl der Pools: {pools.length}</p>
    </div>
  );
}
```

## Vorbereitung für die Produktion

1. Umgebungsvariablen konfigurieren:
   - Kopieren Sie die `.env`-Datei und passen Sie die Werte für die Produktion an
   - Stellen Sie sicher, dass `NEXT_PUBLIC_ENVIRONMENT=production` gesetzt ist
   - Konfigurieren Sie die korrekten API- und WebSocket-URLs

2. Produktions-Build erstellen:
   ```bash
   cd web
   npm run build
   ```

3. Build testen:
   ```bash
   npm run start
   ```

## Deployment-Optionen

### Option 1: Vercel

1. Vercel CLI installieren:
   ```bash
   npm install -g vercel
   ```

2. Bei Vercel anmelden:
   ```bash
   vercel login
   ```

3. Projekt deployen:
   ```bash
   cd web
   vercel
   ```

### Option 2: Docker

1. Dockerfile im `web`-Verzeichnis erstellen:
   ```dockerfile
   FROM node:18-alpine AS base
   
   FROM base AS deps
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci
   
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npm run build
   
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV production
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   
   EXPOSE 3000
   ENV PORT 3000
   
   CMD ["node", "server.js"]
   ```

2. Docker-Image bauen:
   ```bash
   docker build -t sui-liquidity-sniper-frontend .
   ```

3. Container starten:
   ```bash
   docker run -p 3000:3000 sui-liquidity-sniper-frontend
   ```

### Option 3: Traditionelles Hosting

1. Statischen Export erstellen:
   ```bash
   cd web
   npm run build
   npm run export
   ```

2. Den Inhalt des `out`-Verzeichnisses auf Ihren Webserver hochladen.

## Produktionsoptimierungen

- Verwenden Sie Vercel Analytics oder ein ähnliches Tool zur Leistungsüberwachung
- Implementieren Sie ein CDN für statische Assets
- Optimieren Sie die WebSocket-Verbindungen für Stabilität in Produktionsumgebungen

## Bekannte Probleme und Lösungen

- **WebSocket-Verbindungsprobleme**: Stellen Sie sicher, dass die WebSocket-URL korrekt konfiguriert ist und der Server erreichbar ist.
- **Hohe Speichernutzung bei langen Chart-Sitzungen**: Implementieren Sie eine Bereinigung nicht benötigter Daten.

## Nächste Schritte

- End-to-End-Tests implementieren
- Benutzerauthentifizierung hinzufügen
- Analytics für Benutzerverhalten einrichten
- Mobile-Optimierung verbessern

## Support

Bei Fragen oder Problemen wenden Sie sich an das Entwicklungsteam unter support@example.com. 