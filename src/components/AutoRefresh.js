"use client";
// Re-loads the page data every few seconds so status changes appear without a manual refresh.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({ seconds = 5, label = "Live" }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return (
    <span className="live-dot" aria-live="off">
      {label}: updates every {seconds}s
    </span>
  );
}
