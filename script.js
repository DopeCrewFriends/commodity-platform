// Theme Toggle - Load immediately to prevent flash - default to dark for homepage
(function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

// Navigate to homepage function
function navigateToHomepage() {
    const landingPage = document.getElementById('landingPage');
    const profilePage = document.getElementById('profile');
    const navMenu = document.getElementById('navMenu');
    const themeToggle = document.getElementById('themeToggle');
    
    if (landingPage && profilePage) {
        // Show landing page
        landingPage.style.display = 'flex';
        // Hide profile page
        profilePage.style.display = 'none';
    }
    
    // Hide navigation menu
    if (navMenu) {
        navMenu.style.display = 'none';
    }
    
    // Hide theme toggle on homepage and force dark mode
    if (themeToggle) {
        themeToggle.style.display = 'none';
    }
    
    // Force dark mode on homepage
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // Clear wallet connection when going to homepage (optional - remove if you want to keep connection)
    // localStorage.removeItem('walletConnected');
    // localStorage.removeItem('walletAddress');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Disconnect wallet function
async function disconnectWallet() {
    // Disconnect from Phantom if connected
    if (window.solana && window.solana.isPhantom && window.solana.isConnected) {
        try {
            await window.solana.disconnect();
        } catch (err) {
            console.error('Error disconnecting from Phantom:', err);
        }
    }
    
    // Clear localStorage
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletAddressFormatted');
    
    // Show landing page and hide profile
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
    
    // Hide navigation menu
    if (navMenu) {
        navMenu.style.display = 'none';
    }
    
    // Hide wallet address and show connect button
    if (connectWalletBtn && walletAddress) {
        walletAddress.style.display = 'none';
        connectWalletBtn.style.display = 'none'; // Keep hidden on homepage
    }
    
    // Hide theme toggle on homepage
    if (themeToggle) {
        themeToggle.style.display = 'none';
    }
    
    // Force dark mode on homepage
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Navigate to profile page function
function navigateToProfile() {
    const landingPage = document.getElementById('landingPage');
    const profilePage = document.getElementById('profile');
    const navMenu = document.getElementById('navMenu');
    const themeToggle = document.getElementById('themeToggle');
    
    if (landingPage && profilePage) {
        // Hide landing page
        landingPage.style.display = 'none';
        // Show profile page
        profilePage.style.display = 'block';
    }
    
    // Show navigation menu
    if (navMenu) {
        navMenu.style.display = 'flex';
    }
    
    // Show theme toggle
    if (themeToggle) {
        themeToggle.style.display = 'flex';
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Nav brand click handler
document.addEventListener('DOMContentLoaded', () => {
    const navBrand = document.getElementById('navBrand');
    if (navBrand) {
        navBrand.addEventListener('click', function() {
            // Check if wallet is connected
            const isConnected = localStorage.getItem('walletConnected') === 'true';
            
            if (isConnected) {
                // Navigate to profile page if connected
                navigateToProfile();
            } else {
                // Navigate to homepage if not connected
                navigateToHomepage();
            }
        });
    }
    
    // Add click handler to wallet address for disconnect
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
    
    // Restore wallet connection on page load
    restoreWalletConnection();
});

// Theme Toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle?.querySelector('.theme-icon');

    // Update theme icon based on current theme
    function updateThemeIcon() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        if (themeIcon) {
            const moonIcon = themeIcon.querySelector('.theme-icon-moon');
            const sunIcon = themeIcon.querySelector('.theme-icon-sun');
            
            if (currentTheme === 'dark') {
                // Show sun icon in dark mode
                if (moonIcon) moonIcon.style.display = 'none';
                if (sunIcon) sunIcon.style.display = 'block';
            } else {
                // Show moon icon in light mode
                if (moonIcon) moonIcon.style.display = 'block';
                if (sunIcon) sunIcon.style.display = 'none';
            }
        }
    }

    // Toggle theme
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon();
    }

    // Initialize icon
    updateThemeIcon();

    // Add click event to theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});

// Wallet Modal
const walletModal = document.getElementById('walletModal');
const walletOptions = document.querySelectorAll('.wallet-option');
const connectWalletBtn = document.getElementById('connectWalletBtn');

// Open wallet modal function
function openWalletModal() {
    if (walletModal) {
        // Prevent body scrolling
        document.body.classList.add('wallet-modal-open');
        // Show modal with slight delay for smooth animation
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
    
    // Hide any previous errors
    if (walletError) {
        walletError.style.display = 'none';
        walletError.textContent = '';
    }
    
    // Check if Phantom is installed
    if (!isPhantomInstalled()) {
        if (walletError) {
            walletError.textContent = 'Phantom wallet is not installed. Please install it from https://phantom.app';
            walletError.style.display = 'block';
        }
        return null;
    }
    
    try {
        // Disable button during connection
        if (phantomOption) {
            phantomOption.style.opacity = '0.6';
            phantomOption.style.pointerEvents = 'none';
        }
        
        // Connect to Phantom
        const resp = await window.solana.connect();
        const publicKey = resp.publicKey.toString();
        
        // Format address for display (first 4 and last 4 characters)
        const formattedAddress = publicKey.slice(0, 4) + '...' + publicKey.slice(-4);
        
        // Store connection info
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', publicKey);
        localStorage.setItem('walletAddressFormatted', formattedAddress);
        
        // Update UI
        updateWalletUI(publicKey, formattedAddress);
        
        // Update profile wallet address IMMEDIATELY - do it directly
        const profileWalletAddress = document.getElementById('profileWalletAddress');
        if (profileWalletAddress) {
            profileWalletAddress.textContent = publicKey;
            profileWalletAddress.setAttribute('data-full-address', publicKey);
        }
        
        // Also call the update function
        updateProfileWalletAddress(publicKey);
        
        // Load user-specific data for this wallet
        loadUserData(publicKey);
        
        // Close modal
        closeWalletModal();
        
        return publicKey;
    } catch (err) {
        console.error('Error connecting to Phantom:', err);
        
        // Show error message
        if (walletError) {
            if (err.code === 4001) {
                walletError.textContent = 'Connection rejected. Please try again.';
            } else {
                walletError.textContent = 'Failed to connect to Phantom wallet. Please try again.';
            }
            walletError.style.display = 'block';
        }
        
        // Re-enable button
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
    
    // Update navbar wallet address
    if (walletAddress) {
        walletAddress.querySelector('.address-text').textContent = formattedAddress;
        walletAddress.style.display = 'flex';
    }
    
    // Hide connect button
    if (connectWalletBtn) {
        connectWalletBtn.style.display = 'none';
    }
    
    // Update profile wallet address immediately
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
        // Check if already connected
        if (window.solana.isConnected) {
            return true;
        }
        
        // Try to reconnect if we have a saved connection
        const savedAddress = localStorage.getItem('walletAddress');
        if (savedAddress) {
            // Check if we can get the public key
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

// User Data Management Functions
// Get current wallet address
function getCurrentWalletAddress() {
    return localStorage.getItem('walletAddress');
}

// Get user-specific data key
function getUserDataKey(dataType) {
    const walletAddress = getCurrentWalletAddress();
    if (!walletAddress) return null;
    return `user_${walletAddress}_${dataType}`;
}

// Get user data
function getUserData(dataType, defaultValue = null) {
    const key = getUserDataKey(dataType);
    if (!key) return defaultValue;
    const data = localStorage.getItem(key);
    if (data) {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error(`Error parsing user data for ${dataType}:`, e);
            return defaultValue;
        }
    }
    return defaultValue;
}

// Set user data
function setUserData(dataType, data) {
    const key = getUserDataKey(dataType);
    if (!key) {
        console.error('Cannot save user data: no wallet address');
        return false;
    }
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error(`Error saving user data for ${dataType}:`, e);
        return false;
    }
}

// Load user data for a specific wallet address
function loadUserData(walletAddress) {
    if (!walletAddress) return;
    
    // Load profile data
    const profileKey = `user_${walletAddress}_profileData`;
    const savedProfileData = localStorage.getItem(profileKey);
    
    // Load and apply statistics
    loadUserStatistics(walletAddress);
    
    // Load and apply escrow data
    loadUserEscrows(walletAddress);
    
    // Load and apply trade history
    loadUserTradeHistory(walletAddress);
    
    // Update wallet address in profile AFTER loading profile data (so it doesn't get overwritten)
    updateProfileWalletAddress(walletAddress);
    
    if (savedProfileData) {
        try {
            const profileData = JSON.parse(savedProfileData);
            applyProfileData(profileData);
            
            // Show modal if profile is incomplete
            if (!isProfileComplete(profileData)) {
                showProfileCompletionPrompt();
            } else {
                hideProfileCompletionPrompt();
            }
        } catch (e) {
            console.error('Error loading user profile data:', e);
            initializeNewUserProfile(walletAddress);
        }
    } else {
        // Initialize default profile for new user
        initializeNewUserProfile(walletAddress);
    }
    
    // Update wallet address AFTER all profile data is loaded to ensure it's correct
    // Use setTimeout to ensure DOM is fully updated
    setTimeout(() => {
        updateProfileWalletAddress(walletAddress);
    }, 50);
}

// Copy wallet address to clipboard
async function copyWalletAddress(fullAddress) {
    try {
        await navigator.clipboard.writeText(fullAddress);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = fullAddress;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (e) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

// Update wallet address in profile section and navbar
function updateProfileWalletAddress(walletAddress) {
    if (!walletAddress) return;
    
    const formattedAddress = walletAddress.length > 12 
        ? walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4)
        : walletAddress;
    
    // Update profile wallet address (main profile section) - show full address
    // Try multiple times to ensure it works
    const updateMainWallet = () => {
        const profileWalletAddress = document.getElementById('profileWalletAddress');
        if (profileWalletAddress) {
            profileWalletAddress.textContent = walletAddress; // Show full address
            profileWalletAddress.setAttribute('data-full-address', walletAddress);
            return true;
        }
        return false;
    };
    
    // Try immediately
    if (!updateMainWallet()) {
        // If element not found, try again after a short delay
        setTimeout(() => {
            updateMainWallet();
        }, 100);
    }
    
    // Update navbar wallet address (top right)
    const navbarWalletAddress = document.getElementById('walletAddress');
    if (navbarWalletAddress) {
        const addressText = navbarWalletAddress.querySelector('.address-text');
        if (addressText) {
            addressText.textContent = formattedAddress;
        }
    }
    
    // Also update in edit profile section
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
        // Make the wallet address and copy icon clickable
        const copyHandler = async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const fullAddress = profileWalletAddress.getAttribute('data-full-address') || profileWalletAddress.textContent;
            
            if (fullAddress) {
                const success = await copyWalletAddress(fullAddress);
                
                if (success && profileCopyFeedback) {
                    // Show feedback
                    profileCopyFeedback.style.display = 'inline';
                    profileCopyFeedback.textContent = 'Copied!';
                    
                    // Hide feedback after 2 seconds
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

// Load user escrow data
function loadUserEscrows(walletAddress) {
    if (!walletAddress) return;
    
    const escrowsKey = `user_${walletAddress}_escrows`;
    const savedEscrows = localStorage.getItem(escrowsKey);
    
    if (savedEscrows) {
        try {
            const escrowsData = JSON.parse(savedEscrows);
            applyEscrowsData(escrowsData);
        } catch (e) {
            console.error('Error loading user escrows:', e);
            initializeDefaultEscrows(walletAddress);
        }
    } else {
        initializeDefaultEscrows(walletAddress);
    }
}

// Initialize default escrows (empty)
function initializeDefaultEscrows(walletAddress) {
    const defaultEscrows = {
        totalAmount: 0,
        items: []
    };
    
    const escrowsKey = `user_${walletAddress}_escrows`;
    localStorage.setItem(escrowsKey, JSON.stringify(defaultEscrows));
    applyEscrowsData(defaultEscrows);
}

// Apply escrows data to UI
function applyEscrowsData(escrowsData) {
    const totalEscrowValue = document.getElementById('totalEscrowValue');
    const escrowsList = document.getElementById('activeEscrowsList');
    const noEscrowsMessage = document.getElementById('noEscrowsMessage');
    
    // Update total amount
    if (totalEscrowValue) {
        totalEscrowValue.textContent = escrowsData.totalAmount !== undefined 
            ? `$${escrowsData.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '$0.00';
    }
    
    // Hide all escrow items
    const escrowItems = document.querySelectorAll('.active-escrow-item');
    escrowItems.forEach(item => {
        item.style.display = 'none';
    });
    
    // Show empty message if no escrows
    if (escrowsData.items && escrowsData.items.length === 0) {
        if (noEscrowsMessage) {
            noEscrowsMessage.style.display = 'block';
        }
    } else if (noEscrowsMessage) {
        noEscrowsMessage.style.display = 'none';
    }
}

// Load user trade history
function loadUserTradeHistory(walletAddress) {
    if (!walletAddress) return;
    
    const tradeHistoryKey = `user_${walletAddress}_tradeHistory`;
    const savedTradeHistory = localStorage.getItem(tradeHistoryKey);
    
    if (savedTradeHistory) {
        try {
            const tradeHistory = JSON.parse(savedTradeHistory);
            applyTradeHistory(tradeHistory);
        } catch (e) {
            console.error('Error loading user trade history:', e);
            initializeDefaultTradeHistory(walletAddress);
        }
    } else {
        initializeDefaultTradeHistory(walletAddress);
    }
}

// Initialize default trade history (empty)
function initializeDefaultTradeHistory(walletAddress) {
    const defaultTradeHistory = {
        completed: [],
        ongoing: [],
        unsuccessful: []
    };
    
    const tradeHistoryKey = `user_${walletAddress}_tradeHistory`;
    localStorage.setItem(tradeHistoryKey, JSON.stringify(defaultTradeHistory));
    applyTradeHistory(defaultTradeHistory);
}

// Apply trade history to UI
function applyTradeHistory(tradeHistory) {
    // Hide all trade items
    const allTradeItems = document.querySelectorAll('.trade-item');
    allTradeItems.forEach(item => {
        item.style.display = 'none';
    });
    
    // Show trades based on saved data
    if (tradeHistory.completed && tradeHistory.completed.length > 0) {
        tradeHistory.completed.forEach((trade, index) => {
            const tradeItem = document.querySelector(`.trade-item.completed[data-trade-id="${index + 1}"]`);
            if (tradeItem) {
                tradeItem.style.display = 'flex';
            }
        });
    }
    
    if (tradeHistory.ongoing && tradeHistory.ongoing.length > 0) {
        tradeHistory.ongoing.forEach((trade, index) => {
            const tradeItem = document.querySelector(`.trade-item.ongoing[data-trade-id="${index + 6}"]`);
            if (tradeItem) {
                tradeItem.style.display = 'flex';
            }
        });
    }
    
    if (tradeHistory.unsuccessful && tradeHistory.unsuccessful.length > 0) {
        tradeHistory.unsuccessful.forEach((trade, index) => {
            const tradeItem = document.querySelector(`.trade-item.unsuccessful[data-trade-id="${index + 9}"]`);
            if (tradeItem) {
                tradeItem.style.display = 'flex';
            }
        });
    }
}

// Load user statistics
function loadUserStatistics(walletAddress) {
    if (!walletAddress) return;
    
    const statsKey = `user_${walletAddress}_statistics`;
    const savedStats = localStorage.getItem(statsKey);
    
    if (savedStats) {
        try {
            const stats = JSON.parse(savedStats);
            applyStatistics(stats);
        } catch (e) {
            console.error('Error loading user statistics:', e);
            initializeDefaultStatistics(walletAddress);
        }
    } else {
        initializeDefaultStatistics(walletAddress);
    }
}

// Initialize default statistics for new user
function initializeDefaultStatistics(walletAddress) {
    const currentDate = new Date();
    const month = currentDate.toLocaleString('default', { month: 'short' });
    const year = currentDate.getFullYear();
    
    const defaultStats = {
        memberSince: `${month} ${year}`,
        completedTrades: 0,
        totalVolume: 0,
        successRate: null,
        rating: null
    };
    
    const statsKey = `user_${walletAddress}_statistics`;
    localStorage.setItem(statsKey, JSON.stringify(defaultStats));
    applyStatistics(defaultStats);
}

// Apply statistics to UI
function applyStatistics(stats) {
    // Update main profile section
    const memberSince = document.getElementById('memberSince');
    const completedTrades = document.getElementById('completedTrades');
    const totalVolume = document.getElementById('totalVolume');
    const successRate = document.getElementById('successRate');
    const rating = document.getElementById('rating');
    
    // Update edit profile section
    const editMemberSince = document.getElementById('editMemberSince');
    const editCompletedTrades = document.getElementById('editCompletedTrades');
    const editTotalVolume = document.getElementById('editTotalVolume');
    const editSuccessRate = document.getElementById('editSuccessRate');
    const editRating = document.getElementById('editRating');
    
    const memberSinceText = stats.memberSince || '-';
    const completedTradesText = stats.completedTrades !== undefined ? stats.completedTrades : '0';
    const totalVolumeText = stats.totalVolume !== undefined 
        ? `$${stats.totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '$0.00';
    const successRateText = stats.successRate !== null && stats.successRate !== undefined 
        ? `${stats.successRate}%`
        : '-';
    const ratingText = stats.rating !== null && stats.rating !== undefined 
        ? `⭐ ${stats.rating}/5.0`
        : '-';
    
    if (memberSince) memberSince.textContent = memberSinceText;
    if (editMemberSince) editMemberSince.textContent = memberSinceText;
    
    if (completedTrades) completedTrades.textContent = completedTradesText;
    if (editCompletedTrades) editCompletedTrades.textContent = completedTradesText;
    
    if (totalVolume) totalVolume.textContent = totalVolumeText;
    if (editTotalVolume) editTotalVolume.textContent = totalVolumeText;
    
    if (successRate) successRate.textContent = successRateText;
    if (editSuccessRate) editSuccessRate.textContent = successRateText;
    
    if (rating) rating.textContent = ratingText;
    if (editRating) editRating.textContent = ratingText;
}

// Check if profile is complete
function isProfileComplete(profileData) {
    return profileData && 
           profileData.name && profileData.name.trim() !== '' &&
           profileData.email && profileData.email.trim() !== '' &&
           profileData.company && profileData.company.trim() !== '' &&
           profileData.location && profileData.location.trim() !== '';
}

// Show profile completion modal (forced interaction)
function showProfileCompletionPrompt() {
    const modal = document.getElementById('profileCompletionModal');
    if (!modal) return;
    
    // Prevent body scrolling
    document.body.classList.add('wallet-modal-open');
    
    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('active');
    }, 100);
}

// Hide profile completion modal
function hideProfileCompletionPrompt() {
    const modal = document.getElementById('profileCompletionModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('wallet-modal-open');
    }
}

// Initialize profile completion modal
document.addEventListener('DOMContentLoaded', () => {
    const completeProfileBtn = document.getElementById('completeProfileBtn');
    const modal = document.getElementById('profileCompletionModal');
    
    if (completeProfileBtn) {
        completeProfileBtn.addEventListener('click', function() {
            hideProfileCompletionPrompt();
            openEditProfileModal();
        });
    }
    
    // Prevent closing modal by clicking overlay (force interaction)
    if (modal) {
        const overlay = modal.querySelector('.profile-completion-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', function(e) {
                e.stopPropagation();
                // Do nothing - force user to click the button
            });
        }
    }
});

// Apply profile data to UI
function applyProfileData(profileData) {
    const actualProfileSection = document.querySelector('.profile-section:not(.profile-section-editing)');
    if (!actualProfileSection) return;
    
    const profileName = actualProfileSection.querySelector('.profile-name');
    const profileEmail = actualProfileSection.querySelector('.profile-email');
    const companyName = actualProfileSection.querySelector('.company-name');
    const locationText = actualProfileSection.querySelector('.location-text');
    const actualProfileAvatar = actualProfileSection.querySelector('.profile-avatar');
    const actualAvatarPlaceholder = actualProfileSection.querySelector('.avatar-placeholder');
    
    // Show placeholders if fields are empty
    if (profileName) {
        profileName.textContent = profileData.name && profileData.name.trim() !== '' 
            ? profileData.name 
            : 'Your Name';
        if (!profileData.name || profileData.name.trim() === '') {
            profileName.classList.add('placeholder-text');
        } else {
            profileName.classList.remove('placeholder-text');
        }
    }
    
    if (profileEmail) {
        profileEmail.textContent = profileData.email && profileData.email.trim() !== '' 
            ? profileData.email 
            : 'your.email@example.com';
        if (!profileData.email || profileData.email.trim() === '') {
            profileEmail.classList.add('placeholder-text');
        } else {
            profileEmail.classList.remove('placeholder-text');
        }
    }
    
    if (companyName) {
        companyName.textContent = profileData.company && profileData.company.trim() !== '' 
            ? profileData.company 
            : 'Your Company';
        if (!profileData.company || profileData.company.trim() === '') {
            companyName.classList.add('placeholder-text');
        } else {
            companyName.classList.remove('placeholder-text');
        }
    }
    
    if (locationText) {
        locationText.textContent = profileData.location && profileData.location.trim() !== '' 
            ? profileData.location 
            : 'Your Location';
        if (!profileData.location || profileData.location.trim() === '') {
            locationText.classList.add('placeholder-text');
        } else {
            locationText.classList.remove('placeholder-text');
        }
    }
    
    // Restore avatar
    if (profileData.avatarImage) {
        let profileImg = actualProfileAvatar.querySelector('img');
        if (!profileImg) {
            profileImg = document.createElement('img');
            profileImg.style.width = '100%';
            profileImg.style.height = '100%';
            profileImg.style.borderRadius = '50%';
            profileImg.style.objectFit = 'cover';
            profileImg.style.boxShadow = 'var(--shadow)';
            actualProfileAvatar.insertBefore(profileImg, actualAvatarPlaceholder);
        }
        profileImg.src = profileData.avatarImage;
        if (actualAvatarPlaceholder) actualAvatarPlaceholder.style.display = 'none';
    } else {
        // Remove any existing image
        const profileImg = actualProfileAvatar.querySelector('img');
        if (profileImg) {
            profileImg.remove();
        }
        
        // Show placeholder with initials
        if (actualAvatarPlaceholder) {
            actualAvatarPlaceholder.style.display = 'flex';
            if (profileData.name && profileData.name.trim() !== '') {
                // Use initials from name
                const nameParts = profileData.name.split(' ');
                const initials = nameParts.length > 1 
                    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                    : profileData.name.substring(0, 2).toUpperCase();
                actualAvatarPlaceholder.textContent = initials || '??';
            } else {
                // Use wallet address initials (first 2 chars)
                const walletAddress = getCurrentWalletAddress();
                if (walletAddress) {
                    actualAvatarPlaceholder.textContent = walletAddress.slice(0, 2).toUpperCase();
                } else {
                    actualAvatarPlaceholder.textContent = '??';
                }
            }
        }
    }
}

// Initialize default profile for new user (blank)
function initializeNewUserProfile(walletAddress) {
    const formattedAddress = walletAddress.length > 12 
        ? walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4)
        : walletAddress;
    
    // Generate initials from wallet address (first 2 characters)
    const initials = walletAddress.slice(0, 2).toUpperCase();
    
    const defaultProfile = {
        name: '',
        email: '',
        company: '',
        location: '',
        avatarImage: null
    };
    
    setUserData('profileData', defaultProfile);
    applyProfileData(defaultProfile);
    
    // Update avatar placeholder with initials
    const actualAvatarPlaceholder = document.querySelector('.avatar-placeholder');
    if (actualAvatarPlaceholder) {
        actualAvatarPlaceholder.textContent = initials;
    }
    
    // Show profile completion prompt
    showProfileCompletionPrompt();
}

// Restore profile data from localStorage (for current user)
function restoreProfileData() {
    const walletAddress = getCurrentWalletAddress();
    if (!walletAddress) return;
    
    loadUserData(walletAddress);
}

// Restore wallet connection from localStorage
function restoreWalletConnection() {
    const savedWalletAddress = localStorage.getItem('walletAddress');
    const isConnected = localStorage.getItem('walletConnected') === 'true';
    
    if (isConnected && savedWalletAddress) {
        // Hide landing page and show profile
        const landingPage = document.getElementById('landingPage');
        const profilePage = document.getElementById('profile');
        const navMenu = document.getElementById('navMenu');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        const walletAddress = document.getElementById('walletAddress');
        const themeToggle = document.getElementById('themeToggle');
        
        if (landingPage && profilePage) {
            landingPage.style.display = 'none';
            profilePage.style.display = 'block';
            
            // Update wallet address IMMEDIATELY after showing profile page
            // Do it directly to ensure it works
            const profileWalletAddress = document.getElementById('profileWalletAddress');
            if (profileWalletAddress && savedWalletAddress) {
                profileWalletAddress.textContent = savedWalletAddress;
                profileWalletAddress.setAttribute('data-full-address', savedWalletAddress);
            }
            
            // Also call the update function
            updateProfileWalletAddress(savedWalletAddress);
            
            // Initialize escrows handler after profile page is shown
            setTimeout(() => {
                initializeEscrowsHandler();
            }, 100);
        }
        
        if (navMenu) {
            navMenu.style.display = 'flex';
        }
        
        // Also update wallet address again to be sure (using the update function)
        updateProfileWalletAddress(savedWalletAddress);
        
        if (connectWalletBtn && walletAddress) {
            connectWalletBtn.style.display = 'none';
            walletAddress.style.display = 'flex';
        }
        
        // Show theme toggle
        if (themeToggle) {
            themeToggle.style.display = 'flex';
        }
        
        // Load user-specific data
        loadUserData(savedWalletAddress);
        
        // Initialize escrow dashboard data
        initializeEscrowDashboard();
    }
}

// Close wallet modal function
function closeWalletModal() {
    if (walletModal) {
        walletModal.classList.remove('active');
        document.body.classList.remove('wallet-modal-open');
        
        // Hide landing page and show profile
        const landingPage = document.getElementById('landingPage');
        const profilePage = document.getElementById('profile');
        const navMenu = document.getElementById('navMenu');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        const walletAddress = document.getElementById('walletAddress');
        
        if (landingPage && profilePage) {
            // Hide landing page
            landingPage.style.display = 'none';
            // Show profile page
            profilePage.style.display = 'block';
            
            // Initialize escrows handler after profile page is shown
            setTimeout(() => {
                initializeEscrowsHandler();
            }, 100);
        }
        
        // Show navigation menu
        if (navMenu) {
            navMenu.style.display = 'flex';
        }
        
        // Hide connect button and show wallet address
        if (connectWalletBtn && walletAddress) {
            // Hide connect button
            connectWalletBtn.style.display = 'none';
            
            // Get the actual wallet address from localStorage
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
        
        // Show theme toggle after connection
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.style.display = 'flex';
        }
        
        // Initialize escrow dashboard data
        initializeEscrowDashboard();
    }
}

// Profile Card Click Handler
const profileCard = document.getElementById('profileCard');
const tradePartnersDropdown = document.getElementById('tradePartnersDropdown');
const editProfileBtn = document.getElementById('editProfileBtn');

if (profileCard && tradePartnersDropdown) {
    profileCard.addEventListener('click', function(e) {
        // Don't toggle if clicking on the Edit Profile button, trade items, or filter buttons
        if (e.target.closest('#editProfileBtn') || 
            e.target.closest('.trade-item') || 
            e.target.closest('.filter-btn')) {
            return;
        }
        
        // Toggle dropdown
        profileCard.classList.toggle('expanded');
        tradePartnersDropdown.classList.toggle('expanded');
    });
}

// Edit Profile Overlay
const editProfileOverlay = document.getElementById('editProfileOverlay');
const editProfileForm = document.getElementById('editProfileForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Open edit profile overlay
function openEditProfileModal() {
    if (editProfileOverlay) {
        // Get current profile values from the actual profile page
        const profileName = document.querySelector('.profile-name');
        const profileEmail = document.querySelector('.profile-email');
        const companyName = document.querySelector('.company-name');
        const locationText = document.querySelector('.location-text');
        const avatarPlaceholder = document.querySelector('.avatar-placeholder');
        const existingProfileImg = document.querySelector('.profile-avatar img');
        
        // Populate editable fields with current values
        if (profileName) document.getElementById('editName').value = profileName.textContent;
        if (profileEmail) document.getElementById('editEmail').value = profileEmail.textContent;
        if (companyName) document.getElementById('editCompany').value = companyName.textContent;
        if (locationText) document.getElementById('editLocation').value = locationText.textContent;
        
        // Handle profile picture in editing view
        const editProfileImage = document.getElementById('editProfileImage');
        const editAvatarPlaceholder = document.getElementById('editAvatarPlaceholder');
        const removePictureBtn = document.getElementById('removePictureBtn');
        
        if (existingProfileImg && existingProfileImg.src) {
            editProfileImage.src = existingProfileImg.src;
            editProfileImage.style.display = 'block';
            editAvatarPlaceholder.style.display = 'none';
            if (removePictureBtn) removePictureBtn.style.display = 'block';
        } else {
            editProfileImage.style.display = 'none';
            editAvatarPlaceholder.style.display = 'flex';
            if (avatarPlaceholder) editAvatarPlaceholder.textContent = avatarPlaceholder.textContent;
            if (removePictureBtn) removePictureBtn.style.display = 'none';
        }
        
        // Prevent body scrolling
        document.body.classList.add('wallet-modal-open');
        // Show overlay
        editProfileOverlay.style.display = 'block';
    }
}

// Close edit profile overlay
function closeEditProfileModal() {
    if (editProfileOverlay) {
        editProfileOverlay.style.display = 'none';
        document.body.classList.remove('wallet-modal-open');
    }
}

// Edit Profile Button
if (editProfileBtn) {
    editProfileBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent triggering profile card click
        openEditProfileModal();
    });
}

// Cancel edit button
if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', function(e) {
        e.preventDefault();
        closeEditProfileModal();
    });
}

// Handle profile picture upload
const profilePictureInput = document.getElementById('profilePictureInput');
const editProfileImage = document.getElementById('editProfileImage');
const editAvatarPlaceholder = document.getElementById('editAvatarPlaceholder');
const removePictureBtn = document.getElementById('removePictureBtn');

if (profilePictureInput) {
    profilePictureInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                editProfileImage.src = e.target.result;
                editProfileImage.style.display = 'block';
                editAvatarPlaceholder.style.display = 'none';
                if (removePictureBtn) removePictureBtn.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
}

// Handle remove picture button
if (removePictureBtn) {
    removePictureBtn.addEventListener('click', function() {
        editProfileImage.src = '';
        editProfileImage.style.display = 'none';
        editAvatarPlaceholder.style.display = 'flex';
        removePictureBtn.style.display = 'none';
        if (profilePictureInput) profilePictureInput.value = '';
    });
}

// Handle edit profile form submission
if (editProfileForm) {
    editProfileForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const name = document.getElementById('editName').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const company = document.getElementById('editCompany').value.trim();
        const location = document.getElementById('editLocation').value.trim();
        
        // Update profile display - target the actual profile section (not the editing one)
        const actualProfileSection = document.querySelector('.profile-section:not(.profile-section-editing)');
        if (!actualProfileSection) {
            console.error('Profile section not found');
            return;
        }
        
        const profileName = actualProfileSection.querySelector('.profile-name');
        const profileEmail = actualProfileSection.querySelector('.profile-email');
        const companyName = actualProfileSection.querySelector('.company-name');
        const locationText = actualProfileSection.querySelector('.location-text');
        const actualProfileAvatar = actualProfileSection.querySelector('.profile-avatar');
        const actualAvatarPlaceholder = actualProfileSection.querySelector('.avatar-placeholder');
        
        // Update text fields
        if (profileName) profileName.textContent = name;
        if (profileEmail) profileEmail.textContent = email;
        if (companyName) companyName.textContent = company;
        if (locationText) locationText.textContent = location;
        
        // Update avatar (picture or initials)
        if (editProfileImage && editProfileImage.src && editProfileImage.style.display !== 'none') {
            // Use uploaded picture
            let profileImg = actualProfileAvatar.querySelector('img');
            if (!profileImg) {
                profileImg = document.createElement('img');
                profileImg.style.width = '100%';
                profileImg.style.height = '100%';
                profileImg.style.borderRadius = '50%';
                profileImg.style.objectFit = 'cover';
                profileImg.style.boxShadow = 'var(--shadow)';
                actualProfileAvatar.insertBefore(profileImg, actualAvatarPlaceholder);
            }
            profileImg.src = editProfileImage.src;
            if (actualAvatarPlaceholder) actualAvatarPlaceholder.style.display = 'none';
        } else {
            // Use initials from name
            const profileImg = actualProfileAvatar.querySelector('img');
            if (profileImg) {
                profileImg.remove();
            }
            if (actualAvatarPlaceholder) {
                actualAvatarPlaceholder.style.display = 'flex';
                // Get initials from name
                const nameParts = name.split(' ');
                const initials = nameParts.length > 1 
                    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                    : name.substring(0, 2).toUpperCase();
                actualAvatarPlaceholder.textContent = initials || 'JD';
            }
        }
        
        // Save to localStorage for persistence
        const profileData = {
            name: name,
            email: email,
            company: company,
            location: location,
            avatarImage: editProfileImage && editProfileImage.src && editProfileImage.style.display !== 'none' ? editProfileImage.src : null
        };
        setUserData('profileData', profileData);
        
        // Check if profile is now complete and hide prompt
        if (isProfileComplete(profileData)) {
            hideProfileCompletionPrompt();
        } else {
            showProfileCompletionPrompt();
        }
        
        // Close modal
        closeEditProfileModal();
        
        // Show success message (optional)
        console.log('Profile updated successfully');
    });
}

// Close modal when clicking on overlay
editProfileModal?.querySelector('.wallet-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeEditProfileModal();
    }
});

// Trade Item Click Handlers
const tradeItems = document.querySelectorAll('.trade-item');
tradeItems.forEach(item => {
    item.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent triggering profile card click
        const tradeId = this.getAttribute('data-trade-id');
        console.log('Trade clicked:', tradeId);
        // In the future, this would navigate to trade details page or open modal
        alert(`Trade #${tradeId} details will be shown here`);
    });
});

// Initialize Active Escrows Header Click Handler
function initializeEscrowsHandler() {
const escrowsHeaderCard = document.getElementById('escrowsHeaderCard');
const activeEscrowsDropdown = document.getElementById('activeEscrowsDropdown');

if (escrowsHeaderCard && activeEscrowsDropdown) {
        // Remove existing listener if any (by using once: false and checking)
        escrowsHeaderCard.onclick = null;
        
    escrowsHeaderCard.addEventListener('click', function(e) {
        // Don't toggle if clicking on escrow items
        if (e.target.closest('.active-escrow-item')) {
            return;
        }
            
            // Check if there are any active escrows
            const activeEscrowsList = document.getElementById('activeEscrowsList');
            const activeEscrowItems = activeEscrowsList ? activeEscrowsList.querySelectorAll('.active-escrow-item') : [];
            const noEscrowsMessage = document.getElementById('noEscrowsMessage');
            
            // Count visible escrow items
            let visibleCount = 0;
            activeEscrowItems.forEach(item => {
                if (item.style.display !== 'none' && item.offsetParent !== null) {
                    visibleCount++;
                }
            });
        
        // Toggle dropdown
            const isExpanding = !escrowsHeaderCard.classList.contains('expanded');
        escrowsHeaderCard.classList.toggle('expanded');
        activeEscrowsDropdown.classList.toggle('expanded');
            
            // Show/hide empty state message when expanding
            if (isExpanding) {
                if (visibleCount === 0 && noEscrowsMessage) {
                    noEscrowsMessage.style.display = 'block';
                } else if (noEscrowsMessage) {
                    noEscrowsMessage.style.display = 'none';
                }
            }
        });
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    initializeEscrowsHandler();
});

// Active Escrow Item Click Handlers
const activeEscrowItems = document.querySelectorAll('.active-escrow-item');
activeEscrowItems.forEach(item => {
    item.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent triggering header card click
        const escrowId = this.getAttribute('data-escrow-id');
        console.log('Active escrow clicked:', escrowId);
        // In the future, this would navigate to escrow details page or open modal
        alert(`Active Escrow #${escrowId} details will be shown here`);
    });
});

// Trade Filter Buttons
const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent triggering profile card click
        
        // Remove active class from all buttons
        filterButtons.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        this.classList.add('active');
        
        // Get filter type
        const filterType = this.getAttribute('data-filter');
        
        // Show/hide trade items based on filter
        tradeItems.forEach(item => {
            if (filterType === 'completed' && item.classList.contains('completed')) {
                item.style.display = 'flex';
            } else if (filterType === 'ongoing' && item.classList.contains('ongoing')) {
                item.style.display = 'flex';
            } else if (filterType === 'unsuccessful' && item.classList.contains('unsuccessful')) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
});

// Initialize escrow dashboard with sample data
function initializeEscrowDashboard() {
    // Update total escrow value
    // Total escrow value is now managed by loadUserEscrows() function
    // No need to set it here as it's user-specific
    
    const escrowStatus = document.getElementById('escrowStatus');
    if (escrowStatus) {
        escrowStatus.textContent = 'In Escrow';
    }
}

// Close edit profile overlay when clicking on overlay
editProfileOverlay?.addEventListener('click', (e) => {
    // Only close if clicking directly on overlay, not on content
    if (e.target === editProfileOverlay) {
        closeEditProfileModal();
    }
});

// Mobile Navigation Toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.querySelector('.nav-menu');

if (navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// Close mobile menu when clicking on a link
const navLinks = document.querySelectorAll('.nav-menu a');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 70; // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});


// Add scroll effect to navbar
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.15)';
    } else {
        navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
    
    lastScroll = currentScroll;
});

// Animate elements on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all cards and sections (only after wallet is connected)
document.addEventListener('DOMContentLoaded', () => {
    // Only animate elements after wallet modal is closed
    const animateElements = document.querySelectorAll('.holding-item, .stat-card');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

