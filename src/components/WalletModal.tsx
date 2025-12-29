import React, { useState } from 'react';

interface WalletModalProps {
  onConnect: () => void;
  onClose: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ onConnect, onClose }) => {
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  const isPhantomInstalled = () => {
    if (typeof window === 'undefined') return false;
    return window.solana?.isPhantom || (window as any).phantom?.solana?.isPhantom;
  };

  const handleConnect = async () => {
    if (!isPhantomInstalled()) {
      setError('Phantom wallet is not installed. Please install it from https://phantom.app');
      return;
    }

    setError('');
    setConnecting(true);

    try {
      await onConnect();
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      if (err.code === 4001 || err.message?.includes('rejected')) {
        setError('Connection rejected. Please approve the connection in your Phantom wallet.');
      } else if (err.message?.includes('not found')) {
        setError('Phantom wallet not found. Please make sure the extension is installed and enabled.');
      } else {
        setError(err.message || 'Failed to connect to Phantom wallet. Please try again.');
      }
    } finally {
      setConnecting(false);
    }
  };

  React.useEffect(() => {
    document.body.classList.add('wallet-modal-open');
    return () => {
      document.body.classList.remove('wallet-modal-open');
    };
  }, []);

  return (
    <div className="wallet-modal active" id="walletModal">
      <div className="wallet-modal-overlay" onClick={onClose}></div>
      <div className="wallet-modal-content">
        <div className="wallet-modal-header">
          <h2>Connect Your Wallet</h2>
          <p>Connect your wallet to access the SETL escrow platform</p>
        </div>
        <div className="wallet-options">
          <button 
            className="wallet-option" 
            data-wallet="phantom" 
            id="phantomWalletOption"
            onClick={handleConnect}
            disabled={connecting}
            style={{ opacity: connecting ? 0.6 : 1, pointerEvents: connecting ? 'none' : 'auto' }}
          >
            <div className="wallet-icon">👻</div>
            <div className="wallet-info">
              <h3>Phantom</h3>
              <p>Connect using Phantom wallet</p>
            </div>
            <div className="wallet-arrow">→</div>
          </button>
        </div>
        {error && (
          <div id="walletError" className="wallet-error" style={{ display: 'block' }}>
            {error}
          </div>
        )}
        <div className="wallet-modal-footer">
          <p className="wallet-disclaimer">By connecting, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
