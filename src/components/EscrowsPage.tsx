import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEscrows } from '../hooks/useEscrows';
import { useEscrowChainActions } from '../hooks/useEscrowChainActions';
import { useWallet } from '../hooks/useWallet';
import EscrowsSection from './EscrowsSection';

interface EscrowsPageProps {
  walletAddress: string;
}

const EscrowsPage: React.FC<EscrowsPageProps> = ({ walletAddress }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const openEscrowId = searchParams.get('open') ?? undefined;

  useEffect(() => {
    if (openEscrowId) {
      setSearchParams({}, { replace: true });
    }
  }, [openEscrowId, setSearchParams]);

  const { escrowsData, updateEscrows } = useEscrows(walletAddress);
  const handleEscrowAction = useEscrowChainActions(walletAddress, escrowsData, updateEscrows);
  const { chainPublicKey, signTransaction, signAndSendTransaction } = useWallet();

  return (
    <div className="portfolio-dashboard escrows-page" id="escrows">
      <div className="escrows-page__container container">
        <EscrowsSection
          escrowsData={escrowsData}
          updateEscrows={updateEscrows}
          walletAddress={walletAddress}
          chainPublicKey={chainPublicKey}
          signTransaction={signTransaction}
          signAndSendTransaction={signAndSendTransaction}
          onEscrowAction={handleEscrowAction}
          openEscrowId={openEscrowId}
        />
      </div>
    </div>
  );
};

export default EscrowsPage;

