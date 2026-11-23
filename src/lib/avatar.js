// Illustrated avatars for helpers, drawn as SVG from a seed (their id or name).
// No photos are collected or stored. Pure functions: they work in the browser and on the server.

const SKIN = ["#4a2e20", "#5c3a28", "#6e4530", "#7f5238", "#93613f", "#a9744f"];
const HAIR = ["#120d0b", "#1d1411", "#2b1c15", "#3a2619"];
const WRAPS = ["#ff7a1a", "#2dd4bf", "#ffc233", "#8b9cff"];
export const AVATAR_STYLES = ["crop", "fade", "afro", "puffs", "locs", "wrap", "bald", "cap"];

const THEME = {
  mechanic: { bg: ["#ffb06b", "#d4520e"], shirt: "#16244d", collar: "#ff7a1a", cap: "#ff7a1a", capDark: "#b4480b" },
  driver: { bg: ["#6ff0dc", "#0f766e"], shirt: "#0b1838", collar: "#f8fafc", cap: "#2dd4bf", capDark: "#0f766e" },
  customer: { bg: ["#a5b4fc", "#4338ca"], shirt: "#1e293b", collar: "#a5b4fc", cap: "#a5b4fc", capDark: "#4338ca" },
};

function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hairParts(style, hair, accent, accentDark) {
  const crop = `<path d="M30.5 40C30 25 38 19.5 48 19.5S66 25 65.5 40C63 32 57 28.5 48 28.5S33 32 30.5 40Z" fill="${hair}"/>`;
  switch (style) {
    case "fade":
      return { back: "", front: `<path d="M32 35C33 24 40 21 48 21S63 24 64 35C60 29.5 55 27.5 48 27.5S36 29.5 32 35Z" fill="${hair}"/><path d="M41 22.5L39 27" stroke="#000" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/>` };
    case "afro":
      return {
        back: `<circle cx="48" cy="33" r="24" fill="${hair}"/><circle cx="27" cy="41" r="8" fill="${hair}"/><circle cx="69" cy="41" r="8" fill="${hair}"/>`,
        front: `<path d="M31 38C31 26 38 22 48 22S65 26 65 38C61 31 55 29 48 29S35 31 31 38Z" fill="${hair}"/>`,
      };
    case "puffs":
      return { back: `<circle cx="30" cy="22" r="10" fill="${hair}"/><circle cx="66" cy="22" r="10" fill="${hair}"/>`, front: crop };
    case "locs":
      return {
        back: `<path d="M27 38C27 20 37 15 48 15S69 20 69 38L71 70C66 72 62 70 60 66V46H36V66C34 70 30 72 25 70Z" fill="${hair}"/>`,
        front: crop,
      };
    case "wrap":
      return {
        back: `<path d="M29 37C27 18 38 11.5 48 11.5S69 18 67 37Z" fill="${accent}"/><circle cx="61" cy="14" r="6.5" fill="${accent}"/>`,
        front: `<path d="M30 38C33 30 40 27.5 48 27.5S63 30 66 38C66 32 64 27 60 24H36C32 27 30 32 30 38Z" fill="${accentDark}"/>`,
      };
    case "bald":
      return { back: "", front: `<ellipse cx="42" cy="28" rx="5.5" ry="2.6" fill="#fff" fill-opacity=".14"/>` };
    case "cap":
      return {
        back: "",
        front: `${crop}<path d="M30 34C30 20 38 16 48 16S66 20 66 34Z" fill="${accent}"/><path d="M45 32.5C55 30.5 67 31.5 75 35.5C69 37.5 56 36.5 45 35.5Z" fill="${accentDark}"/><circle cx="48" cy="24" r="2.2" fill="#fff" fill-opacity=".85"/>`,
      };
    default:
      return { back: "", front: crop };
  }
}

// Returns the SVG markup as a string.
export function avatarSvg({ seed = "x", kind = "customer", style } = {}) {
  const h = hash(seed);
  const t = THEME[kind] || THEME.customer;
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >>> 3) % HAIR.length];
  const wrap = WRAPS[(h >>> 5) % WRAPS.length];
  const look = AVATAR_STYLES.includes(style) ? style : AVATAR_STYLES[(h >>> 7) % AVATAR_STYLES.length];
  const glasses = (h >>> 11) % 5 === 0;
  const accent = look === "wrap" ? wrap : t.cap;
  const accentDark = look === "wrap" ? wrap : t.capDark;
  const { back, front } = hairParts(look, hair, accent, accentDark);
  const eye = (x) => `<ellipse cx="${x}" cy="44" rx="2" ry="2.3" fill="#140d0a"/><circle cx="${x + 0.7}" cy="43.2" r=".65" fill="#fff"/>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg[0]}"/><stop offset="1" stop-color="${t.bg[1]}"/></linearGradient><clipPath id="c"><circle cx="48" cy="48" r="48"/></clipPath></defs>`,
    `<g clip-path="url(#c)"><rect width="96" height="96" fill="url(#g)"/>`,
    back,
    `<path d="M12 100C14 76 30 68 48 68S82 76 84 100Z" fill="${t.shirt}"/>`,
    `<path d="M40 68.5L48 80L56 68.5Z" fill="${t.collar}"/>`,
    `<rect x="42" y="54" width="12" height="16" rx="5" fill="${skin}"/><rect x="42" y="54" width="12" height="8" fill="#000" fill-opacity=".18"/>`,
    `<circle cx="31" cy="45" r="4.5" fill="${skin}"/><circle cx="65" cy="45" r="4.5" fill="${skin}"/>`,
    `<ellipse cx="48" cy="42" rx="17" ry="19.5" fill="${skin}"/>`,
    front,
    eye(41.5),
    eye(54.5),
    `<path d="M38 39.5Q41.5 37.3 45 39M51 39Q54.5 37.3 58 39.5" stroke="${hair}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    `<path d="M48 46Q46.3 50 48.8 50.6" stroke="#000" stroke-opacity=".3" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    `<path d="M43 53.5Q48 57.6 53 53.5" stroke="#2a150e" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    glasses ? `<g fill="none" stroke="#0b1020" stroke-width="1.4"><rect x="36" y="40" width="11" height="8" rx="3"/><rect x="49" y="40" width="11" height="8" rx="3"/><path d="M47 43.5H49"/></g>` : "",
    `</g></svg>`,
  ].join("");
}

export function avatarDataUri(opts) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(avatarSvg(opts));
}
