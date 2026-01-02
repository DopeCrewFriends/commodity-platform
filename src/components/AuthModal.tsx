import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';

interface AuthModalProps {
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { connect } = useWallet();
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
      await connect();
      onClose();
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

  return (
    <div className="wallet-modal active" onClick={onClose}>
      <div className="wallet-modal-overlay"></div>
      <div className="wallet-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Connect Your Wallet</h2>
          <p>Connect your wallet to access the SETL escrow platform</p>
        </div>
        <div className="wallet-options">
          <button 
            className="wallet-option" 
            data-wallet="phantom" 
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
          <div className="wallet-error" style={{ display: 'block', marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={connecting} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            Cancel
          </button>
        </div>
        <div className="wallet-modal-footer" style={{ marginTop: '1rem' }}>
          <p className="wallet-disclaimer">By connecting, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
