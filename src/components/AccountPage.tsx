import React, { useState } from 'react';
import { ProfileData, Statistics } from '../types';
import ProfileCard from './ProfileCard';
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

  if (!profileData) {
    return (
      <div className="portfolio-dashboard dash-inst" id="account">
        <div className="dash-inst-container">
          <p className="dash-inst-kicker" style={{ marginTop: '1rem' }}>
            Account
          </p>
          <p>Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="portfolio-dashboard dash-inst" id="account">
        <div className="dash-inst-container">
          <header className="page-rail-header page-rail-header--flush">
            <h1>Account</h1>
            <p>Profile details and statistics for your organisation record.</p>
          </header>
          <div style={{ maxWidth: '800px' }}>
            <ProfileCard
              profileData={profileData}
              statistics={statistics}
              onEditClick={() => setShowEditModal(true)}
              walletAddress={walletAddress}
            />
          </div>
        </div>
      </div>

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

