import Link from "next/link";
import { requirePageUser } from "@/lib/session";
import { listAudit, listAuditActions } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";
import { when } from "@/lib/format";

export const metadata = { title: "Audit log" };

export default async function AuditAdmin({ searchParams }) {
  const user = await requirePageUser(["admin"]);
  const sp = await searchParams;
  const action = typeof sp?.action === "string" ? sp.action : "";
  const [rows, actions] = await Promise.all([listAudit(user, { action }), listAuditActions(user)]);
  return (
    <>
      <div className="page-head">
        <span className="kicker">Admin · Security</span>
        <h1>Audit log</h1>
        <p>Every login, payment, status change and admin action is recorded here. Entries are kept for 12 months.</p>
      </div>
      <AdminNav active="/admin/audit" />
      <form className="card row mb" action="/admin/audit">
        <label htmlFor="action" style={{ margin: 0 }}>
          Filter by action
        </label>
        <select id="action" name="action" defaultValue={action} style={{ maxWidth: 280 }}>
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button className="btn btn-ghost btn-sm" type="submit">
          Filter
        </button>
        {action && <Link href="/admin/audit">Clear</Link>}
      </form>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Who</th>
              <th scope="col">Action</th>
              <th scope="col">On</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="small">{when(r.created_at)}</td>
                <td className="small">
                  {r.actor_name || "-"} <span className="muted">({r.actor_role})</span>
                </td>
                <td>
                  <code className="small">{r.action}</code>
                </td>
                <td className="small">
                  {r.entity} {r.entity_id}
                </td>
                <td className="small muted">{r.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
