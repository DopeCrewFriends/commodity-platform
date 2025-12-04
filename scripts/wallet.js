// ==================== WALLET CONNECTION ====================

// Wallet Modal elements
const walletModal = document.getElementById('walletModal');
const walletOptions = document.querySelectorAll('.wallet-option');
const connectWalletBtn = document.getElementById('connectWalletBtn');

// Open wallet modal function
function openWalletModal() {
    if (walletModal) {
        document.body.classList.add('wallet-modal-open');
        setTimeout(() => {
            walletModal.classList.add('active');
        }, 100);
    }
}

// Connect wallet button click handler
if (connectWalletBtn) {
    connectWalletBtn.addEventListener('click', openWalletModal);
}

// Landing page connect wallet button
const landingConnectBtn = document.getElementById('landingConnectBtn');
if (landingConnectBtn) {
    landingConnectBtn.addEventListener('click', openWalletModal);
}

// Check if Phantom wallet is installed
function isPhantomInstalled() {
    return window.solana && window.solana.isPhantom;
}

// Connect to Phantom wallet
async function connectPhantomWallet() {
    const walletError = document.getElementById('walletError');
    const phantomOption = document.getElementById('phantomWalletOption');
    
    if (walletError) {
        walletError.style.display = 'none';
        walletError.textContent = '';
    }
    
    if (!isPhantomInstalled()) {
        if (walletError) {
            walletError.textContent = 'Phantom wallet is not installed. Please install it from https://phantom.app';
            walletError.style.display = 'block';
        }
        return null;
    }
    
    try {
        if (phantomOption) {
            phantomOption.style.opacity = '0.6';
            phantomOption.style.pointerEvents = 'none';
        }
        
        const resp = await window.solana.connect();
        const publicKey = resp.publicKey.toString();
        const formattedAddress = publicKey.slice(0, 4) + '...' + publicKey.slice(-4);
        
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', publicKey);
        localStorage.setItem('walletAddressFormatted', formattedAddress);
        
        updateWalletUI(publicKey, formattedAddress);
        
        const profileWalletAddress = document.getElementById('profileWalletAddress');
        if (profileWalletAddress) {
            profileWalletAddress.textContent = publicKey;
            profileWalletAddress.setAttribute('data-full-address', publicKey);
        }
        
        updateProfileWalletAddress(publicKey);
        
        // Load user-specific data for this wallet
        loadUserData(publicKey);
        
        closeWalletModal();
        
        return publicKey;
    } catch (err) {
        console.error('Error connecting to Phantom:', err);
        
        if (walletError) {
            if (err.code === 4001) {
                walletError.textContent = 'Connection rejected. Please try again.';
            } else {
                walletError.textContent = 'Failed to connect to Phantom wallet. Please try again.';
            }
            walletError.style.display = 'block';
        }
        
        if (phantomOption) {
            phantomOption.style.opacity = '1';
            phantomOption.style.pointerEvents = 'auto';
        }
        
        return null;
    }
}

// Update wallet UI after connection
function updateWalletUI(publicKey, formattedAddress) {
    const walletAddress = document.getElementById('walletAddress');
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    
    if (walletAddress) {
        walletAddress.querySelector('.address-text').textContent = formattedAddress;
        walletAddress.style.display = 'flex';
    }
    
    if (connectWalletBtn) {
        connectWalletBtn.style.display = 'none';
    }
    
    updateProfileWalletAddress(publicKey);
}

// Handle wallet option clicks
walletOptions.forEach(option => {
    option.addEventListener('click', async function() {
        const walletType = this.getAttribute('data-wallet');
        
        if (walletType === 'phantom') {
            await connectPhantomWallet();
        }
    });
});

// Check if wallet is still connected to Phantom
async function checkPhantomConnection() {
    if (!isPhantomInstalled()) {
        return false;
    }
    
    try {
        if (window.solana.isConnected) {
            return true;
        }
        
        const savedAddress = localStorage.getItem('walletAddress');
        if (savedAddress) {
            const publicKey = window.solana.publicKey;
            if (publicKey && publicKey.toString() === savedAddress) {
                return true;
            }
        }
    } catch (err) {
        console.error('Error checking Phantom connection:', err);
    }
    
    return false;
}

// Disconnect wallet function
async function disconnectWallet() {
    if (window.solana && window.solana.isPhantom && window.solana.isConnected) {
        try {
            await window.solana.disconnect();
        } catch (err) {
            console.error('Error disconnecting from Phantom:', err);
        }
    }
    
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletAddressFormatted');
    
    const landingPage = document.getElementById('landingPage');
    const profilePage = document.getElementById('profile');
    const navMenu = document.getElementById('navMenu');
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const walletAddress = document.getElementById('walletAddress');
    const themeToggle = document.getElementById('themeToggle');
    
    if (landingPage && profilePage) {
        landingPage.style.display = 'flex';
        profilePage.style.display = 'none';
    }
    
    if (navMenu) {
        navMenu.style.display = 'none';
    }
    
    if (connectWalletBtn && walletAddress) {
        walletAddress.style.display = 'none';
        connectWalletBtn.style.display = 'none';
    }
    
    if (themeToggle) {
        themeToggle.style.display = 'none';
    }
    
    document.documentElement.setAttribute('data-theme', 'dark');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Close wallet modal function
function closeWalletModal() {
    if (walletModal) {
        walletModal.classList.remove('active');
        document.body.classList.remove('wallet-modal-open');
        
        const landingPage = document.getElementById('landingPage');
        const profilePage = document.getElementById('profile');
        const navMenu = document.getElementById('navMenu');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        const walletAddress = document.getElementById('walletAddress');
        
        if (landingPage && profilePage) {
            landingPage.style.display = 'none';
            profilePage.style.display = 'block';
            
            setTimeout(() => {
                if (typeof initializeEscrowsHandler === 'function') {
                    initializeEscrowsHandler();
                }
            }, 100);
        }
        
        if (navMenu) {
            navMenu.style.display = 'flex';
        }
        
        if (connectWalletBtn && walletAddress) {
            connectWalletBtn.style.display = 'none';
            
            const savedWalletAddress = localStorage.getItem('walletAddress');
            if (savedWalletAddress) {
                const formattedAddress = savedWalletAddress.length > 12 
                    ? savedWalletAddress.slice(0, 4) + '...' + savedWalletAddress.slice(-4)
                    : savedWalletAddress;
                
                const addressText = walletAddress.querySelector('.address-text');
                if (addressText) {
                    addressText.textContent = formattedAddress;
                }
                walletAddress.style.display = 'flex';
            }
        }
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.style.display = 'flex';
        }
        
        if (typeof initializeEscrowDashboard === 'function') {
            initializeEscrowDashboard();
        }
    }
}

// Restore wallet connection from localStorage
function restoreWalletConnection() {
    const savedWalletAddress = localStorage.getItem('walletAddress');
    const isConnected = localStorage.getItem('walletConnected') === 'true';
    
    if (isConnected && savedWalletAddress) {
        const landingPage = document.getElementById('landingPage');
        const profilePage = document.getElementById('profile');
        const navMenu = document.getElementById('navMenu');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        const walletAddress = document.getElementById('walletAddress');
        const themeToggle = document.getElementById('themeToggle');
        
        if (landingPage && profilePage) {
            landingPage.style.display = 'none';
            profilePage.style.display = 'block';
            
            const profileWalletAddress = document.getElementById('profileWalletAddress');
            if (profileWalletAddress && savedWalletAddress) {
                profileWalletAddress.textContent = savedWalletAddress;
                profileWalletAddress.setAttribute('data-full-address', savedWalletAddress);
            }
            
            updateProfileWalletAddress(savedWalletAddress);
            
            setTimeout(() => {
                if (typeof initializeEscrowsHandler === 'function') {
                    initializeEscrowsHandler();
                }
            }, 100);
        }
        
        if (navMenu) {
            navMenu.style.display = 'flex';
        }
        
        updateProfileWalletAddress(savedWalletAddress);
        
        if (connectWalletBtn && walletAddress) {
            connectWalletBtn.style.display = 'none';
            walletAddress.style.display = 'flex';
        }
        
        if (themeToggle) {
            themeToggle.style.display = 'flex';
        }
        
        if (typeof loadUserData === 'function') {
            loadUserData(savedWalletAddress);
        }
        
        if (typeof initializeEscrowDashboard === 'function') {
            initializeEscrowDashboard();
        }
    }
}

// Wallet address click handler for disconnect
document.addEventListener('DOMContentLoaded', () => {
    const walletAddress = document.getElementById('walletAddress');
    if (walletAddress) {
        walletAddress.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Are you sure you want to disconnect your wallet?')) {
                disconnectWallet();
            }
        });
    }
    
    restoreWalletConnection();
});

// Update wallet address in profile section and navbar
function updateProfileWalletAddress(walletAddress) {
    if (!walletAddress) return;
    
    const formattedAddress = walletAddress.length > 12 
        ? walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4)
        : walletAddress;
    
    const updateMainWallet = () => {
        const profileWalletAddress = document.getElementById('profileWalletAddress');
        if (profileWalletAddress) {
            profileWalletAddress.textContent = walletAddress;
            profileWalletAddress.setAttribute('data-full-address', walletAddress);
            return true;
        }
        return false;
    };
    
    if (!updateMainWallet()) {
        setTimeout(() => {
            updateMainWallet();
        }, 100);
    }
    
    const navbarWalletAddress = document.getElementById('walletAddress');
    if (navbarWalletAddress) {
        const addressText = navbarWalletAddress.querySelector('.address-text');
        if (addressText) {
            addressText.textContent = formattedAddress;
        }
    }
    
    const editProfileWalletAddress = document.getElementById('editingProfileWalletAddress');
    if (editProfileWalletAddress) {
        editProfileWalletAddress.textContent = formattedAddress;
    }
}

// Initialize copy functionality for profile wallet address
document.addEventListener('DOMContentLoaded', () => {
    const profileWalletAddress = document.getElementById('profileWalletAddress');
    const profileCopyIcon = document.getElementById('profileCopyIcon');
    const profileCopyFeedback = document.getElementById('profileCopyFeedback');
    
    if (profileWalletAddress && profileCopyIcon) {
        const copyHandler = async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const fullAddress = profileWalletAddress.getAttribute('data-full-address') || profileWalletAddress.textContent;
            
            if (fullAddress) {
                const success = await copyWalletAddress(fullAddress);
                
                if (success && profileCopyFeedback) {
                    profileCopyFeedback.style.display = 'inline';
                    profileCopyFeedback.textContent = 'Copied!';
                    
                    setTimeout(() => {
                        profileCopyFeedback.style.display = 'none';
                    }, 2000);
                }
            }
        };
        
        profileWalletAddress.addEventListener('click', copyHandler);
        profileCopyIcon.addEventListener('click', copyHandler);
    }
});

