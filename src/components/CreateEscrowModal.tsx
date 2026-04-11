import React, { useState, useRef, useMemo } from 'react';
import { PublicKey, Transaction, type SendOptions } from '@solana/web3.js';
import BN from 'bn.js';
import { useContacts } from '../hooks/useContacts';
import { Contact, EscrowsData, Escrow } from '../types';
import { getInitials } from '../utils/storage';
import { supabase } from '../utils/supabase';
import {
  chainInitEscrow,
  chainMintForPaymentMethod,
  getAppSolanaCluster,
  getClusterDisplayName,
  getSolanaRpcUrl,
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

  const appSolanaRpcHost = useMemo(() => {
    try {
      return new URL(getSolanaRpcUrl()).hostname;
    } catch {
      return 'Solana RPC';
    }
  }, []);

  const clusterLabel = useMemo(() => getClusterDisplayName(), []);
  const phantomSimNetwork = useMemo(
    () => (getAppSolanaCluster() === 'mainnet-beta' ? 'Mainnet' : 'Devnet'),
    []
  );

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
      <div className="wallet-modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Create Escrow</h2>
          {currentStep !== 'details' && (
            <p style={{ fontSize: '0.8rem' }}>
              {currentStep === 'select' ? 'Choose a contact to create an escrow with' : 'Review and confirm escrow details'}
            </p>
          )}
        </div>

        {currentStep === 'select' ? (
          <>
        <div style={{ marginBottom: '1rem' }}>
          <div className="contacts-search-container" style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              className="contacts-search-input"
              placeholder="Search contacts by name, email, or wallet address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '4px',
            padding: '0.5rem'
          }}>
            {filteredContacts.length === 0 ? (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: '#666' 
              }}>
                {contacts.length === 0 
                  ? 'No contacts yet. Add a contact first to create an escrow.'
                  : 'No contacts match your search.'
                }
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const initials = getInitials(contact.name || '', contact.walletAddress);
                const isSelected = selectedContact?.walletAddress === contact.walletAddress;

                return (
                  <div
                    key={contact.walletAddress}
                    onClick={() => handleSelectContact(contact)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '1rem',
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                      border: isSelected ? '2px solid var(--primary-color)' : '1px solid rgba(0,0,0,0.1)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div 
                      className="contact-avatar" 
                      style={{ 
                        marginRight: '1rem',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-light)',
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        marginBottom: '0.25rem',
                        fontSize: '1rem'
                      }}>
                        {contact.name || 'Unknown'}
                        {(contact as any).username && (
                          <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '0.5rem' }}>
                            @{(contact as any).username}
                          </span>
                        )}
                      </div>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#666',
                        marginBottom: '0.25rem'
                      }}>
                        {contact.email || 'No email'}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#999',
                        fontFamily: 'monospace'
                      }}>
                        {contact.walletAddress.slice(0, 8)}...{contact.walletAddress.slice(-8)}
                      </div>
                      {contact.company && (
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: '#666',
                          marginTop: '0.25rem'
                        }}>
                          {contact.company}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div style={{ 
                        marginLeft: '1rem',
                        color: 'var(--primary-color)',
                        fontSize: '1.5rem'
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {selectedContact && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'rgba(37, 99, 235, 0.05)', 
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Selected: {selectedContact.name || 'Unknown'}
              {(selectedContact as any).username && (
                <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '0.5rem' }}>
                  @{(selectedContact as any).username}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.9em', color: '#666' }}>
              {selectedContact.email || 'No email'}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleContinue}
            disabled={!selectedContact}
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', opacity: selectedContact ? 1 : 0.5, cursor: selectedContact ? 'pointer' : 'not-allowed' }}
          >
            Continue
          </button>
        </div>
          </>
        ) : currentStep === 'details' ? (
          <div className="escrow-details-form">
            {/* Buyer (left) and Seller (right) with distinct colors */}
            {selectedContact && (
              <div style={{ 
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '0.75rem'
              }}>
                <div style={{ 
                  flex: 1,
                  padding: '0.5rem 0.75rem', 
                  backgroundColor: 'rgba(34, 197, 94, 0.08)', 
                  borderRadius: '2.4px',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  borderLeft: '3px solid rgb(34, 197, 94)'
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgb(22, 163, 74)', fontWeight: '600', marginBottom: '0.25rem' }}>Buyer</div>
                  <div style={{ fontWeight: '600', fontSize: '0.8rem', color: 'var(--text-dark)' }}>You</div>
                </div>
                <div style={{ 
                  flex: 1,
                  padding: '0.5rem 0.75rem', 
                  backgroundColor: 'rgba(234, 179, 8, 0.1)', 
                  borderRadius: '2.4px',
                  border: '1px solid rgba(234, 179, 8, 0.35)',
                  borderLeft: '3px solid rgb(234, 179, 8)'
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgb(202, 138, 4)', fontWeight: '600', marginBottom: '0.25rem' }}>Seller</div>
                  <div style={{ fontWeight: '600', fontSize: '0.8rem', color: 'var(--text-dark)' }}>
                    {selectedContact.name || 'Unknown'}
                    {(selectedContact as any).username && (
                      <span style={{ color: 'var(--text-light)', fontSize: '0.75em', marginLeft: '0.5rem' }}>
                        @{(selectedContact as any).username}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Escrow Basis */}
            <div className="form-group" style={{ marginBottom: '0.875rem' }}>
              <label htmlFor="escrowBasis" style={{ display: 'block', marginBottom: '0.375rem', fontWeight: '600', fontSize: '0.8rem' }}>
                Escrow Basis
              </label>
              <input
                type="text"
                id="escrowBasis"
                value={escrowBasis}
                onChange={(e) => setEscrowBasis(e.target.value)}
                placeholder="e.g., 100,000MT of EN590"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '2.4px',
                  background: 'var(--bg-light)',
                  color: 'var(--text-dark)',
                  fontSize: '0.8rem'
                }}
              />
              <p style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-light)' }}>
                Specify the commodity, quantity, and specifications
              </p>
            </div>

            {/* Escrow Amount */}
            <div className="form-group" style={{ marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                <label htmlFor="escrowAmount" style={{ fontWeight: '600', fontSize: '0.8rem', marginBottom: 0 }}>
                  Escrow Amount
                </label>
                <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('USDT')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '2.4px',
                      background: paymentMethod === 'USDT' ? '#26a17b' : 'var(--bg-light)',
                      color: paymentMethod === 'USDT' ? 'white' : 'var(--text-dark)',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: paymentMethod === 'USDT' ? 1 : 0.5
                    }}
                  >
                    <img 
                      src="/images/usdt logo.png" 
                      alt="USDT"
                      style={{ width: '14px', height: '14px' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span>USDT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('USDC')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '2.4px',
                      background: paymentMethod === 'USDC' ? '#3e73c4' : 'var(--bg-light)',
                      color: paymentMethod === 'USDC' ? 'white' : 'var(--text-dark)',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: paymentMethod === 'USDC' ? 1 : 0.5
                    }}
                  >
                    <img 
                      src="/images/usdc.png" 
                      alt="USDC"
                      style={{ width: '14px', height: '14px' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
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
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '2.4px',
                  background: 'var(--bg-light)',
                  color: 'var(--text-dark)',
                  fontSize: '0.8rem'
                }}
              />
              <p style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-light)' }}>
                Amount to be held in escrow
              </p>
            </div>

            {/* Supporting Documents */}
            <div className="form-group" style={{ marginBottom: '0.875rem' }}>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: '600', fontSize: '0.8rem' }}>
                Supporting Documents (Optional)
              </label>
              <div
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '2.4px',
                  padding: '1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: 'var(--bg-light)'
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  const files = Array.from(e.dataTransfer.files);
                  const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);
                  setSelectedFiles([...selectedFiles, ...validFiles]);
                }}
              >
                <input
                  type="file"
                  id="fileUpload"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="fileUpload" style={{ cursor: 'pointer', display: 'block' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 0.375rem' }}>
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: 'var(--text-dark)' }}>
                    Click to upload documents or drag and drop
                  </p>
                  <p style={{ margin: '0.125rem 0', fontSize: '0.7rem', color: 'var(--text-light)' }}>
                    PDF, DOC, DOCX, JPG, PNG (Max 10MB per file)
                  </p>
                </label>
              </div>
              {selectedFiles.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  {selectedFiles.map((file, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.375rem 0.5rem',
                      background: 'var(--bg-light)',
                      borderRadius: '2.4px',
                      marginBottom: '0.375rem'
                    }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-light)',
                          cursor: 'pointer',
                          fontSize: '1.1rem',
                          padding: '0 0.375rem'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Notes */}
            <div className="form-group" style={{ marginBottom: '0.875rem' }}>
              <label htmlFor="additionalNotes" style={{ display: 'block', marginBottom: '0.375rem', fontWeight: '600', fontSize: '0.8rem' }}>
                Additional Notes (Optional)
              </label>
              <textarea
                id="additionalNotes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Additional details about the escrow..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '2.4px',
                  background: 'var(--bg-light)',
                  color: 'var(--text-dark)',
                  fontSize: '0.8rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleBack}
                style={{ padding: '0.5rem 0.875rem', fontSize: '0.8rem' }}
              >
                Back
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleCreateEscrow}
                disabled={!escrowBasis || !escrowAmount || parseAmountNumber(escrowAmount) <= 0}
                style={{ 
                  padding: '0.5rem 0.875rem', 
                  fontSize: '0.8rem', 
opacity: (escrowBasis && escrowAmount && parseAmountNumber(escrowAmount) > 0) ? 1 : 0.5,
                  cursor: (escrowBasis && escrowAmount && parseAmountNumber(escrowAmount) > 0) ? 'pointer' : 'not-allowed'
                }}
              >
                Review
              </button>
            </div>
          </div>
        ) : (
          <div className="escrow-review-form">
            <div style={{ marginBottom: '0.875rem', padding: '0.75rem', background: 'var(--bg-light)', borderRadius: '2.4px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: '600' }}>
                Review Escrow Details
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>
                Please review all information before confirming
              </div>
            </div>

            {/* Review Section */}
            <div style={{ marginBottom: '0.875rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: '600' }}>
                Counterparty
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', padding: '0.5rem 0.75rem', background: 'var(--bg-light)', borderRadius: '2.4px' }}>
                {selectedContact?.name || 'Unknown'}
                {selectedContact && (selectedContact as any).username && (
                  <span style={{ color: 'var(--text-light)', marginLeft: '0.5rem' }}>
                    @{(selectedContact as any).username}
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '0.875rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: '600' }}>
                Escrow Basis
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', padding: '0.5rem 0.75rem', background: 'var(--bg-light)', borderRadius: '2.4px' }}>
                {escrowBasis}
              </div>
            </div>

            <div style={{ marginBottom: '0.875rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: '600' }}>
                Escrow Amount
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', padding: '0.5rem 0.75rem', background: 'var(--bg-light)', borderRadius: '2.4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ${parseAmountNumber(escrowAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {paymentMethod && (
                  <img 
                    src={paymentMethod === 'USDC' ? '/images/usdc.png' : '/images/usdt logo.png'} 
                    alt={paymentMethod}
                    style={{ width: '16px', height: '16px' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>

            {additionalNotes && (
              <div style={{ marginBottom: '0.875rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Additional Notes
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', padding: '0.5rem 0.75rem', background: 'var(--bg-light)', borderRadius: '2.4px', whiteSpace: 'pre-wrap' }}>
                  {additionalNotes}
                </div>
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div style={{ marginBottom: '0.875rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Supporting Documents ({selectedFiles.length})
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', padding: '0.5rem 0.75rem', background: 'var(--bg-light)', borderRadius: '2.4px' }}>
                  {selectedFiles.map((file, index) => (
                    <div key={index} style={{ marginBottom: '0.25rem' }}>
                      {file.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chainBusy && paymentMethod === 'USDC' && (
              <p
                style={{
                  fontSize: '0.72rem',
                  lineHeight: 1.45,
                  color: 'var(--text-light)',
                  margin: '0 0 0.75rem',
                  padding: '0.5rem 0.65rem',
                  background: 'var(--bg-light)',
                  borderRadius: '2.4px',
                  border: '1px solid var(--border-color)',
                }}
              >
                The app already simulated this on <strong>{appSolanaRpcHost}</strong> (override with{' '}
                <code style={{ fontSize: '0.68rem' }}>VITE_SOLANA_RPC_URL</code>). Phantom simulates on its
                own {phantomSimNetwork} path, so you may see a red warning or missing USDC lines even when the
                transaction is valid. You can still confirm, or align Phantom’s {phantomSimNetwork} RPC with this
                host for matching previews.
              </p>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleBackToDetails}
                style={{ padding: '0.5rem 0.875rem', fontSize: '0.8rem' }}
              >
                Back
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleConfirmEscrow}
                disabled={chainBusy}
                style={{ 
                  padding: '0.5rem 0.875rem', 
                  fontSize: '0.8rem'
                }}
              >
                {chainBusy ? 'Signing on-chain…' : 'Confirm & Create Escrow'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateEscrowModal;


