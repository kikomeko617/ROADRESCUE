import Link from "next/link";
import { requirePageUser } from "@/lib/session";
import { dashboardStats, listRecentOrders } from "@/lib/admin";
import { adminCancelAction } from "@/app/actions/admin";
import AdminNav from "@/components/AdminNav";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import StatusBadge from "@/components/StatusBadge";
import AutoRefresh from "@/components/AutoRefresh";
import { STATUS_LABEL } from "@/lib/constants";
import { ugx, when } from "@/lib/format";

export const metadata = { title: "Admin" };

export default async function AdminPage({ searchParams }) {
  const user = await requirePageUser(["admin"]);
  const sp = await searchParams;
  const [s, orders] = await Promise.all([dashboardStats(user), listRecentOrders(user)]);
  const maxStatus = Math.max(1, ...s.byStatus.map((b) => Number(b.n)));
  return (
    <>
      <div className="row between page-head">
        <div>
          <span className="kicker">Admin</span>
          <h1>Business overview</h1>
        </div>
        <AutoRefresh seconds={15} />
      </div>
      {sp?.denied && (
        <p className="alert alert-error mb" role="alert">
          You don&apos;t have access to that page.
        </p>
      )}
      <AdminNav active="/admin" />

      <div className="grid grid-4 mb">
        <div className="card">
          <div className="stat">{s.totalOrders}</div>
          <div className="stat-label">
            Orders ({s.active} active, {s.completed} completed)
          </div>
        </div>
        <div className="card">
          <div className="stat">{ugx(s.gmv)}</div>
          <div className="stat-label">Value of completed jobs</div>
        </div>
        <div className="card">
          <div className="stat">{ugx(s.commission)}</div>
          <div className="stat-label">Our commission earned</div>
        </div>
        <div className="card">
          <div className="stat">{s.avgAcceptMin != null ? `${s.avgAcceptMin} min` : "-"}</div>
          <div className="stat-label">Avg. time to find a mechanic or driver (key success measure)</div>
        </div>
        <div className="card">
          <div className="stat">{s.avgRating ? `★ ${s.avgRating}` : "-"}</div>
          <div className="stat-label">{s.reviews} customer reviews</div>
        </div>
        <Link href="/admin/claims" className="card card-link">
          <div className="stat">{s.openClaims}</div>
          <div className="stat-label">Open claims and disputes →</div>
        </Link>
        <Link href="/admin/mechanics" className="card card-link">
          <div className="stat">{s.pendingMechanics}</div>
          <div className="stat-label">Mechanics and drivers waiting for approval →</div>
        </Link>
        <Link href="/admin/inventory" className="card card-link">
          <div className="stat">{s.lowStock.length}</div>
          <div className="stat-label">Parts low on stock →</div>
        </Link>
      </div>

      <div className="layout-side">
        <section className="card table-wrap" aria-labelledby="recent">
          <h2 id="recent">Recent orders</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col">Helper</th>
                <th scope="col">Status</th>
                <th scope="col" className="right">
                  Total
                </th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.order_no}</strong>
                    <div className="tiny muted">
                      {o.service_name} · {o.area} · {when(o.created_at)}
                    </div>
                  </td>
                  <td>{o.customer_name}</td>
                  <td>{o.mechanic_name || <span className="muted">-</span>}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="right">{ugx(o.total_amount)}</td>
                  <td>
                    {["PENDING_PAYMENT", "SEARCHING", "ACCEPTED"].includes(o.status) && (
                      <ActionForm action={adminCancelAction} className="">
                        <input type="hidden" name="orderId" value={o.id} />
                        <SubmitButton className="btn btn-danger btn-sm" pendingText="...">
                          Cancel
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="card">
          <h2>Orders by status</h2>
          <div className="stack">
            {s.byStatus.map((b) => (
              <div key={b.status}>
                <div className="row between small">
                  <span>{STATUS_LABEL[b.status]}</span>
                  <strong>{b.n}</strong>
                </div>
                <div className="progress" aria-hidden="true">
                  <span style={{ width: `${(Number(b.n) / maxStatus) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          {s.lowStock.length > 0 && (
            <>
              <h3 className="mt">Low stock</h3>
              <ul className="small" style={{ paddingLeft: 18 }}>
                {s.lowStock.map((p) => (
                  <li key={p.id}>
                    {p.name}: <strong>{p.stock}</strong> left
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
