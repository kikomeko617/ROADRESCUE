import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/session";
import { getOrderDetail } from "@/lib/orders";
import { confirmAction, reportProblemAction, cancelAction, reviewAction, warrantyAction } from "@/app/actions/orders";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import StatusBadge from "@/components/StatusBadge";
import Timeline from "@/components/Timeline";
import AutoRefresh from "@/components/AutoRefresh";
import Avatar from "@/components/Avatar";
import LiveMap from "@/components/LiveMap";
import { ACTIVE_STATUSES, WARRANTY_DAYS, statusLabel } from "@/lib/constants";
import { avatarDataUri } from "@/lib/avatar";
import { ugx, when, timeAgo } from "@/lib/format";

export const metadata = { title: "Track order" };

const ETA_PROGRESS = { ACCEPTED: 20, EN_ROUTE: 60, IN_PROGRESS: 100 };

export default async function OrderPage({ params, searchParams }) {
  const user = await requirePageUser(["customer"]);
  const { id } = await params;
  const sp = await searchParams;
  let o;
  try {
    o = await getOrderDetail(user, Number(id));
  } catch {
    notFound();
  }
  if (!o) notFound();
  const live = ACTIVE_STATUSES.includes(o.status);
  const canCancel = ["PENDING_PAYMENT", "SEARCHING", "ACCEPTED"].includes(o.status);
  const kind = o.provider_type || "mechanic";
  const driver = kind === "driver";
  const showMap = o.helperPos && ["ACCEPTED", "EN_ROUTE"].includes(o.status);

  return (
    <>
      <p className="small">
        <Link href="/orders">← My orders</Link>
      </p>
      {sp?.paid && o.status === "SEARCHING" && (
        <p className="alert alert-success mb" role="status">
          Payment approved (simulated). Your money is held safely until you confirm the job is done.
        </p>
      )}
      <div className="row between mb">
        <div>
          <span className="kicker">Step 6 · Track</span>
          <h1 style={{ marginBottom: 4 }}>
            {o.service_name} <span className="muted">· {o.order_no}</span>
          </h1>
          <StatusBadge status={o.status} kind={kind} />
        </div>
        {live && <AutoRefresh seconds={5} />}
      </div>

      <div className="layout-side">
        <div>
          {o.status === "PENDING_PAYMENT" && (
            <div className="card soft">
              <h2>Payment needed</h2>
              <p>Approve the mock payment so we can send a {kind}.</p>
              <Link className="btn btn-primary" href={`/checkout/pay/${o.id}`}>
                Pay {ugx(o.total_amount)}
              </Link>
            </div>
          )}
          {o.status === "SEARCHING" && (
            <div className="card soft">
              <h2>
                Finding a {kind} near {o.area}…
              </h2>
              <p className="muted">
                Paid {timeAgo(o.paid_at)}. Verified {kind}s nearby have been alerted.
              </p>
              <div className="progress searching" aria-hidden="true">
                <span style={{ width: "15%" }} />
              </div>
            </div>
          )}
          {o.mechanic_name && ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "AWAITING_CONFIRMATION"].includes(o.status) && (
            <div className="card">
              <div className="row">
                <Avatar id={o.mechanic_id} kind={kind} look={o.mechanic_avatar} size={56} />
                <div>
                  <strong>{o.mechanic_name}</strong> <span className="badge badge-APPROVED">Verified {kind}</span>
                  <div className="small muted">
                    Based in {o.mechanic_area} · Call: {o.mechanic_phone}
                  </div>
                </div>
              </div>
              {ETA_PROGRESS[o.status] && (
                <div className="mt">
                  <div className="row between small">
                    <span>{statusLabel(o.status, kind)}</span>
                    <span>{o.status === "IN_PROGRESS" ? (driver ? "On the road" : "Arrived") : `About ${o.etaMinutes} min away (simulated)`}</span>
                  </div>
                  <div className="progress" role="progressbar" aria-valuenow={ETA_PROGRESS[o.status]} aria-valuemin={0} aria-valuemax={100} aria-label={`${driver ? "Driver" : "Mechanic"} progress`}>
                    <span style={{ width: `${ETA_PROGRESS[o.status]}%` }} />
                  </div>
                </div>
              )}
              {showMap && (
                <div className="mt">
                  <LiveMap
                    points={[{ kind, lat: o.helperPos[0], lng: o.helperPos[1], title: o.mechanic_name, subtitle: `Coming from ${o.mechanic_area}`, avatar: avatarDataUri({ seed: o.mechanic_id, kind, style: o.mechanic_avatar }) }]}
                    you={o.customerPos}
                    route={{ from: o.helperPos, to: o.customerPos }}
                    label={`Map: ${o.mechanic_name} coming from ${o.mechanic_area} to ${o.area}`}
                    className="map-short"
                  />
                  <p className="tiny muted">Approximate positions based on areas, not live GPS.</p>
                </div>
              )}
            </div>
          )}

          {o.status === "AWAITING_CONFIRMATION" && (
            <div className="card soft">
              <h2>{driver ? "Did you get there safely?" : "Is your car fixed?"}</h2>
              <p>
                When you confirm, the money is released to the {kind}. If something is wrong, report it and we&apos;ll keep the money held while we check.
              </p>
              <ActionForm action={confirmAction}>
                <input type="hidden" name="orderId" value={o.id} />
                <SubmitButton className="btn btn-teal" pendingText="Confirming...">
                  {driver ? "Yes, all good" : "Yes, it's fixed"} - release payment
                </SubmitButton>
              </ActionForm>
              <details className="mt">
                <summary>Something is wrong</summary>
                <ActionForm action={reportProblemAction} className="form mt">
                  <input type="hidden" name="orderId" value={o.id} />
                  <label htmlFor="dispute">What went wrong?</label>
                  <textarea id="dispute" name="description" required minLength={10} maxLength={500} />
                  <SubmitButton className="btn btn-danger" pendingText="Sending...">
                    Report a problem
                  </SubmitButton>
                </ActionForm>
              </details>
            </div>
          )}

          {o.status === "COMPLETED" && !o.review && (
            <div className="card">
              <h2>Rate {o.mechanic_name}</h2>
              <ActionForm action={reviewAction}>
                <input type="hidden" name="orderId" value={o.id} />
                <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="small" style={{ fontWeight: 600, marginBottom: 6 }}>
                    Your rating
                  </legend>
                  <div className="stars">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <label key={n}>
                        <input type="radio" name="rating" value={n} defaultChecked={n === 5} /> {n} ★
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="comment">Comment (optional)</label>
                  <textarea id="comment" name="comment" maxLength={500} placeholder="How was the service?" />
                </div>
                <SubmitButton pendingText="Sending...">Submit review</SubmitButton>
              </ActionForm>
            </div>
          )}
          {o.review && (
            <div className="card">
              <h2>Your review</h2>
              <p>
                {"★".repeat(o.review.rating)}
                {"☆".repeat(5 - o.review.rating)} <span className="muted small">{when(o.review.created_at)}</span>
              </p>
              {o.review.comment && <p>&ldquo;{o.review.comment}&rdquo;</p>}
            </div>
          )}

          {o.canClaimWarranty && !o.claims.some((c) => c.status === "OPEN") && (
            <div className="card">
              <h2>{WARRANTY_DAYS}-day warranty</h2>
              <p className="small muted">Did the same problem come back? Tell us and we&apos;ll send someone at no labour cost.</p>
              <details>
                <summary>Open a warranty claim</summary>
                <ActionForm action={warrantyAction} className="form mt">
                  <input type="hidden" name="orderId" value={o.id} />
                  <label htmlFor="warranty">Describe the problem</label>
                  <textarea id="warranty" name="description" required minLength={10} maxLength={500} />
                  <SubmitButton className="btn btn-dark" pendingText="Sending...">
                    Send claim
                  </SubmitButton>
                </ActionForm>
              </details>
            </div>
          )}

          {o.claims.length > 0 && (
            <div className="card">
              <h2>Claims</h2>
              {o.claims.map((c) => (
                <div key={c.id} className="notif">
                  <div>
                    <div className="row">
                      <strong>{c.type === "WARRANTY" ? "Warranty claim" : "Dispute"}</strong> <StatusBadge status={c.status} />
                    </div>
                    <p className="small">{c.description}</p>
                    {c.resolution_note && <p className="small muted">Our response: {c.resolution_note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <h2>Order details</h2>
            <p className="small muted">
              {o.area} · {o.landmark} · {o.vehicle}
              {o.problem_note ? ` · "${o.problem_note}"` : ""}
            </p>
            <div className="table-wrap">
              <table>
                <tbody>
                  {o.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.name} {i.qty > 1 && <span className="muted">× {i.qty}</span>}
                      </td>
                      <td className="right">{ugx(i.line_total)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td className="right">
                      <strong>{ugx(o.total_amount)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {o.payment && (
              <p className="small mt">
                Payment: {o.payment.method === "MOCK_AIRTEL" ? "Airtel Money" : "MTN MoMo"} (mock) from {o.payment.payer_phone_masked} · <StatusBadge status={o.payment.status} />
                {o.payment.provider_ref && <span className="muted"> · Ref {o.payment.provider_ref}</span>}
              </p>
            )}
            {canCancel && (
              <details className="mt">
                <summary>Cancel this order</summary>
                <ActionForm action={cancelAction} className="form mt">
                  <input type="hidden" name="orderId" value={o.id} />
                  <label htmlFor="reason">Reason (optional)</label>
                  <input id="reason" name="reason" type="text" maxLength={200} />
                  <SubmitButton className="btn btn-danger" pendingText="Cancelling...">
                    Cancel and refund
                  </SubmitButton>
                </ActionForm>
              </details>
            )}
          </div>
        </div>

        <aside className="card">
          <h2>Progress</h2>
          <Timeline status={o.status} history={o.history} kind={kind} />
          <details className="small">
            <summary>Full history</summary>
            <ul style={{ paddingLeft: 18 }}>
              {o.history.map((h) => (
                <li key={h.id}>
                  {when(h.created_at)}: {statusLabel(h.to_status, kind)}
                  {h.changed_by_name ? ` by ${h.changed_by_name}` : ""}
                  {h.note ? ` - ${h.note}` : ""}
                </li>
              ))}
            </ul>
          </details>
        </aside>
      </div>
    </>
  );
}
