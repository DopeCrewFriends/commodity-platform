// ==================== PROFILE MANAGEMENT ====================

// Track if we're viewing another user's profile
let viewingOtherUserProfile = false;
let viewedUserWalletAddress = null;

// View another user's profile (read-only)
function viewUserProfile(walletAddress) {
    if (!walletAddress) return;
    
    const currentWallet = getCurrentWalletAddress();
    if (walletAddress === currentWallet) {
        // If clicking on own profile, just show own profile
        viewMyProfile();
        return;
    }
    
    viewingOtherUserProfile = true;
    viewedUserWalletAddress = walletAddress;
    
    // Navigate to profile page
    if (typeof navigateToProfile === 'function') {
        navigateToProfile();
    }
    
    // Load the user's data
    loadUserDataForViewing(walletAddress);
    
    // Update UI to show we're viewing someone else's profile
    updateProfileViewMode(false);
}

// View own profile
function viewMyProfile() {
    viewingOtherUserProfile = false;
    viewedUserWalletAddress = null;
    
    const currentWallet = getCurrentWalletAddress();
    if (currentWallet) {
        loadUserDataForViewing(currentWallet);
        updateProfileViewMode(true);
    }
}

// Update profile view mode (own profile vs. other user's profile)
function updateProfileViewMode(isOwnProfile) {
    const editProfileBtn = document.getElementById('editProfileBtn');
    const backToMyProfileBtn = document.getElementById('backToMyProfileBtn');
    const profileBackArrow = document.getElementById('profileBackArrow');
    const profileActions = document.querySelector('.profile-actions');
    const contactsWalletSection = document.querySelector('.contacts-wallet-section');
    const contactsCard = document.querySelector('.contacts-card');
    const walletBalanceCard = document.querySelector('.wallet-balance-card');
    const profileSection = document.getElementById('profileCard');
    
    if (isOwnProfile) {
        // Show Edit Profile button, hide Back buttons
        if (editProfileBtn) editProfileBtn.style.display = 'flex';
        if (backToMyProfileBtn) backToMyProfileBtn.style.display = 'none';
        if (profileBackArrow) profileBackArrow.style.display = 'none';
        // Remove viewing-other-user class to remove spacing
        if (profileSection) profileSection.classList.remove('viewing-other-user');
        // Show contacts and wallet balance sections
        if (contactsWalletSection) {
            contactsWalletSection.style.display = 'grid';
            contactsWalletSection.style.gridTemplateColumns = '1fr 1fr';
            contactsWalletSection.style.maxWidth = '';
        }
        if (contactsCard) contactsCard.style.display = 'block';
        if (walletBalanceCard) walletBalanceCard.style.display = 'block';
    } else {
        // Hide Edit Profile button, show Back arrow and button
        if (editProfileBtn) editProfileBtn.style.display = 'none';
        
        // Add viewing-other-user class to add spacing
        if (profileSection) profileSection.classList.add('viewing-other-user');
        
        // Show back arrow at top left
        if (profileBackArrow) {
            profileBackArrow.style.display = 'flex';
            // Add click handler if not already added
            if (!profileBackArrow.dataset.listenerAdded) {
                profileBackArrow.addEventListener('click', (e) => {
                    e.stopPropagation();
                    viewMyProfile();
                });
                profileBackArrow.dataset.listenerAdded = 'true';
            }
        }
        
        // Create Back button if it doesn't exist (for profile actions area)
        if (!backToMyProfileBtn && profileActions) {
            const backBtn = document.createElement('button');
            backBtn.className = 'btn btn-secondary edit-profile-btn';
            backBtn.id = 'backToMyProfileBtn';
            backBtn.innerHTML = '<span>←</span> Back to My Profile';
            backBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                viewMyProfile();
            });
            profileActions.appendChild(backBtn);
        } else if (backToMyProfileBtn) {
            backToMyProfileBtn.style.display = 'flex';
        }
        
        // Hide contacts card but show wallet balance when viewing other users
        if (contactsCard) contactsCard.style.display = 'none';
        if (walletBalanceCard) walletBalanceCard.style.display = 'block';
        // Update wallet balance section to show only wallet balance (single column)
        if (contactsWalletSection) {
            contactsWalletSection.style.display = 'grid';
            contactsWalletSection.style.gridTemplateColumns = '1fr';
            contactsWalletSection.style.maxWidth = '600px';
        }
    }
}

// Load user data for viewing (works for both own profile and other users)
function loadUserDataForViewing(walletAddress) {
    if (!walletAddress) return;
    
    const profileKey = `user_${walletAddress}_profileData`;
    const savedProfileData = localStorage.getItem(profileKey);
    
    // Load and apply statistics
    loadUserStatistics(walletAddress);
    
    // Load and apply escrow data
    if (typeof loadUserEscrows === 'function') {
        loadUserEscrows(walletAddress);
    }
    
    // Load and apply trade history
    if (typeof loadUserTradeHistory === 'function') {
        loadUserTradeHistory(walletAddress);
    }
    
    updateProfileWalletAddress(walletAddress);
    
    if (savedProfileData) {
        try {
            const profileData = JSON.parse(savedProfileData);
            applyProfileData(profileData);
            
            // Only show completion prompt for own profile
            if (!viewingOtherUserProfile) {
                if (!isProfileComplete(profileData)) {
                    showProfileCompletionPrompt();
                } else {
                    hideProfileCompletionPrompt();
                }
            } else {
                // Hide completion prompt when viewing other users
                hideProfileCompletionPrompt();
            }
        } catch (e) {
            console.error('Error loading user profile data:', e);
            if (!viewingOtherUserProfile) {
                initializeNewUserProfile(walletAddress);
            }
        }
    } else {
        if (!viewingOtherUserProfile) {
            initializeNewUserProfile(walletAddress);
        }
    }
    
    setTimeout(() => {
        updateProfileWalletAddress(walletAddress);
    }, 50);
    
    // Load contacts and wallet balance based on profile type
    setTimeout(() => {
        if (!viewingOtherUserProfile) {
            // Own profile: show contacts and wallet balance
            if (typeof renderContacts === 'function') {
                renderContacts();
            }
            if (typeof updateWalletBalanceDisplay === 'function') {
                updateWalletBalanceDisplay();
            }
        } else {
            // Other user's profile: show wallet balance only
            if (typeof updateWalletBalanceDisplay === 'function') {
                updateWalletBalanceDisplay(walletAddress);
            }
        }
    }, 100);
}

// Load user data for a specific wallet address
function loadUserData(walletAddress) {
    if (!walletAddress) return;
    
    const profileKey = `user_${walletAddress}_profileData`;
    const savedProfileData = localStorage.getItem(profileKey);
    
    // Use the shared viewing function
    viewingOtherUserProfile = false;
    viewedUserWalletAddress = null;
    loadUserDataForViewing(walletAddress);
    updateProfileViewMode(true);
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
    const defaultStats = {
        memberSince: null,
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
    const memberSince = document.getElementById('memberSince');
    const completedTrades = document.getElementById('completedTrades');
    const totalVolume = document.getElementById('totalVolume');
    const successRate = document.getElementById('successRate');
    const rating = document.getElementById('rating');
    
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

// Show profile completion modal
function showProfileCompletionPrompt() {
    const modal = document.getElementById('profileCompletionModal');
    if (!modal) return;
    
    document.body.classList.add('wallet-modal-open');
    
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
        const profileImg = actualProfileAvatar.querySelector('img');
        if (profileImg) {
            profileImg.remove();
        }
        
        if (actualAvatarPlaceholder) {
            actualAvatarPlaceholder.style.display = 'flex';
            if (profileData.name && profileData.name.trim() !== '') {
                const nameParts = profileData.name.split(' ');
                const initials = nameParts.length > 1 
                    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                    : profileData.name.substring(0, 2).toUpperCase();
                actualAvatarPlaceholder.textContent = initials || '??';
            } else {
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

// Initialize default profile for new user
function initializeNewUserProfile(walletAddress) {
    if (!walletAddress) return;
    
    const initials = walletAddress.slice(0, 2).toUpperCase();
    
    const defaultProfile = {
        name: '',
        email: '',
        company: '',
        location: '',
        avatarImage: null,
        walletAddress: walletAddress,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
    
    // Save default profile - this automatically saves to user_{walletAddress}_profileData
    // which makes it searchable via getAllUsers() once the user fills in their name
    setUserData('profileData', defaultProfile);
    
    applyProfileData(defaultProfile);
    
    const actualAvatarPlaceholder = document.querySelector('.avatar-placeholder');
    if (actualAvatarPlaceholder) {
        actualAvatarPlaceholder.textContent = initials;
    }
    
    showProfileCompletionPrompt();
}

// Edit Profile Overlay
const editProfileOverlay = document.getElementById('editProfileOverlay');
const editProfileForm = document.getElementById('editProfileForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Open edit profile overlay
function openEditProfileModal() {
    if (editProfileOverlay) {
        const mainProfileSection = document.querySelector('.profile-section:not(.profile-section-editing)');
        const profileName = mainProfileSection ? mainProfileSection.querySelector('.profile-name') : document.querySelector('.profile-name');
        const profileEmail = mainProfileSection ? mainProfileSection.querySelector('.profile-email') : document.querySelector('.profile-email');
        const companyName = mainProfileSection ? mainProfileSection.querySelector('.company-name') : document.querySelector('.company-name');
        const locationText = mainProfileSection ? mainProfileSection.querySelector('.location-text') : document.querySelector('.location-text');
        const avatarPlaceholder = mainProfileSection ? mainProfileSection.querySelector('.avatar-placeholder') : document.querySelector('.avatar-placeholder');
        const existingProfileImg = mainProfileSection ? mainProfileSection.querySelector('.profile-avatar img') : document.querySelector('.profile-avatar img');
        
        const editName = document.getElementById('editName');
        const editEmail = document.getElementById('editEmail');
        const editCompany = document.getElementById('editCompany');
        const editLocation = document.getElementById('editLocation');
        
        if (profileName && editName) {
            const nameText = profileName.textContent.trim();
            if (nameText && nameText !== 'Your Name' && !profileName.classList.contains('placeholder-text')) {
                editName.value = nameText;
            } else {
                editName.value = '';
            }
        }
        
        if (profileEmail && editEmail) {
            const emailText = profileEmail.textContent.trim();
            if (emailText && emailText !== 'your.email@example.com' && !profileEmail.classList.contains('placeholder-text')) {
                editEmail.value = emailText;
            } else {
                editEmail.value = '';
            }
        }
        
        if (companyName && editCompany) {
            const companyText = companyName.textContent.trim();
            if (companyText && companyText !== 'Your Company' && !companyName.classList.contains('placeholder-text')) {
                editCompany.value = companyText;
            } else {
                editCompany.value = '';
            }
        }
        
        if (locationText && editLocation) {
            const locationTextValue = locationText.textContent.trim();
            if (locationTextValue && locationTextValue !== 'Your Location' && !locationText.classList.contains('placeholder-text')) {
                editLocation.value = locationTextValue;
            } else {
                editLocation.value = '';
            }
        }
        
        const editProfileImage = document.getElementById('editProfileImage');
        const editAvatarPlaceholder = document.getElementById('editAvatarPlaceholder');
        const avatarEditOverlay = document.querySelector('.avatar-edit-overlay');
        
        const savedProfileData = getUserData('profileData');
        const hasSavedImage = savedProfileData && savedProfileData.avatarImage;
        
        if (editAvatarPlaceholder) {
            editAvatarPlaceholder.style.display = 'flex';
            editAvatarPlaceholder.style.visibility = 'visible';
            editAvatarPlaceholder.style.opacity = '1';
            
            const mainProfileSection = document.querySelector('.profile-section:not(.profile-section-editing)');
            const mainAvatarPlaceholder = mainProfileSection ? mainProfileSection.querySelector('.avatar-placeholder') : null;
            
            if (mainAvatarPlaceholder && mainAvatarPlaceholder.textContent && mainAvatarPlaceholder.textContent.trim() !== '') {
                editAvatarPlaceholder.textContent = mainAvatarPlaceholder.textContent.trim();
            } else if (avatarPlaceholder && avatarPlaceholder.textContent && avatarPlaceholder.textContent.trim() !== '') {
                editAvatarPlaceholder.textContent = avatarPlaceholder.textContent.trim();
            } else {
                const savedName = savedProfileData && savedProfileData.name ? savedProfileData.name.trim() : '';
                const nameInput = document.getElementById('editName');
                const currentName = nameInput && nameInput.value ? nameInput.value.trim() : savedName;
                
                if (currentName && currentName !== '' && currentName !== 'Your Name') {
                    const nameParts = currentName.split(' ');
                    const initials = nameParts.length > 1 
                        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                        : currentName.substring(0, 2).toUpperCase();
                    editAvatarPlaceholder.textContent = initials;
                } else {
                    const walletAddress = getCurrentWalletAddress();
                    if (walletAddress) {
                        editAvatarPlaceholder.textContent = walletAddress.slice(0, 2).toUpperCase();
                    } else {
                        editAvatarPlaceholder.textContent = '??';
                    }
                }
            }
        }
        
        if (hasSavedImage && savedProfileData.avatarImage) {
            editProfileImage.src = savedProfileData.avatarImage;
            editProfileImage.style.display = 'block';
            editProfileImage.style.zIndex = '8';
            if (editAvatarPlaceholder) {
                editAvatarPlaceholder.style.display = 'none';
            }
            if (avatarEditOverlay) {
                avatarEditOverlay.style.display = 'none';
            }
        } else if (existingProfileImg && existingProfileImg.src && existingProfileImg.src.trim() !== '' && !existingProfileImg.src.includes('data:image/svg')) {
            editProfileImage.src = existingProfileImg.src;
            editProfileImage.style.display = 'block';
            editProfileImage.style.zIndex = '8';
            if (editAvatarPlaceholder) {
                editAvatarPlaceholder.style.display = 'none';
            }
            if (avatarEditOverlay) {
                avatarEditOverlay.style.display = 'none';
            }
        } else {
            editProfileImage.style.display = 'none';
            if (editAvatarPlaceholder) {
                editAvatarPlaceholder.style.display = 'flex';
                editAvatarPlaceholder.style.visibility = 'visible';
                editAvatarPlaceholder.style.opacity = '1';
                editAvatarPlaceholder.style.zIndex = '1';
            }
            if (avatarEditOverlay) {
                avatarEditOverlay.style.display = 'flex';
                avatarEditOverlay.style.visibility = 'visible';
                avatarEditOverlay.style.opacity = '1';
                avatarEditOverlay.style.zIndex = '9';
            }
        }
        
        document.body.classList.add('wallet-modal-open');
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

// Close edit profile modal on Escape key press
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
        const editProfileOverlay = document.getElementById('editProfileOverlay');
        if (editProfileOverlay && editProfileOverlay.style.display !== 'none' && editProfileOverlay.style.display !== '') {
            closeEditProfileModal();
        }
    }
});

// Edit Profile Button
const editProfileBtn = document.getElementById('editProfileBtn');
if (editProfileBtn) {
    editProfileBtn.addEventListener('click', function(e) {
        e.stopPropagation();
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

if (profilePictureInput) {
    profilePictureInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                editProfileImage.src = e.target.result;
                editProfileImage.style.display = 'block';
                if (editAvatarPlaceholder) editAvatarPlaceholder.style.display = 'none';
                const avatarEditOverlay = document.querySelector('.avatar-edit-overlay');
                if (avatarEditOverlay) {
                    avatarEditOverlay.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

// Handle edit profile form submission
if (editProfileForm) {
    editProfileForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('editName').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const company = document.getElementById('editCompany').value.trim();
        const location = document.getElementById('editLocation').value.trim();
        
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
        
        if (profileName) profileName.textContent = name;
        if (profileEmail) profileEmail.textContent = email;
        if (companyName) companyName.textContent = company;
        if (locationText) locationText.textContent = location;
        
        if (editProfileImage && editProfileImage.src && editProfileImage.style.display !== 'none') {
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
            const profileImg = actualProfileAvatar.querySelector('img');
            if (profileImg) {
                profileImg.remove();
            }
            if (actualAvatarPlaceholder) {
                actualAvatarPlaceholder.style.display = 'flex';
                const nameParts = name.split(' ');
                const initials = nameParts.length > 1 
                    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                    : name.substring(0, 2).toUpperCase();
                actualAvatarPlaceholder.textContent = initials || 'JD';
            }
        }
        
        const walletAddress = getCurrentWalletAddress();
        
        // Get existing profile to preserve createdAt if it exists
        const existingProfile = getUserData('profileData', {});
        
        const profileData = {
            name: name,
            email: email,
            company: company,
            location: location,
            avatarImage: editProfileImage && editProfileImage.src && editProfileImage.style.display !== 'none' ? editProfileImage.src : null,
            walletAddress: walletAddress,
            createdAt: existingProfile.createdAt || new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        // Save profile data - this automatically saves to user_{walletAddress}_profileData
        // which makes it searchable via the getAllUsers() function in contacts.js
        const saved = setUserData('profileData', profileData);
        
        if (saved) {
            console.log(`✅ Profile saved and registered for search! Wallet: ${walletAddress}`);
        }
        
        applyProfileData(profileData);
        
        if (isProfileComplete(profileData)) {
            hideProfileCompletionPrompt();
        } else {
            showProfileCompletionPrompt();
        }
        
        closeEditProfileModal();
        console.log('Profile updated successfully');
    });
}

// Close edit profile overlay when clicking on overlay
editProfileOverlay?.addEventListener('click', (e) => {
    if (e.target === editProfileOverlay) {
        closeEditProfileModal();
    }
});

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
    
    if (modal) {
        const overlay = modal.querySelector('.profile-completion-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
    }
});

