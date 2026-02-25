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

  const handleEscrowAction = async (escrowId: string, action: 'accept' | 'reject' | 'cancel' | 'complete' | 'sign_complete' | 'sign_cancel') => {
    const escrow = escrowsData.items.find(e => e.id === escrowId);
    if (!escrow) return;

    const me = walletAddress.trim();
    let newStatus: EscrowStatus = escrow.status;
    let cancelledBy: string | undefined;
    let completeSignedBy: string[] = escrow.complete_signed_by ?? [];
    let cancelSignedBy: string[] = escrow.cancel_signed_by ?? [];

    if (action === 'accept') {
      newStatus = 'ongoing';
    } else if (action === 'reject') {
      newStatus = 'cancelled';
      cancelledBy = me;
    } else if (action === 'cancel' && escrow.status === 'waiting') {
      newStatus = 'cancelled';
      cancelledBy = me;
    } else if (action === 'sign_complete') {
      if (!completeSignedBy.includes(me)) completeSignedBy = [...completeSignedBy, me];
      if (completeSignedBy.length >= 2) newStatus = 'completed';
    } else if (action === 'sign_cancel') {
      if (!cancelSignedBy.includes(me)) cancelSignedBy = [...cancelSignedBy, me];
      if (cancelSignedBy.length >= 2) newStatus = 'cancelled';
    } else if (action === 'complete') {
      newStatus = 'completed';
    }

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };
    if (cancelledBy !== undefined) updatePayload.cancelled_by = cancelledBy;
    if (action === 'sign_complete' || action === 'sign_cancel') {
      updatePayload.complete_signed_by = completeSignedBy;
      updatePayload.cancel_signed_by = cancelSignedBy;
    }

    try {
      const { error } = await supabase
        .from('escrows')
        .update(updatePayload)
        .eq('id', escrowId);

      if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
        console.warn('Error updating escrow in Supabase:', error);
      }
    } catch (error) {
      console.warn('Error updating escrow:', error);
    }

    const updatedEscrows = escrowsData.items.map(e =>
      e.id !== escrowId ? e : { ...e, status: newStatus, cancelled_by: cancelledBy ?? e.cancelled_by, complete_signed_by: completeSignedBy, cancel_signed_by: cancelSignedBy }
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

