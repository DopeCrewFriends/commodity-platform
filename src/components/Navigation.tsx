import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close mobile menu when route changes (e.g. after clicking a link)
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    return () => document.body.classList.remove('mobile-menu-open');
  }, [isMenuOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleDisconnect = () => {
    setIsDropdownOpen(false);
    if (confirm('Are you sure you want to disconnect your wallet?')) {
      onDisconnect();
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <nav className={`navbar ${isConnected ? 'nav-connected' : ''}`}>
      <div className="container">
        <div className="nav-brand" id="navBrand">
          <h2>Settl</h2>
        </div>
        {isConnected && (
          <ul className={`nav-menu ${isMenuOpen ? 'active' : ''}`} id="navMenu">
            <li>
              <Link 
                to="/dashboard" 
                className={`nav-link ${location.pathname === '/dashboard' ? 'nav-active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                to="/escrows" 
                className={`nav-link ${location.pathname === '/escrows' ? 'nav-active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Escrows
              </Link>
            </li>
            <li>
              <Link 
                to="/account" 
                className={`nav-link ${location.pathname === '/account' ? 'nav-active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Account
              </Link>
            </li>
            <li className="nav-menu-theme">
              <button
                type="button"
                className="nav-link nav-link-theme-toggle"
                onClick={() => toggleTheme()}
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                <span className="nav-link-theme-label">
                  {theme === 'light' ? 'Dark mode' : 'Light mode'}
                </span>
                <svg className="theme-icon nav-link-theme-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            </li>
        </ul>
        )}
        <div className="nav-right">
          {showThemeToggle && (
            <button 
              className="theme-toggle theme-toggle-desktop" 
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
            <div className="wallet-dropdown-container" ref={dropdownRef}>
              <div 
                className="wallet-address connected" 
                id="walletAddress" 
                onClick={toggleDropdown} 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
              <span className="address-text">{formattedAddress}</span>
                <svg 
                  width="12" 
                  height="12" 
                  viewBox="0 0 12 12" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ 
                    transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  <path 
                    d="M3 4.5L6 7.5L9 4.5" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {isDropdownOpen && (
                <div className="wallet-dropdown-menu">
                  <button 
                    className="wallet-dropdown-item" 
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </button>
                </div>
              )}
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
        {isConnected && (
          <button 
            className="nav-toggle" 
            id="navToggle" 
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navigation;

