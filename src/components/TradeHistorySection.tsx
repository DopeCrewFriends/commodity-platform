import React, { useMemo, useState } from 'react';
import { TradeHistory, Trade } from '../types';
import { getInitials } from '../utils/storage';
import { useProfilesCache } from '../hooks/useProfilesCache';
import { flattenTradeHistoryForDisplay } from '../utils/escrowTradeHistory';

interface TradeHistorySectionProps {
  tradeHistory: TradeHistory;
  walletAddress: string;
}

function statusPillLabel(status: Trade['status']): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'ongoing':
      return 'Ongoing';
    case 'unsuccessful':
      return 'Unsuccessful';
    default:
      return status;
  }
}

const TradeHistorySection: React.FC<TradeHistorySectionProps> = ({ tradeHistory, walletAddress }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const trades = useMemo(() => flattenTradeHistoryForDisplay(tradeHistory), [tradeHistory]);

  const walletAddresses = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => {
      set.add(t.buyer);
      set.add(t.seller);
    });
    return Array.from(set);
  }, [trades]);

  const { profiles } = useProfilesCache(walletAddresses);

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const me = walletAddress.trim();

  return (
    <div className="trade-history-panel active-escrows-section escrows-section" id="tradeHistoryPanel">
      <div className="escrows-header-card" id="tradeHistoryHeaderCard">
        <div className="escrows-header-content">
          <div className="escrows-title-section">
            <h2>Trade History</h2>
          </div>
        </div>
        <div className="active-escrows-content" id="tradeHistoryContent">
          <div className="active-escrows-list" id="tradeHistoryList">
            {trades.length === 0 ? (
              <div className="no-escrows-message" id="noTradesMessage">
                <p>No trades yet</p>
              </div>
            ) : (
              trades.map((trade, index) => {
                const id = trade.id || `trade-${index}`;
                const isExpanded = expandedId === id;
                const buyerProfile = profiles[trade.buyer];
                const sellerProfile = profiles[trade.seller];
                const buyerInitials = buyerProfile
                  ? getInitials(buyerProfile.name || '', buyerProfile.username || '')
                  : getInitials(trade.buyer, trade.buyer);
                const sellerInitials = sellerProfile
                  ? getInitials(sellerProfile.name || '', sellerProfile.username || '')
                  : getInitials(trade.seller, trade.seller);
                const isBuyer = trade.buyer.trim() === me;
                const isSeller = trade.seller.trim() === me;
                const amountStr = `$${trade.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                return (
                  <div
                    key={id}
                    className={`escrow-card trade-history-card ${isExpanded ? 'escrow-card-expanded' : ''}`}
                    data-trade-id={id}
                    data-status={trade.status}
                  >
                    <div className="escrow-card__accent" aria-hidden />
                    <div className="escrow-card__inner">
                      <button
                        type="button"
                        className="escrow-card-header"
                        onClick={() => toggleExpanded(id)}
                        aria-expanded={isExpanded}
                        aria-controls={`trade-body-${id}`}
                      >
                        <span className="escrow-card-summary">{trade.commodity}</span>
                        <span className="escrow-card-amount-wrap">
                          <span className="escrow-card-amount">{amountStr}</span>
                        </span>
                        <span className={`escrow-card-status-pill ${trade.status}`}>
                          {statusPillLabel(trade.status)}
                        </span>
                        <span className="escrow-card-chevron" aria-hidden>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </button>

                      <div id={`trade-body-${id}`} className="escrow-card-body" hidden={!isExpanded}>
                        <div className="escrow-card-parties">
                          <div className={`escrow-party buyer ${isBuyer ? 'escrow-party--you' : ''}`}>
                            <div className="escrow-party-avatar">{buyerInitials}</div>
                            <div className="escrow-party-info">
                              <span className="escrow-party-role">Buyer{isBuyer ? ' (you)' : ''}</span>
                              <span className="escrow-party-name">
                                {buyerProfile?.name || 'Unknown'}
                                {buyerProfile?.username && (
                                  <span className="escrow-party-username">@{buyerProfile.username}</span>
                                )}
                              </span>
                            </div>
                          </div>
                          <span className="escrow-party-arrow" aria-hidden>
                            ↔
                          </span>
                          <div className={`escrow-party seller ${isSeller ? 'escrow-party--you' : ''}`}>
                            <div className="escrow-party-avatar">{sellerInitials}</div>
                            <div className="escrow-party-info">
                              <span className="escrow-party-role">Seller{isSeller ? ' (you)' : ''}</span>
                              <span className="escrow-party-name">
                                {sellerProfile?.name || 'Unknown'}
                                {sellerProfile?.username && (
                                  <span className="escrow-party-username">@{sellerProfile.username}</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="trade-history-meta">
                          <span className="trade-history-meta__item">Duration: {trade.duration}</span>
                          <span className="trade-history-meta__item">{trade.date}</span>
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
  );
};

export default TradeHistorySection;
