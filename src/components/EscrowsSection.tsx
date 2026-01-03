import React, { useState, useEffect } from 'react';
import { EscrowsData, ProfileData } from '../types';
import { getInitials } from '../utils/storage';
import CreateEscrowModal from './CreateEscrowModal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabase';

interface EscrowsSectionProps {
  escrowsData: EscrowsData;
  updateEscrows: (data: EscrowsData) => void;
}

const EscrowsSection: React.FC<EscrowsSectionProps> = ({ escrowsData, updateEscrows }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, ProfileData>>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'ongoing' | 'waiting'>('all');
  const { walletAddress } = useAuth();

  // Filter escrows based on status and active filter
  const activeEscrows = escrowsData.items.filter(escrow => {
    const status = escrow.status.toLowerCase();
    // Always exclude cancelled and rejected
    if (status === 'cancelled' || status === 'rejected') {
      return false;
    }
    
    // Apply filter
    if (activeFilter === 'ongoing') {
      // Show confirmed and completed escrows
      return status === 'confirmed' || status === 'completed';
    } else if (activeFilter === 'waiting') {
      // Show pending escrows
      return status === 'pending';
    }
    
    // 'all' - show all active escrows
    return true;
  });

  // Fetch profiles for all buyers and sellers in active escrows
  useEffect(() => {
    const fetchProfiles = async () => {
      if (activeEscrows.length === 0) return;

      const walletAddresses = new Set<string>();
      activeEscrows.forEach(escrow => {
        walletAddresses.add(escrow.buyer);
        walletAddresses.add(escrow.seller);
      });

      if (walletAddresses.size === 0) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .in('wallet_address', Array.from(walletAddresses));

        if (error) {
          // If table doesn't exist, continue without profile data
          if (error.code === 'PGRST205' || error.code === '42P01') {
            console.log('Profiles table not found, using wallet addresses only');
            return;
          }
          throw error;
        }

        if (data) {
          const profilesMap: Record<string, ProfileData> = {};
          data.forEach(profile => {
            profilesMap[profile.wallet_address] = {
              name: profile.name,
              email: profile.email,
              company: profile.company,
              location: profile.location,
              walletAddress: profile.wallet_address || '',
              avatarImage: profile.avatar_image,
              username: profile.username
            };
          });
          setProfiles(profilesMap);
        }
      } catch (error) {
        console.error('Error fetching profiles for escrows:', error);
      }
    };

    fetchProfiles();
  }, [activeEscrows]);

  const handleCreateEscrow = () => {
    setShowCreateModal(true);
  };

  const handleSelectContact = () => {
    // Escrow is now created in the modal, just close it
    setShowCreateModal(false);
  };


  return (
    <>
      <div className="active-escrows-section">
        <div className="escrows-header-card" id="escrowsHeaderCard">
          <div className="escrows-actions">
            <button className="btn btn-primary create-escrow-btn" id="createEscrowBtn" onClick={handleCreateEscrow}>
              Create Escrow
            </button>
          </div>
        <div className="escrows-header-content">
          <div className="escrows-title-section">
            <h2>Escrows</h2>
            <div className="escrows-filters">
              <button
                className={`escrow-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All
              </button>
              <button
                className={`escrow-filter-btn ${activeFilter === 'ongoing' ? 'active' : ''}`}
                onClick={() => setActiveFilter('ongoing')}
              >
                Ongoing
              </button>
              <button
                className={`escrow-filter-btn ${activeFilter === 'waiting' ? 'active' : ''}`}
                onClick={() => setActiveFilter('waiting')}
              >
                Waiting for Confirmation
              </button>
            </div>
          </div>
        </div>
        
        <div className="active-escrows-content" id="activeEscrowsContent">
          <div className="active-escrows-list" id="activeEscrowsList">
            {activeEscrows.length === 0 ? (
              <div className="no-escrows-message" id="noEscrowsMessage" style={{ display: 'block' }}>
                <p>No active escrows</p>
              </div>
            ) : (
              activeEscrows.map((escrow, index) => {
                const buyerProfile = profiles[escrow.buyer];
                const sellerProfile = profiles[escrow.seller];
                const buyerInitials = buyerProfile 
                  ? getInitials(buyerProfile.name || '', buyerProfile.username || '')
                  : getInitials(escrow.buyer, escrow.buyer);
                const sellerInitials = sellerProfile 
                  ? getInitials(sellerProfile.name || '', sellerProfile.username || '')
                  : getInitials(escrow.seller, escrow.seller);
                
                return (
                  <div 
                    key={escrow.id || index}
                    className="active-escrow-item" 
                    data-escrow-id={escrow.id || index}
                  >
                    <div className="escrow-content-wrapper">
                      <div className="escrow-profiles">
                        <div className="profile-badge buyer">
                          <div className="profile-avatar-small">{buyerInitials}</div>
                          <div className="profile-info">
                            <div className="profile-role">Buyer</div>
                            <div className="profile-name">
                              {buyerProfile?.name || 'Unknown'}
                              {buyerProfile?.username && (
                                <span className="profile-username">@{buyerProfile.username}</span>
                              )}
                            </div>
                            {buyerProfile?.company && (
                              <div className="profile-company">{buyerProfile.company}</div>
                            )}
                          </div>
                        </div>
                        <div className="trade-arrow">↔</div>
                        <div className="profile-badge seller">
                          <div className="profile-avatar-small">{sellerInitials}</div>
                          <div className="profile-info">
                            <div className="profile-role">Seller</div>
                            <div className="profile-name">
                              {sellerProfile?.name || 'Unknown'}
                              {sellerProfile?.username && (
                                <span className="profile-username">@{sellerProfile.username}</span>
                              )}
                            </div>
                            {sellerProfile?.company && (
                              <div className="profile-company">{sellerProfile.company}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="escrow-details">
                        <h4 className="escrow-commodity">{escrow.commodity}</h4>
                        <div className="escrow-amount-container">
                          <span className="escrow-amount">
                            ${escrow.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {escrow.paymentMethod && (
                            <img 
                              src={escrow.paymentMethod === 'USDC' ? '/images/usdc.png' : '/images/usdt logo.png'} 
                              alt={escrow.paymentMethod}
                              className="escrow-payment-logo"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <p className="escrow-date">Started: {new Date(escrow.startDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className={`escrow-status-full ${escrow.status.toLowerCase().replace(' ', '-')}`}>
                      {escrow.status.toLowerCase() === 'pending' ? 'Waiting for Response' : escrow.status}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      </div>

      {showCreateModal && walletAddress && (
        <CreateEscrowModal
          onClose={() => setShowCreateModal(false)}
          onSelectContact={handleSelectContact}
          walletAddress={walletAddress}
          currentEscrowsData={escrowsData}
          updateEscrows={updateEscrows}
        />
      )}
    </>
  );
};

export default EscrowsSection;

