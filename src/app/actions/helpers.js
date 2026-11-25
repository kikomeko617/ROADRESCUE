// Shared helpers for server actions.
import { friendlyError } from "@/lib/errors";

export const ok = (message) => ({ ok: true, message, at: Date.now() });

// Run an action and turn any error into { error } for the form to show.
export async function attempt(fn) {
  try {
    const result = await fn();
    return result ?? ok();
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export const field = (fd, name) => {
  const v = fd.get(name);
  return typeof v === "string" ? v : undefined;
};

// Only allow redirects back to our own site (stops "open redirect" attacks).
export function safeNext(next) {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
