// Display helpers (money in UGX, dates in Kampala time).
export function ugx(n) {
  return "UGX " + Number(n || 0).toLocaleString("en-US");
}

// SQLite stores UTC like "2026-11-19 10:48:03"
export function toDate(s) {
  if (!s) return null;
  return new Date(String(s).replace(" ", "T") + (String(s).endsWith("Z") ? "" : "Z"));
}

export function when(s) {
  const d = toDate(s);
  if (!d) return "";
  return d.toLocaleString("en-GB", { timeZone: "Africa/Kampala", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(s) {
  const d = toDate(s);
  if (!d) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} days ago`;
}
