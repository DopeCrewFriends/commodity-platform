import React, { useState, useEffect, useRef } from 'react';
import { ProfileData, Statistics } from '../types';
import { getInitials } from '../utils/storage';

// Debounce hook for username validation
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface EditProfileModalProps {
  profileData: ProfileData;
  statistics: Statistics;
  walletAddress: string;
  onSave: (data: Partial<ProfileData>) => Promise<void>;
  onClose: () => void;
  checkUsernameAvailability?: (username: string) => Promise<boolean>;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ 
  profileData, 
  statistics: _statistics, 
  walletAddress,
  onSave, 
  onClose,
  checkUsernameAvailability
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

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [validationDisabled, setValidationDisabled] = useState(false);
  
  // Debounce username for validation (increased to 800ms to reduce API calls)
  const debouncedUsername = useDebounce(formData.username, 800);
  
  // Check username availability when debounced value changes
  useEffect(() => {
    let isMounted = true;
    
    // Reset checking state if username is too short or empty
    if (debouncedUsername.trim().length < 3) {
      setCheckingUsername(false);
      if (debouncedUsername.trim().length > 0) {
        setUsernameError('Username must be at least 3 characters');
      } else {
        setUsernameError(null);
      }
      return;
    }

    // Only check if checkUsernameAvailability is provided and not disabled
    if (!checkUsernameAvailability || validationDisabled) {
      setCheckingUsername(false);
      setUsernameError(null);
      return;
    }

    // Set up timeout to prevent permanent "checking" state (reduced to 2.5 seconds)
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setCheckingUsername(false);
      }
    }, 2500); // 2.5 second timeout

    setCheckingUsername(true);
    setUsernameError(null);
    
    checkUsernameAvailability(debouncedUsername)
      .then((isAvailable) => {
        if (!isMounted) return;
        clearTimeout(timeoutId);
        setCheckingUsername(false);
        if (!isAvailable) {
          setUsernameError('This username is already taken');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        clearTimeout(timeoutId);
        setCheckingUsername(false);
        console.error('Failed to check username availability (will validate on save):', err);
        // Disable validation if it keeps failing to prevent browser freeze
        setValidationDisabled(true);
        // Don't show error to user - validation will happen on save
        // This prevents "Failed to fetch" from showing during typing
      });

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [debouncedUsername, checkUsernameAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCheckingUsername(false); // Stop any ongoing checks
    
    // Validate all required fields
    if (!formData.name?.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.email?.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.company?.trim()) {
      setError('Company is required');
      return;
    }
    if (!formData.location?.trim()) {
      setError('Location is required');
      return;
    }
    if (!formData.username?.trim()) {
      setError('Username is required');
      return;
    }
    if (!avatarImage?.trim()) {
      setError('Avatar image is required');
      return;
    }
    
    setSaving(true);
    
    try {
      await onSave({
        ...formData,
        avatarImage: avatarImage
      });
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        const errorMessage = err.message;
        setError(errorMessage);
        
        // If it's a username error, also set usernameError
        if (errorMessage.includes('Username already taken') || errorMessage.includes('username')) {
          setUsernameError('This username is already taken');
        }
      } else {
        setError('Failed to save profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const initials = getInitials(formData.name || '', walletAddress);

  return (
    <div className="edit-profile-overlay" id="editProfileOverlay" onClick={onClose}>
      <div className="edit-profile-container" onClick={(e) => e.stopPropagation()}>
        <form id="editProfileForm" className="edit-profile-form" onSubmit={handleSubmit}>
          <div className="profile-section profile-section-editing" id="editingProfileCard">
            <div className="profile-actions">
              <button type="button" className="btn btn-secondary" id="cancelEditBtn" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
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
                      className={`username-input ${usernameError ? 'error' : ''}`}
                      id="editUsername" 
                      placeholder="Your Username" 
                      value={formData.username}
                      onChange={(e) => {
                        setFormData({ ...formData, username: e.target.value });
                        // Clear error immediately when user types
                        if (usernameError && e.target.value.trim().length >= 3) {
                          setUsernameError(null);
                        }
                      }}
                      required
                      minLength={3}
                      maxLength={20}
                      pattern="[a-zA-Z0-9]{3,20}"
                    />
                    {checkingUsername && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                        Checking...
                      </span>
                    )}
                    {usernameError && (
                      <div style={{ 
                        color: 'var(--error-color, #e74c3c)', 
                        fontSize: '0.75rem', 
                        marginTop: '0.25rem',
                        marginLeft: '1.5rem'
                      }}>
                        {usernameError}
                      </div>
                    )}
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
            {error && (
              <div style={{ 
                color: 'var(--error-color, #e74c3c)', 
                padding: '0.75rem', 
                marginTop: '1rem',
                background: 'var(--error-bg, rgba(231, 76, 60, 0.1))',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;

