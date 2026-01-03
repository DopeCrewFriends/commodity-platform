import React from 'react';
import { Escrow } from '../types';
import { ContactRequest } from '../hooks/useNotifications';
import { getInitials } from '../utils/storage';

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
  onEscrowAction: (escrowId: string, action: 'confirm' | 'reject') => void;
  onContactRequestAction: (requestId: string, action: 'accept' | 'reject') => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  walletAddress,
  escrowsData,
  contactRequests,
  outgoingRequests,
  onEscrowAction,
  onContactRequestAction
}) => {
  // Filter escrows that need action (pending status where user is buyer or seller)
  const pendingEscrows = escrowsData.filter(
    escrow => escrow.status.toLowerCase() === 'pending' && 
    (escrow.buyer === walletAddress || escrow.seller === walletAddress)
  );

  const notifications: Notification[] = [
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
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const renderEscrowNotification = (escrow: Escrow) => {
    const isBuyer = escrow.buyer === walletAddress;
    const otherParty = isBuyer ? escrow.seller : escrow.buyer;
    const otherPartyInitials = getInitials(otherParty, otherParty);

    return (
      <div key={escrow.id} className="notification-item escrow-notification">
        <div className="notification-header">
          <div className="notification-icon escrow-icon">💼</div>
          <div className="notification-title">Escrow Action Required</div>
          <div className="notification-time">
            {new Date(escrow.startDate).toLocaleDateString()}
          </div>
        </div>
        <div className="notification-body">
          <div className="notification-escrow-info">
            <div className="notification-escrow-party">
              <div className="notification-avatar-small">{otherPartyInitials}</div>
              <span className="notification-role">{isBuyer ? 'Seller' : 'Buyer'}</span>
            </div>
            <div className="notification-escrow-details">
              <div className="notification-commodity">{escrow.commodity}</div>
              <div className="notification-amount">
                ${escrow.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div className="notification-actions">
            <button
              className="btn btn-primary notification-action-btn"
              onClick={() => onEscrowAction(escrow.id, 'confirm')}
            >
              Confirm
            </button>
            <button
              className="btn btn-secondary notification-action-btn"
              onClick={() => onEscrowAction(escrow.id, 'reject')}
            >
              Reject
            </button>
          </div>
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
          <div className="notification-time">
            {new Date(request.created_at).toLocaleDateString()}
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

  return (
    <div className="notifications-panel">
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

