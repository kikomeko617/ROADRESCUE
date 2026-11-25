import Link from "next/link";
import { notFound } from "next/navigation";
import { getService, listParts } from "@/lib/catalog";
import { currentUser } from "@/lib/session";
import { addToCartAction } from "@/app/actions/cart";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import { ugx } from "@/lib/format";
import { CATEGORY_IMAGES } from "@/lib/images";

// Which parts are suggested with which service category.
const SUGGEST = {
  "Battery & electrics": ["battery"],
  Fuel: ["petrol"],
  Tyres: ["tyre"],
  Engine: ["coolant", "hose", "fan belt"],
  Brakes: ["brake"],
};

export default async function ServiceDetail({ params }) {
  const { id } = await params;
  const service = await getService(Number(id));
  if (!service) notFound();
  const [user, parts] = await Promise.all([currentUser(), listParts()]);
  const keys = SUGGEST[service.category] || [];
  const suggested = parts.filter((p) => keys.some((k) => p.name.toLowerCase().includes(k)));
  const isCustomer = user?.role === "customer";
  return (
    <>
      <p className="small">
        <Link href="/services">← All services</Link>
      </p>
      <div className="layout-side">
        <div className="card">
          {CATEGORY_IMAGES[service.category] && (
            <img className="card-photo detail" src={CATEGORY_IMAGES[service.category]} alt="" width="960" height="600" decoding="async" />
          )}
          <span className="kicker">Step 2 · Select · {service.category}</span>
          <h1>{service.name}</h1>
          <p>{service.description}</p>
          <div className="row mt">
            <span className="stat">{ugx(service.price)}</span>
            <span className="muted">fixed price · about {service.est_minutes} minutes</span>
          </div>
          <ul className="trust-list mt">
            <li>Price includes the {service.provider_type} coming to you</li>
            <li>Verified, rated {service.provider_type}</li>
            <li>Money held until you confirm the job is done</li>
            <li>7-day warranty on the work</li>
          </ul>
          {suggested.length > 0 && (
            <div className="mt">
              <h2>Parts you might need</h2>
              <p className="muted small">Add them now so the mechanic brings them.</p>
              <div className="stack">
                {suggested.map((p) => (
                  <div key={p.id} className="row between card inset">
                    <div>
                      <strong>{p.name}</strong>
                      <div className="small muted">
                        {ugx(p.price)} · {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                      </div>
                    </div>
                    {isCustomer && p.stock > 0 && (
                      <ActionForm action={addToCartAction} className="row">
                        <input type="hidden" name="kind" value="PART" />
                        <input type="hidden" name="refId" value={p.id} />
                        <input type="hidden" name="qty" value="1" />
                        <SubmitButton className="btn btn-ghost btn-sm" pendingText="Adding...">
                          + Add
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <aside className="card soft">
          <h2>Request this service</h2>
          {isCustomer ? (
            <ActionForm action={addToCartAction}>
              <input type="hidden" name="kind" value="SERVICE" />
              <input type="hidden" name="refId" value={service.id} />
              <input type="hidden" name="goToCart" value="1" />
              <p className="small muted">One service per request. Adding this replaces any other service in your cart.</p>
              <SubmitButton className="btn btn-primary btn-block" pendingText="Adding...">
                Add to cart · {ugx(service.price)}
              </SubmitButton>
            </ActionForm>
          ) : user ? (
            <p className="alert alert-info">Only customer accounts can request services.</p>
          ) : (
            <>
              <p className="small">Log in or create a free account to request help.</p>
              <Link className="btn btn-primary btn-block" href={`/login?next=/services/${service.id}`}>
                Log in to request
              </Link>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
