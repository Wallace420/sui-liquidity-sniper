import axios from 'axios';

type NetworkType = 'mainnet' | 'testnet' | 'devnet';

export function getFaucetHost(network: NetworkType): string {
  switch (network) {
    case 'testnet':
      return 'https://faucet.testnet.sui.io';
    case 'devnet':
      return 'https://faucet.devnet.sui.io';
    default:
      throw new Error(`Faucet nicht verfügbar für ${network}`);
  }
}

export async function requestSuiFromFaucetV0({ 
  host, 
  recipient 
}: { 
  host: string; 
  recipient: string;
}): Promise<boolean> {
  try {
    const response = await axios.post(`${host}/gas`, {
      FixedAmountRequest: {
        recipient
      }
    });

    return response.status === 201 || response.status === 200;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Faucet-Fehler: ${error.response?.data?.error || error.message}`);
    }
    throw error;
  }
} 