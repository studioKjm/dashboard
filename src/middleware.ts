import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 인증이 필요 없는 공개 경로
const publicPaths = ['/login', '/register'];

// ADMIN 이상 권한이 필요한 경로
const adminPaths = ['/admin'];

/**
 * JWT 토큰 검증 (간단한 형식 확인)
 * 실제 검증은 서버에서 수행되므로 여기서는 토큰 존재 여부만 확인
 */
function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  // JWT 형식 확인 (xxx.yyy.zzz)
  const parts = token.split('.');
  return parts.length === 3;
}

/**
 * JWT 토큰에서 payload 추출 (디코딩만, 검증 X)
 */
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * 사용자 권한이 경로 접근에 충분한지 확인
 */
function hasRequiredRole(userRole: string | undefined, pathname: string): boolean {
  // ADMIN 경로 확인
  const isAdminPath = adminPaths.some(path => pathname.startsWith(path));

  if (isAdminPath) {
    // ADMIN 또는 SUPER_ADMIN만 접근 가능
    return userRole === 'admin' || userRole === 'super_admin';
  }

  // 일반 경로는 모든 인증된 사용자 접근 가능
  return true;
}

/**
 * localStorage에서 토큰 확인 (서버 사이드에서는 불가능)
 * 따라서 클라이언트에서 쿠키로 토큰을 전달하도록 해야 함
 */
function getTokenFromCookie(request: NextRequest): string | undefined {
  // access_token 쿠키 확인
  return request.cookies.get('access_token')?.value;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 그대로 통과
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // JWT 토큰 확인 (쿠키에서) - 우선순위 1
  const accessToken = getTokenFromCookie(request);
  if (isValidToken(accessToken)) {
    // 토큰이 유효하면 payload 디코딩해서 권한 확인
    const payload = decodeJWT(accessToken!);
    const userRole = payload?.role;

    // 권한 확인
    if (!hasRequiredRole(userRole, pathname)) {
      // 권한 부족 시 홈으로 리다이렉트 (또는 403 페이지)
      const homeUrl = new URL('/', request.url);
      homeUrl.searchParams.set('error', 'insufficient_permissions');
      return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
  }

  // API Key 확인 (쿠키에서) - 우선순위 2 (하위 호환성)
  // API Key는 모든 권한을 가진 것으로 간주
  const apiKey = request.cookies.get('api_key')?.value;
  if (apiKey) {
    return NextResponse.next();
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

// middleware가 실행될 경로 설정
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
