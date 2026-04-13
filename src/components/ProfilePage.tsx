import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { isEscrowActiveForPanel, mergeTradeHistoryWithEscrows } from '../utils/escrowTradeHistory';

interface ProfilePageProps {
  walletAddress: string;
  onDisconnect: () => void;
  profileData: ProfileData;
  statistics: Statistics;
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  profileLoading: boolean;
}

type DashboardTab = 'overview' | 'messages';

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
  const { tradeHistory } = useTradeHistory(walletAddress);

  const displayTradeHistory = useMemo(
    () => mergeTradeHistoryWithEscrows(tradeHistory, escrowsData.items),
    [tradeHistory, escrowsData.items]
  );
  const {
    contactRequests,
    outgoingRequests,
    acceptContactRequest,
    rejectContactRequest,
    cancelContactRequest,
    refetchContactRequests
  } = useNotifications(walletAddress);
  const { refetchContacts } = useContacts();
  const [showEditModal, setShowEditModal] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');
  const [searchParams, setSearchParams] = useSearchParams();
  const openEscrowId = searchParams.get('open') ?? undefined;

  useEffect(() => {
    if (openEscrowId) {
      setDashboardTab('overview');
      setSearchParams({}, { replace: true });
    }
  }, [openEscrowId, setSearchParams]);

  const messagesBadgeCount = useMemo(() => {
    const w = walletAddress.trim();
    const actionableEscrows = escrowsData.items.filter(
      (e) => isEscrowActiveForPanel(e) && (e.buyer.trim() === w || e.seller.trim() === w)
    ).length;
    return actionableEscrows + contactRequests.length + outgoingRequests.length;
  }, [escrowsData.items, walletAddress, contactRequests.length, outgoingRequests.length]);

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
      <main className="portfolio-dashboard dash-inst" id="profile">
        <div className="dash-inst-container">
          <header className="dash-inst-header">
            <div>
              <p className="dash-inst-kicker">Home</p>
              <h1 className="dash-inst-title">Dashboard</h1>
            </div>
            <div className="dash-inst-tabs" role="tablist" aria-label="Dashboard sections">
              <button
                type="button"
                role="tab"
                aria-selected={dashboardTab === 'overview'}
                onClick={() => setDashboardTab('overview')}
              >
                Overview
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={dashboardTab === 'messages'}
                onClick={() => setDashboardTab('messages')}
              >
                Messages
                {messagesBadgeCount > 0 ? (
                  <span className="dash-inst-tab-badge">{messagesBadgeCount > 99 ? '99+' : messagesBadgeCount}</span>
                ) : null}
              </button>
            </div>
          </header>

          {dashboardTab === 'overview' && (
            <div className="dash-inst-stack">
              <div className="dash-inst-row dash-inst-row--account">
                <ProfileCard
                  profileData={profileData}
                  statistics={statistics}
                  onEditClick={() => setShowEditModal(true)}
                  walletAddress={walletAddress}
                  tradeHistory={tradeHistory}
                  escrows={escrowsData.items}
                />
                <BalancesSection balances={balances} solPrice={solPrice} loading={loading} priceLoading={priceLoading} />
              </div>

              <section className="dash-inst-section" aria-labelledby="dash-escrows-heading">
                <h2 id="dash-escrows-heading" className="visually-hidden">
                  Active escrows
                </h2>
                <EscrowsSection
                  escrowsData={escrowsData}
                  updateEscrows={updateEscrows}
                  walletAddress={walletAddress}
                  chainPublicKey={chainPublicKey}
                  signTransaction={signTransaction}
                  signAndSendTransaction={signAndSendTransaction}
                  onEscrowAction={handleEscrowAction}
                  openEscrowId={openEscrowId}
                />
              </section>

              <div className="dash-inst-grid2">
                <ContactsSection onContactRequestSent={refetchContactRequests} />
                <TradeHistorySection tradeHistory={displayTradeHistory} walletAddress={walletAddress} />
              </div>
            </div>
          )}

          {dashboardTab === 'messages' && (
            <section className="dash-inst-section dash-inst-section--messages" aria-labelledby="dash-messages-heading">
              <h2 id="dash-messages-heading" className="visually-hidden">
                Messages and notifications
              </h2>
              <NotificationsPanel
                walletAddress={walletAddress}
                escrowsData={escrowsData.items}
                contactRequests={contactRequests}
                outgoingRequests={outgoingRequests}
                onContactRequestAction={handleContactRequestAction}
              />
            </section>
          )}
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
