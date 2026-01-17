/**
 * Authentication utilities
 */

/**
 * Set API key in cookie and localStorage
 */
export function setApiKey(apiKey: string): void {
  // Set in cookie for server-side middleware
  document.cookie = `api_key=${apiKey}; path=/; max-age=2592000; SameSite=Strict`;

  // Also set in localStorage for client-side convenience
  if (typeof window !== 'undefined') {
    localStorage.setItem('api_key', apiKey);
  }
}

/**
 * Get API key from localStorage (client-side only)
 */
export function getApiKey(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('api_key');
}

/**
 * Remove API key from cookie and localStorage
 */
export function removeApiKey(): void {
  // Remove from cookie
  document.cookie = 'api_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

  // Remove from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('api_key');
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getApiKey() !== null;
}
