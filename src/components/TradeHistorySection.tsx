import React from 'react';
import { TradeHistory } from '../types';
import { getInitials } from '../utils/storage';

interface TradeHistorySectionProps {
  tradeHistory: TradeHistory;
  activeFilter: 'completed' | 'ongoing' | 'unsuccessful';
  onFilterChange: (filter: 'completed' | 'ongoing' | 'unsuccessful') => void;
}

const TradeHistorySection: React.FC<TradeHistorySectionProps> = ({ 
  tradeHistory, 
  activeFilter, 
  onFilterChange 
}) => {
  const getTradesForFilter = () => {
    switch (activeFilter) {
      case 'completed':
        return tradeHistory.completed || [];
      case 'ongoing':
        return tradeHistory.ongoing || [];
      case 'unsuccessful':
        return tradeHistory.unsuccessful || [];
      default:
        return [];
    }
  };

  const trades = getTradesForFilter();

  return (
    <div className="trade-partners-dropdown" id="tradePartnersDropdown">
      <div className="dropdown-header">
        <h3>Trade History</h3>
        <div className="trade-filters">
          <button 
            className={`filter-btn ${activeFilter === 'completed' ? 'active' : ''}`}
            data-filter="completed"
            onClick={() => onFilterChange('completed')}
          >
            Completed
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'ongoing' ? 'active' : ''}`}
            data-filter="ongoing"
            onClick={() => onFilterChange('ongoing')}
          >
            Ongoing
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'unsuccessful' ? 'active' : ''}`}
            data-filter="unsuccessful"
            onClick={() => onFilterChange('unsuccessful')}
          >
            Unsuccessful
          </button>
        </div>
        <span className="dropdown-arrow">▼</span>
      </div>
      <div className="trade-partners-list" id="tradePartnersList">
        {trades.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)' }}>
            No {activeFilter} trades
          </div>
        ) : (
          trades.map((trade, index) => {
            const buyerInitials = getInitials(trade.buyer, trade.buyer);
            const sellerInitials = getInitials(trade.seller, trade.seller);
            const isBuyer = trade.buyer === 'JD' || trade.buyer.toLowerCase().includes('jd');
            
            return (
              <div 
                key={trade.id || index} 
                className={`trade-item ${trade.status}`}
                data-trade-id={trade.id || index}
              >
                <div className="trade-profiles">
                  <div className={`profile-badge ${isBuyer ? 'buyer' : 'seller'}`}>
                    <div className="profile-avatar-small">{buyerInitials}</div>
                    <span className="profile-role">Buyer</span>
                  </div>
                  <div className="trade-arrow">↔</div>
                  <div className={`profile-badge ${!isBuyer ? 'buyer' : 'seller'}`}>
                    <div className="profile-avatar-small">{sellerInitials}</div>
                    <span className="profile-role">Seller</span>
                  </div>
                </div>
                <div className="trade-details">
                  <h4 className="trade-commodity">{trade.commodity}</h4>
                  <div className="trade-meta">
                    <span className="trade-amount">${trade.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="trade-duration">⏱️ {trade.duration}</span>
                  </div>
                  <p className="trade-date">{trade.date}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TradeHistorySection;

