// Accounts, passwords and session tokens.
// Passwords are hashed with bcrypt. Sessions are signed tokens (JWT, HS256) stored in an
// httpOnly cookie, so JavaScript in the browser cannot read them.
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { one, run } from "./db.js";
import { logAudit } from "./audit.js";
import { AppError, AccessDeniedError } from "./errors.js";
import { registerSchema, loginSchema } from "./validation.js";
import { MAX_FAILED_LOGINS, LOGIN_WINDOW_MINUTES } from "./constants.js";
import { sessionSecret } from "./secret.js";

export const SESSION_COOKIE = "rr_session";
export const SESSION_HOURS = 8;

export async function createSessionToken(user) {
  return new SignJWT({ role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(sessionSecret());
}

export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    return { id: Number(payload.sub), role: payload.role, name: payload.name };
  } catch {
    return null; // expired or tampered
  }
}

// Least privilege: every protected action calls this first.
export function assertRole(user, roles) {
  if (!user) throw new AccessDeniedError("Please log in first.");
  if (!roles.includes(user.role)) throw new AccessDeniedError();
  return user;
}

export async function registerUser(input) {
  const data = registerSchema.parse(input);
  const exists = await one("SELECT id FROM users WHERE email = ?", [data.email]);
  if (exists) throw new AppError("An account with that email already exists.");
  const hash = await bcrypt.hash(data.password, 10);
  const res = await run("INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)", [
    data.name, data.email, data.phone, hash, data.role,
  ]);
  if (data.role === "mechanic" || data.role === "driver") {
    // New helpers start as PENDING: they can't take jobs until an admin approves them.
    await run("INSERT INTO provider_profiles (user_id, area, skills, status) VALUES (?, ?, ?, 'PENDING')", [res.lastId, data.area, data.skills || ""]);
  }
  const user = { id: res.lastId, name: data.name, email: data.email, role: data.role };
  await logAudit({ actor: user, action: "USER_REGISTERED", entity: "user", entityId: user.id, details: `role=${data.role}` });
  return user;
}

async function recentFailures(email) {
  const row = await one(
    `SELECT COUNT(*) AS n FROM audit_log
      WHERE action = 'LOGIN_FAILED' AND entity_id = ?
        AND created_at > max(datetime('now', ?), COALESCE((SELECT MAX(created_at) FROM audit_log WHERE action = 'LOGIN_SUCCESS' AND entity_id = ?), ''))`,
    [email, `-${LOGIN_WINDOW_MINUTES} minutes`, email]
  );
  return Number(row?.n || 0);
}

export async function authenticate(input) {
  const { email, password } = loginSchema.parse(input);
  if ((await recentFailures(email)) >= MAX_FAILED_LOGINS) {
    await logAudit({ action: "LOGIN_LOCKED", entity: "user", entityId: email });
    throw new AppError(`Too many failed attempts. Try again in ${LOGIN_WINDOW_MINUTES} minutes.`, "LOCKED");
  }
  const user = await one("SELECT id, name, email, role, password_hash, is_active FROM users WHERE email = ?", [email]);
  const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!ok || !user.is_active) {
    await logAudit({ action: "LOGIN_FAILED", entity: "user", entityId: email });
    // Same message whether the email exists or not, so attackers can't find accounts.
    throw new AppError("Wrong email or password.", "UNAUTHORIZED");
  }
  const safe = { id: Number(user.id), name: user.name, email: user.email, role: user.role };
  await logAudit({ actor: safe, action: "LOGIN_SUCCESS", entity: "user", entityId: email });
  return safe;
}

export async function getUserById(id) {
  const u = await one("SELECT id, name, email, phone, role, is_active FROM users WHERE id = ?", [id]);
  if (!u || !u.is_active) return null;
  return { ...u, id: Number(u.id) };
}
