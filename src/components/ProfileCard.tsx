import React, { useMemo, useState } from 'react';
import { Escrow, ProfileData, Statistics, TradeHistory } from '../types';
import { getInitials } from '../utils/storage';
import { mergeTradeHistoryWithEscrows } from '../utils/escrowTradeHistory';
import { computeTradeDerivedStats, formatStatisticDisplay } from '../utils/profileStats';

interface ProfileCardProps {
  profileData: ProfileData;
  statistics: Statistics;
  onEditClick?: () => void;
  walletAddress: string;
  /** When set, completed trades / volume / success rate match merged trade history + escrows (same as the trade panel). */
  tradeHistory?: TradeHistory;
  escrows?: Escrow[];
  /** Hide Edit (e.g. public profile page). */
  showEditButton?: boolean;
  /** Public profile copy uses neutral placeholders instead of “Your …”. */
  profileVariant?: 'self' | 'public';
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profileData,
  statistics,
  onEditClick,
  walletAddress,
  tradeHistory,
  escrows = [],
  showEditButton = true,
  profileVariant = 'self',
}) => {
  const [copyFeedback, setCopyFeedback] = useState(false);

  const displayStats = useMemo(() => {
    if (tradeHistory) {
      const merged = mergeTradeHistoryWithEscrows(tradeHistory, escrows);
      const derived = computeTradeDerivedStats(merged, walletAddress);
      return {
        ...statistics,
        completedTrades: derived.completedTrades,
        totalVolume: derived.totalVolume,
        successRate: derived.successRate
      };
    }
    return statistics;
  }, [statistics, tradeHistory, escrows, walletAddress]);

  const pub = profileVariant === 'public';
  const ph = (selfLabel: string, publicFallback: string) => (pub ? publicFallback : selfLabel);

  const initials = profileData.avatarImage 
    ? null 
    : getInitials(profileData.name || '', walletAddress);

  const copyWalletAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="profile-section" id="profileCard">
      <div className="profile-header-new">
        <div className="profile-avatar-name-section">
          <div className="profile-avatar-large">
            {profileData.avatarImage ? (
              <img 
                src={profileData.avatarImage} 
                alt="Profile" 
                className="profile-avatar-img"
              />
            ) : (
              <div className="avatar-placeholder-large">{initials}</div>
            )}
          </div>
          <div className="profile-name-section">
            <h2 className={`profile-name-large ${!profileData.name?.trim() ? 'placeholder-text' : ''}`}>
              {profileData.name?.trim() || ph('Your Name', '—')}
            </h2>
            {profileData.username ? (
              <span className="username-value-large">@{profileData.username}</span>
            ) : null}
          </div>
        </div>
        {showEditButton ? (
          <button
            type="button"
            className="btn btn-primary edit-profile-btn-new"
            id="editProfileBtn"
            onClick={() => onEditClick?.()}
          >
            Edit
          </button>
        ) : null}
      </div>
      
      <div className="profile-info-section">
        <div className="profile-info-grid">
          <div className="profile-info-item">
            <span className="info-label">Location</span>
            <span className={`info-value ${!profileData.location?.trim() ? 'placeholder-text' : ''}`}>
              {profileData.location?.trim() || ph('Your Location', '—')}
            </span>
          </div>
          <div className="profile-info-item">
            <span className="info-label">Email</span>
            <span className={`info-value ${!profileData.email?.trim() ? 'placeholder-text' : ''}`}>
              {profileData.email?.trim() || ph('your.email@example.com', '—')}
            </span>
          </div>
          <div className="profile-info-item">
            <span className="info-label">Company</span>
            <span className={`info-value ${!profileData.company?.trim() ? 'placeholder-text' : ''}`}>
              {profileData.company?.trim() || ph('Your Company', '—')}
            </span>
          </div>
          <div className="profile-info-item">
            <span className="info-label">Wallet</span>
            <div className="wallet-row">
              <span 
                className="info-value wallet-address-text copyable-wallet" 
                id="profileWalletAddress"
                onClick={copyWalletAddress}
              >
                {walletAddress}
              </span>
              {copyFeedback && (
                <span className="copy-feedback" id="profileCopyFeedback">Copied!</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-stats-section profile-stats-section--inst">
        <div className="profile-stats-grid profile-stats-grid--inst">
          <div className="profile-stat-card profile-stat-card--inst">
            <div className="stat-label-new">Member since</div>
            <div className="stat-value-new" id="memberSince">
              {displayStats.memberSince?.trim() ? displayStats.memberSince : '—'}
            </div>
          </div>
          <div className="profile-stat-card profile-stat-card--inst">
            <div className="stat-label-new">Completed trades</div>
            <div className="stat-value-new" id="completedTrades">
              {displayStats.completedTrades}
            </div>
          </div>
          <div className="profile-stat-card profile-stat-card--inst">
            <div className="stat-label-new">Total volume</div>
            <div className="stat-value-new" id="totalVolume">
              {formatStatisticDisplay(displayStats.totalVolume, 'volume')}
            </div>
          </div>
          <div className="profile-stat-card profile-stat-card--inst">
            <div className="stat-label-new">Success rate</div>
            <div className="stat-value-new" id="successRate">
              {formatStatisticDisplay(displayStats.successRate, 'rate')}
            </div>
          </div>
          <div className="profile-stat-card profile-stat-card--inst">
            <div className="stat-label-new">Rating</div>
            <div className="stat-value-new" id="rating">
              {formatStatisticDisplay(displayStats.rating, 'rating')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;

