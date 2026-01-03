import React, { useState } from 'react';
import { useContacts } from '../hooks/useContacts';
import { getInitials } from '../utils/storage';
import AddContactModal from './AddContactModal';

const ContactsSection: React.FC = () => {
  const { contacts, searchQuery, setSearchQuery, removeContact } = useContacts();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <div className="contacts-section">
        <div className="contacts-header-card" id="contactsHeaderCard">
          <div className="contacts-actions">
            <button 
              className="btn btn-primary add-contact-btn" 
              id="addContactBtn"
              onClick={(e) => {
                e.stopPropagation();
                setShowAddModal(true);
              }}
            >
              Add Contact
            </button>
          </div>
          <div className="contacts-header-content">
            <div className="contacts-title-section">
              <h2>Contacts</h2>
            </div>
          </div>
          
          <div className="contacts-content" id="contactsContent">
            <div className="contacts-search-container">
              <input 
                type="text" 
                className="contacts-search-input" 
                id="contactsSearchInput"
                placeholder="Search contacts by name, email, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="search-icon">🔍</span>
            </div>
            <div className="contacts-list" id="contactsList">
              {contacts.length === 0 ? (
                <div className="no-contacts-message" id="noContactsMessage" style={{ display: 'block' }}>
                  <p>No contacts yet. Add your first contact to get started!</p>
                </div>
              ) : (
                contacts.map((contact) => {
                  const initials = getInitials(contact.name || '', contact.walletAddress || contact.username || '');
                  return (
                    <div key={contact.username || contact.walletAddress} className="contact-item">
                      <div className="contact-avatar">{initials}</div>
                      <div className="contact-info">
                        <div className="contact-name">
                          {contact.name || 'Unknown'}
                          {contact.username && (
                            <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '0.5rem' }}>
                              @{contact.username}
                            </span>
                          )}
                        </div>
                        <div className="contact-email">{contact.email || 'No email'}</div>
                        {contact.company && (
                          <div style={{ fontSize: '0.85em', color: '#666', marginTop: '0.25rem' }}>
                            {contact.company}
                          </div>
                        )}
                        {contact.walletAddress && (
                        <div className="contact-wallet">{contact.walletAddress}</div>
                        )}
                      </div>
                      <div className="contact-actions">
                        <button 
                          className="contact-action-btn" 
                          onClick={async (e) => {
                            e.stopPropagation();
                            await removeContact(contact);
                          }}
                          title="Remove contact"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
};

export default ContactsSection;
