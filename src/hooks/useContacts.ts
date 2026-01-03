import { useState, useEffect, useCallback } from 'react';
import { ProfileData } from '../types';
import { supabase } from '../utils/supabase';
import { useAuth } from './useAuth';

export function useContacts() {
  const { walletAddress } = useAuth();
  const [contacts, setContacts] = useState<ProfileData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Load contacts from Supabase using wallet_address
  useEffect(() => {
    if (!walletAddress) {
      setContacts([]);
      return;
    }

    const loadContacts = async () => {
      setLoading(true);
      try {
        // Get contact wallet addresses for current user
        const { data: contactRelations, error: contactsError } = await supabase
          .from('contacts')
          .select('contact_wallet_address')
          .eq('user_wallet_address', walletAddress);

        if (contactsError) throw contactsError;

        if (!contactRelations || contactRelations.length === 0) {
          setContacts([]);
          return;
        }

        // Get profiles for all contacts
        const contactWalletAddresses = contactRelations.map(c => c.contact_wallet_address);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('wallet_address', contactWalletAddresses);

        if (profilesError) throw profilesError;

        // Map to ProfileData format
        const mappedContacts: ProfileData[] = (profiles || []).map(profile => ({
          name: profile.name,
          email: profile.email,
          company: profile.company,
          location: profile.location,
          walletAddress: profile.wallet_address || '',
          avatarImage: profile.avatar_image,
          username: profile.username
        }));

        setContacts(mappedContacts);
      } catch (error) {
        console.error('Error loading contacts:', error);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [walletAddress]);

  const sendContactRequest = async (contactUsername: string): Promise<boolean> => {
    if (!walletAddress) return false;
    
    try {
      // Find contact by username
      const { data: contactProfile, error: searchError } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('username', contactUsername.toLowerCase().trim())
        .single();

      if (searchError || !contactProfile) {
        throw new Error('User not found');
      }

      if (contactProfile.wallet_address === walletAddress) {
        throw new Error('Cannot send a contact request to yourself');
      }

      // Check if contact already exists
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_wallet_address', walletAddress)
        .eq('contact_wallet_address', contactProfile.wallet_address)
        .maybeSingle();

      if (existingContact) {
        throw new Error('Contact already exists');
      }

      // Check if there's already a pending request (either sent or received)
      const { data: sentRequest } = await supabase
        .from('contact_requests')
        .select('id, status')
        .eq('from_wallet_address', walletAddress)
        .eq('to_wallet_address', contactProfile.wallet_address)
        .maybeSingle();

      const { data: receivedRequest } = await supabase
        .from('contact_requests')
        .select('id, status')
        .eq('from_wallet_address', contactProfile.wallet_address)
        .eq('to_wallet_address', walletAddress)
        .maybeSingle();

      const existingRequest = sentRequest || receivedRequest;

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          throw new Error('A contact request already exists');
        } else if (existingRequest.status === 'accepted') {
          throw new Error('Contact already exists');
        }
      }

      // Send contact request
      const { error: insertError } = await supabase
        .from('contact_requests')
        .insert({
          from_wallet_address: walletAddress,
          to_wallet_address: contactProfile.wallet_address,
          status: 'pending'
        });

      if (insertError) {
        // Check if it's a unique constraint violation (request already exists)
        if (insertError.code === '23505') {
          throw new Error('A contact request already exists');
        }
        // Check if table doesn't exist (Supabase returns PGRST205 for missing tables)
        if (insertError.code === '42P01' || insertError.code === 'PGRST205' || 
            insertError.message?.includes('does not exist') || 
            insertError.message?.includes('Could not find the table')) {
          throw new Error('Contact requests table not found. Please run the database migration in Supabase.');
        }
        console.error('Insert error details:', insertError);
        throw new Error(insertError.message || 'Failed to send contact request');
      }

      return true;
    } catch (error: any) {
      console.error('Error sending contact request:', error);
      throw error;
    }
  };

  // Keep addContact for backward compatibility, but it now sends a request
  const addContact = sendContactRequest;

  const removeContact = async (contact: ProfileData): Promise<void> => {
    if (!walletAddress) return;
    
    try {
      const contactWalletAddress = contact.walletAddress;
      
      if (!contactWalletAddress) {
        throw new Error('Contact wallet address not found');
      }

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('user_wallet_address', walletAddress)
        .eq('contact_wallet_address', contactWalletAddress);

      if (error) throw error;

      // Reload contacts
      const { data: contactRelations } = await supabase
        .from('contacts')
        .select('contact_wallet_address')
        .eq('user_wallet_address', walletAddress);

      if (contactRelations && contactRelations.length > 0) {
        const contactWalletAddresses = contactRelations.map(c => c.contact_wallet_address);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('wallet_address', contactWalletAddresses);

        if (profiles) {
          const mappedContacts: ProfileData[] = profiles.map(profile => ({
            name: profile.name,
            email: profile.email,
            company: profile.company,
            location: profile.location,
            walletAddress: profile.wallet_address || '',
            avatarImage: profile.avatar_image,
            username: profile.username
          }));
          setContacts(mappedContacts);
        } else {
          setContacts([]);
        }
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error('Error removing contact:', error);
      throw error;
    }
  };

  const searchUsers = useCallback(async (query: string): Promise<ProfileData[]> => {
    if (!walletAddress || !query || query.trim().length < 2) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${query.trim()}%`)
        .neq('wallet_address', walletAddress)
        .limit(50);

      if (error) throw error;

      return (data || []).map(profile => ({
        name: profile.name,
        email: profile.email,
        company: profile.company,
        location: profile.location,
        walletAddress: profile.wallet_address || '',
        avatarImage: profile.avatar_image,
        username: profile.username
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }, [walletAddress]);

  const getTopUsers = useCallback(async (limit: number = 5): Promise<ProfileData[]> => {
    if (!walletAddress) {
      return [];
    }

    try {
      // Get top users by most recent (for now, since we don't have a rating system)
      // In the future, this could be sorted by rating, number of contacts, etc.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(profile => ({
        name: profile.name,
        email: profile.email,
        company: profile.company,
        location: profile.location,
        walletAddress: profile.wallet_address || '',
        avatarImage: profile.avatar_image,
        username: profile.username
      }));
    } catch (error) {
      console.error('Error fetching top users:', error);
      return [];
    }
  }, [walletAddress]);

  const filteredContacts = searchQuery.trim() === ''
    ? contacts
    : contacts.filter(contact =>
        contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.walletAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return {
    contacts: filteredContacts,
    totalContacts: contacts.length,
    searchQuery,
    setSearchQuery,
    addContact,
    sendContactRequest,
    removeContact,
    searchUsers,
    getTopUsers,
    loading
  };
}
