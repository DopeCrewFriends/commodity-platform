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

  // Escrow cards here are only in-flight deals (completed / cancelled live under Trade History)
  const pendingEscrows = React.useMemo(() => {
    if (!escrowsData || escrowsData.length === 0) return [];

    return escrowsData.filter((escrow) => {
      const status = escrow.status;
      if (status !== 'waiting' && status !== 'ongoing') return false;
      return escrow.buyer === walletAddress || escrow.seller === walletAddress;
    });
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
    const buyerUsername = buyerProfile?.username || 'Unknown';
    const sellerUsername = sellerProfile?.username || 'Unknown';
    return (
      <article key={escrow.id} className="notification-card notification-card--escrow" data-status={escrow.status}>
        <div className="notification-card__accent" aria-hidden />
        <div className="notification-card__inner">
          <header className="notification-card__header">
            <span className="notification-card__badge">{statusDisplay}</span>
            <span className="notification-card__date">{dateStr}</span>
            <button
              type="button"
              className="notification-card__dismiss"
              onClick={() => handleDismiss(escrow.id, 'escrow')}
              aria-label="Dismiss"
            >
              ×
            </button>
          </header>
          <div className="notification-card__body">
            <h3 className="notification-card__title" title={escrow.commodity}>{escrow.commodity}</h3>
            <div className="notification-card__detail-row">
              <span className="notification-card__amount">
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
              <span className="notification-card__parties">
                <span className={escrow.buyer === walletAddress ? 'notification-card__you' : ''}>@{buyerUsername}</span>
                {' → '}
                <span className={escrow.seller === walletAddress ? 'notification-card__you' : ''}>@{sellerUsername}</span>
              </span>
            </div>
          </div>
          <footer className="notification-card__actions">
            <button
              type="button"
              className="notification-card__cta btn btn-primary"
              onClick={() => navigate(`/dashboard?open=${encodeURIComponent(escrow.id)}`)}
            >
              Manage
            </button>
          </footer>
        </div>
      </article>
    );
  };

  const renderContactRequestNotification = (request: ContactRequest) => {
    const isOutgoing = request.isOutgoing;
    const profile = isOutgoing ? request.toProfile : request.fromProfile;

    if (!profile) return null;

    const initials = getInitials(profile.name || '', profile.username || '');
    const dateStr = new Date(request.created_at).toLocaleDateString();
    const label = isOutgoing ? 'Request sent' : 'Contact request';
    const sub = profile.name || profile.username ? `${profile.name || ''} ${profile.username ? `@${profile.username}` : ''}`.trim() || 'Unknown' : 'Unknown';

    return (
      <article key={request.id} className="notification-card notification-card--contact">
        <div className="notification-card__accent" aria-hidden />
        <div className="notification-card__inner">
          <header className="notification-card__header">
            <span className="notification-card__icon" aria-hidden>C</span>
            <span className="notification-card__label">{label}</span>
            <span className="notification-card__date">{dateStr}</span>
            {request.status?.toLowerCase() !== 'pending' && (
              <button
                type="button"
                className="notification-card__dismiss"
                onClick={() => handleDismiss(request.id, 'contact_request')}
                aria-label="Dismiss"
              >
                ×
              </button>
            )}
          </header>
          <div className="notification-card__body">
            <div className="notification-card__person">
              <span className="notification-card__avatar">{initials}</span>
              <span className="notification-card__name">{sub}</span>
            </div>
          </div>
          <footer className="notification-card__actions">
            {!isOutgoing && (
              <>
                <button
                  type="button"
                  className="notification-card__btn notification-card__btn--primary btn btn-primary"
                  onClick={() => onContactRequestAction(request.id, 'accept')}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="notification-card__btn btn btn-secondary"
                  onClick={() => onContactRequestAction(request.id, 'reject')}
                >
                  Reject
                </button>
              </>
            )}
            {isOutgoing && (
              <>
                <span className="notification-card__waiting">Waiting for response</span>
                <button
                  type="button"
                  className="notification-card__btn btn btn-secondary"
                  onClick={() => onContactRequestAction(request.id, 'cancel')}
                >
                  Cancel
                </button>
              </>
            )}
          </footer>
        </div>
      </article>
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
              type="button"
              className="btn btn-secondary notifications-filter-btn"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <span>Filter</span>
              <span className="notifications-filter-chevron">▼</span>
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

