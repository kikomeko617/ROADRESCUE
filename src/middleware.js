// Runs before protected pages load. Checks the login cookie and the user's role.
// (Every page and action ALSO checks the role on the server - this is the first gate.)
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { canAccess, homeForRole } from "./lib/constants.js";
import { sessionSecret } from "./lib/secret.js";

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("rr_session")?.value;
  let role = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
      role = payload.role;
    } catch {
      role = null;
    }
  }
  if (canAccess(pathname, role)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.search = "";
  if (!role) {
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
  } else {
    url.pathname = homeForRole(role);
    url.searchParams.set("denied", "1");
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/admin/:path*", "/mechanic/:path*", "/driver/:path*", "/request/:path*",
    "/cart/:path*", "/checkout/:path*", "/orders/:path*", "/notifications/:path*",
  ],
};
