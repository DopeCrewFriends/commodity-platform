import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EscrowStatus } from '../types';
import { useEscrows } from '../hooks/useEscrows';
import { supabase } from '../utils/supabase';
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

  const handleEscrowAction = async (escrowId: string, action: 'accept' | 'reject' | 'cancel') => {
    const escrow = escrowsData.items.find(e => e.id === escrowId);
    if (!escrow) return;

    if (action === 'cancel' && escrow.status === 'ongoing') {
      window.alert('Your cancellation request has been recorded. The escrow will only be cancelled when the other party also confirms.');
      return;
    }

    const newStatus: EscrowStatus = action === 'accept' ? 'ongoing' : 'cancelled';

    try {
      const { error } = await supabase
        .from('escrows')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', escrowId);

      if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
        console.warn('Error updating escrow in Supabase:', error);
      }
    } catch (error) {
      console.warn('Error updating escrow:', error);
    }

    const updatedEscrows = escrowsData.items.map(e =>
      e.id === escrowId ? { ...e, status: newStatus } as typeof e : e
    );
    const totalAmount = updatedEscrows
      .filter(e => e.status === 'ongoing' || e.status === 'waiting')
      .reduce((sum, e) => sum + e.amount, 0);

    updateEscrows({ totalAmount, items: updatedEscrows });
  };

  return (
    <div className="portfolio-dashboard escrows-page" id="escrows">
      <div className="escrows-page__container container">
        <EscrowsSection
          escrowsData={escrowsData}
          updateEscrows={updateEscrows}
          walletAddress={walletAddress}
          onEscrowAction={handleEscrowAction}
          openEscrowId={openEscrowId}
        />
      </div>
    </div>
  );
};

export default EscrowsPage;

