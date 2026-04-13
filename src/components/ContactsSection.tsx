import React, { useState } from 'react';
import { useContacts } from '../hooks/useContacts';
import { getInitials } from '../utils/storage';
import { Link } from 'react-router-dom';
import AddContactModal from './AddContactModal';
import { profilePath } from '../utils/profilePaths';

interface ContactsSectionProps {
  onContactRequestSent?: () => void;
}

const ContactsSection: React.FC<ContactsSectionProps> = ({ onContactRequestSent }) => {
  const { contacts, searchQuery, setSearchQuery, removeContact } = useContacts();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <div className="contacts-section">
        <div className="contacts-header-card" id="contactsHeaderCard">
          <div className="contacts-header-content">
            <div className="contacts-title-section">
              <h2>Contacts</h2>
            </div>
            <div className="contacts-search-container">
              <input 
                type="text" 
                className="contacts-search-input" 
                id="contactsSearchInput"
                placeholder="Search contacts"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
          </div>
          
          <div className="contacts-content" id="contactsContent">
            <div className="contacts-list" id="contactsList">
              {contacts.length === 0 ? (
                <div className="no-contacts-message" id="noContactsMessage" style={{ display: 'block' }}>
                  <p>No contacts yet. Add your first contact to get started!</p>
                </div>
              ) : (
                contacts.map((contact) => {
                  const initials = getInitials(contact.name || '', contact.walletAddress || contact.username || '');
                  const displayName = contact.name || 'Unknown';
                  const profileUrl = contact.username?.trim() ? profilePath(contact.username) : null;
                  return (
                    <article
                      key={contact.username || contact.walletAddress}
                      className={`contact-card${profileUrl ? ' contact-card--clickable' : ''}`}
                      {...(profileUrl ? { 'data-tooltip': 'View profile' } : {})}
                    >
                      <div className="contact-card__accent" aria-hidden />
                      {profileUrl && (
                        <Link
                          to={profileUrl}
                          className="contact-card__hit-area"
                          aria-label={`View ${displayName}'s profile`}
                        />
                      )}
                      <div className="contact-card__inner">
                        <div className="contact-card__main">
                          <div className="contact-card__avatar">{initials}</div>
                          <div className="contact-card__identity">
                            <span className="contact-card__name">{displayName}</span>
                            {contact.username && (
                              <span className="contact-card__username">@{contact.username}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="contact-card__remove"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              await removeContact(contact);
                            }}
                            title="Remove contact"
                            aria-label="Remove contact"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="contact-card__meta">
                          <span className="contact-card__email">{contact.email || 'No email'}</span>
                          {contact.company && (
                            <span className="contact-card__company">{contact.company}</span>
                          )}
                        </div>
                        {contact.walletAddress && (
                          <div className="contact-card__wallet">{contact.walletAddress}</div>
                        )}
                      </div>
                    </article>
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
          onContactRequestSent={onContactRequestSent}
        />
      )}
    </>
  );
};

export default ContactsSection;
