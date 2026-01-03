import React from 'react';
import { useEscrows } from '../hooks/useEscrows';
import EscrowsSection from './EscrowsSection';

interface EscrowsPageProps {
  walletAddress: string;
}

const EscrowsPage: React.FC<EscrowsPageProps> = ({ walletAddress }) => {
  const { escrowsData, updateEscrows } = useEscrows(walletAddress);

  return (
    <div className="portfolio-dashboard" id="escrows">
      <div className="container">
        <EscrowsSection escrowsData={escrowsData} updateEscrows={updateEscrows} />
      </div>
    </div>
  );
};

export default EscrowsPage;

