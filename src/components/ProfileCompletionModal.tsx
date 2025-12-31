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
    <div 
      className="profile-completion-modal active" 
      id="profileCompletionModal"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 10000,
        pointerEvents: 'auto'
      }}
    >
      <div 
        className="profile-completion-modal-overlay" 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          pointerEvents: 'none'
        }}
      ></div>
      <div 
        className="profile-completion-modal-content"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profile-completion-modal-header">
          <span className="completion-icon">✨</span>
          <h2>Complete Your Profile</h2>
          <p>You must complete your profile before accessing the platform</p>
        </div>
        <div className="profile-completion-modal-body">
          <p>Please fill in your <strong>name</strong>, <strong>email</strong>, and <strong>username</strong> to continue. These fields are required.</p>
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

