import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Escrow } from '../types';
import { ContactRequest } from '../hooks/useNotifications';
import { getInitials, loadUserData, saveUserData } from '../utils/storage';
import { useProfilesCache } from '../hooks/useProfilesCache';
import { getEscrowStatusDisplayLabel } from '../utils/escrowStatus';

interface Notification {
  id: string;
  type: 'escrow' | 'contact_request';
  timestamp: string;
  data: Escrow | ContactRequest;
}

interface NotificationsPanelProps {
  walletAddress: string;
  escrowsData: Escrow[];
  contactRequests: ContactRequest[];
  outgoingRequests: ContactRequest[];
  onContactRequestAction: (requestId: string, action: 'accept' | 'reject' | 'cancel') => void;
  onDismissNotification?: (notificationId: string, type: 'escrow' | 'contact_request') => void;
}

type FilterType = 'all' | 'escrow' | 'contact_request' | 'waiting' | 'ongoing' | 'completed' | 'cancelled';

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  walletAddress,
  escrowsData,
  contactRequests,
  outgoingRequests,
  onContactRequestAction,
  onDismissNotification
}) => {
  const navigate = useNavigate();
  // Filter state
  const [filter, setFilter] = useState<FilterType>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Load dismissed notifications from localStorage on mount
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(() => {
    if (!walletAddress) return new Set();
    const saved = loadUserData<string[]>(walletAddress, 'dismissedNotifications');
    return saved ? new Set(saved) : new Set();
  });

  // Save dismissed notifications to localStorage whenever they change
  useEffect(() => {
    if (!walletAddress) return;
    const dismissedArray = Array.from(dismissedNotifications);
    saveUserData(walletAddress, 'dismissedNotifications', dismissedArray);
  }, [dismissedNotifications, walletAddress]);

  const handleDismiss = (notificationId: string, type: 'escrow' | 'contact_request') => {
    setDismissedNotifications(prev => {
      const updated = new Set(prev).add(notificationId);
      return updated;
    });
    if (onDismissNotification) {
      onDismissNotification(notificationId, type);
    }
  };

  // Get unique wallet addresses from escrows
  const walletAddresses = useMemo(() => {
    const addresses = new Set<string>();
    escrowsData.forEach(escrow => {
      addresses.add(escrow.buyer);
      addresses.add(escrow.seller);
    });
    return Array.from(addresses);
  }, [escrowsData]);

  // Use shared profiles cache hook
  const { profiles } = useProfilesCache(walletAddresses);

  // Filter escrows that need action (waiting, ongoing, or completed status where user is buyer or seller)
  // Show all escrows that are waiting (for actions) or recently ongoing/completed (for status updates)
  // Use useMemo to ensure it recalculates when escrowsData changes
  const pendingEscrows = React.useMemo(() => {
    if (!escrowsData || escrowsData.length === 0) return [];

    const filtered = escrowsData.filter(
      escrow => {
        const status = escrow.status;
        const isWaiting = status === 'waiting';
        const isRecent = status === 'ongoing' || status === 'completed' || status === 'cancelled';
        const isUserInvolved = escrow.buyer === walletAddress || escrow.seller === walletAddress;
        
        // Parse date - handle both ISO string and locale date string formats
        let escrowDate: Date;
        try {
          escrowDate = new Date(escrow.startDate);
          // If date is invalid, try parsing as locale date
          if (isNaN(escrowDate.getTime())) {
            escrowDate = new Date(escrow.startDate.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'));
          }
        } catch {
          escrowDate = new Date(); // Fallback to current date
        }
        // Show waiting escrows and recently ongoing/completed ones (within last 7 days)
        const isRecentDate = isRecent && escrowDate.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
        return (isWaiting || isRecentDate) && isUserInvolved;
      }
    );

    return filtered;
  }, [escrowsData, walletAddress]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notifications-filter-container')) {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isFilterOpen]);

  const notifications: Notification[] = React.useMemo(() => {
    const allNotifications: Notification[] = [
      ...pendingEscrows.map(escrow => ({
        id: escrow.id,
        type: 'escrow' as const,
        timestamp: escrow.startDate,
        data: escrow
      })),
      ...contactRequests.map(request => ({
        id: request.id,
        type: 'contact_request' as const,
        timestamp: request.created_at,
        data: request
      })),
      ...outgoingRequests.map(request => ({
        id: request.id,
        type: 'contact_request' as const,
        timestamp: request.created_at,
        data: request
      }))
    ]
      .filter(notification => !dismissedNotifications.has(notification.id))
      .filter(notification => {
        if (filter === 'all') return true;
        if (filter === 'escrow') return notification.type === 'escrow';
        if (filter === 'contact_request') return notification.type === 'contact_request';
        if (filter === 'waiting' || filter === 'ongoing' || filter === 'completed' || filter === 'cancelled') {
          return notification.type === 'escrow' && (notification.data as Escrow).status === filter;
        }
        return true;
      })
      .sort((a, b) => {
        // Parse timestamps - handle both ISO strings and other formats
        let dateA: Date;
        let dateB: Date;
        try {
          dateA = new Date(a.timestamp);
          if (isNaN(dateA.getTime())) {
            dateA = new Date(a.timestamp.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'));
          }
        } catch {
          dateA = new Date(0);
        }
        try {
          dateB = new Date(b.timestamp);
          if (isNaN(dateB.getTime())) {
            dateB = new Date(b.timestamp.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'));
          }
        } catch {
          dateB = new Date(0);
        }
        // Sort by most recent first (descending) - newest at top
        return dateB.getTime() - dateA.getTime();
      });
    
    return allNotifications;
  }, [pendingEscrows, contactRequests, outgoingRequests, dismissedNotifications, filter]);

  const renderEscrowNotification = (escrow: Escrow) => {
    const statusDisplay = getEscrowStatusDisplayLabel(escrow, walletAddress);
    const buyerProfile = profiles[escrow.buyer];
    const sellerProfile = profiles[escrow.seller];
    const dateStr = (() => {
      try {
        const date = new Date(escrow.startDate);
        return isNaN(date.getTime()) ? escrow.startDate : date.toLocaleDateString();
      } catch {
        return escrow.startDate;
      }
    })();
    const amountStr = `$${escrow.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const partiesStr = `@${buyerProfile?.username || 'Unknown'} → @${sellerProfile?.username || 'Unknown'}`;
    return (
      <div key={escrow.id} className="notification-item notification-item--escrow">
        <div className="notification-item__row notification-item__head">
          <span className={`notification-item__badge escrow-status-badge ${escrow.status}`}>
            {statusDisplay}
          </span>
          <span className="notification-item__meta">{dateStr}</span>
          <button
            type="button"
            className="notification-dismiss-btn"
            onClick={() => handleDismiss(escrow.id, 'escrow')}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
        <div className="notification-item__summary" title={`${escrow.commodity} · ${amountStr} · ${partiesStr}`}>
          <span className="notification-item__commodity">{escrow.commodity}</span>
          <span className="notification-item__sep">·</span>
          <span className="notification-item__amount">
            {escrow.paymentMethod && (
              <img
                src={escrow.paymentMethod === 'USDC' ? '/images/usdc.png' : '/images/usdt logo.png'}
                alt=""
                aria-hidden
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            {amountStr}
          </span>
          <span className="notification-item__sep">·</span>
          <span className="notification-item__parties">
            <span className={escrow.buyer === walletAddress ? 'notification-item__you' : ''}>
              @{buyerProfile?.username || 'Unknown'}
            </span>
            {' → '}
            <span className={escrow.seller === walletAddress ? 'notification-item__you' : ''}>
              @{sellerProfile?.username || 'Unknown'}
            </span>
          </span>
        </div>
        <div className="notification-item__row notification-item__foot">
          <button
            type="button"
            className="notification-item__manage btn btn-primary"
            onClick={() => navigate(`/escrows?open=${encodeURIComponent(escrow.id)}`)}
          >
            Manage
          </button>
        </div>
      </div>
    );
  };

  const renderContactRequestNotification = (request: ContactRequest) => {
    const isOutgoing = request.isOutgoing;
    const profile = isOutgoing ? request.toProfile : request.fromProfile;

    if (!profile) return null;

    const initials = getInitials(profile.name || '', profile.username || '');
    const dateStr = new Date(request.created_at).toLocaleDateString();
    const title = isOutgoing ? 'Contact Request Sent' : 'Contact Request';
    const sub = profile.name || profile.username ? `${profile.name || ''} ${profile.username ? `@${profile.username}` : ''}`.trim() || 'Unknown' : 'Unknown';

    return (
      <div key={request.id} className="notification-item notification-item--contact">
        <div className="notification-item__row notification-item__head">
          <span className="notification-item__icon contact-icon" aria-hidden>C</span>
          <span className="notification-item__title">{title}</span>
          <span className="notification-item__meta">{dateStr}</span>
          {request.status?.toLowerCase() !== 'pending' && (
            <button
              type="button"
              className="notification-dismiss-btn"
              onClick={() => handleDismiss(request.id, 'contact_request')}
              aria-label="Dismiss"
            >
              ×
            </button>
          )}
        </div>
        <div className="notification-item__summary notification-item__summary--contact">
          <span className="notification-item__avatar">{initials}</span>
          <span className="notification-item__contact-sub">{sub}</span>
        </div>
        {!isOutgoing && (
          <div className="notification-item__row notification-item__foot">
            <button
              type="button"
              className="notification-item__action btn btn-primary"
              onClick={() => onContactRequestAction(request.id, 'accept')}
            >
              Accept
            </button>
            <button
              type="button"
              className="notification-item__action btn btn-secondary"
              onClick={() => onContactRequestAction(request.id, 'reject')}
            >
              Reject
            </button>
          </div>
        )}
        {isOutgoing && (
          <div className="notification-item__row notification-item__foot">
            <span className="notification-item__waiting">Waiting for response</span>
            <button
              type="button"
              className="notification-item__action btn btn-secondary"
              onClick={() => onContactRequestAction(request.id, 'cancel')}
            >
              Cancel request
            </button>
          </div>
        )}
      </div>
    );
  };

  // Create a unique key based on escrow IDs and notification count to force re-render when data changes
  const escrowIds = escrowsData.map(e => e.id).join(',');
  const notificationKey = `notifications-${escrowIds}-${contactRequests.length}-${outgoingRequests.length}-${notifications.length}`;
  
  return (
    <div className="notifications-panel" key={notificationKey}>
      <div className="notifications-header-card">
        <div className="notifications-header-content">
          <div className="notifications-title-section">
            <h2>Notifications</h2>
            {notifications.length > 0 && (
              <div className="notifications-count">{notifications.length}</div>
            )}
          </div>
          <div className="notifications-filter-container">
            <button
              className="notifications-filter-btn"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <span>Filter</span>
              <span style={{ fontSize: '0.65rem' }}>▼</span>
            </button>
            {isFilterOpen && (
              <div className="notifications-filter-dropdown">
                {(['all', 'escrow', 'contact_request', 'waiting', 'ongoing', 'completed', 'cancelled'] as FilterType[]).map((filterOption) => (
                  <button
                    key={filterOption}
                    onClick={() => {
                      setFilter(filterOption);
                      setIsFilterOpen(false);
                    }}
                    className={`filter-option ${filter === filterOption ? 'active' : ''}`}
                  >
                    {filterOption === 'all' ? 'All Notifications' :
                     filterOption === 'escrow' ? 'All Escrows' :
                     filterOption === 'contact_request' ? 'Contact Requests' :
                     filterOption}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="notifications-content" id="notificationsContent">
          {notifications.length === 0 ? (
            <div className="no-notifications-message">
              <p>No notifications</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map(notification => {
                if (notification.type === 'escrow') {
                  return renderEscrowNotification(notification.data as Escrow);
                } else {
                  return renderContactRequestNotification(notification.data as ContactRequest);
                }
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPanel;

