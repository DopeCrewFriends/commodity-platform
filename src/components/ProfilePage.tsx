import React, { useState } from 'react';
import { ProfileData, Statistics } from '../types';
import { useBalances } from '../hooks/useBalances';
import { useEscrows } from '../hooks/useEscrows';
import { useEscrowChainActions } from '../hooks/useEscrowChainActions';
import { useWallet } from '../hooks/useWallet';
import { useTradeHistory } from '../hooks/useTradeHistory';
import { useContacts } from '../hooks/useContacts';
import { useNotifications } from '../hooks/useNotifications';
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
  profileData: ProfileData;
  statistics: Statistics;
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  profileLoading: boolean;
}

const ProfilePage: React.FC<ProfilePageProps> = ({
  walletAddress,
  onDisconnect: _onDisconnect,
  profileData,
  statistics,
  updateProfile,
  checkUsernameAvailability,
  profileLoading
}) => {
  const { balances, solPrice, loading, priceLoading } = useBalances(walletAddress);
  const { escrowsData, updateEscrows } = useEscrows(walletAddress);
  const handleEscrowAction = useEscrowChainActions(walletAddress, escrowsData, updateEscrows);
  const { chainPublicKey, signTransaction, signAndSendTransaction } = useWallet();
  const { tradeHistory, activeFilter, setActiveFilter } = useTradeHistory(walletAddress);
  const { contactRequests, outgoingRequests, acceptContactRequest, rejectContactRequest, cancelContactRequest } = useNotifications(walletAddress);
  const { refetchContacts } = useContacts();
  const [showEditModal, setShowEditModal] = useState(false);

  const handleContactRequestAction = async (requestId: string, action: 'accept' | 'reject' | 'cancel') => {
    if (action === 'accept') {
      const ok = await acceptContactRequest(requestId);
      if (ok) refetchContacts();
    } else if (action === 'reject') {
      await rejectContactRequest(requestId);
    } else if (action === 'cancel') {
      await cancelContactRequest(requestId);
    }
  };

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
          margin-bottom: 0 !important;
          align-items: flex-start !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .escrows-contacts-row .active-escrows-section {
          flex: 1 1 50% !important;
          margin-bottom: 0 !important;
          min-width: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          height: calc(100vh - 457px) !important;
          max-height: calc(100vh - 457px) !important;
        }
        .escrows-contacts-row .contacts-section {
          flex: 1 1 50% !important;
          margin-bottom: 0 !important;
          min-width: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          height: calc(100vh - 457px) !important;
          max-height: calc(100vh - 457px) !important;
        }
        .escrows-contacts-row .escrows-header-card,
        .escrows-contacts-row .contacts-header-card {
          flex: 0 0 auto !important;
          display: flex !important;
          flex-direction: column !important;
          height: calc(100vh - 457px) !important;
          max-height: calc(100vh - 457px) !important;
          overflow: hidden !important;
        }
        .main-content-layout {
          display: flex !important;
          gap: 0.75rem !important;
          align-items: stretch !important;
        }
        .main-content-left {
          flex: 1 1 auto !important;
          min-width: 0 !important;
        }
        .notifications-sidebar {
          flex: 0 0 360px !important;
          min-width: 360px !important;
          max-width: 360px !important;
        }
        .profile-balances-row .balances-section {
          flex: 0 0 280px !important;
          min-width: 280px !important;
          max-width: 280px !important;
        }
        @media (max-width: 1400px) {
          .notifications-sidebar {
            flex: 0 0 340px !important;
            min-width: 340px !important;
            max-width: 340px !important;
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
                <EscrowsSection
                  escrowsData={escrowsData}
                  updateEscrows={updateEscrows}
                  walletAddress={walletAddress}
                  chainPublicKey={chainPublicKey}
                  signTransaction={signTransaction}
                  signAndSendTransaction={signAndSendTransaction}
                  onEscrowAction={handleEscrowAction}
                />
                <ContactsSection />
              </div>
            </div>

            <div className="notifications-sidebar">
              <NotificationsPanel
                walletAddress={walletAddress}
                escrowsData={escrowsData.items}
                contactRequests={contactRequests}
                outgoingRequests={outgoingRequests}
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
