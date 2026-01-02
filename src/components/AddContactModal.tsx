import React, { useState, useEffect } from 'react';
import { useContacts } from '../hooks/useContacts';
import { ProfileData } from '../types';

interface AddContactModalProps {
  onClose: () => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ onClose }) => {
  const { addContact, searchUsers } = useContacts();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileData[]>([]);
  const [selectedUser, setSelectedUser] = useState<ProfileData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

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
        await addContact(selectedUser.username);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add contact. Please try again.');
      }
    } else {
      setError('Please search for and select a user');
    }
  };

  return (
    <div className="wallet-modal active" onClick={onClose}>
      <div className="wallet-modal-overlay"></div>
      <div className="wallet-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Add Contact</h2>
          <p>Search by username (e.g., username)</p>
        </div>
        <form onSubmit={handleSubmit}>
          {!selectedUser && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Search by username (e.g., username)..."
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cleanValue = value.startsWith('@') ? value.slice(1) : value;
                    setSearchQuery(cleanValue);
                    setSelectedUser(null);
                  }}
                  style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem' }}
                />
                {isSearching && (
                  <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                    🔍
                  </span>
                )}
              </div>
              
              {isSearching && (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                  Searching...
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div style={{ 
                  border: '1px solid rgba(0,0,0,0.1)', 
                  borderRadius: '4px', 
                  maxHeight: '300px', 
                  overflowY: 'auto',
                  marginBottom: '0.5rem'
                }}>
                  {searchResults.map((user) => (
                    <div
                      key={user.username}
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

              {!isSearching && searchQuery && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div style={{ padding: '0.5rem', fontSize: '0.9em', color: '#666' }}>
                  No users found. Try a different search.
                </div>
              )}

              {!isSearching && searchQuery.length < 2 && (
                <div style={{ padding: '0.5rem', fontSize: '0.9em', color: '#666' }}>
                  Type at least 2 characters to search.
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

          {error && (
            <div className="wallet-error" style={{ display: 'block', marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!selectedUser}>
              Add Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;
