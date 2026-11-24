"use client";
// A submit button that shows "Please wait..." while the server is working.
import { useContext } from "react";
import { useFormStatus } from "react-dom";
import { PendingContext } from "./ActionForm";

export default function SubmitButton({ children, className = "btn btn-primary", pendingText = "Please wait...", ...rest }) {
  const fromForm = useFormStatus().pending;
  const fromAction = useContext(PendingContext);
  const pending = fromForm || fromAction;
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending} {...rest}>
      {pending ? pendingText : children}
    </button>
  );
}
