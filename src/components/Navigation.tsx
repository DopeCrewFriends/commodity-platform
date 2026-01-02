import React from 'react';
import { formatWalletAddress } from '../utils/storage';

interface NavigationProps {
  walletAddress: string;
  isConnected: boolean;
  onDisconnect: () => void;
  onConnectClick: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  showThemeToggle?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ 
  walletAddress, 
  isConnected,
  onDisconnect, 
  onConnectClick,
  theme, 
  toggleTheme,
  showThemeToggle = true
}) => {
  const formattedAddress = formatWalletAddress(walletAddress);

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect your wallet?')) {
      onDisconnect();
    }
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav-brand" id="navBrand">
          <h2>SETLL</h2>
        </div>
        <ul className="nav-menu" id="navMenu" style={{ display: 'none' }}>
        </ul>
        <div className="nav-right">
          {showThemeToggle && (
            <button 
              className="theme-toggle" 
              id="themeToggle" 
              aria-label="Toggle dark mode"
              onClick={toggleTheme}
            >
              <svg className="theme-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  className="theme-icon-moon" 
                  style={{ display: theme === 'light' ? 'block' : 'none' }}
                  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  fill="currentColor"
                />
                <g className="theme-icon-sun" style={{ display: theme === 'dark' ? 'block' : 'none' }}>
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5.64 5.64l1.41 1.41M16.95 16.95l1.41 1.41M5.64 18.36l1.41-1.41M16.95 7.05l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </g>
              </svg>
            </button>
          )}
          {isConnected && walletAddress ? (
            <div className="wallet-address connected" id="walletAddress" onClick={handleDisconnect} style={{ cursor: 'pointer', display: 'flex' }}>
              <span className="address-text">{formattedAddress}</span>
            </div>
          ) : (
            <button 
              className="btn btn-primary connect-wallet-btn" 
              id="connectWalletBtn"
              onClick={onConnectClick}
            >
              Connect Wallet
            </button>
          )}
        </div>
        <button className="nav-toggle" id="navToggle" style={{ display: 'none' }}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;

