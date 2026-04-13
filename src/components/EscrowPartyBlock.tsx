import React from 'react';
import { Link } from 'react-router-dom';
import { profilePath } from '../utils/profilePaths';

export interface EscrowPartyBlockProps {
  partyClass: 'buyer' | 'seller';
  /** e.g. `Buyer`, `Seller`, or `Buyer (you)` for trade history */
  roleLabel: string;
  initials: string;
  displayName: string;
  username: string | null | undefined;
  /** Adds `escrow-party--you` for dashboard styling */
  highlightYou?: boolean;
}

const EscrowPartyBlock: React.FC<EscrowPartyBlockProps> = ({
  partyClass,
  roleLabel,
  initials,
  displayName,
  username,
  highlightYou,
}) => {
  const u = username?.trim();
  const href = u ? profilePath(u) : null;

  return (
    <div
      className={`escrow-party ${partyClass}${href ? ' escrow-party--profile-hit' : ''}${
        highlightYou ? ' escrow-party--you' : ''
      }`}
      {...(href ? { 'data-tooltip': 'View profile' } : {})}
    >
      {href && (
        <Link
          to={href}
          className="escrow-party-hit"
          aria-label={`View ${displayName}'s profile`}
        />
      )}
      <div className="escrow-party__surface">
        <div className="escrow-party-avatar">{initials}</div>
        <div className="escrow-party-info">
          <span className="escrow-party-role">{roleLabel}</span>
          <span className="escrow-party-name">
            {displayName}
            {u ? <span className="escrow-party-username">@{u}</span> : null}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EscrowPartyBlock;
