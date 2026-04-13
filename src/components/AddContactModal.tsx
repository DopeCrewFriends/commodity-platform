import React, { useState, useEffect } from 'react';
import { useContacts } from '../hooks/useContacts';
import { useContactProfileHover } from '../hooks/useContactProfileHover';
import { ProfileData } from '../types';
import { getInitials } from '../utils/storage';

interface AddContactModalProps {
  onClose: () => void;
  /** Refetch notifications in the parent (same `useNotifications` instance as the bell panel). */
  onContactRequestSent?: () => void;
}

function truncateWallet(addr: string): string {
  const t = addr.trim();
  if (t.length <= 16) return t || '—';
  return `${t.slice(0, 8)}...${t.slice(-8)}`;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ onClose, onContactRequestSent }) => {
  const { sendContactRequest, searchUsers, getTopUsers } = useContacts();
  const profileHover = useContactProfileHover();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileData[]>([]);
  const [topUsers, setTopUsers] = useState<ProfileData[]>([]);
  const [selectedUser, setSelectedUser] = useState<ProfileData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingTopUsers, setLoadingTopUsers] = useState(true);
  const [error, setError] = useState('');

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
        onContactRequestSent?.();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send contact request. Please try again.');
      }
    } else {
      setError('Please search for and select a user');
    }
  };

  const renderUserRow = (user: ProfileData) => {
    const initials = getInitials(user.name || '', user.walletAddress || user.username || '');
    const wa = (user.walletAddress || '').trim();

    return (
      <div
        key={user.username || user.walletAddress || user.email}
        role="button"
        tabIndex={0}
        onClick={() => handleSelectUser(user)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelectUser(user);
          }
        }}
        className="cem-contact-row"
        onMouseEnter={(e) => profileHover.onRowMouseEnter(e, user)}
        onMouseLeave={profileHover.onRowMouseLeave}
        onFocus={(e) => profileHover.onRowFocus(e, user)}
        onBlur={profileHover.onRowBlur}
      >
        <div className="cem-contact-avatar contact-avatar">{initials}</div>
        <div className="cem-contact-body">
          <div className="cem-contact-name">
            {user.name || 'Unknown'}
            {user.username ? <span className="cem-username">@{user.username}</span> : null}
          </div>
          <div className="cem-contact-email">{user.email || 'No email'}</div>
          {wa ? <div className="cem-contact-wallet">{truncateWallet(wa)}</div> : null}
          {user.company ? <div className="cem-contact-company">{user.company}</div> : null}
        </div>
      </div>
    );
  };

  return (
    <div className="wallet-modal active" onClick={onClose}>
      <div className="wallet-modal-overlay" />
      {profileHover.hoverLayer}
      <div className="wallet-modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Add Contact</h2>
          <p className="modal-header-subtitle">Search by username or pick a suggested contact</p>
        </div>

        <form onSubmit={handleSubmit}>
          {!selectedUser ? (
            <div className="cem-stack">
              <div className="contacts-search-container" style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="contacts-search-input"
                  placeholder="Search by username…"
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cleanValue = value.startsWith('@') ? value.slice(1) : value;
                    setSearchQuery(cleanValue);
                    setSelectedUser(null);
                  }}
                />
              </div>

              {searchQuery.trim().length >= 2 ? (
                <>
                  <p className="cem-list-heading">Search results</p>
                  <div className="cem-scroll-list">
                    {isSearching ? (
                      <div className="cem-empty">Searching…</div>
                    ) : searchResults.length === 0 ? (
                      <div className="cem-empty">No users found. Try a different search.</div>
                    ) : (
                      searchResults.map((user) => renderUserRow(user))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="cem-list-heading">Suggested contacts</p>
                  <div className="cem-scroll-list">
                    {loadingTopUsers ? (
                      <div className="cem-empty">Loading suggestions…</div>
                    ) : topUsers.length === 0 ? (
                      <div className="cem-empty">No users available yet.</div>
                    ) : (
                      topUsers.map((user) => renderUserRow(user))
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="cem-selected-banner">
              <strong>
                Selected: {selectedUser.name || 'Unknown'}
                {selectedUser.username ? (
                  <span className="cem-username"> @{selectedUser.username}</span>
                ) : null}
              </strong>
              <div className="cem-muted">{selectedUser.email || 'No email'}</div>
              <button
                type="button"
                className="cem-change-selection"
                onClick={() => {
                  setSelectedUser(null);
                  setSearchQuery('');
                }}
              >
                Change selection
              </button>
            </div>
          )}

          {error ? <div className="cem-form-error">{error}</div> : null}

          <div className="cem-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!selectedUser}>
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;
