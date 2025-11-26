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
function disconnectWallet() {
    // Clear localStorage
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
    
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

// Restore profile data from localStorage
function restoreProfileData() {
    const savedProfileData = localStorage.getItem('profileData');
    if (savedProfileData) {
        try {
            const profileData = JSON.parse(savedProfileData);
            const actualProfileSection = document.querySelector('.profile-section:not(.profile-section-editing)');
            if (actualProfileSection) {
                const profileName = actualProfileSection.querySelector('.profile-name');
                const profileEmail = actualProfileSection.querySelector('.profile-email');
                const companyName = actualProfileSection.querySelector('.company-name');
                const locationText = actualProfileSection.querySelector('.location-text');
                const actualProfileAvatar = actualProfileSection.querySelector('.profile-avatar');
                const actualAvatarPlaceholder = actualProfileSection.querySelector('.avatar-placeholder');
                
                if (profileName && profileData.name) profileName.textContent = profileData.name;
                if (profileEmail && profileData.email) profileEmail.textContent = profileData.email;
                if (companyName && profileData.company) companyName.textContent = profileData.company;
                if (locationText && profileData.location) locationText.textContent = profileData.location;
                
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
                } else if (profileData.name) {
                    // Restore initials from name
                    const profileImg = actualProfileAvatar.querySelector('img');
                    if (profileImg) {
                        profileImg.remove();
                    }
                    if (actualAvatarPlaceholder) {
                        actualAvatarPlaceholder.style.display = 'flex';
                        const nameParts = profileData.name.split(' ');
                        const initials = nameParts.length > 1 
                            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                            : profileData.name.substring(0, 2).toUpperCase();
                        actualAvatarPlaceholder.textContent = initials || 'JD';
                    }
                }
            }
        } catch (e) {
            console.error('Error restoring profile data:', e);
        }
    }
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
            
            // Initialize escrows handler after profile page is shown
            setTimeout(() => {
                initializeEscrowsHandler();
            }, 100);
        }
        
        if (navMenu) {
            navMenu.style.display = 'flex';
        }
        
        if (connectWalletBtn && walletAddress) {
            connectWalletBtn.style.display = 'none';
            walletAddress.querySelector('.address-text').textContent = savedWalletAddress;
            walletAddress.style.display = 'flex';
        }
        
        // Update profile wallet address
        const profileWalletAddress = document.getElementById('profileWalletAddress');
        if (profileWalletAddress) {
            profileWalletAddress.textContent = savedWalletAddress;
        }
        
        // Show theme toggle
        if (themeToggle) {
            themeToggle.style.display = 'flex';
        }
        
        // Restore profile data
        restoreProfileData();
        
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
            
            // Show wallet address with simulated address
            // In a real app, this would be the actual connected wallet address
            const simulatedAddress = '0x' + Math.random().toString(16).substr(2, 8) + '...' + Math.random().toString(16).substr(2, 4);
            walletAddress.querySelector('.address-text').textContent = simulatedAddress;
            walletAddress.style.display = 'flex';
            
            // Save wallet connection to localStorage
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', simulatedAddress);
            
            // Update profile wallet address
            const profileWalletAddress = document.getElementById('profileWalletAddress');
            if (profileWalletAddress) {
                profileWalletAddress.textContent = simulatedAddress;
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
        localStorage.setItem('profileData', JSON.stringify(profileData));
        
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
    const totalEscrowValue = document.getElementById('totalEscrowValue');
    if (totalEscrowValue) {
        totalEscrowValue.textContent = '$86,020.00';
    }
    
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

