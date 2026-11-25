"use client";
// A form that sends to a server action and shows its error/success message.
// It keeps what the user typed if there is an error (React would otherwise clear the form).
import { createContext, startTransition, useActionState } from "react";

export const PendingContext = createContext(false);

export default function ActionForm({ action, children, className = "form" }) {
  const [state, formAction, pending] = useActionState(action, null);

  function onSubmit(e) {
    e.preventDefault();
    // Include the clicked button's name/value (e.g. Approve vs Suspend).
    const data = new FormData(e.currentTarget, e.nativeEvent.submitter);
    startTransition(() => formAction(data));
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className={className} aria-busy={pending}>
      {state?.error && (
        <p className="alert alert-error" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && state?.message && (
        <p className="alert alert-success" role="status">
          {state.message}
        </p>
      )}
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
    </form>
  );
}
