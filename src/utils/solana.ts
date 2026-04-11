// Using direct RPC calls instead of @solana/web3.js (align with `getSolanaRpcUrl` in escrowChain.ts)
function getRpcUrl(): string {
  const u = import.meta.env.VITE_SOLANA_RPC_URL?.trim();
  if (u) return u;
  const cluster = import.meta.env.VITE_SOLANA_CLUSTER?.trim().toLowerCase();
  if (cluster === 'mainnet-beta' || cluster === 'mainnet') {
    return 'https://api.mainnet-beta.solana.com';
  }
  return 'https://api.devnet.solana.com';
}

const USDC_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT_ADDRESS = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

export async function fetchSOLBalance(walletAddress: string): Promise<number> {
  try {
    const response = await fetch(getRpcUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [walletAddress]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Failed to fetch balance');
    }
    
    const balance = data.result?.value || 0;
    return balance / 1000000000; // Convert lamports to SOL
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    return 0;
  }
}

export async function fetchUSDCBalance(walletAddress: string): Promise<number> {
  try {
    const response = await fetch(getRpcUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          { mint: USDC_MINT_ADDRESS },
          { encoding: 'jsonParsed', commitment: 'confirmed' }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Failed to fetch USDC balance');
    }

    const tokenAccounts = data.result?.value || [];
    if (tokenAccounts.length > 0) {
      const account = tokenAccounts[0].account;
      const parsed = account?.data?.parsed ?? account?.data;
      const uiAmount = parsed?.info?.tokenAmount?.uiAmount;
      return typeof uiAmount === 'number' ? uiAmount : (parseFloat(uiAmount) || 0);
    }
    return 0;
  } catch (error) {
    console.error('Error fetching USDC balance:', error);
    return 0;
  }
}

export async function fetchUSDTBalance(walletAddress: string): Promise<number> {
  try {
    const response = await fetch(getRpcUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          { mint: USDT_MINT_ADDRESS },
          { encoding: 'jsonParsed', commitment: 'confirmed' }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Failed to fetch USDT balance');
    }

    const tokenAccounts = data.result?.value || [];
    if (tokenAccounts.length > 0) {
      const account = tokenAccounts[0].account;
      const parsed = account?.data?.parsed ?? account?.data;
      const uiAmount = parsed?.info?.tokenAmount?.uiAmount;
      return typeof uiAmount === 'number' ? uiAmount : (parseFloat(uiAmount) || 0);
    }
    return 0;
  } catch (error) {
    console.error('Error fetching USDT balance:', error);
    return 0;
  }
}

