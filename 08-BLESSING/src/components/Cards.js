// Cards for the "people near you" and "garages near you" sections.
import Avatar from "./Avatar";
import { PROVIDER_LABEL } from "@/lib/constants";
import { formatKm } from "@/lib/geo";

export function HelperCard({ h, delay = 0 }) {
  return (
    <article className="helper-card glow" data-reveal style={{ "--d": `${delay * 70}ms` }}>
      <Avatar id={h.id} kind={h.role} look={h.avatar_style} size={68} online={h.is_online} />
      <div className="helper-body">
        <div className="helper-top">
          <h3>{h.name}</h3>
          <span className={`type-badge type-${h.role}`}>{PROVIDER_LABEL[h.role]}</span>
        </div>
        <p className="tiny muted">
          {h.area}
          {h.km != null ? ` · ${formatKm(h.km)} away · ~${h.eta} min` : ""}
        </p>
        <p className="small helper-skills">{h.skills}</p>
        <div className="helper-meta">
          <span>{h.rating ? `★ ${h.rating}` : "New"}</span>
          <span>
            {h.jobs} {h.jobs === 1 ? "job" : "jobs"}
          </span>
          <span className={h.is_online ? "status-on" : "status-off"}>{h.is_online ? "Available now" : "Offline"}</span>
        </div>
      </div>
    </article>
  );
}

export function GarageCard({ g, delay = 0 }) {
  return (
    <article className="garage-card glow" data-reveal style={{ "--d": `${delay * 70}ms` }}>
      <div className="garage-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path fill="currentColor" d="M12 3 2 8v2h20V8L12 3Zm-8 9v8h3v-5h10v5h3v-8H4Zm5 4v4h6v-4H9Z" />
        </svg>
      </div>
      <div>
        <div className="helper-top">
          <h3>{g.name}</h3>
          {g.is_partner ? <span className="type-badge type-garage">Partner</span> : null}
        </div>
        <p className="tiny muted">
          {g.area} · {g.landmark}
          {g.km != null ? ` · ${formatKm(g.km)}` : ""}
        </p>
        <p className="small">{g.specialties}</p>
        <div className="helper-meta">
          <span>{g.rating ? `★ ${g.rating}` : "-"}</span>
          <span>{g.hours}</span>
        </div>
      </div>
    </article>
  );
}
