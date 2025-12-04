// ==================== TRADES AND ESCROWS ====================

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
    
    if (totalEscrowValue) {
        totalEscrowValue.textContent = escrowsData.totalAmount !== undefined 
            ? `$${escrowsData.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '$0.00';
    }
    
    const escrowItems = document.querySelectorAll('.active-escrow-item');
    escrowItems.forEach(item => {
        item.style.display = 'none';
    });
    
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
    const allTradeItems = document.querySelectorAll('.trade-item');
    allTradeItems.forEach(item => {
        item.style.display = 'none';
    });
    
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

// Profile Card Click Handler
const profileCard = document.getElementById('profileCard');
const tradePartnersDropdown = document.getElementById('tradePartnersDropdown');
const editProfileBtn = document.getElementById('editProfileBtn');

if (profileCard && tradePartnersDropdown) {
    profileCard.addEventListener('click', function(e) {
        if (e.target.closest('#editProfileBtn') || 
            e.target.closest('.trade-item') || 
            e.target.closest('.filter-btn')) {
            return;
        }
        
        profileCard.classList.toggle('expanded');
        tradePartnersDropdown.classList.toggle('expanded');
    });
}

// Trade Item Click Handlers
const tradeItems = document.querySelectorAll('.trade-item');
tradeItems.forEach(item => {
    item.addEventListener('click', function(e) {
        e.stopPropagation();
        const tradeId = this.getAttribute('data-trade-id');
        console.log('Trade clicked:', tradeId);
        alert(`Trade #${tradeId} details will be shown here`);
    });
});

// Initialize Active Escrows Header Click Handler
function initializeEscrowsHandler() {
    const escrowsHeaderCard = document.getElementById('escrowsHeaderCard');
    const activeEscrowsDropdown = document.getElementById('activeEscrowsDropdown');

    if (escrowsHeaderCard && activeEscrowsDropdown) {
        escrowsHeaderCard.onclick = null;
        
        escrowsHeaderCard.addEventListener('click', function(e) {
            if (e.target.closest('.active-escrow-item')) {
                return;
            }
            
            const activeEscrowsList = document.getElementById('activeEscrowsList');
            const activeEscrowItems = activeEscrowsList ? activeEscrowsList.querySelectorAll('.active-escrow-item') : [];
            const noEscrowsMessage = document.getElementById('noEscrowsMessage');
            
            let visibleCount = 0;
            activeEscrowItems.forEach(item => {
                if (item.style.display !== 'none' && item.offsetParent !== null) {
                    visibleCount++;
                }
            });
        
            const isExpanding = !escrowsHeaderCard.classList.contains('expanded');
            escrowsHeaderCard.classList.toggle('expanded');
            activeEscrowsDropdown.classList.toggle('expanded');
            
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
        e.stopPropagation();
        const escrowId = this.getAttribute('data-escrow-id');
        console.log('Active escrow clicked:', escrowId);
        alert(`Active Escrow #${escrowId} details will be shown here`);
    });
});

// Trade Filter Buttons
const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        filterButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const filterType = this.getAttribute('data-filter');
        
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
    const escrowStatus = document.getElementById('escrowStatus');
    if (escrowStatus) {
        escrowStatus.textContent = 'In Escrow';
    }
}

