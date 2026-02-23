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
      <div className="portfolio-dashboard" id="account">
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '2rem' }}>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="portfolio-dashboard" id="account">
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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

