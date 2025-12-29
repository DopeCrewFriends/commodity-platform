import React, { useState } from 'react';
import { ProfileData, Statistics } from '../types';
import { getInitials, clearAllUserData } from '../utils/storage';

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

  const handleClearData = () => {
    if (confirm('Are you sure you want to delete ALL user data? This will clear all profiles, contacts, escrows, and other data. This action cannot be undone.')) {
      clearAllUserData();
      alert('All user data has been cleared. Please refresh the page.');
      window.location.reload();
    }
  };

  return (
    <div className="profile-section" id="profileCard">
      <div className="profile-actions">
        <button className="btn btn-primary edit-profile-btn" id="editProfileBtn" onClick={onEditClick}>
          <span>✏️</span>
          Edit Profile
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={handleClearData}
          style={{ 
            marginLeft: '0.5rem',
            fontSize: '0.75rem',
            padding: '0.375rem 0.75rem'
          }}
          title="Clear all user data"
        >
          🗑️ Clear Data
        </button>
      </div>
      <div className="profile-avatar-display-container">
        <div className="profile-avatar">
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
            <div className="avatar-placeholder">{initials}</div>
          )}
        </div>
        <div className="profile-name-username">
          <h1 className={`profile-name ${!profileData.name?.trim() ? 'placeholder-text' : ''}`}>
            {profileData.name?.trim() || 'Your Name'}
          </h1>
          {(profileData as any).username && (
            <span className="username-value">@{(profileData as any).username}</span>
          )}
        </div>
      </div>
      <div className="profile-header">
        <div className="profile-info">
          <div className="profile-info-left">
            <div className="profile-field-group">
              <label className="field-label">Location:</label>
              <div className="profile-field-value">
                <span className={`location-text ${!profileData.location?.trim() ? 'placeholder-text' : ''}`}>
                  {profileData.location?.trim() || 'Your Location'}
                </span>
              </div>
            </div>
            <div className="profile-field-group">
              <label className="field-label">Company:</label>
              <div className="profile-field-value">
                <span className={`company-name ${!profileData.company?.trim() ? 'placeholder-text' : ''}`}>
                  {profileData.company?.trim() || 'Your Company'}
                </span>
              </div>
            </div>
          </div>
          <div className="profile-info-right">
            <div className="profile-field-group">
              <label className="field-label">Email:</label>
              <div className="profile-field-value">
                <span className={`profile-email ${!profileData.email?.trim() ? 'placeholder-text' : ''}`}>
                  {profileData.email?.trim() || 'your.email@example.com'}
                </span>
              </div>
            </div>
            <div className="profile-field-group">
              <label className="field-label">Wallet:</label>
              <div className="profile-field-value">
                <span 
                  className="wallet-address-text copyable-wallet" 
                  id="profileWalletAddress"
                  onClick={copyWalletAddress}
                  style={{ cursor: 'pointer' }}
                >
                  {walletAddress}
                </span>
                <span className="copy-icon" id="profileCopyIcon" onClick={copyWalletAddress} style={{ cursor: 'pointer', marginLeft: '0.5rem' }}>📋</span>
                {copyFeedback && (
                  <span className="copy-feedback" id="profileCopyFeedback" style={{ display: 'inline', marginLeft: '0.5rem' }}>Copied!</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="profile-stats">
        <div className="profile-stat-item">
          <div className="stat-value">Member Since</div>
          <div className="stat-label" id="memberSince">{statistics.memberSince || '-'}</div>
        </div>
        <div className="profile-stat-item">
          <div className="stat-value">Completed Trades</div>
          <div className="stat-label" id="completedTrades">{statistics.completedTrades || 0}</div>
        </div>
        <div className="profile-stat-item">
          <div className="stat-value">Total Volume</div>
          <div className="stat-label" id="totalVolume">{formatStatValue(statistics.totalVolume, 'volume')}</div>
        </div>
        <div className="profile-stat-item">
          <div className="stat-value">Success Rate</div>
          <div className="stat-label" id="successRate">{formatStatValue(statistics.successRate, 'rate')}</div>
        </div>
        <div className="profile-stat-item">
          <div className="stat-value">Rating</div>
          <div className="stat-label" id="rating">{formatStatValue(statistics.rating, 'rating')}</div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;

