/** Public profile URL path segment (usernames are stored lowercase in DB). */
export function profilePath(username: string): string {
  const u = username.trim().toLowerCase();
  if (!u) return '/u';
  return `/u/${encodeURIComponent(u)}`;
}

export function normalizeProfileUsernameParam(param: string | undefined): string {
  if (!param) return '';
  try {
    return decodeURIComponent(param).trim().toLowerCase();
  } catch {
    return param.trim().toLowerCase();
  }
}
