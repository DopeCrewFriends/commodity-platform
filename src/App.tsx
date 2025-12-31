import { useState, useEffect } from 'react';
import { useWallet } from './hooks/useWallet';
import { useTheme } from './hooks/useTheme';
import { useProfile } from './hooks/useProfile';
import LandingPage from './components/LandingPage';
import ProfilePage from './components/ProfilePage';
import WalletModal from './components/WalletModal';
import ProfileCompletionModal from './components/ProfileCompletionModal';
import EditProfileModal from './components/EditProfileModal';
import Navigation from './components/Navigation';

function App() {
  const { walletAddress, isConnected, connect, disconnect } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [openEditProfile, setOpenEditProfile] = useState<(() => void) | null>(null);
  
  // Check profile completion when wallet is connected
  const { profileData, statistics, updateProfile, checkUsernameAvailability, isProfileComplete, loading: profileLoading } = useProfile(walletAddress || '');

  useEffect(() => {
    // Force dark theme on landing page
    if (!isConnected) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [isConnected]);

  // Check profile completion when profile loads or updates
  useEffect(() => {
    if (isConnected && walletAddress && !profileLoading) {
      if (!isProfileComplete) {
        setShowProfileCompletion(true);
      } else {
        // Profile is complete, hide completion modal
        setShowProfileCompletion(false);
      }
    } else if (isConnected && walletAddress && profileLoading) {
      // While loading, don't show completion modal yet
      setShowProfileCompletion(false);
    }
  }, [isConnected, walletAddress, isProfileComplete, profileLoading]);

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
    await disconnect();
    setShowProfileCompletion(false);
  };

  return (
    <>
      <Navigation 
        walletAddress={walletAddress || ''} 
        isConnected={isConnected}
        onDisconnect={handleDisconnect}
        onConnectClick={() => setShowWalletModal(true)}
        theme={theme}
        toggleTheme={toggleTheme}
        showThemeToggle={isConnected && !!walletAddress}
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
              walletAddress={walletAddress}
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
          
          {/* Only show ProfilePage if profile is complete */}
          {!showProfileCompletion && isProfileComplete && (
            <ProfilePage 
              walletAddress={walletAddress}
              onDisconnect={handleDisconnect}
              onShowProfileCompletion={() => {
                // If profile becomes incomplete, show completion modal
                setShowProfileCompletion(true);
              }}
              onTriggerEdit={(openEdit) => {
                setOpenEditProfile(() => openEdit);
              }}
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
              Loading...
            </div>
          )}
        </>
      ) : (
        <LandingPage onConnectClick={() => setShowWalletModal(true)} />
      )}
      
      {showWalletModal && (
        <WalletModal
          onConnect={handleConnectWallet}
          onClose={() => setShowWalletModal(false)}
        />
      )}
    </>
  );
}

export default App;
