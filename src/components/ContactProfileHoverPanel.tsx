import React, { useEffect, useRef, useState } from 'react';
import { ProfileData, Statistics } from '../types';
import { getInitials } from '../utils/storage';
import { buildStatisticsSnapshotForProfile, formatStatisticDisplay } from '../utils/profileStats';
import { fetchPublicProfileStats, mapPublicStatsRowToStatistics } from '../utils/supabasePublicProfileStats';

function showField(v?: string | null): string | undefined {
  const t = v?.trim();
  return t || undefined;
}

interface ContactProfileHoverPanelProps {
  profile: Partial<ProfileData>;
}

/** Compact profile summary (dashboard profile panel fields, read-only). */
const ContactProfileHoverPanel: React.FC<ContactProfileHoverPanelProps> = ({ profile }) => {
  const initials = getInitials(profile.name || '', profile.walletAddress || profile.username || '');
  const wallet = showField(profile.walletAddress);
  const usernameDisplay = showField(profile.username);

  const profileRef = useRef(profile);
  profileRef.current = profile;

  const [stats, setStats] = useState<Statistics>(() => buildStatisticsSnapshotForProfile(profile));

  useEffect(() => {
    const p = profileRef.current;
    setStats(buildStatisticsSnapshotForProfile(p));
    const w = p.walletAddress?.trim();
    if (!w) return;

    let cancelled = false;
    fetchPublicProfileStats(w).then((row) => {
      if (cancelled) return;
      setStats(mapPublicStatsRowToStatistics(row, profileRef.current));
    });

    return () => {
      cancelled = true;
    };
  }, [profile.walletAddress, profile.profileCreatedAt]);

  return (
    <div className="cem-profile-hover-panel-inner">
      <div className="cem-profile-hover-header">
        {profile.avatarImage ? (
          <img src={profile.avatarImage} alt="" className="cem-profile-hover-avatar-img" width={48} height={48} />
        ) : (
          <div className="cem-profile-hover-avatar" aria-hidden>
            {initials}
          </div>
        )}
        <div className="cem-profile-hover-titles">
          <div className="cem-profile-hover-name">{showField(profile.name) || 'Unknown'}</div>
          {usernameDisplay ? <div className="cem-profile-hover-username">@{usernameDisplay}</div> : null}
        </div>
      </div>
      <div className="cem-profile-hover-info">
        <div className="cem-profile-hover-row">
          <span className="cem-profile-hover-label">Location</span>
          <span className="cem-profile-hover-value">{showField(profile.location) || '—'}</span>
        </div>
        <div className="cem-profile-hover-row">
          <span className="cem-profile-hover-label">Email</span>
          <span className="cem-profile-hover-value cem-profile-hover-value--wrap">
            {showField(profile.email) || '—'}
          </span>
        </div>
        <div className="cem-profile-hover-row">
          <span className="cem-profile-hover-label">Company</span>
          <span className="cem-profile-hover-value cem-profile-hover-value--wrap">
            {showField(profile.company) || '—'}
          </span>
        </div>
        <div className="cem-profile-hover-row">
          <span className="cem-profile-hover-label">Wallet</span>
          <span className="cem-profile-hover-value cem-profile-hover-value--mono cem-profile-hover-value--wrap">
            {wallet || '—'}
          </span>
        </div>
      </div>

      <div className="cem-profile-hover-stats" aria-label="Trading stats">
        <div className="cem-profile-hover-stat">
          <span className="cem-profile-hover-stat-label">Member since</span>
          <span className="cem-profile-hover-stat-value">{stats.memberSince?.trim() ? stats.memberSince : '—'}</span>
        </div>
        <div className="cem-profile-hover-stat">
          <span className="cem-profile-hover-stat-label">Completed trades</span>
          <span className="cem-profile-hover-stat-value">{stats.completedTrades}</span>
        </div>
        <div className="cem-profile-hover-stat">
          <span className="cem-profile-hover-stat-label">Total volume</span>
          <span className="cem-profile-hover-stat-value">{formatStatisticDisplay(stats.totalVolume, 'volume')}</span>
        </div>
        <div className="cem-profile-hover-stat">
          <span className="cem-profile-hover-stat-label">Success rate</span>
          <span className="cem-profile-hover-stat-value">{formatStatisticDisplay(stats.successRate, 'rate')}</span>
        </div>
        <div className="cem-profile-hover-stat">
          <span className="cem-profile-hover-stat-label">Rating</span>
          <span className="cem-profile-hover-stat-value">{formatStatisticDisplay(stats.rating, 'rating')}</span>
        </div>
      </div>
    </div>
  );
};

export default ContactProfileHoverPanel;
