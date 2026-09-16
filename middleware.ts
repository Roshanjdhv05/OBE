import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    const authRole = request.cookies.get('obe_user_role')?.value;
    if (!authRole) {
      return NextResponse.redirect(new URL('/login?role=admin', request.url));
    }
    if (authRole !== 'super_admin') {
      return NextResponse.redirect(new URL('/faculty', request.url));
    }
  }

  // Protect /faculty routes
  if (pathname.startsWith('/faculty')) {
    const authRole = request.cookies.get('obe_user_role')?.value;
    if (!authRole) {
      return NextResponse.redirect(new URL('/login?role=faculty', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/faculty/:path*'],
};
