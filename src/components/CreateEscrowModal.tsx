import React, { useState } from 'react';
import { useContacts } from '../hooks/useContacts';
import { Contact, EscrowsData, Escrow } from '../types';
import { getInitials } from '../utils/storage';
import { supabase } from '../utils/supabase';

interface CreateEscrowModalProps {
  onClose: () => void;
  onSelectContact: (contact: Contact) => void;
  walletAddress: string;
  currentEscrowsData: EscrowsData;
  updateEscrows: (data: EscrowsData) => void;
}

const CreateEscrowModal: React.FC<CreateEscrowModalProps> = ({ 
  onClose, 
  onSelectContact,
  walletAddress, 
  currentEscrowsData,
  updateEscrows
}) => {
  const { contacts, searchQuery, setSearchQuery } = useContacts();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [currentStep, setCurrentStep] = useState<'select' | 'details' | 'review'>('select');
  
  // Escrow form state
  const [role, setRole] = useState<'buyer' | 'seller' | ''>('');
  const [escrowBasis, setEscrowBasis] = useState('');
  const [escrowAmount, setEscrowAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'USDT' | 'USDC'>('USDC');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

  const handleCreateEscrow = () => {
    if (selectedContact && role && escrowBasis && escrowAmount) {
      setCurrentStep('review');
    }
  };

  const handleConfirmEscrow = async () => {
    if (!selectedContact || !role || !escrowBasis || !escrowAmount) return;

    // Determine buyer and seller based on role
    // Trim wallet addresses to avoid whitespace mismatches
    const buyer = role === 'buyer' ? walletAddress.trim() : selectedContact.walletAddress.trim();
    const seller = role === 'seller' ? walletAddress.trim() : selectedContact.walletAddress.trim();
    
    console.log(`📝 Creating escrow:`);
    console.log(`   Creator wallet: ${walletAddress.trim()}`);
    console.log(`   Buyer: ${buyer}`);
    console.log(`   Seller: ${seller}`);
    console.log(`   Role: ${role}`);

    // Create escrow ID
    const escrowId = `escrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    let finalEscrowId = escrowId;
    let supabaseInsertSuccess = false;

    // First, try to create escrow in Supabase (source of truth)
    try {
      const insertData = {
        id: escrowId,
        buyer_wallet_address: buyer.trim(),
        seller_wallet_address: seller.trim(),
        commodity: escrowBasis,
        amount: parseFloat(escrowAmount),
        status: 'waiting' as const,
        duration_days: 7, // Default duration
        additional_notes: additionalNotes || null,
        payment_method: paymentMethod,
        created_by: walletAddress.trim(),
        created_at: createdAt,
        updated_at: createdAt
      };
      
      console.log('📤 Inserting escrow to Supabase:', insertData);
      
      const { data, error: supabaseError } = await supabase
        .from('escrows')
        .insert(insertData)
        .select()
        .single();

      if (supabaseError) {
        // If table doesn't exist, log and use localStorage fallback
        if (supabaseError.code === 'PGRST205' || supabaseError.code === '42P01') {
          console.log('Escrows table not found in Supabase, using localStorage fallback');
        } else {
          console.error('❌ Error creating escrow in Supabase:', supabaseError);
          console.error(`   Error code: ${supabaseError.code}, Message: ${supabaseError.message}`);
          console.error(`   Error details:`, supabaseError);
        }
      } else {
        console.log('✅ Escrow created successfully in Supabase:', data);
        supabaseInsertSuccess = true;
        // Use the ID returned from Supabase (in case it's different)
        if (data?.id) {
          finalEscrowId = data.id;
          console.log('Using Supabase ID:', finalEscrowId);
        }
        
        // Verify the escrow was saved correctly by fetching it back
        const { data: verifyData, error: verifyError } = await supabase
          .from('escrows')
          .select('*')
          .eq('id', finalEscrowId)
          .single();
        
        if (verifyError) {
          console.error('❌ Error verifying escrow in Supabase:', verifyError);
        } else {
          console.log('✅ Verified escrow exists in Supabase:', verifyData);
          console.log(`   Status: ${verifyData?.status}, Buyer: ${verifyData?.buyer_wallet_address}, Seller: ${verifyData?.seller_wallet_address}`);
          
          // Test if the other user (recipient) can see this escrow
          const otherUserWallet = (buyer.trim() === walletAddress.trim()) ? seller.trim() : buyer.trim();
          console.log(`🔍 Testing if other user (${otherUserWallet}) can see this escrow...`);
          
          const { data: recipientView, error: recipientError } = await supabase
            .from('escrows')
            .select('*')
            .or(`buyer_wallet_address.eq.${otherUserWallet},seller_wallet_address.eq.${otherUserWallet}`)
            .eq('id', finalEscrowId)
            .single();
          
          if (recipientError) {
            console.error(`❌ Other user (${otherUserWallet}) CANNOT see this escrow:`, recipientError);
            console.error(`   Error code: ${recipientError.code}, Message: ${recipientError.message}`);
          } else {
            console.log(`✅ Other user (${otherUserWallet}) CAN see this escrow:`, recipientView);
          }
        }
      }
    } catch (error) {
      console.error('❌ Exception creating escrow in Supabase:', error);
    }

    // Create new escrow object with final ID
    const newEscrow: Escrow = {
      id: finalEscrowId,
      buyer,
      seller,
      commodity: escrowBasis,
      amount: parseFloat(escrowAmount),
      status: 'waiting',
      startDate: createdAt,
      created_by: walletAddress,
      paymentMethod: paymentMethod
    };

    // Update local state for current user
    // If Supabase succeeded, this will just update local cache
    // If Supabase failed, this will save to localStorage as fallback
    const updatedEscrows: EscrowsData = {
      totalAmount: currentEscrowsData.totalAmount + newEscrow.amount,
      items: [...currentEscrowsData.items, newEscrow]
    };

    // Always call updateEscrows to update local state
    // If Supabase insert succeeded, the upsert will just update the existing record
    // If Supabase insert failed, the upsert will create it
    console.log(`📝 Calling updateEscrows (Supabase insert ${supabaseInsertSuccess ? 'succeeded' : 'failed'})`);
    updateEscrows(updatedEscrows);

    // IMPORTANT: Do NOT save to other user's localStorage
    // The other user will fetch this escrow from Supabase when they load their page
    // Supabase is the source of truth for cross-user data

    onSelectContact(selectedContact);
    onClose();
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
      <div className="wallet-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', padding: '0.875rem' }}>
        <div className="wallet-modal-header" style={{ marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Create Escrow</h2>
          <p style={{ fontSize: '0.8rem' }}>
            {currentStep === 'select' ? 'Choose a contact to create an escrow with' : 
             currentStep === 'details' ? 'Fill in the escrow details' : 
             'Review and confirm escrow details'}
          </p>
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
              style={{ width: '100%' }}
            />
            <span className="search-icon">🔍</span>
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
            {/* Selected Contact Display */}
            {selectedContact && (
              <div style={{ 
                padding: '0.5rem 0.75rem', 
                backgroundColor: 'rgba(37, 99, 235, 0.05)', 
                borderRadius: '2.4px',
                marginBottom: '0.75rem',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                  Creating escrow with:
                </div>
                <div style={{ fontWeight: '600', fontSize: '0.8rem', color: 'var(--text-dark)' }}>
                  {selectedContact.name || 'Unknown'}
                  {(selectedContact as any).username && (
                    <span style={{ color: 'var(--text-light)', fontSize: '0.75em', marginLeft: '0.5rem' }}>
                      @{(selectedContact as any).username}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* I am - Role Selection */}
            <div className="form-group" style={{ marginBottom: '0.875rem' }}>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: '600', fontSize: '0.8rem' }}>
                I am
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setRole('buyer')}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '2.4px',
                    background: role === 'buyer' ? 'var(--primary-color)' : 'var(--bg-light)',
                    color: role === 'buyer' ? 'var(--white)' : 'var(--text-dark)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontWeight: '600',
                    opacity: role === 'buyer' ? 1 : 0.6
                  }}
                >
                  Buyer
                </button>
                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '2.4px',
                    background: role === 'seller' ? 'var(--primary-color)' : 'var(--bg-light)',
                    color: role === 'seller' ? 'var(--white)' : 'var(--text-dark)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontWeight: '600',
                    opacity: role === 'seller' ? 1 : 0.6
                  }}
                >
                  Seller
                </button>
              </div>
            </div>

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
                type="number"
                id="escrowAmount"
                value={escrowAmount}
                onChange={(e) => setEscrowAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
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
                disabled={!role || !escrowBasis || !escrowAmount}
                style={{ 
                  padding: '0.5rem 0.875rem', 
                  fontSize: '0.8rem', 
                  opacity: (role && escrowBasis && escrowAmount) ? 1 : 0.5, 
                  cursor: (role && escrowBasis && escrowAmount) ? 'pointer' : 'not-allowed' 
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
                Your Role
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', padding: '0.5rem 0.75rem', background: 'var(--bg-light)', borderRadius: '2.4px', textTransform: 'capitalize' }}>
                {role}
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
                ${parseFloat(escrowAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                style={{ 
                  padding: '0.5rem 0.875rem', 
                  fontSize: '0.8rem'
                }}
              >
                Confirm & Create Escrow
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateEscrowModal;


