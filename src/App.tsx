import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useWallet } from './hooks/useWallet';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import LandingPage from './components/LandingPage';
import ProfilePage from './components/ProfilePage';
import AccountPage from './components/AccountPage';
import EscrowsPage from './components/EscrowsPage';
import WalletModal from './components/WalletModal';
import ProfileCompletionModal from './components/ProfileCompletionModal';
import EditProfileModal from './components/EditProfileModal';
import Navigation from './components/Navigation';
import Footer from './components/Footer';

function AppContent() {
  const { walletAddress, isConnected, connect, disconnect } = useWallet();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Check profile completion - uses wallet address
  // Load profile from database first to check if it exists and is complete
  const { profileData, statistics, updateProfile, checkUsernameAvailability, isProfileComplete, loading: profileLoading } = useProfile(false);

  useEffect(() => {
    // Force dark theme on landing page
    if (!isConnected) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [isConnected]);

  // Check profile completion when wallet is connected and profile loads
  useEffect(() => {
    if (isConnected && walletAddress && !profileLoading) {
      // Check if profile exists in database (has any non-empty data)
      const profileExists = profileData && (
        profileData.name?.trim() || 
        profileData.email?.trim() || 
        profileData.username?.trim() ||
        profileData.company?.trim() ||
        profileData.location?.trim() ||
        profileData.avatarImage?.trim()
      );

      if (profileExists) {
        // Profile exists in database - check if it's complete
        const isComplete = isProfileComplete();
        if (isComplete) {
          // Profile exists and is complete - hide completion modal
          console.log('Profile complete - user can access the app');
          setShowProfileCompletion(false);
        } else {
          // Profile exists but is incomplete - show completion modal
          console.log('Profile incomplete - showing completion modal');
        setShowProfileCompletion(true);
        }
      } else {
        // Profile doesn't exist in database (all fields empty) - show completion modal for new user
        console.log('No profile found in database - showing completion modal for new user');
        setShowProfileCompletion(true);
      }
    } else if (isConnected && walletAddress && profileLoading) {
      // While loading, don't show completion modal yet
      setShowProfileCompletion(false);
    } else if (!isConnected || !walletAddress) {
      // Wallet not connected - hide completion modal
      setShowProfileCompletion(false);
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
    setShowProfileCompletion(false);
  };

  // Memoize callbacks to prevent infinite re-renders
  const handleShowProfileCompletion = useCallback(() => {
    setShowProfileCompletion(true);
  }, []);

  const handleTriggerEdit = useCallback((_openEdit: () => void) => {
    // This callback is used by ProfilePage to trigger edit modal
    // The edit modal is controlled by showEditModal state
  }, []);

  // Determine if user can access protected routes
  const canAccess = isConnected && walletAddress && !showProfileCompletion && isProfileComplete();

  return (
    <>
      <Navigation 
        walletAddress={profileData?.walletAddress || walletAddress || ''} 
        isConnected={isConnected}
        onDisconnect={handleDisconnect}
        onConnectClick={() => setShowWalletModal(true)}
        theme={theme}
        toggleTheme={toggleTheme}
        showThemeToggle={isConnected}
      />
      
      {isConnected && walletAddress ? (
        <>
          {/* Show profile completion modal if profile is incomplete - blocks access */}
          {showProfileCompletion && (
            <ProfileCompletionModal
              onComplete={() => {
                // Open edit modal after completion modal animation finishes
                setTimeout(() => {
                  setShowEditModal(true);
                }, 350);
              }}
            />
          )}
          
          {/* Show edit modal when profile is incomplete (for completion) */}
          {showEditModal && profileData && (
            <EditProfileModal
              profileData={profileData}
              statistics={statistics}
              walletAddress={profileData?.walletAddress || ''}
              onSave={async (data) => {
                await updateProfile(data);
                // After saving, check if profile is now complete
                // The useEffect will handle showing/hiding the completion modal
              }}
              onClose={() => {
                setShowEditModal(false);
              }}
              checkUsernameAvailability={checkUsernameAvailability}
            />
          )}
          
          {/* Show loading state while checking profile */}
          {profileLoading && !showProfileCompletion && (
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
          
          {/* Fallback: If loading is done but no profileData and no completion modal, show error */}
          {!profileLoading && !profileData && !showProfileCompletion && (
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
                    onShowProfileCompletion={handleShowProfileCompletion}
                    onTriggerEdit={handleTriggerEdit}
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
      <AppContent />
    </Router>
  );
}

export default App;
