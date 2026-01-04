import React, { useState } from 'react';
import { ProfileData, Statistics } from '../types';
import { getInitials } from '../utils/storage';

interface ProfileCardProps {
  profileData: ProfileData;
  statistics: Statistics;
  onEditClick: () => void;
  walletAddress: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profileData, statistics, onEditClick, walletAddress }) => {
  const [copyFeedback, setCopyFeedback] = useState(false);
  
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

  const formatStatValue = (value: string | number | null, type: string): string => {
    if (value === null || value === undefined) return '-';
    if (type === 'volume') {
      return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (type === 'rate') {
      return `${value}%`;
    }
    if (type === 'rating') {
      return `⭐ ${value}/5.0`;
    }
    return String(value);
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
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  boxShadow: 'var(--shadow)'
                }}
              />
            ) : (
              <div className="avatar-placeholder-large">{initials}</div>
            )}
          </div>
          <div className="profile-name-section">
            <h1 className={`profile-name-large ${!profileData.name?.trim() ? 'placeholder-text' : ''}`}>
              {profileData.name?.trim() || 'Your Name'}
            </h1>
            {(profileData as any).username && (
              <span className="username-value-large">@{(profileData as any).username}</span>
            )}
          </div>
        </div>
        <button className="btn btn-primary edit-profile-btn-new" id="editProfileBtn" onClick={onEditClick}>
          Edit
        </button>
      </div>
      
      <div className="profile-info-section">
        <div className="profile-info-grid">
          <div className="profile-info-item">
            <span className="info-label">Location</span>
            <span className={`info-value ${!profileData.location?.trim() ? 'placeholder-text' : ''}`}>
              {profileData.location?.trim() || 'Your Location'}
            </span>
          </div>
          <div className="profile-info-item">
            <span className="info-label">Email</span>
            <span className={`info-value ${!profileData.email?.trim() ? 'placeholder-text' : ''}`}>
              {profileData.email?.trim() || 'your.email@example.com'}
            </span>
          </div>
          <div className="profile-info-item">
            <span className="info-label">Company</span>
            <span className={`info-value ${!profileData.company?.trim() ? 'placeholder-text' : ''}`}>
              {profileData.company?.trim() || 'Your Company'}
            </span>
          </div>
          <div className="profile-info-item">
            <span className="info-label">Wallet</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span 
                className="info-value wallet-address-text copyable-wallet" 
                id="profileWalletAddress"
                onClick={copyWalletAddress}
                style={{ cursor: 'pointer' }}
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

      <div className="profile-stats-section">
        <div className="profile-stats-grid">
          <div className="profile-stat-card">
            <div className="stat-label-new">Member Since</div>
            <div className="stat-value-new" id="memberSince">{statistics.memberSince || '-'}</div>
          </div>
          <div className="profile-stat-card">
            <div className="stat-label-new">Completed Trades</div>
            <div className="stat-value-new" id="completedTrades">{statistics.completedTrades || 0}</div>
          </div>
          <div className="profile-stat-card">
            <div className="stat-label-new">Total Volume</div>
            <div className="stat-value-new" id="totalVolume">{formatStatValue(statistics.totalVolume, 'volume')}</div>
          </div>
          <div className="profile-stat-card">
            <div className="stat-label-new">Success Rate</div>
            <div className="stat-value-new" id="successRate">{formatStatValue(statistics.successRate, 'rate')}</div>
          </div>
          <div className="profile-stat-card">
            <div className="stat-label-new">Rating</div>
            <div className="stat-value-new" id="rating">{formatStatValue(statistics.rating, 'rating')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;

