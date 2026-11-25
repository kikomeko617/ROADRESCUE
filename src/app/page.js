import Link from "next/link";
import { listServices, listProviders, listGarages, platformStats } from "@/lib/catalog";
import { currentUser } from "@/lib/session";
import { AREAS, homeForRole } from "@/lib/constants";
import { ugx } from "@/lib/format";
import { HeroCar } from "@/components/Illustrations";
import StorySection from "@/components/StorySection";
import HomeMap from "@/components/HomeMap";
import { HelperCard, GarageCard } from "@/components/Cards";
import { STORY_IMAGES, PEOPLE_IMAGES, PAGE_IMAGES } from "@/lib/images";

const STATEMENT =
  "One tap sends a verified mechanic, a tow truck or a safe driver to wherever you stopped. You see the price before anyone comes, and your money waits until you say the job is done.";

const WHO = [
  ["", "Everyone"],
  ["mechanic", "Mechanics"],
  ["driver", "Drivers"],
];

export default async function HomePage({ searchParams }) {
  const sp = await searchParams;
  const area = AREAS.includes(sp?.area) ? sp.area : "";
  const who = ["mechanic", "driver"].includes(sp?.who) ? sp.who : "";
  const [user, helpers, garages, stats, services] = await Promise.all([
    currentUser(),
    listProviders({ area }),
    listGarages({ area }),
    platformStats(),
    listServices(),
  ]);

  const isCustomer = !user || user.role === "customer";
  const getHelp = !user ? "/login?next=/request" : user.role === "customer" ? "/request" : homeForRole(user.role);
  const from = (need, kind) => {
    const prices = services.filter((s) => s.provider_type === kind && need.includes(s.category)).map((s) => Number(s.price));
    return prices.length ? `From ${ugx(Math.min(...prices))}` : "";
  };
  const story = [
    {
      key: "repair",
      kicker: "01 · Mechanic",
      title: "A mechanic, at the side of the road.",
      body: "Flat battery, burst tyre, overheating or brakes - a verified mechanic comes with the tools and the parts you ordered.",
      points: ["Jump-starts, tyres, batteries, brakes", "Parts delivered with the mechanic", "Not sure what's wrong? Diagnosis first"],
      price: from(["Battery & electrics", "Tyres", "Engine", "Brakes", "General"], "mechanic"),
      href: isCustomer ? (user ? "/request?need=repair" : "/login?next=/request?need=repair") : getHelp,
      cta: "Get a mechanic",
      image: STORY_IMAGES.repair,
    },
    {
      key: "tow",
      kicker: "02 · Towing",
      title: "Can't be fixed here? We tow it.",
      body: "Saloons, SUVs, pickups and even trucks. A tow truck takes your vehicle to a partner garage or any garage you choose.",
      points: ["Light and heavy vehicles", "10 partner garages on the map", "Fixed price for the first 10 km"],
      price: from(["Towing"], "mechanic"),
      href: isCustomer ? (user ? "/request?need=tow" : "/login?next=/request?need=tow") : getHelp,
      cta: "Request a tow",
      image: STORY_IMAGES.tow,
    },
    {
      key: "driver",
      kicker: "03 · Driver",
      title: "Too tired to drive? We'll drive.",
      body: "A vetted driver meets you and drives you home, to the airport or around town - in your own car.",
      points: ["Safe ride home in your car", "Airport runs to Entebbe", "A driver for the whole day"],
      price: from(["Driver"], "driver"),
      href: isCustomer ? (user ? "/request?need=driver" : "/login?next=/request?need=driver") : getHelp,
      cta: "Book a driver",
      image: STORY_IMAGES.driver,
    },
  ];

  const shown = helpers.filter((h) => !who || h.role === who).slice(0, 8);
  const shownGarages = garages.slice(0, area ? 3 : 6);
  const words = STATEMENT.split(" ");
  const nearbyHref = (w) => {
    const q = new URLSearchParams();
    if (area) q.set("area", area);
    if (w) q.set("who", w);
    const s = q.toString();
    return `/${s ? `?${s}` : ""}#nearby`;
  };

  return (
    <div className="home">
      {/* ---------- Hero ---------- */}
      <section className="hero bleed" aria-labelledby="hero-title">
        <div className="hero-bg" aria-hidden="true">
          <img className="hero-photo" src={PAGE_IMAGES.hero} alt="" width="720" height="900" fetchPriority="high" decoding="async" />
          <span className="aurora a1" />
          <span className="aurora a2" />
          <span className="aurora a3" />
          <span className="hero-grid" />
        </div>
        <div className="container hero-inner">
          <div className="hero-copy">
            {sp?.denied && (
              <p className="alert alert-error mb" role="alert">
                You don&apos;t have access to that page.
              </p>
            )}
            <p className="live-pill">
              <span className="pulse-dot" aria-hidden="true" /> {helpers.filter((h) => h.is_online).length} helpers available across Kampala
            </p>
            <h1 id="hero-title" className="display">
              <span className="line">
                <span>Broken down?</span>
              </span>
              <span className="line">
                <span className="grad">Help is one tap away.</span>
              </span>
            </h1>
            <p className="lead hero-lead">Mechanics, tow trucks and safe drivers who come to you. Fixed prices. Money held until you&apos;re happy.</p>
            <div className="hero-cta">
              <Link className="btn btn-primary btn-lg" href={getHelp}>
                {isCustomer ? "Get help now" : "Go to my dashboard"} →
              </Link>
              <Link className="btn btn-glass btn-lg" href="#nearby">
                See who&apos;s nearby
              </Link>
            </div>
          </div>
          <div className="hero-visual" data-progress aria-hidden="true">
            <div className="radar">
              <span />
              <span />
              <span />
            </div>
            <svg className="hero-pin" viewBox="0 0 60 80">
              <path d="M30 78C24 66 4 50 4 30a26 26 0 0 1 52 0c0 20-20 36-26 48Z" fill="#ff7a1a" />
              <circle cx="30" cy="30" r="10" fill="#0a1631" />
            </svg>
            <HeroCar />
          </div>
        </div>
        <div className="container">
          <dl className="hero-stats">
            <div>
              <dt>Avg. time to accept a job</dt>
              <dd>
                <span data-count={stats.acceptMin ?? 0}>{stats.acceptMin ?? "-"}</span> min
              </dd>
            </div>
            <div>
              <dt>Verified helpers</dt>
              <dd>
                <span data-count={stats.helpers}>{stats.helpers}</span>
              </dd>
            </div>
            <div>
              <dt>Partner garages</dt>
              <dd>
                <span data-count={stats.garages}>{stats.garages}</span>
              </dd>
            </div>
            <div>
              <dt>Average rating</dt>
              <dd>
                ★ <span data-count={stats.rating ?? 0} data-decimals="1">{stats.rating ?? "-"}</span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------- Statement (words light up as you scroll) ---------- */}
      <section className="statement" aria-label="What ROADRESCUE does">
        <p className="wordfill" data-progress style={{ "--n": words.length }}>
          {words.map((w, i) => (
            <span key={i} style={{ "--i": i }}>
              {w}{" "}
            </span>
          ))}
        </p>
      </section>

      {/* ---------- Three ways we rescue you ---------- */}
      <section className="section" aria-labelledby="ways">
        <div className="section-head" data-reveal>
          <span className="kicker">Three ways we rescue you</span>
          <h2 id="ways" className="title">
            Whatever stopped you,
            <br />
            <span className="grad">someone&apos;s on it.</span>
          </h2>
        </div>
        <StorySection items={story} />
      </section>

      {/* ---------- Real people (photos drift slightly as you scroll) ---------- */}
      <section className="section" aria-labelledby="real">
        <div className="section-head" data-reveal>
          <span className="kicker">Real people, real roads</span>
          <h2 id="real" className="title">
            Local hands. <span className="grad">Kampala know-how.</span>
          </h2>
          <p className="lead">Mechanics and drivers from your own neighbourhood, who know the roads, the traffic and the parts.</p>
        </div>
        <div className="mosaic" data-progress>
          {PEOPLE_IMAGES.map((im, i) => (
            <figure key={im.src} className={`mosaic-item ${im.shape}`} data-reveal style={{ "--d": `${i * 90}ms`, "--dir": i % 2 ? -1 : 1 }}>
              <img src={im.src} alt={im.alt} width={im.shape === "wide" ? 1200 : 800} height={im.shape === "wide" ? 800 : 1000} loading="lazy" decoding="async" />
            </figure>
          ))}
        </div>
        <p className="tiny muted center mt">Stock photos, for illustration only. Profiles of our helpers use illustrated avatars.</p>
      </section>

      {/* ---------- Live map ---------- */}
      <section className="section" aria-labelledby="map-title">
        <div className="section-head" data-reveal>
          <span className="kicker">Live map</span>
          <h2 id="map-title" className="title">
            Help near you, <span className="grad">right now.</span>
          </h2>
          <p className="lead">Every verified mechanic, driver and partner garage in the pilot area. Tap a pin to see who it is.</p>
        </div>
        <div data-reveal>
          <HomeMap
            helpers={helpers.map(({ id, name, role, area: a, rating, is_online, avatar_style, lat, lng }) => ({ id, name, role, area: a, rating, is_online, avatar_style, lat, lng }))}
            garages={garages.map(({ id, name, area: a, hours, lat, lng }) => ({ id, name, area: a, hours, lat, lng }))}
          />
        </div>
      </section>

      {/* ---------- People and garages ---------- */}
      <section className="section" id="nearby" aria-labelledby="people">
        <div className="section-head" data-reveal>
          <span className="kicker">The people who come to you</span>
          <h2 id="people" className="title">
            Real names. <span className="grad">Rated after every job.</span>
          </h2>
        </div>
        <div className="filter-bar" data-reveal>
          <form action="/#nearby" method="get" className="area-filter">
            <label htmlFor="area-filter">Show who&apos;s near</label>
            <select id="area-filter" name="area" defaultValue={area}>
              <option value="">All of Kampala</option>
              {AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            {who && <input type="hidden" name="who" value={who} />}
            <button type="submit" className="btn btn-ghost btn-sm">
              Show
            </button>
          </form>
          <nav className="segmented" aria-label="Filter helpers">
            {WHO.map(([w, label]) => (
              <Link key={label} href={nearbyHref(w)} className={who === w ? "active" : ""} aria-current={who === w ? "true" : undefined} scroll={false}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="muted small" aria-live="polite">
          {area ? `Closest to ${area} first.` : "Available helpers first."} Faces are illustrations - every person here is fictitious.
        </p>
        <div className="helper-grid">
          {shown.map((h, i) => (
            <HelperCard key={h.id} h={h} delay={i % 4} />
          ))}
        </div>

        <figure className="garage-banner" data-reveal>
          <img src={PAGE_IMAGES.garages} alt="" width="1600" height="700" loading="lazy" decoding="async" />
          <figcaption>
            <h3 className="subtitle">Garages {area ? `near ${area}` : "in our network"}</h3>
            <p className="small">When it can&apos;t be fixed by the road, we tow it to a partner garage you can trust.</p>
          </figcaption>
        </figure>
        <div className="garage-grid">
          {shownGarages.map((g, i) => (
            <GarageCard key={g.id} g={g} delay={i % 3} />
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="section" aria-labelledby="how">
        <div className="section-head" data-reveal>
          <span className="kicker">How it works</span>
          <h2 id="how" className="title">
            Four taps. <span className="grad">Back on the road.</span>
          </h2>
        </div>
        <ol className="steps-line">
          {[
            ["What do you need?", "A mechanic, a tow, a driver or fuel."],
            ["What do you drive?", "Pick your make once. We remember it."],
            ["Where are you?", "Tap the map or share your location."],
            ["Pay safely, track live", "Mobile money is held until you confirm."],
          ].map(([t, d], i) => (
            <li key={t} data-reveal style={{ "--d": `${i * 110}ms` }}>
              <span className="step-num">{i + 1}</span>
              <h3>{t}</h3>
              <p className="muted small">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Trust ---------- */}
      <section className="section" aria-labelledby="trust">
        <div className="section-head" data-reveal>
          <span className="kicker">Why drivers trust ROADRESCUE</span>
          <h2 id="trust" className="title">Built so nobody gets cheated by the road.</h2>
        </div>
        <div className="bento">
          <div className="bento-card big glow" data-reveal>
            <span className="bento-icon">✓</span>
            <h3>Every helper is checked</h3>
            <p className="muted">Mechanics and drivers are approved by our team before they can take a single job, and can be suspended after complaints.</p>
          </div>
          <div className="bento-card glow" data-reveal style={{ "--d": "80ms" }}>
            <span className="bento-icon">UGX</span>
            <h3>Fixed prices first</h3>
            <p className="muted small">No bargaining by the road.</p>
          </div>
          <div className="bento-card glow" data-reveal style={{ "--d": "160ms" }}>
            <span className="bento-icon">⏸</span>
            <h3>Money held safely</h3>
            <p className="muted small">Released only when you confirm.</p>
          </div>
          <div className="bento-card glow" data-reveal style={{ "--d": "240ms" }}>
            <span className="bento-icon">7</span>
            <h3>7-day warranty</h3>
            <p className="muted small">Same problem again? We come back.</p>
          </div>
          <div className="bento-card glow" data-reveal style={{ "--d": "320ms" }}>
            <span className="bento-icon">★</span>
            <h3>Rate every job</h3>
            <p className="muted small">Ratings decide who gets work.</p>
          </div>
        </div>
      </section>

      {/* ---------- Final call to action ---------- */}
      <section className="cta-final" data-reveal aria-labelledby="cta">
        <img className="cta-bg" src={PAGE_IMAGES.cta} alt="" width="1100" height="620" loading="lazy" decoding="async" />
        <h2 id="cta" className="title">
          Next time the road stops you,
          <br />
          <span className="grad">tap once.</span>
        </h2>
        <div className="hero-cta center">
          <Link className="btn btn-primary btn-lg" href={getHelp}>
            {isCustomer ? "Get help now" : "Go to my dashboard"} →
          </Link>
          {!user && (
            <Link className="btn btn-glass btn-lg" href="/register">
              Become a mechanic or driver
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
