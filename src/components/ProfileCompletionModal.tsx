import React from 'react';

interface ProfileCompletionModalProps {
  onComplete: () => void;
}

const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({ onComplete }) => {
  const handleComplete = () => {
    // Remove the active class to trigger fade out
    const modal = document.getElementById('profileCompletionModal');
    if (modal) {
      modal.classList.remove('active');
    }
    // Wait for animation to complete before calling onComplete
    setTimeout(() => {
      onComplete();
    }, 300);
  };
  React.useEffect(() => {
    document.body.classList.add('wallet-modal-open');
    return () => {
      document.body.classList.remove('wallet-modal-open');
    };
  }, []);

  return (
    <div className="profile-completion-modal active" id="profileCompletionModal">
      <div className="profile-completion-modal-overlay" onClick={(e) => e.stopPropagation()}></div>
      <div className="profile-completion-modal-content">
        <div className="profile-completion-modal-header">
          <span className="completion-icon">✨</span>
          <h2>Welcome to SETL!</h2>
          <p>Complete your profile to get started</p>
        </div>
        <div className="profile-completion-modal-body">
          <p>Fill in your profile information to begin using the platform. You can always update this later.</p>
        </div>
        <div className="profile-completion-modal-footer">
          <button 
            className="btn btn-primary" 
            id="completeProfileBtn" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleComplete();
            }}
            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          >
            Complete Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;

