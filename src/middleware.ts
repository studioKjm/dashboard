import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 인증이 필요 없는 공개 경로
const publicPaths = ['/login', '/register'];

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
    return NextResponse.next();
  }

  // API Key 확인 (쿠키에서) - 우선순위 2 (하위 호환성)
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
