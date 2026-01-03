import React from 'react';
import { useProfile } from '../hooks/useProfile';
import ProfileCard from './ProfileCard';
import EditProfileModal from './EditProfileModal';
import { useState } from 'react';

interface AccountPageProps {
  walletAddress: string;
  onDisconnect: () => void;
}

const AccountPage: React.FC<AccountPageProps> = ({ walletAddress }) => {
  const { profileData, statistics, updateProfile, checkUsernameAvailability } = useProfile(false);
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

