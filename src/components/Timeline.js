import { TIMELINE, statusLabel } from "@/lib/constants";
import { when } from "@/lib/format";

// Shows how far along the job is: done steps, the current step and what's next.
export default function Timeline({ status, history, kind = "mechanic" }) {
  const reached = Object.fromEntries(history.map((h) => [h.to_status, h.created_at]));
  const off = ["CANCELLED", "REFUNDED", "DISPUTED"].includes(status);
  const idx = TIMELINE.indexOf(status);
  return (
    <ol className="timeline" aria-label="Job progress">
      {TIMELINE.map((s, i) => {
        const cls = !off && i < idx ? "done" : !off && i === idx ? (s === "COMPLETED" ? "done" : "current") : reached[s] ? "done" : "";
        return (
          <li key={s} className={cls} aria-current={cls === "current" ? "step" : undefined}>
            {statusLabel(s, kind)}
            {reached[s] && <span className="tiny muted"> · {when(reached[s])}</span>}
          </li>
        );
      })}
      {off && (
        <li className="current">
          {statusLabel(status, kind)}
          {reached[status] && <span className="tiny muted"> · {when(reached[status])}</span>}
        </li>
      )}
    </ol>
  );
}
