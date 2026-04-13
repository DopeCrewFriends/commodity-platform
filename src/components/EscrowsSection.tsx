import React, { useState, useMemo, useEffect } from 'react';
import type { PublicKey, Transaction, SendOptions } from '@solana/web3.js';
import { EscrowsData, Contact, EscrowStatus, Escrow } from '../types';
import { solscanTxUrl } from '../utils/solscan';
import { getInitials } from '../utils/storage';
import { getEscrowStatusDisplayLabel, getEscrowStepDisplayLabel } from '../utils/escrowStatus';
import { isEscrowActiveForPanel } from '../utils/escrowTradeHistory';
import { useProfilesCache } from '../hooks/useProfilesCache';
import CreateEscrowModal from './CreateEscrowModal';
import EscrowPartyBlock from './EscrowPartyBlock';
import { useAuth } from '../hooks/useAuth';

export type PhantomSignTransaction = (tx: Transaction) => Promise<Transaction>;

interface EscrowsSectionProps {
  escrowsData: EscrowsData;
  updateEscrows: (data: EscrowsData) => void;
  walletAddress?: string;
  /** Same `useWallet()` instance as the app — CreateEscrowModal must not call `useWallet()` again or chain signing stays null. */
  chainPublicKey?: PublicKey | null;
  signTransaction?: PhantomSignTransaction | null;
  /** Phantom `signAndSendTransaction` — prefer for clearer approve previews (optional). */
  signAndSendTransaction?: ((tx: Transaction, opts?: SendOptions) => Promise<{ signature: string }>) | null;
  onEscrowAction?: (escrowId: string, action: 'accept' | 'reject' | 'cancel' | 'complete' | 'sign_complete' | 'sign_cancel') => void;
  openEscrowId?: string;
}

const LIFECYCLE_STEPS: { status: EscrowStatus; label: string }[] = [
  { status: 'waiting', label: 'Waiting for seller' },
  { status: 'ongoing', label: 'In progress' },
  { status: 'completed', label: 'Completed' },
  { status: 'cancelled', label: 'Cancelled' }
];

function shortTxSig(signature: string): string {
  if (!signature || signature.length < 14) return signature;
  return `${signature.slice(0, 6)}…${signature.slice(-4)}`;
}

function EscrowTimelineTxRow({ label, signature }: { label: string; signature: string }) {
  return (
    <div className="escrow-timeline-tx">
      <span className="escrow-timeline-tx-label">{label}</span>
      <code className="escrow-timeline-tx-sig" title={signature}>
        {shortTxSig(signature)}
      </code>
      <a
        href={solscanTxUrl(signature)}
        target="_blank"
        rel="noopener noreferrer"
        className="escrow-timeline-tx-solscan"
      >
        Solscan
      </a>
    </div>
  );
}

/** On-chain tx links for a lifecycle step (init, accept, votes, reject/cancel). */
function escrowTimelineTxBlock(step: EscrowStatus, escrow: Escrow, inPath: boolean): React.ReactNode {
  if (!inPath) return null;
  const ct = escrow.chainTransactions;
  if (step === 'waiting' && escrow.chainInitTx?.trim()) {
    return <EscrowTimelineTxRow label="Create / fund escrow" signature={escrow.chainInitTx.trim()} />;
  }
  if (step === 'ongoing' && ct?.accept?.trim()) {
    return <EscrowTimelineTxRow label="Seller accepted (on-chain)" signature={ct.accept.trim()} />;
  }
  if (step === 'completed' && ct?.voteComplete?.length) {
    const parts = ct.voteComplete
      .map((sig, i) =>
        sig?.trim() ? (
          <EscrowTimelineTxRow key={`${sig}-${i}`} label={`Sign to complete (${i + 1})`} signature={sig.trim()} />
        ) : null
      )
      .filter(Boolean);
    return parts.length ? <div className="escrow-timeline-tx-stack">{parts}</div> : null;
  }
  if (step === 'cancelled') {
    const parts: React.ReactNode[] = [];
    ct?.voteCancel?.forEach((sig, i) => {
      if (sig?.trim()) {
        parts.push(
          <EscrowTimelineTxRow key={`vc-${sig}-${i}`} label={`Sign to cancel (${i + 1})`} signature={sig.trim()} />
        );
      }
    });
    if (ct?.reject?.trim()) {
      parts.push(<EscrowTimelineTxRow key="rej" label="Seller rejected" signature={ct.reject.trim()} />);
    }
    if (ct?.buyerCancel?.trim()) {
      parts.push(<EscrowTimelineTxRow key="bc" label="Buyer cancelled" signature={ct.buyerCancel.trim()} />);
    }
    return parts.length ? <div className="escrow-timeline-tx-stack">{parts}</div> : null;
  }
  return null;
}

type EscrowFilterType = 'all' | 'ongoing' | 'waiting';

const ESCROW_FILTER_OPTIONS: { value: EscrowFilterType; label: string }[] = [
  { value: 'all', label: 'All active' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'waiting', label: 'Waiting for seller' }
];

type SignConfirmAction = 'sign_complete' | 'sign_cancel';

const EscrowsSection: React.FC<EscrowsSectionProps> = ({
  escrowsData,
  updateEscrows,
  walletAddress: walletAddressProp,
  chainPublicKey,
  signTransaction,
  signAndSendTransaction,
  onEscrowAction,
  openEscrowId,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<EscrowFilterType>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [signConfirmPending, setSignConfirmPending] = useState<{ escrowId: string; action: SignConfirmAction } | null>(null);
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

  // Main panel: only in-flight escrows; completed / cancelled appear under Trade History
  const activeEscrows = escrowsData.items.filter((escrow) => {
    if (!isEscrowActiveForPanel(escrow)) return false;
    if (activeFilter === 'ongoing') return escrow.status === 'ongoing';
    if (activeFilter === 'waiting') return escrow.status === 'waiting';
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
      <div className="active-escrows-section escrows-section">
        <div className="escrows-header-card" id="escrowsHeaderCard">
          <div className="escrows-header-content">
            <div className="escrows-title-section">
              <h2>Active Escrows</h2>
            </div>
            <div className="escrows-actions">
              <button className="btn btn-primary create-escrow-btn" id="createEscrowBtn" onClick={handleCreateEscrow}>
                Create Escrow
              </button>
              <div className="escrows-filter-container">
                <button
                  type="button"
                  className="btn btn-secondary escrows-filter-btn"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <span>Filter</span>
                  <span className="escrows-filter-chevron">▼</span>
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
            </div>
          </div>
        <div className="active-escrows-content" id="activeEscrowsContent">
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
                const isWaiting = escrow.status === 'waiting';
                const isOngoing = escrow.status === 'ongoing';
                const canAcceptReject = onEscrowAction && isWaiting && isSeller;
                const canCancelWaiting = onEscrowAction && isWaiting && isBuyer;
                const canCompleteOrCancelOngoing = onEscrowAction && isOngoing && (isBuyer || isSeller);

                const amountStr = `$${escrow.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                return (
                  <div
                    key={id}
                    className={`escrow-card ${isExpanded ? 'escrow-card-expanded' : ''}`}
                    data-escrow-id={id}
                    data-status={escrow.status}
                  >
                    <div className="escrow-card__accent" aria-hidden />
                    <div
                      className="escrow-card-hit-layer"
                      aria-hidden="true"
                      onClick={() => toggleExpanded(id)}
                    />
                    <div className="escrow-card__inner escrow-card__inner--interactive">
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
                          {getEscrowStatusDisplayLabel(escrow, walletAddress)}
                        </span>
                        <span className="escrow-card-chevron" aria-hidden>{isExpanded ? '▲' : '▼'}</span>
                      </button>

                      <div
                        id={`escrow-body-${id}`}
                        className="escrow-card-body"
                        hidden={!isExpanded}
                      >
                      <div className="escrow-card-parties">
                        <EscrowPartyBlock
                          partyClass="buyer"
                          roleLabel="Buyer"
                          initials={buyerInitials}
                          displayName={buyerProfile?.name || 'Unknown'}
                          username={buyerProfile?.username}
                        />
                        <span className="escrow-party-arrow" aria-hidden>↔</span>
                        <EscrowPartyBlock
                          partyClass="seller"
                          roleLabel="Seller"
                          initials={sellerInitials}
                          displayName={sellerProfile?.name || 'Unknown'}
                          username={sellerProfile?.username}
                        />
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
                            const stepLabel = getEscrowStepDisplayLabel(step.status, escrow, walletAddress);
                            const txBlock = escrowTimelineTxBlock(step.status, escrow, inPath);
                            return (
                              <div
                                key={step.status}
                                className={`escrow-timeline-step ${step.status} ${isReached ? 'reached' : ''} ${isActive ? 'active' : ''} ${!inPath ? 'skipped' : ''}`}
                              >
                                <div className="escrow-timeline-marker">
                                  {step.status === 'completed' && isActive ? (
                                    <span className="escrow-timeline-icon escrow-timeline-icon-check" aria-hidden>✓</span>
                                  ) : step.status === 'cancelled' && isActive ? (
                                    <span className="escrow-timeline-icon escrow-timeline-icon-x" aria-hidden>×</span>
                                  ) : (
                                    <span className="escrow-timeline-icon escrow-timeline-icon-dot" aria-hidden />
                                  )}
                                </div>
                                <div className="escrow-timeline-content">
                                  <div className="escrow-timeline-content-row">
                                    <span className="escrow-timeline-label">{stepLabel}</span>
                                    <span className="escrow-timeline-date">{inPath ? dateLabel : '—'}</span>
                                  </div>
                                  {txBlock}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="escrow-card-footer">
                        {canAcceptReject && (
                          <div className="escrow-actions">
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => onEscrowAction!(escrow.id, 'accept')}>
                              Accept
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEscrowAction!(escrow.id, 'reject')}>
                              Reject
                            </button>
                          </div>
                        )}
                        {canCancelWaiting && (
                          <div className="escrow-actions">
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => onEscrowAction!(escrow.id, 'cancel')}>
                              Cancel
                            </button>
                          </div>
                        )}
                        {canCompleteOrCancelOngoing && (() => {
                          const completeSigned = escrow.complete_signed_by ?? [];
                          const cancelSigned = escrow.cancel_signed_by ?? [];
                          const completeCount = completeSigned.length;
                          const cancelCount = cancelSigned.length;
                          const hasSignedComplete = completeSigned.some((w) => w.trim() === me);
                          const hasSignedCancel = cancelSigned.some((w) => w.trim() === me);
                          return (
                            <div className="escrow-two-party">
                              <p className="escrow-two-party-intro">
                                This is a two-party escrow. On Solana, <strong>each wallet has one on-chain vote</strong> (complete
                                or cancel). Signing one option and then the other <strong>replaces</strong> your vote — if buyer
                                and seller end on different choices, the escrow stays locked until both match. The counters below
                                track who has signed in the app; the chain only settles when both on-chain votes agree.
                              </p>
                              <div className="escrow-two-party-rows">
                                <div className="escrow-two-party-panel">
                                  <p className="escrow-two-party-count">
                                    <span className="escrow-two-party-count-label">Complete:</span>
                                    <span className="escrow-two-party-count-value">{completeCount}/2</span>
                                    <span> signed</span>
                                    {completeCount < 2 && (
                                      <span className="escrow-two-party-count-note">Not yet completed — both must sign</span>
                                    )}
                                  </p>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    disabled={hasSignedComplete}
                                    onClick={() => setSignConfirmPending({ escrowId: escrow.id, action: 'sign_complete' })}
                                  >
                                    {hasSignedComplete ? "You've signed to complete" : 'Sign to complete'}
                                  </button>
                                </div>
                                <div className="escrow-two-party-panel escrow-two-party-panel--cancel">
                                  <p className="escrow-two-party-count">
                                    <span className="escrow-two-party-count-label">Cancel:</span>
                                    <span className="escrow-two-party-count-value">{cancelCount}/2</span>
                                    <span> signed</span>
                                    {cancelCount < 2 && (
                                      <span className="escrow-two-party-count-note">Not yet cancelled — both must sign</span>
                                    )}
                                  </p>
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    disabled={hasSignedCancel}
                                    onClick={() => setSignConfirmPending({ escrowId: escrow.id, action: 'sign_cancel' })}
                                  >
                                    {hasSignedCancel ? "You've signed to cancel" : 'Sign to cancel'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
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
          chainPublicKey={chainPublicKey ?? null}
          signTransaction={signTransaction ?? null}
          signAndSendTransaction={signAndSendTransaction ?? null}
          currentEscrowsData={escrowsData}
          updateEscrows={updateEscrows}
        />
      )}

      {signConfirmPending && onEscrowAction && (
        <div className="escrow-sign-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="escrow-sign-confirm-title">
          <div className="escrow-sign-confirm-modal">
            <h3 id="escrow-sign-confirm-title" className="escrow-sign-confirm-title">
              Confirm signature
            </h3>
            <p className="escrow-sign-confirm-message">
              Your signature cannot be reversed. Are you sure you want to sign to{' '}
              {signConfirmPending.action === 'sign_complete' ? 'complete' : 'cancel'} this escrow?
            </p>
            <div className="escrow-sign-confirm-actions">
              <button
                type="button"
                className={`btn btn-sm ${signConfirmPending.action === 'sign_complete' ? 'btn-primary' : 'btn-danger'}`}
                onClick={() => {
                  onEscrowAction(signConfirmPending.escrowId, signConfirmPending.action);
                  setSignConfirmPending(null);
                }}
              >
                Yes, sign
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSignConfirmPending(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EscrowsSection;

