import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SOLPriceProvider } from './contexts/SOLPriceContext';
import { useWallet } from './hooks/useWallet';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import LandingPage from './components/LandingPage';
import WalletModal from './components/WalletModal';
import EditProfileModal from './components/EditProfileModal';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import PublicProfilePage from './components/PublicProfilePage';
import ConnectedAppRoutes from './components/ConnectedAppRoutes';

function AppContent() {
  const { walletAddress, isConnected, connect, disconnect } = useWallet();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { profileData, statistics, updateProfile, checkUsernameAvailability, isProfileComplete, loading: profileLoading } =
    useProfile(false, walletAddress);

  useEffect(() => {
    if (!isConnected || !walletAddress || profileLoading || !profileData) {
      return;
    }
    if (!isProfileComplete()) {
      setShowEditModal(true);
    } else {
      setShowEditModal(false);
    }
  }, [isConnected, walletAddress, profileLoading, profileData, isProfileComplete]);

  const handleConnectWallet = async () => {
    try {
      await connect();
      setShowWalletModal(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnect = async () => {
    await signOut();
    await disconnect();
    setShowEditModal(false);
  };

  const canAccess = isConnected && walletAddress && isProfileComplete();

  return (
    <>
      <Navigation
        walletAddress={profileData?.walletAddress || walletAddress || ''}
        isConnected={isConnected}
        onDisconnect={handleDisconnect}
        onConnectClick={() => setShowWalletModal(true)}
        theme={theme}
        toggleTheme={toggleTheme}
        showThemeToggle={true}
      />

      <Routes>
        <Route path="/u/:username" element={<PublicProfilePage />} />

        {!isConnected || !walletAddress ? (
          <>
            <Route path="/" element={<LandingPage onConnectClick={() => setShowWalletModal(true)} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route
            path="/*"
            element={
              <>
                {showEditModal && profileData && (
                  <EditProfileModal
                    profileData={profileData}
                    statistics={statistics}
                    walletAddress={profileData?.walletAddress || ''}
                    onSave={async (data) => {
                      await updateProfile(data);
                      setShowEditModal(false);
                    }}
                    onClose={() => setShowEditModal(false)}
                    checkUsernameAvailability={checkUsernameAvailability}
                  />
                )}
                <ConnectedAppRoutes
                  profileLoading={profileLoading}
                  profileData={profileData}
                  canAccess={!!canAccess}
                  showEditModal={showEditModal}
                  setShowEditModal={setShowEditModal}
                  walletAddress={walletAddress}
                  statistics={statistics}
                  updateProfile={updateProfile}
                  checkUsernameAvailability={checkUsernameAvailability}
                  onDisconnect={handleDisconnect}
                />
              </>
            }
          />
        )}
      </Routes>

      {showWalletModal && (
        <WalletModal onConnect={handleConnectWallet} onClose={() => setShowWalletModal(false)} />
      )}

      <Footer />
    </>
  );
}

function App() {
  return (
    <Router>
      <SOLPriceProvider>
        <AppContent />
      </SOLPriceProvider>
    </Router>
  );
}

export default App;
