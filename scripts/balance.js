// ==================== WALLET BALANCE ====================

// Solana RPC endpoints
const SOLANA_RPC_URL = 'https://restless-weathered-telescope.solana-mainnet.quiknode.pro/f69b75f517fdbfa8062bce9bd3d96310000e349a/';
const SOLANA_WS_URL = 'wss://restless-weathered-telescope.solana-mainnet.quiknode.pro/f69b75f517fdbfa8062bce9bd3d96310000e349a/';

// USDC mint address on Solana mainnet
const USDC_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Get wallet balance using Solana RPC
async function getWalletBalance(walletAddress) {
    if (!walletAddress) {
        console.error('No wallet address provided');
        return null;
    }
    
    try {
        const response = await fetch(SOLANA_RPC_URL, {
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
        
        console.log('🔵 SOL Balance API Response:', data);
        console.log('🔵 SOL Balance (lamports):', data.result?.value);
        console.log('🔵 SOL Balance (SOL):', data.result?.value ? (data.result.value / 1e9) : 'N/A');
        
        if (data.error) {
            throw new Error(data.error.message || 'Failed to fetch balance');
        }
        
        return data.result?.value || null;
    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        return null;
    }
}

// Get USDC token balance for a wallet address
async function getUSDCBalance(walletAddress) {
    if (!walletAddress) {
        console.error('No wallet address provided');
        return null;
    }
    
    try {
        const response = await fetch(SOLANA_RPC_URL, {
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
        
        console.log('🟢 USDC Balance API Response:', data);
        
        if (data.error) {
            console.error('🟢 USDC Error:', data.error);
            throw new Error(data.error.message || 'Failed to fetch USDC balance');
        }
        
        const tokenAccounts = data.result?.value || [];
        console.log('🟢 USDC Token Accounts Found:', tokenAccounts.length);
        
        if (tokenAccounts.length === 0) {
            console.log('🟢 No USDC token account found, balance is 0');
            return 0;
        }
        
        const tokenAccount = tokenAccounts[0];
        console.log('🟢 USDC Token Account Data:', tokenAccount);
        const parsedInfo = tokenAccount.account?.data?.parsed?.info;
        
        if (parsedInfo && parsedInfo.tokenAmount) {
            const amount = parsedInfo.tokenAmount.amount;
            const decimals = parsedInfo.tokenAmount.decimals || 6;
            const uiAmount = parsedInfo.tokenAmount.uiAmount || (parseFloat(amount) / Math.pow(10, decimals));
            
            console.log('🟢 USDC Raw Amount:', amount);
            console.log('🟢 USDC Decimals:', decimals);
            console.log('🟢 USDC UI Amount:', uiAmount);
            
            return {
                amount: amount,
                decimals: decimals,
                uiAmount: uiAmount
            };
        }
        
        console.log('🟢 Could not parse USDC token account info');
        return null;
    } catch (error) {
        console.error('Error fetching USDC balance:', error);
        return null;
    }
}

// Update wallet balance display
async function updateWalletBalanceDisplay(walletAddressParam = null) {
    const balanceAmount = document.getElementById('walletBalanceAmount');
    const balanceUSD = document.getElementById('walletBalanceUSD');
    const usdcAmount = document.getElementById('walletBalanceUSDCAmount');
    const usdcUSD = document.getElementById('walletBalanceUSDCUSD');
    
    const walletAddress = walletAddressParam || getCurrentWalletAddress();
    
    if (!walletAddress) {
        if (balanceAmount) balanceAmount.innerHTML = '<span class="balance-loading">Connect wallet to view balance</span>';
        if (balanceUSD) balanceUSD.innerHTML = '<span class="usd-loading">-</span>';
        if (usdcAmount) usdcAmount.innerHTML = '<span class="balance-loading">Connect wallet to view balance</span>';
        if (usdcUSD) usdcUSD.innerHTML = '<span class="usd-loading">-</span>';
        return;
    }
    
    if (balanceAmount) balanceAmount.innerHTML = '<span class="balance-loading">Loading...</span>';
    if (balanceUSD) balanceUSD.innerHTML = '<span class="usd-loading">Calculating...</span>';
    if (usdcAmount) usdcAmount.innerHTML = '<span class="balance-loading">Loading...</span>';
    if (usdcUSD) usdcUSD.innerHTML = '<span class="usd-loading">Calculating...</span>';
    
    try {
        const solBalancePromise = getWalletBalance(walletAddress);
        const usdcBalancePromise = getUSDCBalance(walletAddress);
        
        const [solBalance, usdcBalance] = await Promise.all([solBalancePromise, usdcBalancePromise]);
        
        console.log('📊 Final SOL Balance (lamports):', solBalance);
        console.log('📊 Final USDC Balance:', usdcBalance);
        console.log('📊 Wallet Address:', walletAddress);
        
        if (solBalance !== null && solBalance !== undefined) {
            const solAmount = (solBalance / 1e9).toFixed(4);
            // Format with commas for large numbers
            const formattedSol = parseFloat(solAmount).toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 4 
            });
            if (balanceAmount) balanceAmount.innerHTML = `<span>${formattedSol}</span>`;
            
            try {
                const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
                const priceData = await priceResponse.json();
                const solPrice = priceData.solana?.usd || 0;
                const solUSDValue = (parseFloat(solAmount) * solPrice).toFixed(2);
                const formattedSolUSD = parseFloat(solUSDValue).toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                });
                if (balanceUSD) {
                    balanceUSD.innerHTML = `<span>≈ $${formattedSolUSD}</span>`;
                }
            } catch (priceError) {
                console.error('Error fetching SOL price:', priceError);
                if (balanceUSD) balanceUSD.innerHTML = '<span class="usd-loading">Price unavailable</span>';
            }
        } else {
            if (balanceAmount) balanceAmount.innerHTML = '<span class="balance-loading">Error loading balance</span>';
            if (balanceUSD) balanceUSD.innerHTML = '<span class="usd-loading">-</span>';
        }
        
        if (usdcBalance !== null && usdcBalance !== undefined) {
            let usdcAmountValue = '0.00';
            if (typeof usdcBalance === 'object' && usdcBalance.uiAmount !== undefined) {
                usdcAmountValue = parseFloat(usdcBalance.uiAmount).toFixed(2);
            } else if (typeof usdcBalance === 'number') {
                usdcAmountValue = usdcBalance.toFixed(2);
            }
            
            // Format USDC with commas for large numbers
            const formattedUSDC = parseFloat(usdcAmountValue).toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });
            if (usdcAmount) usdcAmount.innerHTML = `<span>${formattedUSDC}</span>`;
            
            const formattedUSDCUSD = parseFloat(usdcAmountValue).toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });
            if (usdcUSD) {
                usdcUSD.innerHTML = `<span>≈ $${formattedUSDCUSD}</span>`;
            }
        } else {
            if (usdcAmount) usdcAmount.innerHTML = '<span class="balance-loading">Error loading balance</span>';
            if (usdcUSD) usdcUSD.innerHTML = '<span class="usd-loading">-</span>';
        }
    } catch (error) {
        console.error('Error updating wallet balance:', error);
        if (balanceAmount) balanceAmount.innerHTML = '<span class="balance-loading">Error loading balance</span>';
        if (balanceUSD) balanceUSD.innerHTML = '<span class="usd-loading">-</span>';
        if (usdcAmount) usdcAmount.innerHTML = '<span class="balance-loading">Error loading balance</span>';
        if (usdcUSD) usdcUSD.innerHTML = '<span class="usd-loading">-</span>';
    }
}

// Test function
async function testWalletBalances(walletAddress = null) {
    const address = walletAddress || getCurrentWalletAddress();
    
    if (!address) {
        console.error('❌ No wallet address provided. Please connect your wallet or pass an address as parameter.');
        return { error: 'No wallet address provided' };
    }
    
    console.log('🧪 Testing wallet balances for:', address);
    console.log('🧪 RPC Endpoint:', SOLANA_RPC_URL);
    
    try {
        console.log('\n=== SOL Balance Test ===');
        const solBalance = await getWalletBalance(address);
        console.log('SOL Balance Result:', solBalance);
        if (solBalance !== null) {
            console.log('SOL Balance (SOL):', (solBalance / 1e9).toFixed(9));
        }
        
        console.log('\n=== USDC Balance Test ===');
        const usdcBalance = await getUSDCBalance(address);
        console.log('USDC Balance Result:', usdcBalance);
        
        return {
            walletAddress: address,
            solBalance: solBalance,
            solBalanceSOL: solBalance !== null ? (solBalance / 1e9) : null,
            usdcBalance: usdcBalance
        };
    } catch (error) {
        console.error('❌ Error testing balances:', error);
        return { error: error.message };
    }
}

window.testWalletBalances = testWalletBalances;

// Initialize wallet balance functionality
async function initializeWalletBalance() {
    updateWalletBalanceDisplay();
}

