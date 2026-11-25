import Link from "next/link";
import { requirePageUser } from "@/lib/session";
import { listCustomerOrders } from "@/lib/orders";
import StatusBadge from "@/components/StatusBadge";
import { ugx, when } from "@/lib/format";

export const metadata = { title: "My orders" };

export default async function OrdersPage() {
  const user = await requirePageUser(["customer"]);
  const orders = await listCustomerOrders(user);
  return (
    <>
      <div className="page-head">
        <h1>My orders</h1>
        <p>Track live jobs and see your past rescues.</p>
      </div>
      {orders.length === 0 ? (
        <div className="card empty">
          <p>You haven&apos;t ordered any help yet.</p>
          <Link href="/services" className="btn btn-primary">
            Find a service
          </Link>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <caption className="sr-only">Your orders</caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Service</th>
                <th scope="col">Status</th>
                <th scope="col">Helper</th>
                <th scope="col" className="right">
                  Total
                </th>
                <th scope="col">Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/orders/${o.id}`}>
                      <strong>{o.order_no}</strong>
                    </Link>
                  </td>
                  <td>{o.service_name}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td>{o.mechanic_name || <span className="muted">-</span>}</td>
                  <td className="right">{ugx(o.total_amount)}</td>
                  <td className="small muted">{when(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
