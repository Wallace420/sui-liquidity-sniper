# SUI liquidity sniper

The bot monitors the creation of new pools. Once a pool is created, the bot automatically makes a purchase, logs the trade in the database, and starts a trading process that tracks the token's price fluctuations. When the desired profit is reached, or if the stop-loss rule is triggered, it automatically sells as well.

All actions will be sent on telegram chat by your bot.


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


<<<<<<< HEAD
### Upcoming Features

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
=======
>>>>>>> 7a653ef1dec3964b3d647b498c1e2b654d4b5177

