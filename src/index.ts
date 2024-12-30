import dotenv from 'dotenv';
import { SUI } from './chain/config';
import { setupListeners } from './chain/monitor';
import { setSuiClient } from '@7kprotocol/sdk-ts';
import { runTrade } from './trader/tradeStrategy';

dotenv.config()

async function main() {
  console.log("Starting...")
  const { validateConnection, client } = SUI;
  const isValid = await validateConnection();

  if (!isValid) {
    console.log("Invalid connection. Exiting...")
    process.exit(1)
  }

  setSuiClient(client)

  console.log("Connection validated, Starting monitor")

  await setupListeners()

  runTrade()
}

main()
