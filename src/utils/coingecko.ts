// CoinGecko API utility for fetching cryptocurrency prices

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

export interface CoinPrice {
  usd: number;
}

export interface CoinGeckoResponse {
  solana: CoinPrice;
}

/**
 * Fetches the current USD price of Solana (SOL) from CoinGecko
 * @returns Promise<number> The price of SOL in USD
 */
export async function fetchSOLPrice(): Promise<number> {
  try {
    const response = await fetch(
      `${COINGECKO_API_URL}/simple/price?ids=solana&vs_currencies=usd`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoResponse = await response.json();
    return data.solana?.usd || 0;
  } catch (error) {
    console.error('Error fetching SOL price from CoinGecko:', error);
    return 0;
  }
}

