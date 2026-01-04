import React, { useState, useEffect } from 'react';
import { useContacts } from '../hooks/useContacts';
import { ProfileData } from '../types';
import { getInitials } from '../utils/storage';

interface AddContactModalProps {
  onClose: () => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ onClose }) => {
  const { sendContactRequest, searchUsers, getTopUsers } = useContacts();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileData[]>([]);
  const [topUsers, setTopUsers] = useState<ProfileData[]>([]);
  const [selectedUser, setSelectedUser] = useState<ProfileData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingTopUsers, setLoadingTopUsers] = useState(true);
  const [error, setError] = useState('');

  // Load top users when modal opens
  useEffect(() => {
    const loadTopUsers = async () => {
      setLoadingTopUsers(true);
      try {
        const users = await getTopUsers(5);
        setTopUsers(users);
      } catch (err) {
        console.error('Error loading top users:', err);
      } finally {
        setLoadingTopUsers(false);
      }
    };

    loadTopUsers();
  }, [getTopUsers]);

  // Search users when query changes
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, searchUsers]);

  const handleSelectUser = (user: ProfileData) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedUser && selectedUser.username) {
      try {
        await sendContactRequest(selectedUser.username);
          onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send contact request. Please try again.');
      }
        } else {
      setError('Please search for and select a user');
        }
  };

  const renderUserItem = (user: ProfileData, isSelected: boolean = false) => {
    const initials = getInitials(user.name || '', user.walletAddress || user.username || '');
    
    return (
      <div
        key={user.username || user.walletAddress}
        onClick={() => !isSelected && handleSelectUser(user)}
        className={isSelected ? '' : 'contact-item'}
        style={isSelected ? {} : {
          cursor: 'pointer',
          marginBottom: '0.5rem',
          padding: '0.5rem',
          borderRadius: '2.4px',
          transition: 'background-color 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'var(--bg-light)';
      }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
      }
        }}
      >
        <div className="contact-avatar">{initials}</div>
        <div className="contact-info">
          <div className="contact-name">
            {user.name || 'Unknown'}
            {user.username && (
              <span style={{ color: 'var(--text-light)', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                @{user.username}
              </span>
            )}
          </div>
          <div className="contact-email">{user.email || 'No email'}</div>
          {user.company && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
              {user.company}
            </div>
          )}
          {user.walletAddress && (
            <div className="contact-wallet">{user.walletAddress}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="wallet-modal active" onClick={onClose}>
      <div className="wallet-modal-overlay"></div>
      <div className="wallet-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Add Contact</h2>
          <p>Search by username or browse top users</p>
        </div>
        <form onSubmit={handleSubmit}>
          {!selectedUser && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cleanValue = value.startsWith('@') ? value.slice(1) : value;
                    setSearchQuery(cleanValue);
                    setSelectedUser(null);
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '0.5rem', 
                    paddingRight: '2rem',
                    fontSize: '0.875rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '2.4px',
                    background: 'var(--bg-light)',
                    color: 'var(--text-dark)'
                  }}
                />
                {isSearching && (
                  <span style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: 'var(--text-light)' }}>
                    Searching...
                  </span>
                )}
              </div>
              
              {!isSearching && searchResults.length > 0 && (
                <div style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '2.4px', 
                  maxHeight: '300px', 
                  overflowY: 'auto',
                  marginBottom: '0.75rem',
                  padding: '0.5rem',
                  background: 'var(--bg-light)'
                }}>
                  {searchResults.map((user) => renderUserItem(user))}
                </div>
              )}

              {/* Show top users when not searching */}
              {!isSearching && searchQuery.length < 2 && (
                <div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-light)', 
                    marginBottom: '0.5rem',
                    fontWeight: '500'
                  }}>
                    Top Users
                  </div>
                  {loadingTopUsers ? (
                    <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.875rem' }}>
                      Loading top users...
                    </div>
                  ) : topUsers.length > 0 ? (
                <div style={{ 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '2.4px', 
                  maxHeight: '300px', 
                  overflowY: 'auto',
                      padding: '0.5rem',
                      background: 'var(--bg-light)'
                    }}>
                      {topUsers.map((user) => renderUserItem(user))}
                      </div>
                  ) : (
                    <div style={{ padding: '0.5rem', fontSize: '0.875rem', color: 'var(--text-light)' }}>
                      No users available yet.
                </div>
              )}
                </div>
              )}

              {!isSearching && searchQuery && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div style={{ padding: '0.5rem', fontSize: '0.875rem', color: 'var(--text-light)' }}>
                  No users found. Try a different search.
                </div>
              )}
            </div>
          )}

          {selectedUser && (
            <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: 'var(--bg-light)', borderRadius: '2.4px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                Selected User:
              </div>
              {renderUserItem(selectedUser, true)}
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
                  fontSize: '0.875rem',
                  textDecoration: 'underline',
                  marginTop: '0.5rem',
                  padding: 0
                }}
              >
                Change selection
              </button>
            </div>
          )}

          {error && (
            <div className="wallet-error" style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--error-color, #e74c3c)', padding: '0.5rem', background: 'rgba(231, 76, 60, 0.1)', borderRadius: '2.4px' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!selectedUser} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;
