import Link from "next/link";
import { listServices, listCategories } from "@/lib/catalog";
import { ugx } from "@/lib/format";
import { CATEGORY_IMAGES } from "@/lib/images";

export const metadata = { title: "Find help" };

export default async function ServicesPage({ searchParams }) {
  const sp = await searchParams;
  const q = typeof sp?.q === "string" ? sp.q : "";
  const category = typeof sp?.category === "string" ? sp.category : "";
  const [services, categories] = await Promise.all([listServices({ q, category }), listCategories()]);
  return (
    <>
      {sp?.welcome && (
        <p className="alert alert-success mb" role="status">
          Welcome to ROADRESCUE! Pick a service, or <Link href="/request">answer three quick questions</Link> and we&apos;ll match you.
        </p>
      )}
      <div className="page-head">
        <span className="kicker">Step 1 · Discover</span>
        <h1>What do you need help with?</h1>
        <p>Search or pick a category. Every price is fixed and includes the mechanic or driver coming to you.</p>
      </div>
      <form className="card row mb" role="search" action="/services">
        <label htmlFor="q" className="sr-only">
          Search services
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Search e.g. battery, tyre, overheating" style={{ flex: 1, minWidth: 200 }} />
        {category && <input type="hidden" name="category" value={category} />}
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </form>
      <div className="chips mb" aria-label="Filter by category">
        <Link className={`chip light ${!category ? "active" : ""}`} href={q ? `/services?q=${encodeURIComponent(q)}` : "/services"} aria-current={!category ? "true" : undefined}>
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            className={`chip light ${category === c ? "active" : ""}`}
            aria-current={category === c ? "true" : undefined}
            href={`/services?category=${encodeURIComponent(c)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          >
            {c}
          </Link>
        ))}
      </div>
      <p className="muted small" aria-live="polite">
        {services.length} service{services.length === 1 ? "" : "s"} found{q ? ` for "${q}"` : ""}
        {category ? ` in ${category}` : ""}
      </p>
      {services.length === 0 ? (
        <div className="card empty">
          <p>No services match that search.</p>
          <p>
            Not sure what&apos;s wrong? Try <Link href="/services?q=diagnosis">Callout and diagnosis</Link>.
          </p>
        </div>
      ) : (
        <div className="grid grid-3">
          {services.map((s) => (
            <Link key={s.id} href={`/services/${s.id}`} className="card service-card glow" data-reveal>
              {CATEGORY_IMAGES[s.category] && (
                <img className="card-photo" src={CATEGORY_IMAGES[s.category]} alt="" width="960" height="600" loading="lazy" decoding="async" />
              )}
              <span className="kicker">{s.category}</span>
              <h2 style={{ fontSize: "1.15rem" }}>{s.name}</h2>
              <p className="muted small">{s.description}</p>
              <div className="meta">
                <span className="price">{ugx(s.price)}</span>
                <span className="muted small">
                  ~{s.est_minutes} min · {s.helpers_available} {s.provider_type}s
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
