// ==================== CONTACTS MANAGEMENT ====================

// Get all users from API (with localStorage fallback)
async function getAllUsers() {
    const currentWallet = getCurrentWalletAddress();
    
    // Try API first
    if (typeof getAllProfilesFromAPI === 'function') {
        try {
            const apiUsers = await getAllProfilesFromAPI(currentWallet);
            if (apiUsers && apiUsers.length > 0) {
                // Cache API results in localStorage for offline access
                apiUsers.forEach(user => {
                    const key = `user_${user.walletAddress}_profileData`;
                    const profileData = {
                        name: user.name,
                        email: user.email,
                        company: user.company,
                        location: user.location,
                        avatarImage: user.avatarImage,
                        walletAddress: user.walletAddress
                    };
                    localStorage.setItem(key, JSON.stringify(profileData));
                });
                return apiUsers;
            }
        } catch (error) {
            console.warn('Failed to fetch users from API, falling back to localStorage:', error);
        }
    }
    
    // Fallback to localStorage
    const users = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_') && key.endsWith('_profileData')) {
            // Extract wallet address from key: user_{walletAddress}_profileData
            const walletAddress = key.replace('user_', '').replace('_profileData', '');
            
            // Skip current user
            if (walletAddress === currentWallet) continue;
            
            try {
                const profileData = JSON.parse(localStorage.getItem(key));
                if (profileData && profileData.name && profileData.name.trim() !== '') {
                    users.push({
                        walletAddress: walletAddress,
                        name: profileData.name.trim(),
                        email: profileData.email || '',
                        company: profileData.company || '',
                        location: profileData.location || '',
                        avatarImage: profileData.avatarImage || null
                    });
                }
            } catch (e) {
                console.error(`Error parsing profile data for ${walletAddress}:`, e);
            }
        }
    }
    
    return users;
}

// Search users by name (API with localStorage fallback)
async function searchUsersByName(searchQuery) {
    if (!searchQuery || searchQuery.trim() === '') {
        return [];
    }
    
    const query = searchQuery.trim();
    const currentWallet = getCurrentWalletAddress();
    const contacts = getContacts();
    const contactAddresses = new Set(contacts.map(c => c.address));
    
    // Try API first
    if (typeof searchProfilesFromAPI === 'function') {
        try {
            const apiUsers = await searchProfilesFromAPI(query, currentWallet);
            if (apiUsers && apiUsers.length > 0) {
                // Cache API results in localStorage
                apiUsers.forEach(user => {
                    const key = `user_${user.walletAddress}_profileData`;
                    const profileData = {
                        name: user.name,
                        email: user.email,
                        company: user.company,
                        location: user.location,
                        avatarImage: user.avatarImage,
                        walletAddress: user.walletAddress
                    };
                    localStorage.setItem(key, JSON.stringify(profileData));
                });
                
                // Filter out already added contacts
                return apiUsers.filter(user => !contactAddresses.has(user.walletAddress));
            }
        } catch (error) {
            console.warn('Failed to search users from API, falling back to localStorage:', error);
        }
    }
    
    // Fallback to localStorage search
    const queryLower = query.toLowerCase();
    const allUsers = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_') && key.endsWith('_profileData')) {
            const walletAddress = key.replace('user_', '').replace('_profileData', '');
            if (walletAddress === currentWallet) continue;
            
            try {
                const profileData = JSON.parse(localStorage.getItem(key));
                if (profileData && profileData.name && profileData.name.trim() !== '') {
                    allUsers.push({
                        walletAddress: walletAddress,
                        name: profileData.name.trim(),
                        email: profileData.email || '',
                        company: profileData.company || '',
                        location: profileData.location || '',
                        avatarImage: profileData.avatarImage || null
                    });
                }
            } catch (e) {
                console.error(`Error parsing profile data for ${walletAddress}:`, e);
            }
        }
    }
    
    // Filter users by name and exclude already added contacts
    return allUsers.filter(user => {
        const nameMatch = user.name.toLowerCase().includes(queryLower);
        const isAlreadyContact = contactAddresses.has(user.walletAddress);
        return nameMatch && !isAlreadyContact;
    });
}

// Render search results
function renderSearchResults(users) {
    const searchResults = document.getElementById('contactsSearchResults');
    const contactsList = document.getElementById('contactsList');
    const noContactsMessage = document.getElementById('noContactsMessage');
    
    if (!searchResults) return;
    
    if (users.length === 0) {
        searchResults.style.display = 'none';
        if (contactsList && contactsList.children.length === 0) {
            if (noContactsMessage) noContactsMessage.style.display = 'block';
        }
        return;
    }
    
    searchResults.style.display = 'block';
    if (noContactsMessage) noContactsMessage.style.display = 'none';
    
    searchResults.innerHTML = users.map(user => {
        // Get initials for avatar
        const nameParts = user.name.split(' ');
        const initials = nameParts.length > 1 
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : user.name.substring(0, 2).toUpperCase();
        
        return `
            <div class="search-result-item" data-wallet-address="${user.walletAddress}">
                <div class="search-result-avatar">
                    ${user.avatarImage 
                        ? `<img src="${escapeHtml(user.avatarImage)}" alt="${escapeHtml(user.name)}">`
                        : `<div class="search-result-avatar-placeholder">${initials}</div>`
                    }
                </div>
                <div class="search-result-info">
                    <div class="search-result-name">${escapeHtml(user.name)}</div>
                    ${user.email ? `<div class="search-result-email">${escapeHtml(user.email)}</div>` : ''}
                    ${user.company ? `<div class="search-result-company">${escapeHtml(user.company)}</div>` : ''}
                    ${user.location ? `<div class="search-result-location">📍 ${escapeHtml(user.location)}</div>` : ''}
                    <div class="search-result-address">${formatAddress(user.walletAddress)}</div>
                </div>
                <button class="btn btn-primary btn-small add-from-search-btn" data-wallet-address="${user.walletAddress}" data-user-name="${escapeHtml(user.name)}">
                    Add Contact
                </button>
            </div>
        `;
    }).join('');
    
    // Add event listeners for add buttons
    searchResults.querySelectorAll('.add-from-search-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const walletAddress = btn.getAttribute('data-wallet-address');
            const userName = btn.getAttribute('data-user-name');
            addContactFromSearch(userName, walletAddress);
        });
    });
    
    // Add click handlers to view profile when clicking on search result items
    searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking on the Add Contact button
            if (e.target.closest('.add-from-search-btn')) {
                return;
            }
            const walletAddress = item.getAttribute('data-wallet-address');
            if (walletAddress && typeof viewUserProfile === 'function') {
                viewUserProfile(walletAddress);
            }
        });
    });
}

// Add contact from search results
function addContactFromSearch(name, walletAddress) {
    // Check if already a contact
    const contacts = getContacts();
    if (contacts.some(c => c.address === walletAddress)) {
        alert('This user is already in your contacts!');
        return;
    }
    
    addContact(name, walletAddress);
    
    // Clear search
    const searchInput = document.getElementById('contactsSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    renderSearchResults([]);
    
    // Show success message and refresh directory
    const searchResults = document.getElementById('contactsSearchResults');
    if (searchResults) {
        searchResults.style.display = 'none';
    }
    
    // Refresh the appropriate view
    const contactsList = document.getElementById('contactsList');
    if (contactsList) {
        contactsList.style.display = 'block';
    }
    
    if (currentContactsView === 'my-contacts') {
        renderMyContacts();
    } else {
        renderUserDirectory();
    }
}

// Get user-specific contacts key
function getContactsKey() {
    const walletAddress = getCurrentWalletAddress();
    if (!walletAddress) return null;
    return `user_${walletAddress}_contacts`;
}

// Get contacts from localStorage
function getContacts() {
    const key = getContactsKey();
    if (!key) return [];
    const contacts = localStorage.getItem(key);
    return contacts ? JSON.parse(contacts) : [];
}

// Save contacts to localStorage
function saveContacts(contacts) {
    const key = getContactsKey();
    if (!key) return false;
    try {
        localStorage.setItem(key, JSON.stringify(contacts));
        return true;
    } catch (e) {
        console.error('Error saving contacts:', e);
        return false;
    }
}

// Add a new contact
function addContact(name, address, notes = '') {
    const contacts = getContacts();
    const newContact = {
        id: Date.now().toString(),
        name: name.trim(),
        address: address.trim(),
        notes: notes.trim(),
        createdAt: new Date().toISOString()
    };
    contacts.push(newContact);
    saveContacts(contacts);
    renderContacts();
}

// Update an existing contact
function updateContact(contactId, name, address, notes = '') {
    const contacts = getContacts();
    const index = contacts.findIndex(c => c.id === contactId);
    if (index !== -1) {
        contacts[index] = {
            ...contacts[index],
            name: name.trim(),
            address: address.trim(),
            notes: notes.trim()
        };
        saveContacts(contacts);
        renderContacts();
        return true;
    }
    return false;
}

// Delete a contact
function deleteContact(contactId) {
    const contacts = getContacts();
    const filtered = contacts.filter(c => c.id !== contactId);
    saveContacts(filtered);
    
    // Refresh the appropriate view
    if (currentContactsView === 'my-contacts') {
        renderMyContacts();
    } else {
        renderUserDirectory();
    }
}

// Render user directory (all users with profiles)
async function renderUserDirectory() {
    const contactsList = document.getElementById('contactsList');
    const noContactsMessage = document.getElementById('noContactsMessage');
    if (!contactsList) return;
    
    // Show loading state
    contactsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light);">Loading users...</p>';
    
    const allUsers = await getAllUsers();
    const savedContacts = getContacts();
    const savedContactAddresses = new Set(savedContacts.map(c => c.address));
    
    if (allUsers.length === 0) {
        if (noContactsMessage) {
            noContactsMessage.innerHTML = '<p>No users found yet. Be the first to complete your profile!</p>';
            noContactsMessage.style.display = 'block';
        }
        contactsList.innerHTML = '';
        if (noContactsMessage) contactsList.appendChild(noContactsMessage);
        return;
    }
    
    if (noContactsMessage) noContactsMessage.style.display = 'none';
    
    contactsList.innerHTML = allUsers.map(user => {
        const isSavedContact = savedContactAddresses.has(user.walletAddress);
        
        // Get initials for avatar
        const nameParts = user.name.split(' ');
        const initials = nameParts.length > 1 
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : user.name.substring(0, 2).toUpperCase();
        
        return `
            <div class="user-profile-card" data-wallet-address="${user.walletAddress}">
                <div class="user-profile-avatar">
                    ${user.avatarImage 
                        ? `<img src="${escapeHtml(user.avatarImage)}" alt="${escapeHtml(user.name)}">`
                        : `<div class="user-profile-avatar-placeholder">${initials}</div>`
                    }
                </div>
                <div class="user-profile-info">
                    <div class="user-profile-name">${escapeHtml(user.name)}</div>
                    ${user.email ? `<div class="user-profile-email">${escapeHtml(user.email)}</div>` : ''}
                    ${user.company ? `<div class="user-profile-company">${escapeHtml(user.company)}</div>` : ''}
                    ${user.location ? `<div class="user-profile-location">📍 ${escapeHtml(user.location)}</div>` : ''}
                    <div class="user-profile-address">${formatAddress(user.walletAddress)}</div>
                </div>
                <div class="user-profile-actions">
                    ${isSavedContact 
                        ? `<span class="contact-badge">✓ Added</span>`
                        : `<button class="btn btn-primary btn-small add-user-btn" data-wallet-address="${user.walletAddress}" data-user-name="${escapeHtml(user.name)}">
                            Add Contact
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners for add buttons
    contactsList.querySelectorAll('.add-user-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const walletAddress = btn.getAttribute('data-wallet-address');
            const userName = btn.getAttribute('data-user-name');
            addContactFromSearch(userName, walletAddress);
        });
    });
    
    // Add click handlers to view profile when clicking on user profile cards
    contactsList.querySelectorAll('.user-profile-card[data-wallet-address]').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking on the Add Contact button or badge
            if (e.target.closest('.add-user-btn') || e.target.closest('.contact-badge')) {
                return;
            }
            const walletAddress = card.getAttribute('data-wallet-address');
            if (walletAddress && typeof viewUserProfile === 'function') {
                viewUserProfile(walletAddress);
            }
        });
    });
}

// Render saved contacts (My Contacts view)
function renderMyContacts() {
    const contactsList = document.getElementById('contactsList');
    const noContactsMessage = document.getElementById('noContactsMessage');
    if (!contactsList) return;
    
    const contacts = getContacts();
    
    if (contacts.length === 0) {
        if (noContactsMessage) {
            noContactsMessage.innerHTML = '<p>Add your first contact by searching their name.</p>';
            noContactsMessage.style.display = 'block';
        }
        contactsList.innerHTML = '';
        if (noContactsMessage) contactsList.appendChild(noContactsMessage);
        return;
    }
    
    if (noContactsMessage) noContactsMessage.style.display = 'none';
    
    // Helper function to render contacts list with profile data
    const renderContactsList = (userMap = new Map()) => {
        contactsList.innerHTML = contacts.map(contact => {
            const userProfile = userMap.get(contact.address);
            
            // Get initials for avatar
            const nameParts = contact.name.split(' ');
            const initials = nameParts.length > 1 
                ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                : contact.name.substring(0, 2).toUpperCase();
            
            // Use profile data if available, otherwise use contact data
            const displayName = userProfile?.name || contact.name;
            const email = userProfile?.email || '';
            const company = userProfile?.company || '';
            const location = userProfile?.location || '';
            const avatarImage = userProfile?.avatarImage || null;
            
            return `
                <div class="user-profile-card" data-contact-id="${contact.id}">
                    <div class="user-profile-avatar">
                        ${avatarImage 
                            ? `<img src="${escapeHtml(avatarImage)}" alt="${escapeHtml(displayName)}">`
                            : `<div class="user-profile-avatar-placeholder">${initials}</div>`
                        }
                    </div>
                    <div class="user-profile-info">
                        <div class="user-profile-name">${escapeHtml(displayName)}</div>
                        ${email ? `<div class="user-profile-email">${escapeHtml(email)}</div>` : ''}
                        ${company ? `<div class="user-profile-company">${escapeHtml(company)}</div>` : ''}
                        ${location ? `<div class="user-profile-location">📍 ${escapeHtml(location)}</div>` : ''}
                        <div class="user-profile-address">${formatAddress(contact.address)}</div>
                        ${contact.notes ? `<div class="contact-notes" style="margin-top: 0.25rem; font-size: 0.8rem; color: var(--text-light); font-style: italic;">${escapeHtml(contact.notes)}</div>` : ''}
                    </div>
                    <div class="user-profile-actions">
                        <button class="btn btn-secondary btn-small remove-contact-btn" data-contact-id="${contact.id}" title="Remove Contact">
                            Remove
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners for remove buttons
        contactsList.querySelectorAll('.remove-contact-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactId = btn.getAttribute('data-contact-id');
                if (confirm('Are you sure you want to remove this contact?')) {
                    deleteContact(contactId);
                    renderMyContacts();
                }
            });
        });
        
        // Add click handlers to view profile when clicking on contact cards
        contactsList.querySelectorAll('.user-profile-card[data-contact-id]').forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on the Remove button
                if (e.target.closest('.remove-contact-btn')) {
                    return;
                }
                const contactId = card.getAttribute('data-contact-id');
                if (contactId) {
                    const contacts = getContacts();
                    const contact = contacts.find(c => c.id === contactId);
                    if (contact && contact.address && typeof viewUserProfile === 'function') {
                        viewUserProfile(contact.address);
                    }
                }
            });
        });
    };
    
    // Render immediately with basic info
    renderContactsList(new Map());
    
    // Then update with profile data from API (if available)
    getAllUsers().then(allUsers => {
        const userMap = new Map(allUsers.map(u => [u.walletAddress, u]));
        renderContactsList(userMap);
    }).catch(err => {
        console.error('Error loading user profiles for contacts:', err);
    });
}

// Render contacts list (legacy function - now renders based on current view)
function renderContacts() {
    if (currentContactsView === 'my-contacts') {
        renderMyContacts();
    } else {
        renderUserDirectory();
    }
}

// Contact Modal Functions
function openContactModal(contactId = null) {
    const modal = document.getElementById('contactModal');
    const form = document.getElementById('contactForm');
    const title = document.getElementById('contactModalTitle');
    const nameInput = document.getElementById('contactName');
    const addressInput = document.getElementById('contactAddress');
    const notesInput = document.getElementById('contactNotes');
    
    if (!modal || !form) return;
    
    if (contactId) {
        const contacts = getContacts();
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
            title.textContent = 'Edit Contact';
            nameInput.value = contact.name;
            addressInput.value = contact.address;
            notesInput.value = contact.notes || '';
            form.dataset.editId = contactId;
        }
    } else {
        title.textContent = 'Add Contact';
        form.reset();
        delete form.dataset.editId;
    }
    
    document.body.classList.add('wallet-modal-open');
    modal.style.display = 'flex';
}

function closeContactModal() {
    const modal = document.getElementById('contactModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('wallet-modal-open');
        const form = document.getElementById('contactForm');
        if (form) {
            form.reset();
            delete form.dataset.editId;
        }
    }
}

// Track current view state
let currentContactsView = 'my-contacts'; // 'directory' or 'my-contacts'

// Initialize contacts management
function initializeContactsManagement() {
    renderMyContacts();
    currentContactsView = 'my-contacts';
    
    // Initialize My Contacts button - always shows My Contacts
    const myContactsBtn = document.getElementById('myContactsBtn');
    if (myContactsBtn) {
        myContactsBtn.addEventListener('click', () => {
            // Hide search if open
            const searchSection = document.getElementById('contactsSearchSection');
            const searchInput = document.getElementById('contactsSearchInput');
            if (searchSection) searchSection.style.display = 'none';
            if (searchInput) searchInput.value = '';
            renderSearchResults([]);
            
            // Always show My Contacts
            renderMyContacts();
            currentContactsView = 'my-contacts';
        });
    }
    
    // Initialize search toggle button
    const toggleSearchBtn = document.getElementById('toggleSearchBtn');
    const searchSection = document.getElementById('contactsSearchSection');
    if (toggleSearchBtn && searchSection) {
        toggleSearchBtn.addEventListener('click', () => {
            const isVisible = searchSection.style.display !== 'none';
            
            if (isVisible) {
                // Close search and return to My Contacts
                searchSection.style.display = 'none';
                const searchInput = document.getElementById('contactsSearchInput');
                if (searchInput) searchInput.value = '';
                renderSearchResults([]);
                const contactsList = document.getElementById('contactsList');
                if (contactsList) contactsList.style.display = 'block';
                
                // Always return to My Contacts when closing search
                renderMyContacts();
                currentContactsView = 'my-contacts';
            } else {
                // Open search and show directory
                searchSection.style.display = 'block';
                currentContactsView = 'directory';
                renderUserDirectory();
                const searchInput = document.getElementById('contactsSearchInput');
                if (searchInput) setTimeout(() => searchInput.focus(), 100);
            }
        });
    }
    
    // Initialize search functionality
    const searchInput = document.getElementById('contactsSearchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query === '') {
                renderSearchResults([]);
                const contactsList = document.getElementById('contactsList');
                if (contactsList) {
                    contactsList.style.display = 'block';
                }
                
                // Re-render current view
                if (currentContactsView === 'my-contacts') {
                    renderMyContacts();
                } else {
                    renderUserDirectory();
                }
                return;
            }
            
            // Debounce search (only works on directory view)
            searchTimeout = setTimeout(async () => {
                if (currentContactsView === 'directory') {
                    const results = await searchUsersByName(query);
                    renderSearchResults(results);
                    
                    // Hide user directory when showing search results
                    const contactsList = document.getElementById('contactsList');
                    if (contactsList) {
                        contactsList.style.display = results.length > 0 ? 'none' : 'block';
                    }
                }
            }, 300);
        });
        
        // Clear search on escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                renderSearchResults([]);
                const contactsList = document.getElementById('contactsList');
                if (contactsList) {
                    contactsList.style.display = 'block';
                }
                
                // Re-render current view
                if (currentContactsView === 'my-contacts') {
                    renderMyContacts();
                } else {
                    renderUserDirectory();
                }
            }
        });
    }
    
    
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const nameInput = document.getElementById('contactName');
            const addressInput = document.getElementById('contactAddress');
            const notesInput = document.getElementById('contactNotes');
            
            if (!nameInput || !addressInput) return;
            
            const name = nameInput.value.trim();
            const address = addressInput.value.trim();
            const notes = notesInput.value.trim();
            
            if (!name || !address) {
                alert('Please fill in name and wallet address');
                return;
            }
            
            if (address.length < 32 || address.length > 44) {
                alert('Please enter a valid Solana wallet address');
                return;
            }
            
            const editId = contactForm.dataset.editId;
            
            if (editId) {
                updateContact(editId, name, address, notes);
            } else {
                addContact(name, address, notes);
            }
            
            closeContactModal();
        });
    }
    
    const closeModalBtn = document.getElementById('closeContactModal');
    const cancelBtn = document.getElementById('cancelContactBtn');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeContactModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeContactModal);
    }
    
    const modal = document.getElementById('contactModal');
    if (modal) {
        const overlay = modal.querySelector('.contact-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', closeContactModal);
        }
    }
    
    window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('user_') && e.key.endsWith('_contacts')) {
            renderContacts();
        }
    });
}

