import { ZodError } from "zod";

// An error whose message is safe to show to the user.
export class AppError extends Error {
  constructor(message, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export class AccessDeniedError extends AppError {
  constructor(message = "You are not allowed to do that.") {
    super(message, "FORBIDDEN");
    this.name = "AccessDeniedError";
  }
}

// Turn any error into a short, friendly message. Unknown errors are logged
// on the server but never shown in detail (no stack traces leak to users).
export function friendlyError(err) {
  if (err instanceof ZodError) return err.issues[0]?.message || "Please check the form.";
  if (err instanceof AppError) return err.message;
  console.error("[roadrescue] unexpected error:", err);
  return "Something went wrong. Please try again.";
}
