import { useState, useEffect } from 'react';
import { Contact } from '../types';
import { loadUserData, saveUserData } from '../utils/storage';
import { apiRequest, checkApiHealth } from '../utils/api';

export function useContacts(walletAddress: string | null) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check API availability on mount
  useEffect(() => {
    checkApiHealth().then(setIsOnline);
  }, []);

  // Load contacts from API or localStorage
  useEffect(() => {
    if (!walletAddress) {
      setContacts([]);
      return;
    }

    const loadContacts = async () => {
      setLoading(true);
      try {
        if (isOnline) {
          // Try to load from API
          try {
            const data = await apiRequest<{ contacts: Contact[] }>(
              `/api/contacts?user_wallet=${encodeURIComponent(walletAddress)}`
            );
            setContacts(data.contacts || []);
            // Sync to localStorage as backup
            saveUserData(walletAddress, 'contacts', data.contacts || []);
          } catch (error) {
            console.error('Failed to load contacts from API, using localStorage:', error);
            // Fallback to localStorage
            const savedContacts = loadUserData<Contact[]>(walletAddress, 'contacts') || [];
            setContacts(savedContacts);
          }
        } else {
          // Use localStorage only
          const savedContacts = loadUserData<Contact[]>(walletAddress, 'contacts') || [];
          setContacts(savedContacts);
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
        // Fallback to localStorage
        const savedContacts = loadUserData<Contact[]>(walletAddress, 'contacts') || [];
        setContacts(savedContacts);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [walletAddress, isOnline]);

  const addContact = async (contact: Contact): Promise<boolean> => {
    if (!walletAddress) return false;
    
    // Check for duplicates
    const exists = contacts.some(
      c => c.walletAddress === contact.walletAddress || c.email === contact.email
    );
    
    if (exists) return false;

    const newContact: Contact = {
      ...contact,
      id: contact.id || Date.now().toString()
    };

    try {
      if (isOnline) {
        // Try to save to API
        try {
          await apiRequest<{ success: boolean; contact: Contact }>('/api/contacts', {
            method: 'POST',
            body: JSON.stringify({
              userWallet: walletAddress,
              contact: newContact
            }),
          });
        } catch (error) {
          console.error('Failed to save contact to API:', error);
          // Continue to save locally even if API fails
        }
      }

      // Always save to localStorage as backup
      const updated = [...contacts, newContact];
      setContacts(updated);
      saveUserData(walletAddress, 'contacts', updated);
      return true;
    } catch (error) {
      console.error('Error adding contact:', error);
      return false;
    }
  };

  const removeContact = async (contactWalletAddress: string): Promise<void> => {
    if (!walletAddress) return;
    
    try {
      if (isOnline) {
        // Try to delete from API
        try {
          await apiRequest<{ success: boolean }>(
            `/api/contacts/${encodeURIComponent(contactWalletAddress)}?user_wallet=${encodeURIComponent(walletAddress)}`,
            { method: 'DELETE' }
          );
        } catch (error) {
          console.error('Failed to delete contact from API:', error);
          // Continue to delete locally even if API fails
        }
      }

      // Always update localStorage
      const updated = contacts.filter(c => c.walletAddress !== contactWalletAddress);
      setContacts(updated);
      saveUserData(walletAddress, 'contacts', updated);
    } catch (error) {
      console.error('Error removing contact:', error);
    }
  };

  const filteredContacts = searchQuery.trim() === ''
    ? contacts
    : contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.walletAddress.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return {
    contacts: filteredContacts,
    totalContacts: contacts.length,
    searchQuery,
    setSearchQuery,
    addContact,
    removeContact,
    loading,
    isOnline
  };
}
