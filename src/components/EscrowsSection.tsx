import React, { useState, useMemo, useEffect } from 'react';
import { EscrowsData, Contact, EscrowStatus } from '../types';
import { getInitials } from '../utils/storage';
import { getEscrowStatusDisplay } from '../utils/escrowStatus';
import { useProfilesCache } from '../hooks/useProfilesCache';
import CreateEscrowModal from './CreateEscrowModal';
import { useAuth } from '../hooks/useAuth';

interface EscrowsSectionProps {
  escrowsData: EscrowsData;
  updateEscrows: (data: EscrowsData) => void;
  walletAddress?: string;
  onEscrowAction?: (escrowId: string, action: 'accept' | 'reject' | 'cancel') => void;
  openEscrowId?: string;
}

const LIFECYCLE_STEPS: { status: EscrowStatus; label: string }[] = [
  { status: 'waiting', label: 'Waiting for confirmation' },
  { status: 'ongoing', label: 'In progress' },
  { status: 'completed', label: 'Completed' },
  { status: 'cancelled', label: 'Cancelled' }
];

type EscrowFilterType = 'all' | 'ongoing' | 'waiting' | 'completed';

const ESCROW_FILTER_OPTIONS: { value: EscrowFilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'waiting', label: 'Waiting for Confirmation' }
];

const EscrowsSection: React.FC<EscrowsSectionProps> = ({ escrowsData, updateEscrows, walletAddress: walletAddressProp, onEscrowAction, openEscrowId }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<EscrowFilterType>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { walletAddress: authWallet } = useAuth();
  const walletAddress = walletAddressProp ?? authWallet ?? '';

  useEffect(() => {
    if (openEscrowId) {
      setExpandedId(openEscrowId);
    }
  }, [openEscrowId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.escrows-filter-container')) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFilterOpen]);

  const toggleExpanded = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Filter escrows based on status and active filter
  const activeEscrows = escrowsData.items.filter(escrow => {
    const status = escrow.status;
    
    // Apply filter
    if (activeFilter === 'ongoing') {
      return status === 'ongoing';
    } else if (activeFilter === 'waiting') {
      return status === 'waiting';
    } else if (activeFilter === 'completed') {
      return status === 'completed';
    }
    
    // 'all' - show all escrows including cancelled
    return true;
  });

  // Get unique wallet addresses from active escrows
  const walletAddresses = useMemo(() => {
    const addresses = new Set<string>();
    activeEscrows.forEach(escrow => {
      addresses.add(escrow.buyer);
      addresses.add(escrow.seller);
    });
    return Array.from(addresses);
  }, [activeEscrows]);

  // Use shared profiles cache hook
  const { profiles } = useProfilesCache(walletAddresses);

  const handleCreateEscrow = () => {
    setShowCreateModal(true);
  };

  const handleSelectContact = (_contact: Contact) => {
    setShowCreateModal(false);
  };


  return (
    <>
      <div className="active-escrows-section">
        <div className="escrows-header-card" id="escrowsHeaderCard">
          <div className="escrows-header-content">
            <div className="escrows-title-section">
              <h2>Escrows</h2>
            </div>
            <div className="escrows-actions">
              <button className="btn btn-primary create-escrow-btn" id="createEscrowBtn" onClick={handleCreateEscrow}>
                Create Escrow
              </button>
            </div>
          </div>
        <div className="active-escrows-content" id="activeEscrowsContent">
          <div className="escrows-filter-container">
            <button
              type="button"
              className="escrows-filter-btn"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <span>Filter</span>
              <span style={{ fontSize: '0.65rem' }}>▼</span>
            </button>
            {isFilterOpen && (
              <div className="escrows-filter-dropdown">
                {ESCROW_FILTER_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`filter-option ${activeFilter === value ? 'active' : ''}`}
                    onClick={() => {
                      setActiveFilter(value);
                      setIsFilterOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="active-escrows-list" id="activeEscrowsList">
            {activeEscrows.length === 0 ? (
              <div className="no-escrows-message" id="noEscrowsMessage" style={{ display: 'block' }}>
                <p>No active escrows</p>
              </div>
            ) : (
              activeEscrows.map((escrow, index) => {
                const id = escrow.id || `escrow-${index}`;
                const isExpanded = expandedId === id;
                const buyerProfile = profiles[escrow.buyer];
                const sellerProfile = profiles[escrow.seller];
                const buyerInitials = buyerProfile 
                  ? getInitials(buyerProfile.name || '', buyerProfile.username || '')
                  : getInitials(escrow.buyer, escrow.buyer);
                const sellerInitials = sellerProfile 
                  ? getInitials(sellerProfile.name || '', sellerProfile.username || '')
                  : getInitials(escrow.seller, escrow.seller);

                const me = walletAddress.trim();
                const isBuyer = escrow.buyer.trim() === me;
                const isSeller = escrow.seller.trim() === me;
                const canAcceptReject = onEscrowAction && escrow.status === 'waiting' && isSeller;
                const canCancel = onEscrowAction && (escrow.status === 'waiting' || escrow.status === 'ongoing') && (isBuyer || isSeller);
                const isOngoing = escrow.status === 'ongoing';

                const amountStr = `$${escrow.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                return (
                  <div
                    key={id}
                    className={`escrow-card ${isExpanded ? 'escrow-card-expanded' : ''}`}
                    data-escrow-id={id}
                  >
                    <button
                      type="button"
                      className="escrow-card-header"
                      onClick={() => toggleExpanded(id)}
                      aria-expanded={isExpanded}
                      aria-controls={`escrow-body-${id}`}
                    >
                      <span className="escrow-card-summary">{escrow.commodity}</span>
                      <span className="escrow-card-amount-wrap">
                        {escrow.paymentMethod && (
                          <img
                            src={escrow.paymentMethod === 'USDC' ? '/images/usdc.png' : '/images/usdt logo.png'}
                            alt=""
                            className="escrow-card-payment-icon"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <span className="escrow-card-amount">{amountStr}</span>
                      </span>
                      <span className={`escrow-card-status-pill ${escrow.status}`}>
                        {getEscrowStatusDisplay(escrow.status)}
                      </span>
                      <span className="escrow-card-chevron" aria-hidden>{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    <div
                      id={`escrow-body-${id}`}
                      className="escrow-card-body"
                      hidden={!isExpanded}
                    >
                      <div className="escrow-card-parties">
                        <div className="escrow-party buyer">
                          <div className="escrow-party-avatar">{buyerInitials}</div>
                          <div className="escrow-party-info">
                            <span className="escrow-party-role">Buyer</span>
                            <span className="escrow-party-name">
                              {buyerProfile?.name || 'Unknown'}
                              {buyerProfile?.username && <span className="escrow-party-username">@{buyerProfile.username}</span>}
                            </span>
                          </div>
                        </div>
                        <span className="escrow-party-arrow" aria-hidden>↔</span>
                        <div className="escrow-party seller">
                          <div className="escrow-party-avatar">{sellerInitials}</div>
                          <div className="escrow-party-info">
                            <span className="escrow-party-role">Seller</span>
                            <span className="escrow-party-name">
                              {sellerProfile?.name || 'Unknown'}
                              {sellerProfile?.username && <span className="escrow-party-username">@{sellerProfile.username}</span>}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="escrow-timeline-wrap">
                        <h4 className="escrow-timeline-title">Status timeline</h4>
                        <div className="escrow-timeline">
                          {LIFECYCLE_STEPS.map((step) => {
                            const isActive = escrow.status === step.status;
                            const isReached =
                              (step.status === 'waiting' && escrow.status !== 'waiting') ||
                              (step.status === 'ongoing' && escrow.status === 'completed') ||
                              (step.status === 'completed' && escrow.status === 'completed') ||
                              (step.status === 'cancelled' && escrow.status === 'cancelled');
                            const inPath = escrow.status === 'cancelled' ? (step.status === 'waiting' || step.status === 'cancelled') : step.status !== 'cancelled';
                            const dateLabel = (step.status === 'waiting' || isActive) ? new Date(escrow.startDate).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                            return (
                              <div
                                key={step.status}
                                className={`escrow-timeline-step ${step.status} ${isReached ? 'reached' : ''} ${isActive ? 'active' : ''} ${!inPath ? 'skipped' : ''}`}
                              >
                                <div className="escrow-timeline-marker">
                                  {step.status === 'completed' && isActive ? (
                                    <span className="escrow-timeline-icon escrow-timeline-icon-check">✓</span>
                                  ) : step.status === 'cancelled' && isActive ? (
                                    <span className="escrow-timeline-icon escrow-timeline-icon-x">×</span>
                                  ) : (
                                    <span className="escrow-timeline-icon escrow-timeline-icon-dot" />
                                  )}
                                </div>
                                <div className="escrow-timeline-content">
                                  <span className="escrow-timeline-label">{step.label}</span>
                                  <span className="escrow-timeline-date">{inPath ? dateLabel : '—'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="escrow-card-footer">
                        {(canAcceptReject || canCancel) && (
                          <div className="escrow-actions">
                            {canAcceptReject && (
                              <>
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => onEscrowAction!(escrow.id, 'accept')}>
                                  Accept
                                </button>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEscrowAction!(escrow.id, 'reject')}>
                                  Reject
                                </button>
                              </>
                            )}
                            {canCancel && (
                              <>
                                {isOngoing && (
                                  <p className="escrow-cancel-note">Both parties must confirm to cancel the escrow.</p>
                                )}
                                <button type="button" className="btn btn-danger btn-sm" onClick={() => onEscrowAction!(escrow.id, 'cancel')}>
                                  {isOngoing ? 'Request cancellation' : 'Cancel'}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      </div>

      {showCreateModal && walletAddress && (
        <CreateEscrowModal
          onClose={() => setShowCreateModal(false)}
          onSelectContact={handleSelectContact}
          walletAddress={walletAddress}
          currentEscrowsData={escrowsData}
          updateEscrows={updateEscrows}
        />
      )}
    </>
  );
};

export default EscrowsSection;

