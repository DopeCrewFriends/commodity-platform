import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SOLPriceProvider } from './contexts/SOLPriceContext';
import { useWallet } from './hooks/useWallet';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import LandingPage from './components/LandingPage';
import ProfilePage from './components/ProfilePage';
import AccountPage from './components/AccountPage';
import EscrowsPage from './components/EscrowsPage';
import WalletModal from './components/WalletModal';
import EditProfileModal from './components/EditProfileModal';
import Navigation from './components/Navigation';
import Footer from './components/Footer';

function AppContent() {
  const { walletAddress, isConnected, connect, disconnect } = useWallet();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Use same wallet as rest of app so profile loads right after connect (single source of truth)
  const { profileData, statistics, updateProfile, checkUsernameAvailability, isProfileComplete, loading: profileLoading } = useProfile(false, walletAddress);

  // When profile is incomplete, open the edit profile modal directly
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
      // Profile completion check will be handled by ProfilePage based on API data
      // We'll show completion modal if profile is incomplete
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnect = async () => {
    await signOut();
    await disconnect();
    setShowEditModal(false);
  };

  // Determine if user can access protected routes
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
      
      {isConnected && walletAddress ? (
        <>
          {/* Show edit profile modal when profile is incomplete - take user straight to edit */}
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

          {/* When profile incomplete and modal closed, show prompt to complete */}
          {!profileLoading && profileData && !isProfileComplete() && !showEditModal && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '50vh',
              gap: '1rem',
              padding: '1rem'
            }}>
              <p style={{ fontSize: '1.2rem' }}>Complete your profile to continue.</p>
              <button className="btn btn-primary" onClick={() => setShowEditModal(true)}>
                Complete Profile
              </button>
            </div>
          )}
          
          {/* Show loading state while checking profile */}
          {profileLoading && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: '50vh',
              fontSize: '1.2rem'
            }}>
              Loading profile...
            </div>
          )}
          
          {/* Fallback: If loading is done but no profileData, show error */}
          {!profileLoading && !profileData && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: '50vh',
              fontSize: '1.2rem',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <p>Unable to load profile. Please refresh the page.</p>
              <button onClick={() => window.location.reload()} className="btn btn-primary">
                Refresh Page
              </button>
            </div>
          )}

          {/* Routes - only accessible if profile is complete */}
          {canAccess && (
            <Routes>
              <Route 
                path="/dashboard" 
                element={
                  <ProfilePage 
                    walletAddress={profileData?.walletAddress || ''}
                    onDisconnect={handleDisconnect}
                    profileData={profileData!}
                    statistics={statistics}
                    updateProfile={updateProfile}
                    checkUsernameAvailability={checkUsernameAvailability}
                    profileLoading={profileLoading}
                  />
                } 
              />
              <Route 
                path="/escrows" 
                element={
                  <EscrowsPage 
                    walletAddress={profileData?.walletAddress || ''}
                  />
                } 
              />
              <Route 
                path="/account" 
                element={
                  <AccountPage 
                    walletAddress={profileData?.walletAddress || ''}
                    onDisconnect={handleDisconnect}
                    profileData={profileData!}
                    statistics={statistics}
                    updateProfile={updateProfile}
                    checkUsernameAvailability={checkUsernameAvailability}
                  />
                } 
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          )}
        </>
      ) : (
        <Routes>
          <Route path="/" element={<LandingPage onConnectClick={() => setShowWalletModal(true)} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
      
      {showWalletModal && (
        <WalletModal
          onConnect={handleConnectWallet}
          onClose={() => setShowWalletModal(false)}
        />
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
