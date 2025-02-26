# SUI Liquidity Sniper

Ein leistungsstarkes Tool zum Snipen von Liquiditätspools auf der SUI-Blockchain.

## Funktionen

- **Verbesserte Terminal-Ausgabe**: Klare und strukturierte Anzeige aller wichtigen Informationen
- **Echtzeit-Überwachung**: Automatische Erkennung neuer Pools und Benachrichtigungen
- **Fortschrittliche Filterung**: Intelligente Filterung von Pools basierend auf Risiko-Score, Liquidität und Honeypot-Erkennung
- **Benutzerfreundliche Befehle**: Einfache Befehle und Schnellzugriffstasten für alle Aktionen
- **Detaillierte Pool-Informationen**: Umfassende Informationen zu jedem Pool, einschließlich Social-Media-Links und Metriken
- **Automatischer Modus**: Automatisches Snipen von Pools, die den Filterkriterien entsprechen

## Installation

```bash
# Klone das Repository
git clone https://github.com/yourusername/sui-liquidity-sniper.git

# Wechsle in das Verzeichnis
cd sui-liquidity-sniper

# Installiere die Abhängigkeiten
npm install

# Starte die Anwendung
npm run cli
```

## Befehle und Schnellzugriffstasten

| Befehl | Schnelltaste | Beschreibung |
|--------|--------------|--------------|
| `help` | `h` | Zeigt die Hilfe an |
| `clear` | `c` | Löscht den Bildschirm |
| `status` | `s` | Zeigt den aktuellen Status an |
| `pools` | `p` | Zeigt alle aktiven Pools an |
| `details <poolId>` | - | Zeigt Details zu einem Pool an |
| `buy <poolId> <amount>` | - | Kauft Token aus einem Pool |
| `sell <poolId> <amount>` | - | Verkauft Token aus einem Pool |
| `auto on` | `a` | Schaltet den Auto-Modus ein |
| `auto off` | `x` | Schaltet den Auto-Modus aus |
| `risk` | `r` | Zeigt Risikoanalyse für alle Pools |
| `filter` | `f` | Zeigt und ändert Filtereinstellungen |
| `quickbuy` | `qb` | Kauft automatisch den besten Pool |
| `quicksell` | `qs` | Verkauft alle gekauften Token |
| `wallet` | `w` | Zeigt Wallet-Informationen |
| `scan` | - | Scannt aktiv nach neuen Pools |
| `monitor <on|off>` | - | Schaltet Pool-Überwachung ein/aus |
| `exit` | `q` | Beendet das Programm |

## Parameter

- `minliquidity` - Minimale Liquidität in SUI
- `maxrisk` - Maximaler Risiko-Score (0-100)
- `size` - Positionsgröße in SUI
- `takeprofit` - Take-Profit in Prozent
- `stoploss` - Stop-Loss in Prozent
- `trailingstop` - Trailing-Stop aktivieren/deaktivieren (on/off)
- `trailingdistance` - Trailing-Distanz in Prozent

## Verbesserte Terminal-Ausgabe

Die Terminal-Ausgabe wurde vollständig überarbeitet, um eine bessere Übersicht und Benutzerfreundlichkeit zu gewährleisten:

1. **Strukturierte Anzeige**: Alle Informationen werden in klar strukturierten Tabellen und Boxen angezeigt
2. **Farbkodierung**: Wichtige Informationen werden farblich hervorgehoben
3. **Detaillierte Pool-Informationen**: Umfassende Informationen zu jedem Pool, einschließlich:
   - Token-Informationen (Name, Symbol, Adresse)
   - Liquiditätsinformationen
   - Risiko-Metriken (Scam-Wahrscheinlichkeit, Honeypot-Erkennung)
   - Social-Media-Links
   - Handelsstatistiken
4. **Echtzeit-Benachrichtigungen**: Sofortige Benachrichtigungen bei neuen Pools
5. **Benutzerfreundliche Eingabe**: Verbesserte Eingabeaufforderung mit Befehlshistorie und Schnellzugriffstasten

## Schnellzugriff auf wichtige Funktionen

Mit den neuen Schnellzugriffstasten können Sie sofort auf die wichtigsten Funktionen zugreifen:

1. **Risikoanalyse (r)**: Zeigt eine detaillierte Risikoanalyse aller aktiven Pools mit farblicher Hervorhebung
2. **Filtereinstellungen (f)**: Zeigt die aktuellen Filtereinstellungen und ermöglicht deren schnelle Änderung
3. **Schnellkauf (qb)**: Kauft automatisch den besten verfügbaren Pool basierend auf Risiko und Liquidität
4. **Schnellverkauf (qs)**: Verkauft alle gekauften Token mit einem Befehl
5. **Wallet-Informationen (w)**: Zeigt alle wichtigen Informationen zu Ihrer Wallet auf einen Blick

## Lizenz

MIT


## Screenshots

<div align="center">
  <img src="./assets/screenshot_1.png" width="90%" />
</div>

<div align="center">
  <img src="./assets/screenshot_2.png" width="90%" />
</div>

<div align="center">
  <img src="./assets/screenshot_3.png" width="90%" />
</div>


## Env variables

Configure your .env with this credentials

`SUI_WALLET_SECRET_KEY`

`DATABASE_URL`

`TELEGRAM_TOKEN`

`TELEGRAM_GROUP_ID`

`SUIVISION_API_KEY`

get your free api key here: [blockvision](https://dashboard.blockvision.org/overview) 

*This API is only needed to retrieve information about the token creator, specifically to identify if spot bot wallets have created tokens used in scams by removing liquidity.*


## Running locally in dev mode.

clone the repo

```bash
  git clone https://github.com/AguaPotavel/sui-liquidity-sniper
```

go to folder

```bash
  cd my-project
```

Install deps

```bash
  npm install
```

Run migrations

```bash
  npx prisma migrate
```

Generate prisma client

```bash
  npx prisma generate
```

Run the project

```bash
  npm run dev
```

## Features

- Monitor new pool creations.
- Execute a purchase immediately after a pool is created.
- Detect and avoid honeypots.
- Track purchased tokens to identify the best selling opportunities.


## Dex support

- [x]  Cetus
- [x]  BlueMove
- [ ]  Bluefin
- [ ]  Turbos
- [ ]  FlowX

*Cetus is purchased directly on Cetus, while BlueMove uses 7k.agg to facilitate these transactions.* 

*The bot will only acquire tokens with liquidity created by the migrator from MovePump.*
## Authors

- @DirtySanch3z


## FAQ

#### Why is only supported BlueMove and Cetus?

Because tokens listed on Turbos, Bluefi, FlowX considerably less than in the other dex

#### Why is checked the owner of token?

Due to the prevalence of scam bots, they often create a token, provide liquidity, and then remove it as soon as users start buying the token, leaving buyers at a loss.


## Upcoming Features

### Performance-Optimierungen
Integration von Mysticeti V2, das schnellere Transaktionsverarbeitung ermöglicht6

Anpassung an Remora, die neue horizontale Skalierungslösung von SUI, die hundertausende Transaktionen pro Sekunde verarbeiten kann6

Implementierung der neuen "Programmable Peer-to-Peer Tunnels" für reduzierte Latenzzeiten6

### DEX-Integration
Erweiterung um neue DEXs wie Steamm von Suilend4

Anpassung an die verbesserte Kapitaleffizienz durch neue "Bank"-Features4

Integration der neuen yield-bearing LP Token Funktionalität4

### Sicherheitsupdates
Implementierung der neuen Zero-Knowledge Proofs für verbesserte Privatsphäre6

Aktualisierung der Honeypot-Erkennung für neue Scam-Muster1

Erweiterung der Gas-Preis-Optimierung gemäß SIP-45 für Hochlastzeiten4

Wallet-Funktionalität
Integration der neuen Phantom und Backpack Wallet-Funktionen4

Verbesserung der Multi-Wallet-Verwaltung für bis zu 40 Wallets1

Implementierung verbesserter Backup- und Sicherheitsprotokolle8

Diese Updates werden schrittweise implementiert werden, um die Stabilität des Bots zu gewährleisten und von den neuen SUI-Blockchain-Funktionen optimal zu profitieren.

