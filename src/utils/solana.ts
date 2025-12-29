// Using direct RPC calls instead of @solana/web3.js
const QUICKNODE_RPC_URL = 'https://restless-weathered-telescope.solana-mainnet.quiknode.pro/f69b75f517fdbfa8062bce9bd3d96310000e349a/';
const USDC_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export async function fetchSOLBalance(walletAddress: string): Promise<number> {
  try {
    const response = await fetch(QUICKNODE_RPC_URL, {
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
    const response = await fetch(QUICKNODE_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getParsedTokenAccountsByOwner',
        params: [
          walletAddress,
          {
            mint: USDC_MINT_ADDRESS
          },
          {
            encoding: 'jsonParsed'
          }
        ]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Failed to fetch USDC balance');
    }
    
    const tokenAccounts = data.result?.value || [];
    if (tokenAccounts.length > 0) {
      return tokenAccounts[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching USDC balance:', error);
    return 0;
  }
}

