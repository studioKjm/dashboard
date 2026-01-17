import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 인증이 필요 없는 공개 경로
const publicPaths = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 그대로 통과
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // API Key 확인 (쿠키에서)
  const apiKey = request.cookies.get('api_key')?.value;

  // API Key가 없으면 로그인 페이지로 리다이렉트
  if (!apiKey) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 인증 통과
  return NextResponse.next();
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
