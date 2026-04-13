import React from 'react';
import { Link } from 'react-router-dom';
import { profilePath } from '../utils/profilePaths';

interface ProfileUsernameLinkProps {
  username: string | null | undefined;
  className?: string;
  children: React.ReactNode;
}

/** Link to `/u/:username` when username is present; otherwise renders children in a span. */
const ProfileUsernameLink: React.FC<ProfileUsernameLinkProps> = ({ username, className, children }) => {
  const u = username?.trim();
  if (!u) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link to={profilePath(u)} className={className ?? 'profile-username-link'}>
      {children}
    </Link>
  );
};

export default ProfileUsernameLink;
