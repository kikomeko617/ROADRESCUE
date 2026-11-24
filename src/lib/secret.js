// The key used to sign login sessions. Shared by the server code and the middleware.
let warned = false;

export function sessionSecret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16 && s !== "change-me-to-a-long-random-string") return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set to a long random string in production.");
  }
  if (!warned) {
    console.warn("[roadrescue] Using the development session secret. Set SESSION_SECRET before hosting.");
    warned = true;
  }
  return new TextEncoder().encode("roadrescue-dev-only-secret-do-not-use-in-production");
}
