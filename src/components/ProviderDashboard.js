// The helper dashboard, shared by mechanics (/mechanic) and drivers (/driver).
import { listOpenJobs, listMechanicJobs } from "@/lib/orders";
import { acceptJobAction, advanceJobAction } from "@/app/actions/mechanic";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import StatusBadge from "@/components/StatusBadge";
import AutoRefresh from "@/components/AutoRefresh";
import Avatar from "@/components/Avatar";
import { one } from "@/lib/db";
import { ugx, timeAgo, when } from "@/lib/format";

const NEXT_STEP = {
  mechanic: {
    ACCEPTED: ["EN_ROUTE", "I'm on my way"],
    EN_ROUTE: ["IN_PROGRESS", "I've arrived - start work"],
    IN_PROGRESS: ["AWAITING_CONFIRMATION", "Job done - ask customer to confirm"],
  },
  driver: {
    ACCEPTED: ["EN_ROUTE", "I'm on my way"],
    EN_ROUTE: ["IN_PROGRESS", "I've picked them up - start the drive"],
    IN_PROGRESS: ["AWAITING_CONFIRMATION", "Arrived - ask customer to confirm"],
  },
};

const WORDS = {
  mechanic: { title: "Mechanic dashboard", jobs: "jobs", job: "job", active: "My active jobs", accept: "Accept job" },
  driver: { title: "Driver dashboard", jobs: "trips", job: "trip", active: "My active trips", accept: "Accept trip" },
};

export default async function ProviderDashboard({ user, kind, sp }) {
  const w = WORDS[kind];
  const [{ profile, jobs: open }, { jobs, stats }, look] = await Promise.all([
    listOpenJobs(user),
    listMechanicJobs(user),
    one("SELECT avatar_style FROM provider_profiles WHERE user_id = ?", [user.id]),
  ]);
  const active = jobs.filter((j) => ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "AWAITING_CONFIRMATION", "DISPUTED"].includes(j.status));
  const past = jobs.filter((j) => !active.includes(j));
  const approved = profile?.status === "APPROVED";

  return (
    <>
      <div className="row between page-head">
        <div className="row">
          <Avatar id={user.id} kind={kind} look={look?.avatar_style} size={64} />
          <div>
            <span className="kicker">
              {w.title} · {profile?.area}
            </span>
            <h1>Hello, {user.name.split(" ")[0]}</h1>
          </div>
        </div>
        <AutoRefresh seconds={8} />
      </div>
      {sp?.welcome && (
        <p className="alert alert-success mb" role="status">
          Account created! Our team will check your details before you can take {w.jobs}.
        </p>
      )}
      {sp?.denied && (
        <p className="alert alert-error mb" role="alert">
          You don&apos;t have access to that page.
        </p>
      )}
      {!approved && (
        <p className="alert alert-info mb" role="status">
          Your account is <strong>{profile?.status?.toLowerCase()}</strong>. An admin must approve you before you can accept {w.jobs}.
        </p>
      )}

      <div className="grid grid-4 mb">
        <div className="card stat-card">
          <div className="stat">{stats.done}</div>
          <div className="stat-label">{kind === "driver" ? "Trips" : "Jobs"} completed</div>
        </div>
        <div className="card stat-card">
          <div className="stat">{ugx(stats.earned)}</div>
          <div className="stat-label">Earned (after commission)</div>
        </div>
        <div className="card stat-card">
          <div className="stat">{stats.rating ? `★ ${stats.rating}` : "-"}</div>
          <div className="stat-label">{stats.reviews} reviews</div>
        </div>
        <div className="card stat-card">
          <div className="stat">{open.length}</div>
          <div className="stat-label">Open {w.jobs} right now</div>
        </div>
      </div>

      {active.length > 0 && (
        <section className="mb" aria-labelledby="active">
          <h2 id="active">{w.active}</h2>
          <div className="grid grid-2">
            {active.map((j) => (
              <div key={j.id} className="card soft">
                <div className="row between">
                  <strong>
                    {j.service_name} · {j.order_no}
                  </strong>
                  <StatusBadge status={j.status} kind={kind} />
                </div>
                <p className="small">
                  <strong>{j.customer_name}</strong> · {j.area}, {j.landmark}
                  <br />
                  {j.vehicle}
                  {j.problem_note ? ` · "${j.problem_note}"` : ""}
                </p>
                <p className="small">
                  You earn <strong>{ugx(j.total_amount - j.commission_amount)}</strong> (total {ugx(j.total_amount)})
                </p>
                {NEXT_STEP[kind][j.status] ? (
                  <ActionForm action={advanceJobAction}>
                    <input type="hidden" name="orderId" value={j.id} />
                    <input type="hidden" name="to" value={NEXT_STEP[kind][j.status][0]} />
                    <SubmitButton pendingText="Updating...">{NEXT_STEP[kind][j.status][1]}</SubmitButton>
                  </ActionForm>
                ) : (
                  <p className="small muted">{j.status === "DISPUTED" ? "The customer reported a problem. Our team is reviewing it." : "Waiting for the customer to confirm."}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb" aria-labelledby="open">
        <h2 id="open">Open {w.jobs}</h2>
        {open.length === 0 ? (
          <div className="card empty">No open {w.jobs} right now. New ones appear here automatically.</div>
        ) : (
          <div className="grid grid-2">
            {open.map((j) => (
              <div key={j.id} className="card">
                <div className="row between">
                  <strong>{j.service_name}</strong>
                  {j.area === profile?.area ? <span className="badge badge-COMPLETED">In your area</span> : <span className="badge">{j.area}</span>}
                </div>
                <p className="small">
                  {j.area} · {j.landmark}
                  <br />
                  {j.vehicle}
                  {j.problem_note ? ` · "${j.problem_note}"` : ""}
                  {Number(j.part_lines) > 0 ? " · bring parts from the order" : ""}
                </p>
                <p className="small muted">
                  Waiting {timeAgo(j.paid_at)} · ~{j.est_minutes} min {w.job} · You earn {ugx(j.total_amount - j.commission_amount)}
                </p>
                {approved ? (
                  <ActionForm action={acceptJobAction}>
                    <input type="hidden" name="orderId" value={j.id} />
                    <SubmitButton className="btn btn-dark" pendingText="Accepting...">
                      {w.accept}
                    </SubmitButton>
                  </ActionForm>
                ) : (
                  <button className="btn btn-ghost" disabled>
                    Approval needed
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="card table-wrap" aria-labelledby="past">
          <h2 id="past">Past {w.jobs}</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Service</th>
                <th scope="col">Status</th>
                <th scope="col" className="right">
                  You earned
                </th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {past.map((j) => (
                <tr key={j.id}>
                  <td>{j.order_no}</td>
                  <td>{j.service_name}</td>
                  <td>
                    <StatusBadge status={j.status} kind={kind} />
                  </td>
                  <td className="right">{j.status === "COMPLETED" ? ugx(j.total_amount - j.commission_amount) : "-"}</td>
                  <td className="small muted">{when(j.completed_at || j.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
