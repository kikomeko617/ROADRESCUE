// "Get help": the steps a customer goes through every time they ask for help.
//   1. What do you need?   2. What do you drive? (remembered)   3. Where are you?   4. Choose a service
// Each step is its own URL, so the browser Back button works and nothing is lost on refresh.
import Link from "next/link";
import { requirePageUser } from "@/lib/session";
import { getCustomerProfile, vehicleText } from "@/lib/profile";
import { servicesForNeed, listProviders, listGarages } from "@/lib/catalog";
import { listCustomerOrders } from "@/lib/orders";
import { addToCartAction } from "@/app/actions/cart";
import { AREAS, NEEDS, ACTIVE_STATUSES, PROVIDER_LABEL, needByKey, statusLabel } from "@/lib/constants";
import { ugx } from "@/lib/format";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import VehicleForm, { BodyIcon } from "@/components/VehicleForm";
import AreaPicker from "@/components/AreaPicker";
import NeedIcon from "@/components/NeedIcon";
import { HelperCard, GarageCard } from "@/components/Cards";
import { NEED_IMAGES, BODY_IMAGES, CATEGORY_IMAGES } from "@/lib/images";

export const metadata = { title: "Get help" };

const STEPS = ["Need", "Car", "Location", "Choose"];

function StepProgress({ step, links }) {
  return (
    <ol className="stepper" aria-label="Request steps">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "todo";
        return (
          <li key={label} className={state} aria-current={state === "current" ? "step" : undefined}>
            {state === "done" && links[i] ? (
              <Link href={links[i]}>
                <span className="dot">✓</span>
                {label}
              </Link>
            ) : (
              <span>
                <span className="dot">{n}</span>
                {label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default async function RequestPage({ searchParams }) {
  const user = await requirePageUser(["customer"]);
  const sp = await searchParams;
  const need = needByKey(sp?.need);
  const profile = await getCustomerProfile(user.id);
  const hasCar = Boolean(profile?.vehicle_make);
  const carOk = sp?.car === "1" && hasCar;
  const area = AREAS.includes(sp?.area) ? sp.area : "";
  const step = !need ? 1 : !carOk ? 2 : !area ? 3 : 4;
  const base = need ? `/request?need=${need.key}` : "/request";
  const links = ["/request", base, `${base}&car=1`];
  const first = user.name.split(" ")[0];

  return (
    <div className="wizard">
      <StepProgress step={step} links={links} />
      <div key={step} className="step-in">
        {step === 1 && <StepNeed user={user} first={first} welcome={sp?.welcome} denied={sp?.denied} />}
        {step === 2 && <StepCar need={need} profile={profile} hasCar={hasCar} />}
        {step === 3 && <StepWhere need={need} profile={profile} />}
        {step === 4 && <StepChoose need={need} profile={profile} area={area} base={base} />}
      </div>
    </div>
  );
}

async function StepNeed({ user, first, welcome, denied }) {
  const active = (await listCustomerOrders(user)).filter((o) => ACTIVE_STATUSES.includes(o.status));
  return (
    <>
      {welcome && (
        <p className="alert alert-success mb" role="status">
          Welcome to ROADRESCUE, {first}! Tell us what you need and we&apos;ll find help.
        </p>
      )}
      {denied && (
        <p className="alert alert-error mb" role="alert">
          You don&apos;t have access to that page.
        </p>
      )}
      {active.map((o) => (
        <Link key={o.id} href={`/orders/${o.id}`} className="active-order glass">
          <span className="live-dot">Live</span>
          <span>
            <strong>{o.service_name}</strong> · {statusLabel(o.status, o.provider_type)}
          </span>
          <span className="muted small">Track →</span>
        </Link>
      ))}
      <header className="wizard-head">
        <span className="kicker">Step 1 of 4</span>
        <h1 className="title">
          Hi {first}. <span className="grad">What do you need?</span>
        </h1>
        <p className="lead">Pick one. You&apos;ll see the price before anyone is sent.</p>
      </header>
      <div className="need-grid">
        {NEEDS.map((n, i) => (
          <Link key={n.key} href={`/request?need=${n.key}`} className={`need-card glow need-${n.key}`} style={{ "--i": i }}>
            <span className="need-photo" aria-hidden="true">
              <img src={NEED_IMAGES[n.key]} alt="" width="960" height="600" decoding="async" />
            </span>
            <span className="need-icon">
              <NeedIcon need={n.key} />
            </span>
            <span className="need-title">{n.title}</span>
            <span className="need-blurb">{n.blurb}</span>
            <span className="need-who">{PROVIDER_LABEL[n.provider]} comes to you</span>
          </Link>
        ))}
      </div>
      <p className="small muted mt center">
        Just looking? <Link href="/services">Browse every service and price</Link>
      </p>
    </>
  );
}

function StepCar({ need, profile, hasCar }) {
  return (
    <>
      <header className="wizard-head">
        <span className="kicker">Step 2 of 4 · {need.title}</span>
        <h1 className="title">
          What do you <span className="grad">drive?</span>
        </h1>
        <p className="lead">So your {need.provider} knows what to expect and what to bring.</p>
      </header>
      {hasCar && (
        <div className="saved-car glass">
          {BODY_IMAGES[profile.vehicle_body] ? (
            <img className="saved-car-photo" src={BODY_IMAGES[profile.vehicle_body]} alt="" width="600" height="375" />
          ) : (
            <BodyIcon type={profile.vehicle_body} />
          )}
          <div>
            <span className="tiny muted">Last time you told us</span>
            <strong>{vehicleText(profile)}</strong>
          </div>
          <Link href={`/request?need=${need.key}&car=1`} className="btn btn-primary">
            Yes, still this car →
          </Link>
        </div>
      )}
      {hasCar && <p className="small muted center">…or choose a different one:</p>}
      <div className="card">
        <VehicleForm need={need.key} saved={profile} />
      </div>
    </>
  );
}

async function StepWhere({ need, profile }) {
  const [helpers, garages] = await Promise.all([
    listProviders({ type: need.provider }),
    ["repair", "tow", "unsure"].includes(need.key) ? listGarages() : Promise.resolve([]),
  ]);
  return (
    <>
      <header className="wizard-head">
        <span className="kicker">Step 3 of 4 · {vehicleText(profile)}</span>
        <h1 className="title">
          Where <span className="grad">are you?</span>
        </h1>
        <p className="lead">
          Share your location or tap your area. Pins show the {need.provider}s{garages.length ? " and garages" : ""} around you.
        </p>
      </header>
      <AreaPicker
        need={need.key}
        defaultArea={profile?.last_area || ""}
        helpers={helpers.map(({ id, name, role, area, rating, is_online, avatar_style, lat, lng }) => ({ id, name, role, area, rating, is_online, avatar_style, lat, lng }))}
        garages={garages.map(({ id, name, area, lat, lng }) => ({ id, name, area, lat, lng }))}
      />
    </>
  );
}

async function StepChoose({ need, profile, area, base }) {
  const [services, helpers, garages] = await Promise.all([
    servicesForNeed(need.key),
    listProviders({ type: need.provider, area, limit: 3 }),
    ["repair", "tow", "unsure"].includes(need.key) ? listGarages({ area, limit: 3 }) : Promise.resolve([]),
  ]);
  const heavy = ["Truck", "Van / Minibus"].includes(profile?.vehicle_body);
  const firstEta = helpers.find((h) => h.is_online)?.eta;
  const recommended = (s) => (need.key === "tow" ? (heavy ? s.name.startsWith("Heavy") : !s.name.startsWith("Heavy")) : false);
  return (
    <>
      <header className="wizard-head">
        <span className="kicker">Step 4 of 4</span>
        <h1 className="title">
          Help for your {profile.vehicle_make === "Other" ? "vehicle" : profile.vehicle_make} <span className="grad">in {area}.</span>
        </h1>
        <p className="lead">
          {firstEta ? `The nearest ${need.provider} is about ${firstEta} minutes away. ` : ""}Choose a service - the price is fixed.
        </p>
        <p className="small">
          <Link href={base}>Change car</Link> · <Link href={`${base}&car=1`}>Change area</Link> · <Link href="/request">Change what you need</Link>
        </p>
      </header>
      <div className="choose-layout">
        <div className="stack">
          {services.map((s, i) => (
            <div key={s.id} className={`service-option glow${recommended(s) ? " is-recommended" : ""}`} data-reveal style={{ "--d": `${i * 60}ms` }}>
              {CATEGORY_IMAGES[s.category] && <img className="service-thumb" src={CATEGORY_IMAGES[s.category]} alt="" width="960" height="600" loading="lazy" decoding="async" />}
              <div>
                {recommended(s) && <span className="type-badge type-garage">Best for your {profile.vehicle_body}</span>}
                <h2 className="service-name">{s.name}</h2>
                <p className="muted small">{s.description}</p>
                <p className="tiny muted">
                  {s.category} · about {s.est_minutes} min of work · {s.helpers_available} {need.provider}s verified
                </p>
              </div>
              <ActionForm action={addToCartAction} className="service-buy">
                <input type="hidden" name="kind" value="SERVICE" />
                <input type="hidden" name="refId" value={s.id} />
                <input type="hidden" name="goToCart" value="1" />
                <span className="price">{ugx(s.price)}</span>
                <SubmitButton className="btn btn-primary" pendingText="Adding…">
                  Choose
                </SubmitButton>
              </ActionForm>
            </div>
          ))}
        </div>
        <aside className="stack">
          <h2 className="subtitle">Nearest {need.provider}s</h2>
          {helpers.map((h, i) => (
            <HelperCard key={h.id} h={h} delay={i} />
          ))}
          {garages.length > 0 && (
            <>
              <h2 className="subtitle">Garages near {area}</h2>
              {garages.map((g, i) => (
                <GarageCard key={g.id} g={g} delay={i} />
              ))}
              {need.key === "tow" && <p className="tiny muted">Tell us which garage to tow to in the notes at checkout.</p>}
            </>
          )}
        </aside>
      </div>
    </>
  );
}
