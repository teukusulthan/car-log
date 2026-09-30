import { type NextRequest, NextResponse } from "next/server";

// Auth.js session cookie (the __Secure- prefix is used on https). Pages still verify the session
// properly; this only makes sure a signed-out visitor keeps the link they were opening.
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

export function proxy(request: NextRequest) {
  const signedIn = request.cookies.getAll().some((c) => SESSION_COOKIE.test(c.name));
  if (signedIn) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // App screens only: not auth pages, invites, the offline page, API routes, or static/PWA assets.
  matcher: [
    "/((?!login|signup|invite|offline|api|_next|icons|sw\\.js|manifest\\.webmanifest|icon\\.svg|apple-icon\\.png|favicon\\.ico).*)",
  ],
};
