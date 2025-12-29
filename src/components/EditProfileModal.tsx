import React, { useState, useEffect, useRef } from 'react';
import { ProfileData, Statistics } from '../types';
import { getInitials } from '../utils/storage';

interface EditProfileModalProps {
  profileData: ProfileData;
  statistics: Statistics;
  walletAddress: string;
  onSave: (data: Partial<ProfileData>) => void;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ 
  profileData, 
  statistics, 
  walletAddress,
  onSave, 
  onClose 
}) => {
  const [formData, setFormData] = useState({
    name: profileData.name || '',
    email: profileData.email || '',
    company: profileData.company || '',
    location: profileData.location || '',
    username: (profileData as any).username || ''
  });
  const [avatarImage, setAvatarImage] = useState<string | null>(profileData.avatarImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOverlay, setShowOverlay] = useState(!avatarImage);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.body.classList.add('wallet-modal-open');
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.classList.remove('wallet-modal-open');
    };
  }, [onClose]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAvatarImage(result);
        setShowOverlay(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      avatarImage: avatarImage || undefined
    });
    onClose();
  };

  const initials = getInitials(formData.name || '', walletAddress);

  return (
    <div className="edit-profile-overlay" id="editProfileOverlay" onClick={onClose}>
      <div className="edit-profile-container" onClick={(e) => e.stopPropagation()}>
        <form id="editProfileForm" className="edit-profile-form" onSubmit={handleSubmit}>
          <div className="profile-section profile-section-editing" id="editingProfileCard">
            <div className="profile-actions">
              <button type="button" className="btn btn-secondary" id="cancelEditBtn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
            <div className="profile-avatar-edit-container">
              <div className="profile-avatar">
                {avatarImage ? (
                  <>
                    <img 
                      id="editProfileImage" 
                      src={avatarImage} 
                      alt="" 
                      style={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 8
                      }}
                    />
                    <div 
                      className="avatar-edit-overlay"
                      style={{ display: 'none' }}
                    >
                      <span className="camera-icon">📷</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div 
                      className="avatar-placeholder" 
                      id="editAvatarPlaceholder"
                      style={{
                        display: 'flex',
                        zIndex: 1
                      }}
                    >
                      {initials}
                    </div>
                    <div 
                      className="avatar-edit-overlay"
                      style={{
                        display: showOverlay ? 'flex' : 'none',
                        zIndex: 9
                      }}
                    >
                      <span className="camera-icon">📷</span>
                    </div>
                  </>
                )}
                <input 
                  type="file" 
                  id="profilePictureInput" 
                  accept="image/*" 
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 10
                  }}
                />
              </div>
            </div>
            <div className="profile-header profile-header-editing">
              <div className="profile-info">
                <div className="profile-field-group">
                  <label className="field-label">Display Name:</label>
                  <div className="editable-field-wrapper">
                    <span className="edit-icon">✏️</span>
                    <input 
                      type="text" 
                      className="profile-name-input" 
                      id="editName" 
                      placeholder="Your Name" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="profile-field-group">
                  <label className="field-label">Username:</label>
                  <div className="editable-field-wrapper">
                    <span className="edit-icon">✏️</span>
                    <span className="username-prefix">@</span>
                    <input 
                      type="text" 
                      className="username-input" 
                      id="editUsername" 
                      placeholder="Your Username" 
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                </div>
                <div className="profile-field-group">
                  <label className="field-label">Email:</label>
                  <div className="editable-field-wrapper">
                    <span className="edit-icon">✏️</span>
                    <input 
                      type="email" 
                      className="profile-email-input" 
                      id="editEmail" 
                      placeholder="your.email@example.com" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="profile-field-group">
                  <label className="field-label">Location:</label>
                  <div className="editable-field-wrapper">
                    <span className="edit-icon">✏️</span>
                    <input 
                      type="text" 
                      className="location-text-input" 
                      id="editLocation" 
                      placeholder="Your Location" 
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="profile-field-group">
                  <label className="field-label">Company:</label>
                  <div className="editable-field-wrapper">
                    <span className="edit-icon">✏️</span>
                    <input 
                      type="text" 
                      className="company-name-input" 
                      id="editCompany" 
                      placeholder="Your Company" 
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="profile-wallet">
                  <span className="wallet-label">Wallet:</span>
                  <span className="wallet-address-text" id="editingProfileWalletAddress">
                    {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;

