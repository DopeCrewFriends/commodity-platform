import { useState, useEffect } from 'react';
import { ProfileData } from '../types';
import { supabase } from '../utils/supabase';

export interface ContactRequest {
  id: string;
  from_wallet_address: string;
  to_wallet_address: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  fromProfile?: ProfileData;
  toProfile?: ProfileData;
  isOutgoing?: boolean; // true if sent by current user, false if received
}

export function useNotifications(walletAddress: string | null) {
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setContactRequests([]);
      return;
    }

    const loadContactRequests = async () => {
      setLoading(true);
      try {
        // Fetch pending contact requests sent TO the current user (incoming)
        const { data: incomingRequests, error: incomingError } = await supabase
          .from('contact_requests')
          .select('*')
          .eq('to_wallet_address', walletAddress)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        // Fetch pending contact requests sent BY the current user (outgoing)
        const { data: outgoingRequests, error: outgoingError } = await supabase
          .from('contact_requests')
          .select('*')
          .eq('from_wallet_address', walletAddress)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (incomingError || outgoingError) {
          const error = incomingError || outgoingError;
          if (error) {
            // Check if table doesn't exist (Supabase returns PGRST205 for missing tables)
            if (error.code === '42P01' || error.code === 'PGRST205' || 
                error.message?.includes('does not exist') || 
                error.message?.includes('Could not find the table')) {
              console.warn('Contact requests table not found. Please run the database migration in Supabase.');
              setContactRequests([]);
              setOutgoingRequests([]);
              return;
            }
            throw error;
          }
        }

        // Process incoming requests
        if (incomingRequests && incomingRequests.length > 0) {
          const fromWalletAddresses = incomingRequests.map(r => r.from_wallet_address);
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('wallet_address', fromWalletAddresses);

          if (profilesError) throw profilesError;

          const requestsWithProfiles: ContactRequest[] = incomingRequests.map(request => {
            const profile = profiles?.find(p => p.wallet_address === request.from_wallet_address);
            return {
              ...request,
              isOutgoing: false,
              fromProfile: profile ? {
                name: profile.name,
                email: profile.email,
                company: profile.company,
                location: profile.location,
                walletAddress: profile.wallet_address || '',
                avatarImage: profile.avatar_image,
                username: profile.username
              } : undefined
            };
          });

          setContactRequests(requestsWithProfiles);
        } else {
          setContactRequests([]);
        }

        // Process outgoing requests
        if (outgoingRequests && outgoingRequests.length > 0) {
          const toWalletAddresses = outgoingRequests.map(r => r.to_wallet_address);
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('wallet_address', toWalletAddresses);

          if (profilesError) throw profilesError;

          const requestsWithProfiles: ContactRequest[] = outgoingRequests.map(request => {
            const profile = profiles?.find(p => p.wallet_address === request.to_wallet_address);
            return {
              ...request,
              isOutgoing: true,
              toProfile: profile ? {
                name: profile.name,
                email: profile.email,
                company: profile.company,
                location: profile.location,
                walletAddress: profile.wallet_address || '',
                avatarImage: profile.avatar_image,
                username: profile.username
              } : undefined
            };
          });

          setOutgoingRequests(requestsWithProfiles);
        } else {
          setOutgoingRequests([]);
        }
      } catch (error) {
        console.error('Error loading contact requests:', error);
        setContactRequests([]);
        setOutgoingRequests([]);
      } finally {
        setLoading(false);
      }
    };

    loadContactRequests();
  }, [walletAddress]);

  const acceptContactRequest = async (requestId: string): Promise<boolean> => {
    if (!walletAddress) return false;

    try {
      // Get the request to find the sender's wallet address
      const { data: request, error: requestError } = await supabase
        .from('contact_requests')
        .select('from_wallet_address, to_wallet_address')
        .eq('id', requestId)
        .eq('to_wallet_address', walletAddress)
        .eq('status', 'pending')
        .single();

      if (requestError) {
        if (requestError.code === '42P01' || requestError.code === 'PGRST205' || 
            requestError.message?.includes('does not exist') || 
            requestError.message?.includes('Could not find the table')) {
          throw new Error('Contact requests table not found. Please run the database migration in Supabase.');
        }
        throw new Error('Contact request not found');
      }

      if (!request) {
        throw new Error('Contact request not found');
      }

      const fromWalletAddress = request.from_wallet_address;

      // Update request status to 'accepted'
      const { error: updateError } = await supabase
        .from('contact_requests')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Add bidirectional contact relationships
      // 1. Current user adds the requester as a contact
      const { error: insertContact1 } = await supabase
        .from('contacts')
        .insert({
          user_wallet_address: walletAddress,
          contact_wallet_address: fromWalletAddress
        });

      // 2. Requester adds current user as a contact
      const { error: insertContact2 } = await supabase
        .from('contacts')
        .insert({
          user_wallet_address: fromWalletAddress,
          contact_wallet_address: walletAddress
        });

      // If either insert fails, check if it's because the contact already exists
      if (insertContact1 && insertContact1.code !== '23505') {
        throw insertContact1;
      }
      if (insertContact2 && insertContact2.code !== '23505') {
        throw insertContact2;
      }

      // Reload both incoming and outgoing requests
      const { data: incomingRequests } = await supabase
        .from('contact_requests')
        .select('*')
        .eq('to_wallet_address', walletAddress)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const { data: outgoingRequests } = await supabase
        .from('contact_requests')
        .select('*')
        .eq('from_wallet_address', walletAddress)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Reload incoming requests
      if (incomingRequests && incomingRequests.length > 0) {
        const fromWalletAddresses = incomingRequests.map(r => r.from_wallet_address);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('wallet_address', fromWalletAddresses);

        if (profiles) {
          const requestsWithProfiles: ContactRequest[] = incomingRequests.map(request => {
            const profile = profiles.find(p => p.wallet_address === request.from_wallet_address);
            return {
              ...request,
              isOutgoing: false,
              fromProfile: profile ? {
                name: profile.name,
                email: profile.email,
                company: profile.company,
                location: profile.location,
                walletAddress: profile.wallet_address || '',
                avatarImage: profile.avatar_image,
                username: profile.username
              } : undefined
            };
          });
          setContactRequests(requestsWithProfiles);
        } else {
          setContactRequests([]);
        }
      } else {
        setContactRequests([]);
      }

      // Reload outgoing requests
      if (outgoingRequests && outgoingRequests.length > 0) {
        const toWalletAddresses = outgoingRequests.map(r => r.to_wallet_address);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('wallet_address', toWalletAddresses);

        if (profiles) {
          const requestsWithProfiles: ContactRequest[] = outgoingRequests.map(request => {
            const profile = profiles.find(p => p.wallet_address === request.to_wallet_address);
            return {
              ...request,
              isOutgoing: true,
              toProfile: profile ? {
                name: profile.name,
                email: profile.email,
                company: profile.company,
                location: profile.location,
                walletAddress: profile.wallet_address || '',
                avatarImage: profile.avatar_image,
                username: profile.username
              } : undefined
            };
          });
          setOutgoingRequests(requestsWithProfiles);
        } else {
          setOutgoingRequests([]);
        }
      } else {
        setOutgoingRequests([]);
      }

      return true;
    } catch (error) {
      console.error('Error accepting contact request:', error);
      return false;
    }
  };

  const rejectContactRequest = async (requestId: string): Promise<boolean> => {
    if (!walletAddress) return false;

    try {
      // Update request status to 'rejected'
      const { error: updateError } = await supabase
        .from('contact_requests')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('to_wallet_address', walletAddress)
        .eq('status', 'pending');

      if (updateError) throw updateError;

      // Reload both incoming and outgoing requests
      const { data: incomingRequests } = await supabase
        .from('contact_requests')
        .select('*')
        .eq('to_wallet_address', walletAddress)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const { data: outgoingRequests } = await supabase
        .from('contact_requests')
        .select('*')
        .eq('from_wallet_address', walletAddress)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Reload incoming requests
      if (incomingRequests && incomingRequests.length > 0) {
        const fromWalletAddresses = incomingRequests.map(r => r.from_wallet_address);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('wallet_address', fromWalletAddresses);

        if (profiles) {
          const requestsWithProfiles: ContactRequest[] = incomingRequests.map(request => {
            const profile = profiles.find(p => p.wallet_address === request.from_wallet_address);
            return {
              ...request,
              isOutgoing: false,
              fromProfile: profile ? {
                name: profile.name,
                email: profile.email,
                company: profile.company,
                location: profile.location,
                walletAddress: profile.wallet_address || '',
                avatarImage: profile.avatar_image,
                username: profile.username
              } : undefined
            };
          });
          setContactRequests(requestsWithProfiles);
        } else {
          setContactRequests([]);
        }
      } else {
        setContactRequests([]);
      }

      // Reload outgoing requests
      if (outgoingRequests && outgoingRequests.length > 0) {
        const toWalletAddresses = outgoingRequests.map(r => r.to_wallet_address);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('wallet_address', toWalletAddresses);

        if (profiles) {
          const requestsWithProfiles: ContactRequest[] = outgoingRequests.map(request => {
            const profile = profiles.find(p => p.wallet_address === request.to_wallet_address);
            return {
              ...request,
              isOutgoing: true,
              toProfile: profile ? {
                name: profile.name,
                email: profile.email,
                company: profile.company,
                location: profile.location,
                walletAddress: profile.wallet_address || '',
                avatarImage: profile.avatar_image,
                username: profile.username
              } : undefined
            };
          });
          setOutgoingRequests(requestsWithProfiles);
        } else {
          setOutgoingRequests([]);
        }
      } else {
        setOutgoingRequests([]);
      }

      return true;
    } catch (error) {
      console.error('Error rejecting contact request:', error);
      return false;
    }
  };

  return {
    contactRequests, // Incoming requests
    outgoingRequests, // Outgoing requests
    loading,
    acceptContactRequest,
    rejectContactRequest
  };
}

