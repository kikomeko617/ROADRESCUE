"use client";
// Friendly error page - no technical details are shown to users.
export default function Error({ reset }) {
  return (
    <div className="card empty" style={{ maxWidth: 520, margin: "0 auto" }} role="alert">
      <h1>Something went wrong</h1>
      <p>Please try again. If it keeps happening, contact support.</p>
      <button className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
