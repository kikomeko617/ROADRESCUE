import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/session";
import { getCart } from "@/lib/cart";
import { checkoutAction } from "@/app/actions/orders";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import { AREAS } from "@/lib/constants";
import { ugx } from "@/lib/format";
import { getCustomerProfile, vehicleText } from "@/lib/profile";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requirePageUser(["customer"]);
  const [cart, profile] = await Promise.all([getCart(user.id), getCustomerProfile(user.id)]);
  if (!cart.hasService) redirect("/cart");
  const savedArea = AREAS.includes(profile?.last_area) ? profile.last_area : "";
  return (
    <>
      <div className="page-head">
        <span className="kicker">Step 4 · Checkout</span>
        <h1>Where are you, and how will you pay?</h1>
        <p>We only need your area and a landmark. We don&apos;t store your exact GPS location.{profile?.vehicle_make ? " We filled in what you told us earlier." : ""}</p>
      </div>
      <div className="layout-side">
        <div className="card">
          <ActionForm action={checkoutAction}>
            <h2>Your location</h2>
            <div className="grid grid-2">
              <div>
                <label htmlFor="area">Area</label>
                <select id="area" name="area" required defaultValue={savedArea}>
                  <option value="" disabled>
                    Choose your area
                  </option>
                  {AREAS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="landmark">
                  Landmark <span className="hint">So your mechanic or driver can find you</span>
                </label>
                <input id="landmark" name="landmark" type="text" required minLength={5} maxLength={120} placeholder="e.g. Opposite Shell Ntinda" />
              </div>
            </div>
            <div className="grid grid-2">
              <div>
                <label htmlFor="vehicle">Your car</label>
                <input id="vehicle" name="vehicle" type="text" required minLength={3} maxLength={80} defaultValue={vehicleText(profile)} placeholder="e.g. Toyota Premio, silver" />
              </div>
              <div>
                <label htmlFor="problemNote">
                  What happened? <span className="hint">Optional</span>
                </label>
                <input id="problemNote" name="problemNote" type="text" maxLength={300} placeholder="e.g. Car won't start, or which garage to tow to" />
              </div>
            </div>
            <h2 className="mt">Payment (simulated)</h2>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="sr-only">Payment method</legend>
              <div className="radio-cards">
                <label className="radio-card">
                  <input type="radio" name="method" value="MOCK_MOMO" defaultChecked />
                  <span>
                    MTN MoMo
                    <span className="hint">Sandbox / mock</span>
                  </span>
                </label>
                <label className="radio-card">
                  <input type="radio" name="method" value="MOCK_AIRTEL" />
                  <span>
                    Airtel Money
                    <span className="hint">Sandbox / mock</span>
                  </span>
                </label>
              </div>
            </fieldset>
            <div>
              <label htmlFor="payerPhone">
                Mobile money number <span className="hint">Use a made-up number. We only keep the last 3 digits.</span>
              </label>
              <input id="payerPhone" name="payerPhone" type="tel" inputMode="numeric" required placeholder="07XXXXXXXX" />
            </div>
            <p className="alert alert-info small">This is a test payment. We will never ask for your PIN. In the next step you approve or decline a simulated phone prompt.</p>
            <SubmitButton className="btn btn-primary btn-block" pendingText="Placing order...">
              Place order and pay {ugx(cart.total)}
            </SubmitButton>
          </ActionForm>
        </div>
        <aside className="card soft">
          <h2>Order summary</h2>
          <ul style={{ paddingLeft: 18 }}>
            {cart.items.map((i) => (
              <li key={i.id} className="small">
                {i.name} {i.qty > 1 ? `× ${i.qty}` : ""} - {ugx(i.line_total)}
              </li>
            ))}
          </ul>
          <p className="stat">{ugx(cart.total)}</p>
          <p className="small">
            <Link href="/cart">Edit cart</Link>
          </p>
        </aside>
      </div>
    </>
  );
}
