// Theme Toggle - Load immediately to prevent flash
(function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

// Theme Toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle?.querySelector('.theme-icon');

    // Update theme icon based on current theme
    function updateThemeIcon() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        if (themeIcon) {
            themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
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

// Handle wallet option clicks
walletOptions.forEach(option => {
    option.addEventListener('click', function() {
        const walletType = this.getAttribute('data-wallet');
        
        // For now, just simulate connection and close modal
        // In the future, this would actually connect to the wallet
        console.log(`Connecting to ${walletType}...`);
        
        // Simulate connection delay
        this.style.opacity = '0.6';
        this.style.pointerEvents = 'none';
        
        setTimeout(() => {
            // Close modal after "connection"
            closeWalletModal();
        }, 1000);
    });
});

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
        }
        
        // Show navigation menu
        if (navMenu) {
            navMenu.style.display = 'flex';
        }
        
        // Hide connect button and show wallet address
        if (connectWalletBtn && walletAddress) {
            // Hide connect button
            connectWalletBtn.style.display = 'none';
            
            // Show wallet address with simulated address
            // In a real app, this would be the actual connected wallet address
            const simulatedAddress = '0x' + Math.random().toString(16).substr(2, 8) + '...' + Math.random().toString(16).substr(2, 4);
            walletAddress.querySelector('.address-text').textContent = simulatedAddress;
            walletAddress.style.display = 'flex';
            
            // Update profile wallet address
            const profileWalletAddress = document.getElementById('profileWalletAddress');
            if (profileWalletAddress) {
                profileWalletAddress.textContent = simulatedAddress;
            }
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

// Edit Profile Button
if (editProfileBtn) {
    editProfileBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent triggering profile card click
        // In the future, this would open an edit profile modal or navigate to edit page
        console.log('Edit Profile clicked');
        alert('Edit Profile functionality will be implemented here');
    });
}

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

// Active Escrows Header Click Handler
const escrowsHeaderCard = document.getElementById('escrowsHeaderCard');
const activeEscrowsDropdown = document.getElementById('activeEscrowsDropdown');

if (escrowsHeaderCard && activeEscrowsDropdown) {
    escrowsHeaderCard.addEventListener('click', function(e) {
        // Don't toggle if clicking on escrow items
        if (e.target.closest('.active-escrow-item')) {
            return;
        }
        
        // Toggle dropdown
        escrowsHeaderCard.classList.toggle('expanded');
        activeEscrowsDropdown.classList.toggle('expanded');
    });
}

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
    const totalEscrowValue = document.getElementById('totalEscrowValue');
    if (totalEscrowValue) {
        totalEscrowValue.textContent = '$86,020.00';
    }
    
    const escrowStatus = document.getElementById('escrowStatus');
    if (escrowStatus) {
        escrowStatus.textContent = 'In Escrow';
    }
}

// Close modal when clicking on overlay (optional - you can remove this if you want to force wallet selection)
walletModal?.querySelector('.wallet-modal-overlay')?.addEventListener('click', (e) => {
    // Only close if clicking directly on overlay, not on content
    if (e.target === e.currentTarget) {
        // Uncomment the line below if you want to allow closing by clicking overlay
        // closeWalletModal();
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

// Chart period buttons
const chartButtons = document.querySelectorAll('.chart-btn');
chartButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        chartButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        // In the future, this would update the chart data
        console.log('Chart period changed to:', this.textContent);
    });
});

// Quick action buttons
const actionButtons = document.querySelectorAll('.action-btn');
actionButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        const action = this.querySelector('span:last-child').textContent;
        console.log('Action clicked:', action);
        // In the future, these would trigger modals or navigation
        // Create Escrow, My Escrows, Find Escrow, Analytics
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
    const animateElements = document.querySelectorAll('.holding-item, .activity-item, .stat-card, .portfolio-section');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

