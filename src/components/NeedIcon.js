// Simple line icons for the "What do you need?" cards.
const PATHS = {
  repair: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4Z",
  tow: "M2 17V9h8l3 4h4v4M17 13l3-6 2 1M20 7v6M5 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0M13 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
  driver: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM3.5 10.5c3 0 5 .5 5.6 1.8M20.5 10.5c-3 0-5 .5-5.6 1.8M12 15v6",
  fuel: "M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M7 8h4M14 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3",
  unsure: "M9.1 9a3 3 0 1 1 4.2 2.7c-.8.4-1.3 1.1-1.3 2V15M12 18.5v.5M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
};

export default function NeedIcon({ need, size = 28 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[need]} />
    </svg>
  );
}
