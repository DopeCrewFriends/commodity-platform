import React, { useState } from 'react';
import { useContacts } from '../hooks/useContacts';
import { Contact } from '../types';
import { getInitials } from '../utils/storage';

interface CreateEscrowModalProps {
  walletAddress: string;
  onClose: () => void;
  onSelectContact: (contact: Contact) => void;
}

const CreateEscrowModal: React.FC<CreateEscrowModalProps> = ({ 
  walletAddress, 
  onClose, 
  onSelectContact 
}) => {
  const { contacts, searchQuery, setSearchQuery } = useContacts(walletAddress);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleConfirm = () => {
    if (selectedContact) {
      onSelectContact(selectedContact);
      onClose();
    }
  };

  const filteredContacts = searchQuery.trim() === ''
    ? contacts
    : contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.walletAddress.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <div className="wallet-modal active" onClick={onClose}>
      <div className="wallet-modal-overlay"></div>
      <div className="wallet-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="wallet-modal-header">
          <h2>Create Escrow</h2>
          <p>Choose a contact to create an escrow with</p>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div className="contacts-search-container" style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              className="contacts-search-input"
              placeholder="Search contacts by name, email, or wallet address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
            <span className="search-icon">🔍</span>
          </div>

          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '4px',
            padding: '0.5rem'
          }}>
            {filteredContacts.length === 0 ? (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: '#666' 
              }}>
                {contacts.length === 0 
                  ? 'No contacts yet. Add a contact first to create an escrow.'
                  : 'No contacts match your search.'
                }
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const initials = getInitials(contact.name, contact.walletAddress);
                const isSelected = selectedContact?.walletAddress === contact.walletAddress;

                return (
                  <div
                    key={contact.walletAddress}
                    onClick={() => handleSelectContact(contact)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '1rem',
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                      border: isSelected ? '2px solid var(--primary-color)' : '1px solid rgba(0,0,0,0.1)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div 
                      className="contact-avatar" 
                      style={{ 
                        marginRight: '1rem',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-light)',
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        marginBottom: '0.25rem',
                        fontSize: '1rem'
                      }}>
                        {contact.name}
                      </div>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#666',
                        marginBottom: '0.25rem'
                      }}>
                        {contact.email}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#999',
                        fontFamily: 'monospace'
                      }}>
                        {contact.walletAddress.slice(0, 8)}...{contact.walletAddress.slice(-8)}
                      </div>
                      {contact.company && (
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: '#666',
                          marginTop: '0.25rem'
                        }}>
                          {contact.company}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div style={{ 
                        marginLeft: '1rem',
                        color: 'var(--primary-color)',
                        fontSize: '1.5rem'
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {selectedContact && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'rgba(37, 99, 235, 0.05)', 
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Selected: {selectedContact.name}
            </div>
            <div style={{ fontSize: '0.9em', color: '#666' }}>
              {selectedContact.email}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleConfirm}
            disabled={!selectedContact}
            style={{ opacity: selectedContact ? 1 : 0.5, cursor: selectedContact ? 'pointer' : 'not-allowed' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateEscrowModal;


