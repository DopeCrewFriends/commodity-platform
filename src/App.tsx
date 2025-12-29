import { useState, useEffect } from 'react';
import { useWallet } from './hooks/useWallet';
import { useTheme } from './hooks/useTheme';
import LandingPage from './components/LandingPage';
import ProfilePage from './components/ProfilePage';
import WalletModal from './components/WalletModal';
import ProfileCompletionModal from './components/ProfileCompletionModal';
import Navigation from './components/Navigation';

function App() {
  const { walletAddress, isConnected, connect, disconnect } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [openEditProfile, setOpenEditProfile] = useState<(() => void) | null>(null);

  useEffect(() => {
    // Force dark theme on landing page
    if (!isConnected) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [isConnected]);

  const handleConnectWallet = async () => {
    try {
      const address = await connect();
      setShowWalletModal(false);
      // Check if profile needs completion
      const profileData = localStorage.getItem(`user_${address}_profileData`);
      if (!profileData) {
        setShowProfileCompletion(true);
      }
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
          <ProfilePage 
            walletAddress={walletAddress}
            onDisconnect={handleDisconnect}
            onShowProfileCompletion={() => {
              const profileData = localStorage.getItem(`user_${walletAddress}_profileData`);
              if (!profileData) {
                setShowProfileCompletion(true);
              }
            }}
            onTriggerEdit={(openEdit) => {
              setOpenEditProfile(() => openEdit);
            }}
          />
          {showProfileCompletion && (
            <ProfileCompletionModal
              onComplete={() => {
                setShowProfileCompletion(false);
                // Open edit modal after completion modal animation finishes
                setTimeout(() => {
                  if (openEditProfile) {
                    openEditProfile();
                  }
                }, 350);
              }}
            />
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
