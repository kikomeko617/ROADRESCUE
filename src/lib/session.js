// Reading and writing the login cookie inside Next.js pages and server actions.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_HOURS, createSessionToken, verifySessionToken, getUserById } from "./auth.js";

export async function startSession(user) {
  const token = await createSessionToken(user);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // not readable by browser JavaScript
    sameSite: "lax", // helps block cross-site request forgery
    secure: process.env.NODE_ENV === "production", // HTTPS only when hosted
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

// The logged-in user, re-checked against the database on every request
// (so a deactivated account is locked out immediately).
export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  const user = await getUserById(claims.id);
  if (!user) return null;
  return user;
}

// For pages: send people to login (or their own home) if they shouldn't be here.
export async function requirePageUser(roles) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/?denied=1");
  return user;
}
