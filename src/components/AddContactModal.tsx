import React, { useState, useEffect, useMemo } from 'react';
import { useContacts } from '../hooks/useContacts';
import { apiRequest, checkApiHealth } from '../utils/api';

interface AddContactModalProps {
  walletAddress: string;
  onClose: () => void;
}

interface SearchResult {
  walletAddress: string;
  name: string;
  email: string;
  company?: string;
  location?: string;
  avatarImage?: string;
  username?: string;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ walletAddress, onClose }) => {
  const { addContact } = useContacts(walletAddress);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [allUsers, setAllUsers] = useState<SearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState('');
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    checkApiHealth().then(setIsOnline);
  }, []);

  // Load all users when modal opens (only users with usernames)
  useEffect(() => {
    const loadAllUsers = async () => {
      if (!isOnline) return;
      
      setIsLoadingUsers(true);
      try {
        const data = await apiRequest<{ users: SearchResult[] }>(
          `/api/profiles/all?exclude=${encodeURIComponent(walletAddress)}`
        );
        // Filter to only show users with usernames
        setAllUsers((data.users || []).filter(user => user.username && user.username.trim()));
      } catch (err) {
        console.error('Error loading users:', err);
        setAllUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (isOnline) {
      loadAllUsers();
    }
  }, [isOnline, walletAddress]);

  useEffect(() => {
    if (!isOnline) {
      setSearchResults([]);
      return;
    }

    // If search query is less than 2 characters, show all users (filtered client-side)
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await apiRequest<{ users: SearchResult[] }>(
          `/api/profiles/search?q=${encodeURIComponent(searchQuery)}&exclude=${encodeURIComponent(walletAddress)}`
        );
        setSearchResults(data.users || []);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, walletAddress, isOnline]);

  // Filter all users client-side by username only
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      return allUsers;
    }
    
    const query = searchQuery.toLowerCase();
    return allUsers.filter(user => 
      user.username?.toLowerCase().includes(query)
    );
  }, [allUsers, searchQuery]);

  // Determine which users to display
  const displayUsers = searchQuery.trim().length >= 2 && searchResults.length > 0 
    ? searchResults 
    : filteredUsers;

  const handleSelectUser = (user: SearchResult) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedUser) {
      // Using search result
      try {
        const success = await addContact({
          name: selectedUser.name,
          email: selectedUser.email,
          walletAddress: selectedUser.walletAddress,
          company: selectedUser.company || '',
          location: selectedUser.location || '',
          id: Date.now().toString()
        });

        if (success) {
          onClose();
        } else {
          setError('Contact already exists');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add contact. Please try again.');
      }
    } else if (manualMode) {
      // Manual entry mode
      const formData = {
        name: (document.getElementById('contact-name') as HTMLInputElement)?.value.trim(),
        email: (document.getElementById('contact-email') as HTMLInputElement)?.value.trim(),
        walletAddress: (document.getElementById('contact-wallet') as HTMLInputElement)?.value.trim(),
        company: (document.getElementById('contact-company') as HTMLInputElement)?.value.trim() || '',
        location: (document.getElementById('contact-location') as HTMLInputElement)?.value.trim() || ''
      };

      if (!formData.name || !formData.email || !formData.walletAddress) {
        setError('Please fill in all required fields');
        return;
      }

      if (formData.walletAddress === walletAddress) {
        setError('Cannot add yourself as a contact');
        return;
      }

      try {
        const success = await addContact({
          ...formData,
          id: Date.now().toString()
        });

        if (success) {
          onClose();
        } else {
          setError('Contact already exists with this email or wallet address');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add contact. Please try again.');
      }
    } else {
      setError('Please search for a user or switch to manual entry');
    }
  };

  return (
    <div className="wallet-modal active" onClick={onClose}>
      <div className="wallet-modal-overlay"></div>
      <div className="wallet-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Add Contact</h2>
          <p>Search by username (e.g., @username) or add manually</p>
        </div>
        <form onSubmit={handleSubmit}>
          {!selectedUser && !manualMode && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Search by username (e.g., @username)..."
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Remove @ if user types it
                    const cleanValue = value.startsWith('@') ? value.slice(1) : value;
                    setSearchQuery(cleanValue);
                    setSelectedUser(null);
                  }}
                  style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem' }}
                />
                {(isSearching || isLoadingUsers) && (
                  <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                    🔍
                  </span>
                )}
              </div>
              
              {isLoadingUsers && (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                  Loading users...
                </div>
              )}

              {!isLoadingUsers && displayUsers.length > 0 && (
                <div style={{ 
                  border: '1px solid rgba(0,0,0,0.1)', 
                  borderRadius: '4px', 
                  maxHeight: '300px', 
                  overflowY: 'auto',
                  marginBottom: '0.5rem'
                }}>
                  {displayUsers.map((user) => (
                    <div
                      key={user.walletAddress}
                      onClick={() => handleSelectUser(user)}
                      style={{
                        padding: '0.75rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                        {user.name} {user.username && <span style={{ color: '#666', fontSize: '0.9em', fontWeight: 'normal' }}>@{user.username}</span>}
                      </div>
                      <div style={{ fontSize: '0.85em', color: '#666' }}>{user.email}</div>
                      {user.company && (
                        <div style={{ fontSize: '0.8em', color: '#999', marginTop: '0.25rem' }}>{user.company}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!isLoadingUsers && searchQuery && displayUsers.length === 0 && !isSearching && isOnline && (
                <div style={{ padding: '0.5rem', fontSize: '0.9em', color: '#666' }}>
                  No users found. Try a different search or{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setManualMode(true);
                      setSearchQuery('');
                    }}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--primary-color)', 
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    add manually
                  </button>
                </div>
              )}

              {!isLoadingUsers && !searchQuery && displayUsers.length === 0 && isOnline && (
                <div style={{ padding: '0.5rem', fontSize: '0.9em', color: '#666' }}>
                  No users available. You can{' '}
                  <button
                    type="button"
                    onClick={() => setManualMode(true)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--primary-color)', 
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    add manually
                  </button>
                </div>
              )}

              {!isOnline && (
                <div style={{ padding: '0.5rem', fontSize: '0.9em', color: '#666', marginBottom: '0.5rem' }}>
                  API offline. Switch to{' '}
                  <button
                    type="button"
                    onClick={() => setManualMode(true)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--primary-color)', 
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    manual entry
                  </button>
                </div>
              )}
            </div>
          )}

          {selectedUser && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Selected: {selectedUser.name} {selectedUser.username && <span style={{ color: '#666' }}>@{selectedUser.username}</span>}
              </div>
              <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '0.5rem' }}>{selectedUser.email}</div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setSearchQuery('');
                }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--primary-color)', 
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  textDecoration: 'underline'
                }}
              >
                Change selection
              </button>
            </div>
          )}

          {manualMode && (
            <div style={{ marginBottom: '1rem' }}>
              <input
                id="contact-name"
                type="text"
                placeholder="Name *"
                required
                style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem' }}
              />
              <input
                id="contact-email"
                type="email"
                placeholder="Email *"
                required
                style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem' }}
              />
              <input
                id="contact-wallet"
                type="text"
                placeholder="Wallet Address *"
                required
                style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem' }}
              />
              <input
                id="contact-company"
                type="text"
                placeholder="Company (optional)"
                style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem' }}
              />
              <input
                id="contact-location"
                type="text"
                placeholder="Location (optional)"
                style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem' }}
              />
              <button
                type="button"
                onClick={() => {
                  setManualMode(false);
                  setSearchQuery('');
                }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--primary-color)', 
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  textDecoration: 'underline',
                  marginTop: '0.5rem'
                }}
              >
                ← Back to search
              </button>
            </div>
          )}

          {error && (
            <div className="wallet-error" style={{ display: 'block', marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!selectedUser && !manualMode}>
              Add Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;
