import { NextResponse } from 'next/server';

export function proxy(request) {
  const session = request.cookies.get('legendin_session');
  const { pathname } = request.nextUrl;

  // Paths that do not require authentication
  const isPublicAsset = 
    pathname.startsWith('/_next') || 
    pathname === '/logo.png' || 
    pathname === '/favicon.ico' ||
    pathname.startsWith('/api/'); // Allow API routes to handle their own auth/responses

  const isLoginPage = pathname === '/login';

  // If session is active and user tries to hit login, redirect to dashboard
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If no session active and hitting private page, redirect to login
  if (!session && !isLoginPage && !isPublicAsset) {
    // Avoid intercepting files with extensions
    if (pathname.includes('.')) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If session is active, verify allowedPages permission list (RBAC)
  if (session && !isLoginPage && !isPublicAsset) {
    try {
      // Decode base64 session cookie
      const decoded = atob(session.value);
      const sessionData = JSON.parse(decoded);

      if (sessionData && Array.isArray(sessionData.allowedPages)) {
        const allowed = sessionData.role === 'admin'
          ? ['ceo','dashboard','clients','projects','payments','monthly-statements','analytics','assets','team','amc','designing','purchase','hr','hr-employees','hr-leaves','hr-attendance','hr-payroll','installation', 'manufacturing', 'supervisor', 'supervisor-input']
          : sessionData.allowedPages;
        
        let pageKey = null;
        if (pathname === '/') pageKey = 'dashboard';
        else if (pathname.startsWith('/ceo')) pageKey = 'ceo';
        else if (pathname.startsWith('/clients')) pageKey = 'clients';
        else if (pathname.startsWith('/projects')) pageKey = 'projects';
        else if (pathname.startsWith('/payments')) pageKey = 'payments';
        else if (pathname.startsWith('/monthly-statements')) pageKey = 'monthly-statements';
        else if (pathname.startsWith('/analytics')) pageKey = 'analytics';
        else if (pathname.startsWith('/assets')) pageKey = 'assets';
        else if (pathname.startsWith('/team')) pageKey = 'team';
        else if (pathname.startsWith('/amc')) pageKey = 'amc';
        else if (pathname.startsWith('/designing')) pageKey = 'designing';
        else if (pathname.startsWith('/purchase')) pageKey = 'purchase';
        else if (pathname.startsWith('/supervisor')) pageKey = 'supervisor';
        else if (pathname.startsWith('/hr/supervisor-input')) pageKey = 'supervisor-input';
        else if (pathname.startsWith('/hr')) pageKey = 'hr';
        else if (pathname.startsWith('/installation')) pageKey = 'installation';
        else if (pathname.startsWith('/manufacturing')) pageKey = 'manufacturing';

        if (pageKey && !allowed.includes(pageKey)) {
          // Redirect to the first permitted page, or login if none
          const firstAllowedKey = allowed[0] || 'dashboard';
          const redirectPath = firstAllowedKey === 'dashboard' ? '/' : `/${firstAllowedKey}`;
          return NextResponse.redirect(new URL(redirectPath, request.url));
        }
      }
    } catch (e) {
      // If cookie parsing fails, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run proxy on all paths except static assets or api routes
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)'],
};
