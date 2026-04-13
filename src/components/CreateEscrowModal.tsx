import React, { useState, useRef } from 'react';
import { PublicKey, Transaction, type SendOptions } from '@solana/web3.js';
import BN from 'bn.js';
import { useContacts } from '../hooks/useContacts';
import { useContactProfileHover } from '../hooks/useContactProfileHover';
import { Contact, EscrowsData, Escrow } from '../types';
import { getInitials } from '../utils/storage';
import { supabase } from '../utils/supabase';
import {
  chainInitEscrow,
  chainMintForPaymentMethod,
  getClusterDisplayName,
  isOnChainEscrowConfigured,
} from '../utils/escrowChain';

interface CreateEscrowModalProps {
  onClose: () => void;
  onSelectContact: (contact: Contact) => void;
  walletAddress: string;
  /** From parent `useWallet()` — do not use a second `useWallet()` here or Phantom signing stays out of sync. */
  chainPublicKey: PublicKey | null;
  signTransaction: ((tx: Transaction) => Promise<Transaction>) | null;
  signAndSendTransaction?: ((tx: Transaction, opts?: SendOptions) => Promise<{ signature: string }>) | null;
  currentEscrowsData: EscrowsData;
  updateEscrows: (data: EscrowsData) => void;
}

/** Format amount for display: add commas, allow max 2 decimal places */
function formatAmountWithCommas(value: string): string {
  const filtered = value.replace(/[^\d.]/g, '');
  if (filtered === '') return '';
  const parts = filtered.split('.');
  const intPart = (parts[0] || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decPart = parts[1] !== undefined ? parts[1].slice(0, 2) : '';
  /* Keep the decimal point when user is typing decimals (e.g. "1." or "1.5") */
  return parts[1] !== undefined ? `${intPart}.${decPart}` : intPart;
}

/** Parse display value (with commas) to number */
function parseAmountNumber(displayValue: string): number {
  return parseFloat(displayValue.replace(/,/g, '')) || 0;
}

const CreateEscrowModal: React.FC<CreateEscrowModalProps> = ({
  onClose,
  onSelectContact,
  walletAddress,
  chainPublicKey,
  signTransaction,
  signAndSendTransaction,
  currentEscrowsData,
  updateEscrows,
}) => {
  const { contacts, searchQuery, setSearchQuery } = useContacts();
  const profileHover = useContactProfileHover();
  const confirmInFlight = useRef(false);
  const [chainBusy, setChainBusy] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [currentStep, setCurrentStep] = useState<'select' | 'details' | 'review'>('select');
  
  // Escrow form state (creator is always the buyer)
  const [escrowBasis, setEscrowBasis] = useState('');
  const [escrowAmount, setEscrowAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'USDT' | 'USDC'>('USDC');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileDropActive, setFileDropActive] = useState(false);

  const clusterLabel = getClusterDisplayName();

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleContinue = () => {
    if (selectedContact) {
      setCurrentStep('details');
    }
  };

  const handleBack = () => {
    setCurrentStep('select');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Filter by size (10MB max per file)
      const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);
      setSelectedFiles([...selectedFiles, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEscrowAmount(formatAmountWithCommas(e.target.value));
  };

  const handleCreateEscrow = () => {
    if (selectedContact && escrowBasis && escrowAmount && parseAmountNumber(escrowAmount) > 0) {
      setCurrentStep('review');
    }
  };

  const handleConfirmEscrow = async () => {
    if (!selectedContact || !escrowBasis || !escrowAmount || parseAmountNumber(escrowAmount) <= 0) return;
    if (confirmInFlight.current) return;
    confirmInFlight.current = true;
    try {
    const buyer = walletAddress.trim();
    const seller = selectedContact.walletAddress.trim();
    const escrowId = `escrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();
    let finalEscrowId = escrowId;
    const nonceBn = new BN(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    const chainNonceStr = nonceBn.toString(10);
    const amountNum = parseAmountNumber(escrowAmount);

    const canSignChain =
      chainPublicKey != null &&
      signTransaction != null &&
      chainMintForPaymentMethod(paymentMethod) != null;
    const programConfigured = isOnChainEscrowConfigured();
    /** USDC + program + wallet: init on-chain first, then persist (no DB row without lock). */
    const usdcOnChainPath = paymentMethod === 'USDC' && programConfigured && canSignChain;

    if (paymentMethod === 'USDC' && !programConfigured) {
      window.alert(
        `USDC escrows lock funds on Solana ${clusterLabel}.\n\nSet VITE_ESCROW_PROGRAM_ID in .env.local (deployed program id), restart the dev server, then try again.`
      );
      return;
    }
    if (paymentMethod === 'USDC' && programConfigured && !canSignChain) {
      window.alert(
        `Connect Phantom on ${clusterLabel} so we can sign the escrow init transaction.`
      );
      return;
    }

    let chainEscrowPda: string | undefined;
    let chainInitTx: string | undefined;

    if (usdcOnChainPath) {
      setChainBusy(true);
      try {
        const { signature, escrowPda } = await chainInitEscrow(
          {
            publicKey: chainPublicKey,
            signTransaction,
            ...(signAndSendTransaction ? { signAndSendTransaction } : {}),
          },
          new PublicKey(seller.trim()),
          amountNum,
          nonceBn
        );
        chainEscrowPda = escrowPda;
        chainInitTx = signature;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('On-chain init failed:', e);
        window.alert(
          `Could not lock USDC on-chain — no escrow was saved.\n\n${msg}\n\n` +
            `Use Phantom on ${clusterLabel} with USDC and SOL for that network. Set VITE_SOLANA_RPC_URL (and optionally VITE_SOLANA_CLUSTER) so the app matches your wallet.`
        );
        return;
      } finally {
        setChainBusy(false);
      }

      const insertData: Record<string, unknown> = {
        id: escrowId,
        buyer_wallet_address: buyer.trim(),
        seller_wallet_address: seller.trim(),
        commodity: escrowBasis,
        amount: amountNum,
        status: 'waiting' as const,
        duration_days: 7,
        additional_notes: additionalNotes || null,
        payment_method: paymentMethod,
        created_by: walletAddress.trim(),
        created_at: createdAt,
        updated_at: createdAt,
        chain_nonce: chainNonceStr,
        chain_escrow_pda: chainEscrowPda,
        chain_init_tx: chainInitTx,
      };

      try {
        const { data, error: supabaseError } = await supabase
          .from('escrows')
          .insert(insertData)
          .select()
          .single();

        if (supabaseError) {
          if (supabaseError.code !== 'PGRST205' && supabaseError.code !== '42P01') {
            console.error('Error creating escrow in Supabase:', supabaseError);
          }
          if (String(supabaseError.message || '').toLowerCase().includes('chain_nonce')) {
            const { chain_nonce: _c, chain_escrow_pda: _p, chain_init_tx: _t, ...rest } = insertData;
            const retry = await supabase.from('escrows').insert(rest).select().single();
            if (!retry.error && retry.data?.id) {
              finalEscrowId = retry.data.id;
              await supabase
                .from('escrows')
                .update({
                  chain_nonce: chainNonceStr,
                  chain_escrow_pda: chainEscrowPda,
                  chain_init_tx: chainInitTx,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', finalEscrowId);
            } else {
              window.alert(
                `USDC is locked on-chain (PDA ${chainEscrowPda}) but the database row failed.\n\nInit tx: ${chainInitTx}\n\nRun supabase-setup-full.sql chain_* columns, then add this escrow manually if needed.`
              );
            }
          } else {
            window.alert(
              `USDC is locked on-chain (PDA ${chainEscrowPda}) but Supabase insert failed.\n\nInit tx: ${chainInitTx}\n\n${supabaseError.message}`
            );
          }
        } else if (data?.id) {
          finalEscrowId = data.id;
        }
      } catch (error) {
        console.error('Error creating escrow in Supabase:', error);
        window.alert(
          `USDC is locked on-chain (PDA ${chainEscrowPda}). Supabase save failed — check console.\n\nInit tx: ${chainInitTx}`
        );
      }
    } else {
      // USDT / off-chain template: Supabase only (same as before)
      try {
        const insertData: Record<string, unknown> = {
          id: escrowId,
          buyer_wallet_address: buyer.trim(),
          seller_wallet_address: seller.trim(),
          commodity: escrowBasis,
          amount: amountNum,
          status: 'waiting' as const,
          duration_days: 7,
          additional_notes: additionalNotes || null,
          payment_method: paymentMethod,
          created_by: walletAddress.trim(),
          created_at: createdAt,
          updated_at: createdAt,
        };

        const { data, error: supabaseError } = await supabase
          .from('escrows')
          .insert(insertData)
          .select()
          .single();

        if (supabaseError && supabaseError.code !== 'PGRST205' && supabaseError.code !== '42P01') {
          console.error('Error creating escrow in Supabase:', supabaseError);
        } else if (data?.id) {
          finalEscrowId = data.id;
        }
      } catch (error) {
        console.error('Error creating escrow in Supabase:', error);
      }
    }

    const newEscrow: Escrow = {
      id: finalEscrowId,
      buyer,
      seller,
      commodity: escrowBasis,
      amount: amountNum,
      status: 'waiting',
      startDate: createdAt,
      created_by: walletAddress,
      paymentMethod: paymentMethod,
      chainNonce: usdcOnChainPath ? chainNonceStr : undefined,
      chainEscrowPda,
      chainInitTx,
    };

    const updatedEscrows: EscrowsData = {
      totalAmount: currentEscrowsData.totalAmount + newEscrow.amount,
      items: [...currentEscrowsData.items, newEscrow],
    };

    updateEscrows(updatedEscrows);

    onSelectContact(selectedContact);
    onClose();
    } finally {
      confirmInFlight.current = false;
    }
  };

  const handleBackToDetails = () => {
    setCurrentStep('details');
  };

  const filteredContacts = searchQuery.trim() === ''
    ? contacts
    : contacts.filter(contact =>
        contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.walletAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contact as any).username?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <div className="wallet-modal active" onClick={onClose}>
      <div className="wallet-modal-overlay"></div>
      {profileHover.hoverLayer}
      <div className="wallet-modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Create Escrow</h2>
          {currentStep !== 'details' && (
            <p className="modal-header-subtitle">
              {currentStep === 'select' ? 'Choose a contact to create an escrow with' : 'Review and confirm escrow details'}
            </p>
          )}
        </div>

        {currentStep === 'select' ? (
          <>
            <div className="cem-stack">
              <div className="contacts-search-container" style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="contacts-search-input"
                  placeholder="Search contacts by name, email, or wallet address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="cem-scroll-list">
                {filteredContacts.length === 0 ? (
                  <div className="cem-empty">
                    {contacts.length === 0
                      ? 'No contacts yet. Add a contact first to create an escrow.'
                      : 'No contacts match your search.'}
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const initials = getInitials(contact.name || '', contact.walletAddress);
                    const isSelected = selectedContact?.walletAddress === contact.walletAddress;

                    return (
                      <div
                        key={contact.walletAddress}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectContact(contact)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectContact(contact);
                          }
                        }}
                        className={`cem-contact-row${isSelected ? ' is-selected' : ''}`}
                        onMouseEnter={(e) => profileHover.onRowMouseEnter(e, contact)}
                        onMouseLeave={profileHover.onRowMouseLeave}
                        onFocus={(e) => profileHover.onRowFocus(e, contact)}
                        onBlur={profileHover.onRowBlur}
                      >
                        <div className="cem-contact-avatar contact-avatar">{initials}</div>
                        <div className="cem-contact-body">
                          <div className="cem-contact-name">
                            {contact.name || 'Unknown'}
                            {(contact as { username?: string }).username && (
                              <span className="cem-username">@{(contact as { username?: string }).username}</span>
                            )}
                          </div>
                          <div className="cem-contact-email">{contact.email || 'No email'}</div>
                          <div className="cem-contact-wallet">
                            {contact.walletAddress.slice(0, 8)}...{contact.walletAddress.slice(-8)}
                          </div>
                          {contact.company && (
                            <div className="cem-contact-company">{contact.company}</div>
                          )}
                        </div>
                        {isSelected && <div className="cem-check" aria-hidden>✓</div>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {selectedContact && (
              <div className="cem-selected-banner">
                <strong>
                  Selected: {selectedContact.name || 'Unknown'}
                  {(selectedContact as { username?: string }).username && (
                    <span className="cem-username"> @{(selectedContact as { username?: string }).username}</span>
                  )}
                </strong>
                <div className="cem-muted">{selectedContact.email || 'No email'}</div>
              </div>
            )}

            <div className="cem-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleContinue}
                disabled={!selectedContact}
              >
                Continue
              </button>
            </div>
          </>
        ) : currentStep === 'details' ? (
          <div className="escrow-details-form">
            {/* Buyer (left) and Seller (right) with distinct colors */}
            {selectedContact && (
              <div className="cem-role-row">
                <div className="cem-role-card cem-role-card--buyer">
                  <div className="cem-role-label">Buyer</div>
                  <div className="cem-role-value">You</div>
                </div>
                <div className="cem-role-card cem-role-card--seller">
                  <div className="cem-role-label">Seller</div>
                  <div className="cem-role-value">
                    {selectedContact.name || 'Unknown'}
                    {(selectedContact as { username?: string }).username && (
                      <span className="cem-username"> @{(selectedContact as { username?: string }).username}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="escrowBasis">Escrow basis</label>
              <input
                type="text"
                id="escrowBasis"
                value={escrowBasis}
                onChange={(e) => setEscrowBasis(e.target.value)}
                placeholder="e.g., 100,000MT of EN590"
              />
              <p className="help-text">Specify the commodity, quantity, and specifications</p>
            </div>

            <div className="form-group">
              <div className="cem-label-row">
                <label htmlFor="escrowAmount">Escrow amount</label>
                <div className="cem-pay-toggles" role="group" aria-label="Payment token">
                  <button
                    type="button"
                    className={`cem-pay-btn cem-pay-btn--usdt${paymentMethod === 'USDT' ? ' is-active' : ''}`}
                    onClick={() => setPaymentMethod('USDT')}
                  >
                    <img
                      src="/images/usdt logo.png"
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                    <span>USDT</span>
                  </button>
                  <button
                    type="button"
                    className={`cem-pay-btn cem-pay-btn--usdc${paymentMethod === 'USDC' ? ' is-active' : ''}`}
                    onClick={() => setPaymentMethod('USDC')}
                  >
                    <img
                      src="/images/usdc.png"
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                    <span>USDC</span>
                  </button>
                </div>
              </div>
              <input
                type="text"
                inputMode="decimal"
                id="escrowAmount"
                value={escrowAmount}
                onChange={handleAmountChange}
                placeholder="0.00"
              />
              <p className="help-text">Amount to be held in escrow</p>
            </div>

            <div className="form-group">
              <label htmlFor="fileUpload">Supporting documents (optional)</label>
              <div
                className={`cem-dropzone${fileDropActive ? ' is-dragover' : ''}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setFileDropActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setFileDropActive(true);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setFileDropActive(false);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setFileDropActive(false);
                  const files = Array.from(e.dataTransfer.files);
                  const validFiles = files.filter((file) => file.size <= 10 * 1024 * 1024);
                  setSelectedFiles([...selectedFiles, ...validFiles]);
                }}
              >
                <input
                  type="file"
                  id="fileUpload"
                  className="hidden-input"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
                <label htmlFor="fileUpload" className="cem-dropzone-label">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p className="cem-dropzone-title">Click to upload or drag and drop</p>
                  <p className="cem-dropzone-hint">PDF, DOC, DOCX, JPG, PNG — max 10MB per file</p>
                </label>
              </div>
              {selectedFiles.length > 0 && (
                <div className="cem-file-list">
                  {selectedFiles.map((file, index) => (
                    <div key={file.name + index} className="cem-file-row">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        className="cem-file-remove"
                        onClick={() => handleRemoveFile(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="additionalNotes">Additional notes (optional)</label>
              <textarea
                id="additionalNotes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Additional details about the escrow..."
                rows={3}
              />
            </div>

            <div className="cem-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateEscrow}
                disabled={!escrowBasis || !escrowAmount || parseAmountNumber(escrowAmount) <= 0}
              >
                Review
              </button>
            </div>
          </div>
        ) : (
          <div className="escrow-review-form">
            <div className="cem-review-callout">
              <div className="cem-review-label">Review escrow details</div>
              <div className="cem-review-intro">Please confirm everything below before signing.</div>
            </div>

            <div className="cem-review-block">
              <div className="cem-review-label">Counterparty</div>
              <div className="cem-review-value">
                {selectedContact?.name || 'Unknown'}
                {selectedContact && (selectedContact as { username?: string }).username && (
                  <span className="cem-muted"> @{(selectedContact as { username?: string }).username}</span>
                )}
              </div>
            </div>

            <div className="cem-review-block">
              <div className="cem-review-label">Escrow basis</div>
              <div className="cem-review-value">{escrowBasis}</div>
            </div>

            <div className="cem-review-block">
              <div className="cem-review-label">Escrow amount</div>
              <div className="cem-review-value cem-review-value--amount">
                ${parseAmountNumber(escrowAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {paymentMethod && (
                  <img
                    src={paymentMethod === 'USDC' ? '/images/usdc.png' : '/images/usdt logo.png'}
                    alt={paymentMethod}
                    onError={(e) => {
                      e.currentTarget.style.visibility = 'hidden';
                    }}
                  />
                )}
              </div>
            </div>

            {additionalNotes && (
              <div className="cem-review-block">
                <div className="cem-review-label">Additional notes</div>
                <div className="cem-review-value cem-review-notes">{additionalNotes}</div>
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div className="cem-review-block">
                <div className="cem-review-label">Supporting documents ({selectedFiles.length})</div>
                <div className="cem-review-value">
                  {selectedFiles.map((file, index) => (
                    <div key={file.name + index}>{file.name}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="cem-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={handleBackToDetails}>
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmEscrow} disabled={chainBusy}>
                {chainBusy ? 'Signing on-chain…' : 'Confirm & create escrow'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateEscrowModal;


