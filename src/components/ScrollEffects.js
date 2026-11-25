"use client";
// Page-wide motion, added in one place so pages can stay simple server components:
//   data-reveal         fades/slides an element in when it scrolls into view
//   data-progress       sets --p (0 -> 1) as the element moves through the screen
//   data-count="123"    counts a number up when it appears
//   .glow               a soft light that follows the pointer
// Content is always visible before this script runs, and nothing moves if the user
// has "reduce motion" turned on.
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function ScrollEffects() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = new WeakSet();
    const progressEls = new Set();

    const countUp = (el) => {
      const target = Number(el.dataset.count);
      const decimals = Number(el.dataset.decimals || 0);
      if (!Number.isFinite(target) || reduce) return;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / 1400);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          e.target.querySelectorAll("[data-count]").forEach(countUp);
          if (e.target.dataset.count) countUp(e.target);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    const scan = () => {
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const r = el.getBoundingClientRect();
        // Already on screen when the page loads: show it straight away (no flash).
        if (reduce || (r.top < window.innerHeight && r.bottom > 0 && !root.classList.contains("fx-ready"))) {
          el.classList.add("is-in", "is-static");
          return;
        }
        io.observe(el);
      });
      document.querySelectorAll("[data-progress]").forEach((el) => progressEls.add(el));
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const h = window.innerHeight;
        document.querySelector(".site-header")?.classList.toggle("is-scrolled", window.scrollY > 8);
        if (reduce) return;
        for (const el of progressEls) {
          if (!el.isConnected) {
            progressEls.delete(el);
            continue;
          }
          const r = el.getBoundingClientRect();
          const p = Math.min(1, Math.max(0, (h - r.top) / (h + r.height * 0.6)));
          el.style.setProperty("--p", p.toFixed(3));
        }
      });
    };

    const onPointer = (e) => {
      const card = e.target.closest?.(".glow");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };

    scan();
    root.classList.add("fx-ready");
    onScroll();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    document.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("pointermove", onPointer);
      cancelAnimationFrame(raf);
    };
  }, [pathname, search]);

  return null;
}
