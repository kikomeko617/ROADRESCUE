// Original neon line illustrations (inline SVG, no images to download).

function gearPath(cx, cy, rIn, rOut, teeth) {
  const step = (Math.PI * 2) / teeth;
  const pt = (r, a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  let d = "";
  for (let k = 0; k < teeth; k++) {
    const a = k * step;
    d += `${k ? "L" : "M"}${pt(rIn, a)} L${pt(rOut, a + step * 0.18)} L${pt(rOut, a + step * 0.5)} L${pt(rIn, a + step * 0.68)} `;
  }
  return d + "Z";
}

function Glow({ id, color }) {
  return (
    <defs>
      <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <radialGradient id={`${id}-bg`} cx="50%" cy="45%" r="55%">
        <stop offset="0" stopColor={color} stopOpacity=".28" />
        <stop offset="1" stopColor={color} stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

export function MechanicArt() {
  return (
    <svg viewBox="0 0 400 400" className="art" aria-hidden="true">
      <Glow id="ga" color="#ff7a1a" />
      <circle cx="200" cy="200" r="190" fill="url(#ga-bg)" />
      <circle cx="200" cy="200" r="150" fill="none" stroke="#ff7a1a" strokeOpacity=".25" strokeDasharray="4 10" className="spin-slow" />
      <g filter="url(#ga)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g className="spin-gear">
          <path d={gearPath(200, 200, 78, 96, 12)} stroke="#ff7a1a" strokeWidth="6" />
          <circle cx="200" cy="200" r="36" stroke="#ff7a1a" strokeWidth="6" />
        </g>
        <path d="M118 300 L178 240 M214 204 L282 136 C270 112 282 88 306 84 L290 112 L304 126 L332 110 C330 134 306 148 282 136" stroke="#ffc233" strokeWidth="9" />
        <circle cx="128" cy="290" r="14" stroke="#ffc233" strokeWidth="7" />
      </g>
    </svg>
  );
}

export function TowArt() {
  return (
    <svg viewBox="0 0 400 400" className="art" aria-hidden="true">
      <Glow id="gt" color="#ffc233" />
      <circle cx="200" cy="200" r="190" fill="url(#gt-bg)" />
      <g filter="url(#gt)" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6">
        <path d="M22 268V190q0-10 10-10h62l30 40h50v48" stroke="#ffc233" />
        <path d="M60 188v30h40" stroke="#ffc233" strokeOpacity=".7" />
        <path d="M174 238l52-62 24 52" stroke="#ff7a1a" />
        <path d="M250 228v14" stroke="#ff7a1a" />
        <path d="M244 250l14-10 40-6 28-24h40l22 26 6 10v20H250Z" stroke="#e7ecff" transform="rotate(-6 300 250)" />
        <circle cx="62" cy="272" r="18" stroke="#ffc233" />
        <circle cx="150" cy="272" r="18" stroke="#ffc233" />
        <circle cx="300" cy="270" r="16" stroke="#e7ecff" />
        <circle cx="370" cy="262" r="16" stroke="#e7ecff" />
      </g>
      <path d="M10 300H390" stroke="#9fb0d4" strokeOpacity=".5" strokeWidth="3" strokeDasharray="22 18" className="road-dash" />
    </svg>
  );
}

export function DriverArt() {
  return (
    <svg viewBox="0 0 400 400" className="art" aria-hidden="true">
      <Glow id="gd" color="#2dd4bf" />
      <circle cx="200" cy="200" r="190" fill="url(#gd-bg)" />
      <g fill="none" stroke="#9fb0d4" strokeOpacity=".45" strokeWidth="3">
        <path d="M200 300 L40 400 M200 300 L360 400" />
        <path d="M200 312 V400" strokeDasharray="20 20" className="road-dash" />
      </g>
      <g filter="url(#gd)" fill="none" stroke="#2dd4bf" strokeWidth="9" strokeLinecap="round">
        <circle cx="200" cy="180" r="108" />
        <circle cx="200" cy="180" r="30" />
        <path d="M92 172 C130 160 160 166 172 176 M228 176 C240 166 270 160 308 172 M200 210 V286" />
      </g>
      <circle cx="200" cy="180" r="9" fill="#e7ecff" />
    </svg>
  );
}

export function HeroCar() {
  return (
    <svg viewBox="0 0 600 320" className="hero-car" aria-hidden="true">
      <defs>
        <filter id="hc" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="hc-line" x1="0" x2="1">
          <stop offset="0" stopColor="#ffc233" />
          <stop offset=".5" stopColor="#ff7a1a" />
          <stop offset="1" stopColor="#ff5a8a" />
        </linearGradient>
        <linearGradient id="hc-beam" x1="1" x2="0">
          <stop offset="0" stopColor="#ffc233" stopOpacity=".55" />
          <stop offset="1" stopColor="#ffc233" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M44 196 L-60 160 L-60 250 Z" fill="url(#hc-beam)" className="beam" />
      <g filter="url(#hc)" fill="none" stroke="url(#hc-line)" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M60 236H118A42 42 0 0 1 202 236H398A42 42 0 0 1 482 236H540C556 236 562 228 562 214C562 196 548 184 520 180L470 172C440 140 405 116 360 114H270C220 118 185 140 150 176L75 186C52 190 40 200 40 218C40 230 48 236 60 236Z" />
        <path d="M172 176C196 150 226 134 268 132H302V176ZM318 132H358C390 134 418 150 442 176H318Z" strokeWidth="3.5" opacity=".85" />
        <circle cx="160" cy="236" r="32" className="wheel" />
        <circle cx="440" cy="236" r="32" className="wheel" />
        <circle cx="160" cy="236" r="10" />
        <circle cx="440" cy="236" r="10" />
      </g>
      <ellipse cx="50" cy="204" rx="8" ry="5" fill="#ffe7a3" />
      <path d="M0 288H600" stroke="#9fb0d4" strokeOpacity=".35" strokeWidth="3" strokeDasharray="24 16" className="road-dash" />
    </svg>
  );
}
