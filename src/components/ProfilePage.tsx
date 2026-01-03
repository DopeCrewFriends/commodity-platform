import React, { useState } from 'react';
import { useBalances } from '../hooks/useBalances';
import { useProfile } from '../hooks/useProfile';
import { useEscrows } from '../hooks/useEscrows';
import { useTradeHistory } from '../hooks/useTradeHistory';
import { useNotifications } from '../hooks/useNotifications';
import { EscrowsData } from '../types';
import { supabase } from '../utils/supabase';
import { loadUserData, saveUserData } from '../utils/storage';
import ProfileCard from './ProfileCard';
import TradeHistorySection from './TradeHistorySection';
import EscrowsSection from './EscrowsSection';
import ContactsSection from './ContactsSection';
import BalancesSection from './BalancesSection';
import NotificationsPanel from './NotificationsPanel';
import EditProfileModal from './EditProfileModal';

interface ProfilePageProps {
  walletAddress: string;
  onDisconnect: () => void;
  onShowProfileCompletion: () => void;
  onTriggerEdit?: (openEdit: () => void) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ 
  walletAddress, 
  onShowProfileCompletion,
  onTriggerEdit
}) => {
  // Only load balances when profile is complete (ProfilePage only shows when profile is complete)
  const { balances, solPrice, loading, priceLoading } = useBalances(walletAddress);
  const { profileData, statistics, updateProfile, checkUsernameAvailability, isProfileComplete, loading: profileLoading } = useProfile(false);
  const { escrowsData, updateEscrows } = useEscrows(walletAddress);
  const { tradeHistory, activeFilter, setActiveFilter } = useTradeHistory(walletAddress);
  const { contactRequests, outgoingRequests, acceptContactRequest, rejectContactRequest } = useNotifications(walletAddress);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEscrowAction = (escrowId: string, action: 'accept' | 'reject' | 'cancel') => {
    const escrow = escrowsData.items.find(e => e.id === escrowId);
    if (!escrow) return;

    let newStatus: string;
    if (action === 'accept') {
      newStatus = 'confirmed';
    } else if (action === 'reject') {
      newStatus = 'rejected';
    } else { // cancel
      newStatus = 'cancelled';
    }

    // Update escrow status
    const updatedEscrows = escrowsData.items.map(e => {
      if (e.id === escrowId) {
        return {
          ...e,
          status: newStatus
        };
      }
      return e;
    });

    const totalAmount = updatedEscrows
      .filter(e => e.status === 'confirmed' || e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);

    // Update current user's escrows
    updateEscrows({
      totalAmount,
      items: updatedEscrows
    });

    // Update the other user's escrows using the new storage format
    const otherPartyWallet = escrow.buyer === walletAddress ? escrow.seller : escrow.buyer;
    const otherUserEscrows = loadUserData<EscrowsData>(otherPartyWallet, 'escrows') || { totalAmount: 0, items: [] };
    const otherUserUpdatedEscrows = otherUserEscrows.items.map(e => {
      if (e.id === escrowId) {
        return {
          ...e,
          status: newStatus
        };
      }
      return e;
    });

    const otherUserTotalAmount = otherUserUpdatedEscrows
      .filter(e => {
        const status = e.status.toLowerCase();
        return status === 'pending' || status === 'confirmed' || status === 'completed';
      })
      .reduce((sum, e) => sum + e.amount, 0);

    saveUserData(otherPartyWallet, 'escrows', {
      totalAmount: otherUserTotalAmount,
      items: otherUserUpdatedEscrows
    });

    // Also update in Supabase if table exists
    try {
      supabase.from('escrows')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowId)
        .then(({ error }: { error: any }) => {
          if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
            console.warn('Error updating escrow in Supabase:', error);
          }
        });
    } catch (error) {
      // Supabase table might not exist yet
      console.log('Using localStorage for escrow updates');
    }
  };

  const handleContactRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
    if (action === 'accept') {
      await acceptContactRequest(requestId);
    } else {
      await rejectContactRequest(requestId);
    }
    // The notifications will reload automatically via the hook
  };

  React.useEffect(() => {
    if (profileData && !isProfileComplete()) {
      onShowProfileCompletion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData]); // Only depend on profileData - onShowProfileCompletion and isProfileComplete are stable

  // Expose method to open edit modal
  React.useEffect(() => {
    if (onTriggerEdit) {
      onTriggerEdit(() => setShowEditModal(true));
    }
  }, [onTriggerEdit]);

  if (profileLoading || !profileData) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <style>{`
        .profile-balances-row {
          display: flex !important;
          gap: 0.75rem !important;
          margin-bottom: 1rem !important;
          align-items: stretch !important;
        }
        .profile-balances-row .profile-section {
          flex: 0 1 75% !important;
          margin-bottom: 0 !important;
          min-width: 0 !important;
          padding: 0.875rem !important;
          padding-bottom: 0.875rem !important;
        }
        .profile-balances-row .profile-header {
          gap: 0 !important;
          margin-bottom: 0.375rem !important;
          padding-bottom: 0 !important;
        }
        .profile-balances-row .profile-stats {
          margin-top: 0.25rem !important;
          padding-top: 0.25rem !important;
        }
        .profile-balances-row .profile-avatar {
          width: 50px !important;
          height: 50px !important;
        }
        .profile-balances-row .avatar-placeholder {
          width: 50px !important;
          height: 50px !important;
          font-size: 1.5rem !important;
        }
        .profile-balances-row .profile-name {
          font-size: 1.5rem !important;
          margin-bottom: 0.375rem !important;
        }
        .profile-balances-row .profile-email {
          font-size: 0.875rem !important;
          margin-bottom: 0.5rem !important;
        }
        .profile-balances-row .profile-company {
          font-size: 0.85rem !important;
          margin-bottom: 0.375rem !important;
          gap: 0.375rem !important;
        }
        .profile-balances-row .profile-location {
          font-size: 0.85rem !important;
          margin-bottom: 0.5rem !important;
          gap: 0.375rem !important;
        }
        .profile-balances-row .profile-wallet {
          font-size: 0.8rem !important;
          gap: 0.375rem !important;
        }
        .profile-balances-row .profile-stats {
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)) !important;
          gap: 0.375rem !important;
        }
        .profile-balances-row .balances-header-card {
          padding: 1rem !important;
        }
        .escrows-contacts-row {
          display: flex !important;
          gap: 0.75rem !important;
          margin-bottom: 1rem !important;
          align-items: flex-start !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .escrows-contacts-row .active-escrows-section {
          flex: 1 1 50% !important;
          margin-bottom: 0 !important;
          min-width: 0 !important;
        }
        .escrows-contacts-row .contacts-section {
          flex: 1 1 50% !important;
          margin-bottom: 0 !important;
          min-width: 0 !important;
        }
        .main-content-layout {
          display: flex !important;
          gap: 0.75rem !important;
          align-items: flex-start !important;
        }
        .main-content-left {
          flex: 1 1 auto !important;
          min-width: 0 !important;
        }
        .notifications-sidebar {
          flex: 0 0 280px !important;
          min-width: 280px !important;
          max-width: 280px !important;
        }
        .profile-balances-row .balances-section {
          flex: 0 0 280px !important;
          min-width: 280px !important;
          max-width: 280px !important;
        }
        @media (max-width: 1400px) {
          .notifications-sidebar {
            flex: 0 0 260px !important;
            min-width: 260px !important;
            max-width: 260px !important;
          }
          .profile-balances-row .balances-section {
            flex: 0 0 260px !important;
            min-width: 260px !important;
            max-width: 260px !important;
          }
        }
        @media (max-width: 968px) {
          .main-content-layout {
            flex-direction: column !important;
          }
          .notifications-sidebar {
            flex: 1 1 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
          }
          .profile-balances-row {
            flex-direction: column !important;
          }
          .profile-balances-row .balances-section {
            min-width: 100% !important;
            max-width: 100% !important;
          }
          .escrows-contacts-row {
            flex-direction: column !important;
          }
          .escrows-contacts-row .active-escrows-section,
          .escrows-contacts-row .contacts-section {
            flex: 1 1 100% !important;
          }
        }
      `}</style>
      <main className="portfolio-dashboard" id="profile">
        <div className="container">
          <div className="main-content-layout">
            <div className="main-content-left">
              <div className="profile-balances-row">
                <ProfileCard
                  profileData={profileData}
                  statistics={statistics}
                  onEditClick={() => setShowEditModal(true)}
                  walletAddress={walletAddress}
                />
                <BalancesSection balances={balances} solPrice={solPrice} loading={loading} priceLoading={priceLoading} />
              </div>

              <TradeHistorySection
                tradeHistory={tradeHistory}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />

              <div className="escrows-contacts-row">
                <EscrowsSection escrowsData={escrowsData} updateEscrows={updateEscrows} />
                <ContactsSection />
              </div>
            </div>

            <div className="notifications-sidebar">
              <NotificationsPanel
                walletAddress={walletAddress}
                escrowsData={escrowsData.items}
                contactRequests={contactRequests}
                outgoingRequests={outgoingRequests}
                onEscrowAction={handleEscrowAction}
                onContactRequestAction={handleContactRequestAction}
              />
            </div>
          </div>
        </div>
      </main>

      {showEditModal && (
        <EditProfileModal
          profileData={profileData}
          statistics={statistics}
          walletAddress={walletAddress}
          onSave={updateProfile}
          onClose={() => setShowEditModal(false)}
          checkUsernameAvailability={checkUsernameAvailability}
        />
      )}
    </>
  );
};

export default ProfilePage;
