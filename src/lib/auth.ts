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
 * Checks JWT token first, then falls back to API Key
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null || getApiKey() !== null;
}

// ============================================
// JWT Token Management
// ============================================

/**
 * Set JWT tokens in localStorage and cookie
 * @param accessToken - Access token (15 min expiry)
 * @param refreshToken - Refresh token (7 days expiry)
 */
export function setAuthTokens(accessToken: string, refreshToken: string): void {
  if (typeof window !== 'undefined') {
    // localStorage에 저장
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);

    // Cookie에도 저장 (middleware에서 사용)
    // access_token: 15분 (900초)
    document.cookie = `access_token=${accessToken}; path=/; max-age=900; SameSite=Strict`;
    // refresh_token: 7일 (604800초)
    document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Strict`;
  }
}

/**
 * Get access token from localStorage
 * @returns Access token or null if not found
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('access_token');
}

/**
 * Get refresh token from localStorage
 * @returns Refresh token or null if not found
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('refresh_token');
}

/**
 * Clear all JWT tokens from localStorage and cookies
 */
export function clearAuthTokens(): void {
  if (typeof window !== 'undefined') {
    // localStorage에서 삭제
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    // Cookie에서도 삭제
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

/**
 * Refresh access token using refresh token
 * @returns New access token or null if refresh failed
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001'}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is invalid or expired
      clearAuthTokens();
      return null;
    }

    const data = await response.json();
    const { access_token, refresh_token } = data;

    // Update both tokens
    setAuthTokens(access_token, refresh_token);
    return access_token;
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    clearAuthTokens();
    return null;
  }
}

/**
 * Get user info from access token payload (client-side decode)
 * Note: This is for UI display only, not for security checks
 * @returns User info or null
 */
export function getUserFromToken(): { id: number; email: string; role: string } | null {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return null;
  }

  try {
    // Decode JWT payload (base64)
    const payload = accessToken.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return {
      id: parseInt(decoded.sub),
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}
