import { requirePageUser } from "@/lib/session";
import { listParts } from "@/lib/catalog";
import { stockAction } from "@/app/actions/admin";
import AdminNav from "@/components/AdminNav";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import { ugx } from "@/lib/format";

export const metadata = { title: "Inventory" };

export default async function InventoryAdmin() {
  await requirePageUser(["admin"]);
  const parts = await listParts({ includeInactive: true });
  return (
    <>
      <div className="page-head">
        <span className="kicker">Admin</span>
        <h1>Spare parts inventory</h1>
        <p>Stock goes down automatically when an order is placed, and back up if it&apos;s cancelled. Stock can never go below zero.</p>
      </div>
      <AdminNav active="/admin/inventory" />
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Part</th>
              <th scope="col" className="right">
                Price
              </th>
              <th scope="col">In stock</th>
              <th scope="col">Update stock</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                  <div className="tiny muted">{p.description}</div>
                </td>
                <td className="right">{ugx(p.price)}</td>
                <td>{p.stock < 5 ? <span className="badge badge-PENDING">{p.stock} - low</span> : p.stock}</td>
                <td>
                  <ActionForm action={stockAction} className="row">
                    <input type="hidden" name="partId" value={p.id} />
                    <label htmlFor={`stock-${p.id}`} className="sr-only">
                      New stock for {p.name}
                    </label>
                    <input id={`stock-${p.id}`} name="stock" type="number" min="0" max="10000" defaultValue={p.stock} style={{ width: 90 }} />
                    <SubmitButton className="btn btn-ghost btn-sm" pendingText="...">
                      Save
                    </SubmitButton>
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
