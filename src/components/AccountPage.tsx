import React, { useState } from 'react';
import { ProfileData, Statistics } from '../types';
import { useBalances } from '../hooks/useBalances';
import { useTradeHistory } from '../hooks/useTradeHistory';
import { useEscrows } from '../hooks/useEscrows';
import ProfileCard from './ProfileCard';
import BalancesSection from './BalancesSection';
import EditProfileModal from './EditProfileModal';

interface AccountPageProps {
  walletAddress: string;
  onDisconnect: () => void;
  profileData: ProfileData;
  statistics: Statistics;
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
}

const AccountPage: React.FC<AccountPageProps> = ({
  walletAddress,
  profileData,
  statistics,
  updateProfile,
  checkUsernameAvailability
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const { balances, solPrice, loading, priceLoading } = useBalances(walletAddress);
  const { tradeHistory } = useTradeHistory(walletAddress);
  const { escrowsData } = useEscrows(walletAddress);

  if (!profileData) {
    return (
      <main className="portfolio-dashboard dash-inst" id="account">
        <div className="dash-inst-container">
          <header className="dash-inst-header">
            <div>
              <p className="dash-inst-kicker">Profile</p>
              <h1 className="dash-inst-title">Account</h1>
            </div>
          </header>
          <p className="dash-inst-header__lede">Loading profile…</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="portfolio-dashboard dash-inst" id="account">
        <div className="dash-inst-container">
          <header className="dash-inst-header">
            <div>
              <p className="dash-inst-kicker">Profile</p>
              <h1 className="dash-inst-title">Account</h1>
              <p className="dash-inst-header__lede">
                Profile details and statistics for your organisation record.
              </p>
            </div>
          </header>
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
            <section className="account-funds-actions" aria-label="Deposit and withdraw">
              <p className="account-funds-actions__label">Move funds</p>
              <div className="account-funds-actions__buttons">
                <button type="button" className="btn btn-primary">
                  Deposit
                </button>
                <button type="button" className="btn btn-secondary">
                  Withdraw
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      {showEditModal && profileData && (
        <EditProfileModal
          profileData={profileData}
          statistics={statistics}
          walletAddress={walletAddress}
          onSave={async (data) => {
            await updateProfile(data);
            setShowEditModal(false);
          }}
          onClose={() => setShowEditModal(false)}
          checkUsernameAvailability={checkUsernameAvailability}
        />
      )}
    </>
  );
};

export default AccountPage;

