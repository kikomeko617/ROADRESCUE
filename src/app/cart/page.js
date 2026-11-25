import Link from "next/link";
import { requirePageUser } from "@/lib/session";
import { getCart } from "@/lib/cart";
import { listParts } from "@/lib/catalog";
import { updateQtyAction, removeItemAction, addToCartAction } from "@/app/actions/cart";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import { ugx } from "@/lib/format";

export const metadata = { title: "Your cart" };

export default async function CartPage() {
  const user = await requirePageUser(["customer"]);
  const [cart, parts] = await Promise.all([getCart(user.id), listParts()]);
  const inCart = new Set(cart.items.filter((i) => i.kind === "PART").map((i) => i.ref_id));
  return (
    <>
      <div className="page-head">
        <span className="kicker">Step 3 · Cart</span>
        <h1>Your cart</h1>
        <p>One service plus any parts the mechanic should bring.</p>
      </div>
      {cart.items.length === 0 ? (
        <div className="card empty">
          <p>Your cart is empty.</p>
          <Link className="btn btn-primary" href="/services">
            Find a service
          </Link>
        </div>
      ) : (
        <div className="layout-side">
          <div className="card">
            <div className="table-wrap">
              <table>
                <caption className="sr-only">Items in your cart</caption>
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Qty</th>
                    <th scope="col" className="right">
                      Price
                    </th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cart.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <strong>{i.name}</strong>
                        <div className="tiny muted">{i.kind === "SERVICE" ? `Service · ${i.category}` : `Part · ${i.stock} in stock`}</div>
                      </td>
                      <td>
                        {i.kind === "PART" ? (
                          <ActionForm action={updateQtyAction} className="row">
                            <input type="hidden" name="itemId" value={i.id} />
                            <label htmlFor={`qty-${i.id}`} className="sr-only">
                              Quantity for {i.name}
                            </label>
                            <input id={`qty-${i.id}`} name="qty" type="number" min="1" max="10" defaultValue={i.qty} style={{ width: 70 }} />
                            <SubmitButton className="btn btn-ghost btn-sm" pendingText="...">
                              Update
                            </SubmitButton>
                          </ActionForm>
                        ) : (
                          1
                        )}
                      </td>
                      <td className="right">{ugx(i.line_total)}</td>
                      <td>
                        <ActionForm action={removeItemAction} className="">
                          <input type="hidden" name="itemId" value={i.id} />
                          <SubmitButton className="btn btn-danger btn-sm" pendingText="...">
                            Remove
                          </SubmitButton>
                        </ActionForm>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!cart.hasService && (
              <p className="alert alert-info mt">
                Add a service before checking out. <Link href="/services">Choose a service</Link>
              </p>
            )}
            <h2 className="mt">Add parts</h2>
            <div className="grid grid-2">
              {parts
                .filter((p) => !inCart.has(p.id) && p.stock > 0)
                .map((p) => (
                  <div key={p.id} className="row between card inset">
                    <div>
                      <strong className="small">{p.name}</strong>
                      <div className="tiny muted">
                        {ugx(p.price)} · {p.stock} left
                      </div>
                    </div>
                    <ActionForm action={addToCartAction} className="">
                      <input type="hidden" name="kind" value="PART" />
                      <input type="hidden" name="refId" value={p.id} />
                      <input type="hidden" name="qty" value="1" />
                      <SubmitButton className="btn btn-ghost btn-sm" pendingText="...">
                        + Add
                      </SubmitButton>
                    </ActionForm>
                  </div>
                ))}
            </div>
          </div>
          <aside className="card soft">
            <h2>Summary</h2>
            <table className="totals">
              <tbody>
                <tr>
                  <td>Service</td>
                  <td className="right">{ugx(cart.serviceAmount)}</td>
                </tr>
                <tr>
                  <td>Parts</td>
                  <td className="right">{ugx(cart.partsAmount)}</td>
                </tr>
                <tr className="grand">
                  <td>Total</td>
                  <td className="right">{ugx(cart.total)}</td>
                </tr>
              </tbody>
            </table>
            {cart.hasService ? (
              <Link href="/checkout" className="btn btn-primary btn-block mt">
                Continue to checkout
              </Link>
            ) : (
              <button className="btn btn-primary btn-block mt" disabled>
                Continue to checkout
              </button>
            )}
            <p className="tiny muted mt">Prices are fixed. Your money is held safely and only released when you confirm the job is done.</p>
          </aside>
        </div>
      )}
    </>
  );
}
