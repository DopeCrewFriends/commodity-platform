import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './hooks/useWallet';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import LandingPage from './components/LandingPage';
import ProfilePage from './components/ProfilePage';
import WalletModal from './components/WalletModal';
import AuthModal from './components/AuthModal';
import ProfileCompletionModal from './components/ProfileCompletionModal';
import EditProfileModal from './components/EditProfileModal';
import Navigation from './components/Navigation';

function App() {
  const { walletAddress, isConnected, disconnect } = useWallet();
  const { user, loading: authLoading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [openEditProfile, setOpenEditProfile] = useState<(() => void) | null>(null);
  
  // Check profile completion - uses wallet address
  // Skip loading profile until it's complete (will show completion modal first)
  const { profileData, statistics, updateProfile, checkUsernameAvailability, isProfileComplete, loading: profileLoading } = useProfile(true);

  useEffect(() => {
    // Force dark theme on landing page
    if (!isConnected) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [isConnected]);

  // Check profile completion when wallet is connected and profile loads
  useEffect(() => {
    if (isConnected && walletAddress && !profileLoading) {
      // If profileData exists, check if it's complete
      if (profileData) {
        const isComplete = isProfileComplete();
        if (!isComplete) {
          console.log('Profile incomplete - showing completion modal');
          setShowProfileCompletion(true);
        } else {
          // Profile is complete, hide completion modal
          setShowProfileCompletion(false);
        }
      } else {
        // No profileData yet, but loading is done - show completion modal
        console.log('No profile data - showing completion modal');
        setShowProfileCompletion(true);
      }
    } else if (isConnected && walletAddress && profileLoading) {
      // While loading, don't show completion modal yet
      setShowProfileCompletion(false);
    }
  }, [isConnected, walletAddress, profileLoading, profileData]);

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

  const handleTriggerEdit = useCallback((openEdit: () => void) => {
    setOpenEditProfile(() => openEdit);
  }, []);

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
          
          {/* Only show ProfilePage if profile is complete */}
          {!showProfileCompletion && isProfileComplete && (
            <ProfilePage 
              walletAddress={profileData?.walletAddress || ''}
              onDisconnect={handleDisconnect}
              onShowProfileCompletion={handleShowProfileCompletion}
              onTriggerEdit={handleTriggerEdit}
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
