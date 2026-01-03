import React, { useEffect, useState } from 'react';
import { Escrow, ProfileData } from '../types';
import { ContactRequest } from '../hooks/useNotifications';
import { getInitials, loadUserData, saveUserData } from '../utils/storage';
import { supabase } from '../utils/supabase';

interface Notification {
  id: string;
  type: 'escrow' | 'contact_request';
  timestamp: string;
  data: Escrow | ContactRequest;
}

interface NotificationsPanelProps {
  walletAddress: string;
  escrowsData: Escrow[];
  contactRequests: ContactRequest[]; // Incoming requests
  outgoingRequests: ContactRequest[]; // Outgoing requests
  onEscrowAction: (escrowId: string, action: 'accept' | 'reject' | 'cancel') => void;
  onContactRequestAction: (requestId: string, action: 'accept' | 'reject') => void;
  onDismissNotification?: (notificationId: string, type: 'escrow' | 'contact_request') => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  walletAddress,
  escrowsData,
  contactRequests,
  outgoingRequests,
  onEscrowAction,
  onContactRequestAction,
  onDismissNotification
}) => {
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
  const [profiles, setProfiles] = useState<Record<string, ProfileData>>({});

  // Fetch profiles for all buyers and sellers in escrows
  useEffect(() => {
    const fetchProfiles = async () => {
      if (escrowsData.length === 0) return;

      const walletAddresses = new Set<string>();
      escrowsData.forEach(escrow => {
        walletAddresses.add(escrow.buyer);
        walletAddresses.add(escrow.seller);
      });

      if (walletAddresses.size === 0) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .in('wallet_address', Array.from(walletAddresses));

        if (error) {
          // If table doesn't exist, continue without profile data
          if (error.code === 'PGRST205' || error.code === '42P01') {
            console.log('Profiles table not found, using wallet addresses only');
            return;
          }
          throw error;
        }

        if (data) {
          const profilesMap: Record<string, ProfileData> = {};
          data.forEach(profile => {
            profilesMap[profile.wallet_address] = {
              name: profile.name,
              email: profile.email,
              company: profile.company,
              location: profile.location,
              walletAddress: profile.wallet_address || '',
              avatarImage: profile.avatar_image,
              username: profile.username
            };
          });
          setProfiles(profilesMap);
        }
      } catch (error) {
        console.error('Error fetching profiles for notifications:', error);
      }
    };

    fetchProfiles();
  }, [escrowsData]);

  // Filter escrows that need action (pending, cancelled, rejected, or confirmed status where user is buyer or seller)
  // Show all escrows that are pending (for actions) or recently completed/cancelled (for status updates)
  // Use useMemo to ensure it recalculates when escrowsData changes
  const pendingEscrows = React.useMemo(() => {
    if (!escrowsData || escrowsData.length === 0) return [];
    return escrowsData.filter(
      escrow => {
        const status = escrow.status.toLowerCase();
        const isPending = status === 'pending';
        const isRecent = status === 'cancelled' || status === 'rejected' || status === 'confirmed';
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
        // Show pending escrows and recently completed ones (within last 7 days)
        const isRecentDate = isRecent && escrowDate.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
        return (isPending || isRecentDate) && 
               (escrow.buyer === walletAddress || escrow.seller === walletAddress);
      }
    );
  }, [escrowsData, walletAddress]);

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
  }, [pendingEscrows, contactRequests, outgoingRequests, dismissedNotifications]);

  const renderEscrowNotification = (escrow: Escrow) => {
    const buyerProfile = profiles[escrow.buyer];
    const sellerProfile = profiles[escrow.seller];
    const isSentByMe = escrow.created_by === walletAddress;
    const isCancelled = escrow.status.toLowerCase() === 'cancelled';
    const isRejected = escrow.status.toLowerCase() === 'rejected';
    const isConfirmed = escrow.status.toLowerCase() === 'confirmed';
    const showActions = escrow.status.toLowerCase() === 'pending';

    return (
      <div key={escrow.id} className="notification-item escrow-notification">
        <div className="notification-header">
          <div className="notification-icon escrow-icon">💼</div>
          <div className="notification-title-section" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'nowrap', minWidth: 0 }}>
            <div className="notification-title" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              {isCancelled ? 'Escrow Cancelled' :
               isRejected ? 'Escrow Rejected' :
               isConfirmed ? 'Escrow Confirmed' :
               isSentByMe ? 'Escrow Request Sent' : 'Escrow Action Required'}
            </div>
            <div className="notification-parties-inline" style={{
              fontSize: '0.65rem',
              color: 'var(--text-light)',
              display: 'flex',
              gap: '0.375rem',
              flexWrap: 'nowrap',
              alignItems: 'center',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              <span style={{ whiteSpace: 'nowrap' }}>
                <strong>Buyer:</strong> {buyerProfile?.name || 'Unknown'}
                {buyerProfile?.username && <span> @{buyerProfile.username}</span>}
              </span>
              <span style={{ flexShrink: 0 }}>•</span>
              <span style={{ whiteSpace: 'nowrap' }}>
                <strong>Seller:</strong> {sellerProfile?.name || 'Unknown'}
                {sellerProfile?.username && <span> @{sellerProfile.username}</span>}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="notification-time">
              {(() => {
                try {
                  const date = new Date(escrow.startDate);
                  return isNaN(date.getTime()) ? escrow.startDate : date.toLocaleDateString();
                } catch {
                  return escrow.startDate;
                }
              })()}
            </div>
            {escrow.status.toLowerCase() !== 'pending' && (
              <button
                className="notification-dismiss-btn"
                onClick={() => handleDismiss(escrow.id, 'escrow')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '2px',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-dark)';
                  e.currentTarget.style.background = 'var(--bg-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-light)';
                  e.currentTarget.style.background = 'none';
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
        <div className="notification-body">
          <div className="notification-escrow-info">
            <div className="notification-escrow-details">
              <div className="notification-commodity">{escrow.commodity}</div>
              <div className="notification-amount" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                ${escrow.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {escrow.paymentMethod && (
                  <img 
                    src={escrow.paymentMethod === 'USDC' ? '/images/usdc.png' : '/images/usdt logo.png'} 
                    alt={escrow.paymentMethod}
                    style={{ width: '14px', height: '14px', borderRadius: '50%' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          {showActions && (
            isSentByMe ? (
              <div className="notification-actions">
                <div className="notification-status" style={{ 
                  fontSize: '0.7rem', 
                  color: 'var(--text-light)', 
                  fontStyle: 'italic',
                  marginBottom: '0.5rem'
                }}>
                  Waiting for response...
                </div>
                <button
                  className="btn btn-secondary notification-action-btn"
                  onClick={() => onEscrowAction(escrow.id, 'cancel')}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="notification-actions">
                <button
                  className="btn btn-primary notification-action-btn"
                  onClick={() => onEscrowAction(escrow.id, 'accept')}
                >
                  Accept
                </button>
                <button
                  className="btn btn-secondary notification-action-btn"
                  onClick={() => onEscrowAction(escrow.id, 'reject')}
                >
                  Reject
                </button>
              </div>
            )
          )}
          {!showActions && (
            <div className="notification-status" style={{ 
              fontSize: '0.7rem', 
              color: 'var(--text-light)', 
              fontStyle: 'italic',
              marginTop: '0.5rem'
            }}>
              {isCancelled ? 'This escrow has been cancelled.' :
               isRejected ? 'This escrow has been rejected.' :
               'This escrow has been confirmed.'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContactRequestNotification = (request: ContactRequest) => {
    const isOutgoing = request.isOutgoing;
    const profile = isOutgoing ? request.toProfile : request.fromProfile;
    
    if (!profile) {
      return null; // Skip if profile data is missing
    }

    const initials = getInitials(profile.name || '', profile.username || '');
    
    return (
      <div key={request.id} className="notification-item contact-notification">
        <div className="notification-header">
          <div className="notification-icon contact-icon">👤</div>
          <div className="notification-title">
            {isOutgoing ? 'Contact Request Sent' : 'Contact Request'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="notification-time">
              {new Date(request.created_at).toLocaleDateString()}
            </div>
            {request.status?.toLowerCase() !== 'pending' && (
              <button
                className="notification-dismiss-btn"
                onClick={() => handleDismiss(request.id, 'contact_request')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '2px',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-dark)';
                  e.currentTarget.style.background = 'var(--bg-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-light)';
                  e.currentTarget.style.background = 'none';
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
        <div className="notification-body">
          <div className="notification-contact-info">
            <div className="notification-avatar-small">{initials}</div>
            <div className="notification-contact-details">
              <div className="notification-contact-name">
                {profile.name || 'Unknown'}
                {profile.username && (
                  <span className="notification-username">@{profile.username}</span>
                )}
              </div>
              {profile.company && (
                <div className="notification-company">{profile.company}</div>
              )}
            </div>
          </div>
          {isOutgoing ? (
            <div className="notification-status">
              <span style={{ 
                fontSize: '0.7rem', 
                color: 'var(--text-light)', 
                fontStyle: 'italic' 
              }}>
                Waiting for response...
              </span>
            </div>
          ) : (
            <div className="notification-actions">
              <button
                className="btn btn-primary notification-action-btn"
                onClick={() => onContactRequestAction(request.id, 'accept')}
              >
                Accept
              </button>
              <button
                className="btn btn-secondary notification-action-btn"
                onClick={() => onContactRequestAction(request.id, 'reject')}
              >
                Reject
              </button>
            </div>
          )}
        </div>
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

