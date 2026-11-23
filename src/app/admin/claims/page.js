import { requirePageUser } from "@/lib/session";
import { listClaims } from "@/lib/admin";
import { resolveClaimAction } from "@/app/actions/admin";
import AdminNav from "@/components/AdminNav";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import StatusBadge from "@/components/StatusBadge";
import { ugx, when } from "@/lib/format";

export const metadata = { title: "Claims" };

export default async function ClaimsAdmin() {
  const user = await requirePageUser(["admin"]);
  const claims = await listClaims(user);
  return (
    <>
      <div className="page-head">
        <span className="kicker">Admin · After-sales</span>
        <h1>Warranty claims and disputes</h1>
        <p>Disputes keep the money held until you decide. Warranty claims can send the mechanic back for free or refund the customer.</p>
      </div>
      <AdminNav active="/admin/claims" />
      {claims.length === 0 ? (
        <div className="card empty">No claims yet.</div>
      ) : (
        <div className="grid grid-2">
          {claims.map((c) => (
            <div key={c.id} className="card">
              <div className="row between">
                <strong>
                  {c.type === "WARRANTY" ? "Warranty claim" : "Dispute"} · {c.order_no}
                </strong>
                <StatusBadge status={c.status} />
              </div>
              <p className="small muted">
                {c.customer_name} vs {c.mechanic_name || "no mechanic"} · {ugx(c.total_amount)} · {when(c.created_at)}
              </p>
              <p>{c.description}</p>
              {c.status === "OPEN" ? (
                <ActionForm action={resolveClaimAction}>
                  <input type="hidden" name="claimId" value={c.id} />
                  <div>
                    <label htmlFor={`note-${c.id}`}>Resolution note</label>
                    <input id={`note-${c.id}`} name="note" type="text" required minLength={3} maxLength={300} />
                  </div>
                  <div className="row">
                    {c.type === "WARRANTY" && (
                      <SubmitButton className="btn btn-teal btn-sm" name="decision" value="REVISIT" pendingText="...">
                        Send mechanic back
                      </SubmitButton>
                    )}
                    <SubmitButton className="btn btn-dark btn-sm" name="decision" value="REFUNDED" pendingText="...">
                      Refund customer
                    </SubmitButton>
                    <SubmitButton className="btn btn-ghost btn-sm" name="decision" value="REJECTED" pendingText="...">
                      {c.type === "DISPUTE" ? "Reject - pay mechanic" : "Reject"}
                    </SubmitButton>
                  </div>
                </ActionForm>
              ) : (
                <p className="small">Resolution: {c.resolution_note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
