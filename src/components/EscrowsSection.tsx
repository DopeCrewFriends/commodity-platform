import React, { useState } from 'react';
import { EscrowsData, Contact } from '../types';
import { getInitials } from '../utils/storage';
import CreateEscrowModal from './CreateEscrowModal';

interface EscrowsSectionProps {
  escrowsData: EscrowsData;
  walletAddress: string;
}

const EscrowsSection: React.FC<EscrowsSectionProps> = ({ escrowsData, walletAddress }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateEscrow = () => {
    setShowCreateModal(true);
  };

  const handleSelectContact = (contact: Contact) => {
    // TODO: Implement escrow creation with selected contact
    console.log('Creating escrow with contact:', contact);
    // Here you would typically:
    // 1. Open another modal/form to enter escrow details (amount, commodity, etc.)
    // 2. Submit the escrow creation
    // 3. Update the escrows list
  };

  return (
    <>
      <div className="active-escrows-section">
        <div className="escrows-header-card" id="escrowsHeaderCard">
          <div className="escrows-actions">
            <button className="btn btn-primary create-escrow-btn" id="createEscrowBtn" onClick={handleCreateEscrow}>
              <span>➕</span>
              Create Escrow
            </button>
          </div>
        <div className="escrows-header-content">
          <div className="escrows-title-section">
            <h2>Active Escrows</h2>
            <div className="escrows-total">
              <span className="total-label">Total in Escrow</span>
              <span className="total-amount" id="totalEscrowValue">
                ${escrowsData.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
        
        <div className="active-escrows-content" id="activeEscrowsContent">
          <div className="active-escrows-list" id="activeEscrowsList">
            {escrowsData.items.length === 0 ? (
              <div className="no-escrows-message" id="noEscrowsMessage" style={{ display: 'block' }}>
                <p>No active escrows</p>
              </div>
            ) : (
              escrowsData.items.map((escrow, index) => {
                const buyerInitials = getInitials(escrow.buyer, escrow.buyer);
                const sellerInitials = getInitials(escrow.seller, escrow.seller);
                
                return (
                  <div 
                    key={escrow.id || index}
                    className="active-escrow-item" 
                    data-escrow-id={escrow.id || index}
                  >
                    <div className="escrow-profiles">
                      <div className="profile-badge buyer">
                        <div className="profile-avatar-small">{buyerInitials}</div>
                        <span className="profile-role">Buyer</span>
                      </div>
                      <div className="trade-arrow">↔</div>
                      <div className="profile-badge seller">
                        <div className="profile-avatar-small">{sellerInitials}</div>
                        <span className="profile-role">Seller</span>
                      </div>
                    </div>
                    <div className="escrow-details">
                      <h4 className="escrow-commodity">{escrow.commodity}</h4>
                      <div className="escrow-meta">
                        <span className="escrow-amount">
                          ${escrow.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`escrow-status ${escrow.status.toLowerCase().replace(' ', '-')}`}>
                          {escrow.status}
                        </span>
                      </div>
                      <p className="escrow-date">Started: {escrow.startDate}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      </div>

      {showCreateModal && (
        <CreateEscrowModal
          walletAddress={walletAddress}
          onClose={() => setShowCreateModal(false)}
          onSelectContact={handleSelectContact}
        />
      )}
    </>
  );
};

export default EscrowsSection;

