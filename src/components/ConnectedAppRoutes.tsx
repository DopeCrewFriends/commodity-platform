import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ProfileData, Statistics } from '../types';
import ProfilePage from './ProfilePage';
import AccountPage from './AccountPage';
import MarketplacePage from './MarketplacePage';

/** Old `/escrows` URLs land on the dashboard. */
function EscrowsToDashboardRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/dashboard', search }} replace />;
}

interface ConnectedAppRoutesProps {
  profileLoading: boolean;
  profileData: ProfileData | null;
  canAccess: boolean;
  showEditModal: boolean;
  setShowEditModal: (v: boolean) => void;
  walletAddress: string;
  statistics: Statistics;
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  onDisconnect: () => void;
}

/**
 * Nested under top-level `/*` when wallet is connected.
 * Handles loading / incomplete-profile gates, then dashboard routes.
 */
const ConnectedAppRoutes: React.FC<ConnectedAppRoutesProps> = ({
  profileLoading,
  profileData,
  canAccess,
  showEditModal,
  setShowEditModal,
  walletAddress,
  statistics,
  updateProfile,
  checkUsernameAvailability,
  onDisconnect,
}) => {
  if (profileLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          fontSize: '1.2rem',
        }}
      >
        Loading profile...
      </div>
    );
  }

  if (!profileData) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          fontSize: '1.2rem',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <p>Unable to load profile. Please refresh the page.</p>
        <button type="button" onClick={() => window.location.reload()} className="btn btn-primary">
          Refresh Page
        </button>
      </div>
    );
  }

  if (!canAccess) {
    if (!showEditModal) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            gap: '1rem',
            padding: '1rem',
          }}
        >
          <p style={{ fontSize: '1.2rem' }}>Complete your profile to continue.</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowEditModal(true)}>
            Complete Profile
          </button>
        </div>
      );
    }
    return <div style={{ minHeight: '40vh' }} aria-hidden />;
  }

  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <ProfilePage
            walletAddress={profileData.walletAddress || walletAddress}
            onDisconnect={onDisconnect}
            profileData={profileData}
            statistics={statistics}
            updateProfile={updateProfile}
            checkUsernameAvailability={checkUsernameAvailability}
            profileLoading={profileLoading}
          />
        }
      />
      <Route path="/escrows" element={<EscrowsToDashboardRedirect />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route
        path="/account"
        element={
          <AccountPage
            walletAddress={profileData.walletAddress || walletAddress}
            onDisconnect={onDisconnect}
            profileData={profileData}
            statistics={statistics}
            updateProfile={updateProfile}
            checkUsernameAvailability={checkUsernameAvailability}
          />
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default ConnectedAppRoutes;
