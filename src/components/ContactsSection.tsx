import React, { useState } from 'react';
import { useContacts } from '../hooks/useContacts';
import { getInitials } from '../utils/storage';
import AddContactModal from './AddContactModal';

interface ContactsSectionProps {
  walletAddress: string;
}

const ContactsSection: React.FC<ContactsSectionProps> = ({ walletAddress }) => {
  const { contacts, totalContacts, searchQuery, setSearchQuery, removeContact } = useContacts(walletAddress);
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
              <span>➕</span>
              Add Contact
            </button>
          </div>
          <div className="contacts-header-content">
            <div className="contacts-title-section">
              <h2>Contacts</h2>
              <div className="contacts-count">
                <span className="count-label">Total Contacts</span>
                <span className="count-number" id="contactsCount">{totalContacts}</span>
              </div>
            </div>
          </div>
          
          <div className="contacts-content" id="contactsContent">
            <div className="contacts-search-container">
              <input 
                type="text" 
                className="contacts-search-input" 
                id="contactsSearchInput"
                placeholder="Search contacts by name, email, or wallet address..."
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
                  const initials = getInitials(contact.name, contact.walletAddress);
                  return (
                    <div key={contact.walletAddress} className="contact-item">
                      <div className="contact-avatar">{initials}</div>
                      <div className="contact-info">
                        <div className="contact-name">{contact.name}</div>
                        <div className="contact-email">{contact.email}</div>
                        <div className="contact-wallet">{contact.walletAddress}</div>
                      </div>
                      <div className="contact-actions">
                        <button 
                          className="contact-action-btn" 
                          onClick={async (e) => {
                            e.stopPropagation();
                            await removeContact(contact.walletAddress);
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
          walletAddress={walletAddress}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
};

export default ContactsSection;
