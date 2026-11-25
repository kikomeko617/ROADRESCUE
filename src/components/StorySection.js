"use client";
// "Three ways we rescue you": the picture stays pinned while the text scrolls past,
// and the picture changes to match the step you're reading.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MechanicArt, TowArt, DriverArt } from "./Illustrations";

const ART = { repair: MechanicArt, tow: TowArt, driver: DriverArt };

export default function StorySection({ items }) {
  const [active, setActive] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number(e.target.dataset.index));
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="story">
      <div className="story-visual" aria-hidden="true">
        <div className="story-stage">
          {items.map((it, i) => {
            const Art = ART[it.key];
            return (
              <div key={it.key} className={`story-art story-${it.key}${i === active ? " is-active" : ""}`}>
                {it.image ? (
                  <figure className="story-photo">
                    <img src={it.image} alt="" width="900" height="900" loading={i === 0 ? "eager" : "lazy"} decoding="async" />
                    <span className="story-badge">
                      <Art />
                    </span>
                  </figure>
                ) : (
                  <Art />
                )}
              </div>
            );
          })}
        </div>
        <div className="story-dots">
          {items.map((it, i) => (
            <span key={it.key} className={i === active ? "is-active" : ""} />
          ))}
        </div>
      </div>
      <div className="story-steps">
        {items.map((it, i) => (
          <article key={it.key} ref={(el) => (refs.current[i] = el)} data-index={i} className={`story-step${i === active ? " is-active" : ""}`}>
            <span className="kicker">{it.kicker}</span>
            <h3>{it.title}</h3>
            <p>{it.body}</p>
            <ul className="story-list">
              {it.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <div className="row">
              <span className="price-from">{it.price}</span>
              <Link className="btn btn-ghost btn-sm" href={it.href}>
                {it.cta} →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
