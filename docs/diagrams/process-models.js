// Compact BPMN-style swimlane renderer: nodes placed on a lane/row/column grid, orthogonal arrows.
// Writes an SVG and a PNG (via the installed Microsoft Edge). Usage: node bpmn.js <outdir>
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const COL = 112, ROW = 92, HEAD = 84, PADT = 30, NW = 98, NH = 54, GW = 30, ER = 17;
const C = { navy: "#1e3a5f", text: "#1b1b1b", lane: "#f4f7fb", laneAlt: "#ffffff", grid: "#9fb3c8",
  ev: "#2e7d32", evFill: "#e8f5e9", gate: "#b26a00", gateFill: "#fff8e1", red: "#c62828", redFill: "#ffebee",
  blue: "#1565c0", blueFill: "#e3f2fd" };

function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function render(def) {
  // lane geometry
  let y = PADT; const laneY = {};
  def.lanes.forEach((l) => { laneY[l.id] = { top: y, rows: l.rows || 1 }; y += (l.rows || 1) * ROW + 8; });
  const height = y + 70; // + legend
  const width = HEAD + def.cols * COL + 16;
  const N = {};
  for (const n of def.nodes) {
    const L = laneY[n.lane];
    const cx = HEAD + n.col * COL + COL / 2 + 8;
    const cy = L.top + (n.row || 0) * ROW + ROW / 2 + 4;
    let hw = NW / 2, hh = NH / 2;
    if (n.type === "gate") { hw = hh = GW; }
    if (n.type === "start" || n.type === "end") { hw = hh = ER; }
    N[n.id] = { ...n, cx, cy, hw, hh };
  }
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Arial, Helvetica, sans-serif">`);
  out.push(`<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.navy}"/></marker>
  <marker id="ahr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.red}"/></marker></defs>`);
  out.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#fff"/>`);
  // pool + lanes
  def.lanes.forEach((l, i) => {
    const L = laneY[l.id]; const h = L.rows * ROW;
    out.push(`<rect x="4" y="${L.top}" width="${width - 8}" height="${h}" fill="${i % 2 ? C.laneAlt : C.lane}" stroke="${C.grid}" stroke-width="1.2"/>`);
    out.push(`<rect x="4" y="${L.top}" width="${HEAD - 8}" height="${h}" fill="${C.navy}"/>`);
    const lines = l.name.split("|");
    lines.forEach((t, k) => {
      const ty = L.top + h / 2 + (k - (lines.length - 1) / 2) * 15 + 5;
      out.push(`<text x="${(HEAD - 4) / 2 + 2}" y="${ty}" text-anchor="middle" font-size="12.5" font-weight="bold" fill="#fff">${esc(t)}</text>`);
    });
  });
  // edges first (under nodes)
  const anchor = (n, side) => ({ r: [n.cx + n.hw, n.cy], l: [n.cx - n.hw, n.cy], t: [n.cx, n.cy - n.hh], b: [n.cx, n.cy + n.hh] }[side]);
  for (const e of def.edges) {
    const a = N[e.from], b = N[e.to];
    if (!a || !b) throw new Error("bad edge " + e.from + "->" + e.to);
    let os = e.out, is = e.in;
    if (!os || !is) {
      if (a.cy === b.cy) { os = b.cx > a.cx ? "r" : "l"; is = b.cx > a.cx ? "l" : "r"; }
      else if (a.cx === b.cx) { os = b.cy > a.cy ? "b" : "t"; is = b.cy > a.cy ? "t" : "b"; }
      else { os = "r"; is = "l"; }
    }
    const s = anchor(a, os), t = anchor(b, is);
    const vert = (x) => x === "t" || x === "b";
    let pts;
    if (s[0] === t[0] || s[1] === t[1]) pts = [s, t];
    else if (vert(os) && !vert(is)) pts = [s, [s[0], t[1]], t];
    else if (!vert(os) && vert(is)) pts = [s, [t[0], s[1]], t];
    else if (!vert(os) && !vert(is)) { const gx = e.gx != null ? e.gx : a.cx + COL / 2; pts = [s, [gx, s[1]], [gx, t[1]], t]; }
    else { const gy = (s[1] + t[1]) / 2; pts = [s, [s[0], gy], [t[0], gy], t]; }
    const red = e.style === "exception";
    out.push(`<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${red ? C.red : C.navy}" stroke-width="1.6" ${e.dashed || red ? 'stroke-dasharray="6 4"' : ""} marker-end="url(#${red ? "ahr" : "ah"})"/>`);
    if (e.label) {
      // put label just after the start, along the first segment
      const [p0, p1] = pts; const dx = Math.sign(p1[0] - p0[0]), dy = Math.sign(p1[1] - p0[1]);
      let lx = p0[0] + dx * 10, ly = p0[1] + dy * 14;
      let anchorTxt = dx > 0 ? "start" : dx < 0 ? "end" : "start";
      if (dy !== 0) { lx = p0[0] + 5; ly = p0[1] + dy * 16 + (dy > 0 ? 4 : 0); }
      else { ly = p0[1] - 5; }
      if (e.lpos) { lx = e.lpos[0]; ly = e.lpos[1]; anchorTxt = "middle"; }
      const w = e.label.length * 5.9 + 6;
      const rx = anchorTxt === "end" ? lx - w + 3 : anchorTxt === "middle" ? lx - w / 2 : lx - 3;
      out.push(`<rect x="${rx}" y="${ly - 10}" width="${w}" height="13" fill="#fff" opacity="0.92"/>`);
      out.push(`<text x="${lx}" y="${ly}" text-anchor="${anchorTxt}" font-size="10.5" font-style="italic" fill="${red ? C.red : "#333"}">${esc(e.label)}</text>`);
    }
  }
  // nodes
  for (const n of Object.values(N)) {
    const lines = n.label.split("|");
    if (n.type === "start" || n.type === "end") {
      out.push(`<circle cx="${n.cx}" cy="${n.cy}" r="${ER}" fill="${C.evFill}" stroke="${C.ev}" stroke-width="${n.type === "end" ? 4 : 2}"/>`);
      lines.forEach((t, k) => out.push(`<text x="${n.cx}" y="${n.cy + ER + 13 + k * 12}" text-anchor="middle" font-size="10.5" fill="${C.text}">${esc(t)}</text>`));
      continue;
    }
    if (n.type === "gate") {
      out.push(`<polygon points="${n.cx},${n.cy - GW} ${n.cx + GW},${n.cy} ${n.cx},${n.cy + GW} ${n.cx - GW},${n.cy}" fill="${C.gateFill}" stroke="${C.gate}" stroke-width="2"/>`);
      out.push(`<text x="${n.cx}" y="${n.cy + 6}" text-anchor="middle" font-size="18" font-weight="bold" fill="${C.gate}">&#215;</text>`);
      const pos = n.labelPos || "above";
      lines.forEach((t, k) => {
        let tx = n.cx, ta = "middle", ty;
        if (pos === "above") ty = n.cy - GW - 6 - (lines.length - 1 - k) * 12;
        else if (pos === "below") ty = n.cy + GW + 13 + k * 12;
        else { tx = pos === "left" ? n.cx - GW - 4 : n.cx + GW + 4; ta = pos === "left" ? "end" : "start"; ty = n.cy + (k - (lines.length - 1) / 2) * 12 + 4 - 16; }
        out.push(`<text x="${tx}" y="${ty}" text-anchor="${ta}" font-size="10.5" font-weight="bold" fill="${C.text}">${esc(t)}</text>`);
      });
      continue;
    }
    const st = { task: [C.navy, "#fff", ""], bottleneck: [C.red, C.redFill, ""], improved: [C.blue, C.blueFill, ""], exception: [C.red, "#fff", 'stroke-dasharray="5 4"'] }[n.type];
    const sw = n.type === "bottleneck" || n.type === "improved" ? 3 : 1.6;
    const w = (n.w || NW), h = NH;
    out.push(`<rect x="${n.cx - w / 2}" y="${n.cy - h / 2}" width="${w}" height="${h}" rx="8" fill="${st[1]}" stroke="${st[0]}" stroke-width="${sw}" ${st[2]}/>`);
    const fs = lines.length > 3 ? 10.2 : 11;
    lines.forEach((t, k) => {
      const ty = n.cy + (k - (lines.length - 1) / 2) * (fs + 1.6) + fs / 3;
      const bold = (n.type === "bottleneck" || n.type === "improved") && k === 0;
      out.push(`<text x="${n.cx}" y="${ty}" text-anchor="middle" font-size="${fs}" ${bold ? 'font-weight="bold"' : ""} fill="${n.type === "exception" || n.type === "bottleneck" ? "#7f0000" : n.type === "improved" ? "#0d2b52" : C.text}">${esc(t)}</text>`);
    });
  }
  // legend
  const ly = height - 40; let lx = 12;
  const item = (svg, label, w) => { out.push(svg(lx, ly)); out.push(`<text x="${lx + w}" y="${ly + 4}" font-size="11" fill="#333">${esc(label)}</text>`); lx += w + label.length * 6 + 24; };
  out.push(`<text x="${lx}" y="${ly + 4}" font-size="11" font-weight="bold" fill="#333">Legend:</text>`); lx += 52;
  item((x, y) => `<circle cx="${x + 9}" cy="${y}" r="8" fill="${C.evFill}" stroke="${C.ev}" stroke-width="2"/>`, "Start event", 24);
  item((x, y) => `<circle cx="${x + 9}" cy="${y}" r="8" fill="${C.evFill}" stroke="${C.ev}" stroke-width="4"/>`, "End event", 24);
  item((x, y) => `<rect x="${x}" y="${y - 9}" width="28" height="18" rx="4" fill="#fff" stroke="${C.navy}" stroke-width="1.6"/>`, "Activity", 36);
  item((x, y) => `<polygon points="${x + 10},${y - 10} ${x + 20},${y} ${x + 10},${y + 10} ${x},${y}" fill="${C.gateFill}" stroke="${C.gate}" stroke-width="2"/>`, "Exclusive gateway (decision)", 28);
  item((x, y) => `<rect x="${x}" y="${y - 9}" width="28" height="18" rx="4" fill="#fff" stroke="${C.red}" stroke-dasharray="5 4" stroke-width="1.6"/>`, "Exception path", 36);
  item((x, y) => `<rect x="${x}" y="${y - 9}" width="28" height="18" rx="4" fill="${def.keyType === "improved" ? C.blueFill : C.redFill}" stroke="${def.keyType === "improved" ? C.blue : C.red}" stroke-width="3"/>`, def.keyLabel, 36);
  item((x, y) => `<line x1="${x}" y1="${y}" x2="${x + 28}" y2="${y}" stroke="${C.navy}" stroke-width="1.6" stroke-dasharray="6 4"/>`, "Dependency / message", 36);
  out.push(`</svg>`);
  return { svg: out.join("\n"), width, height };
}

const current = {
  cols: 13, keyLabel: "Measured bottleneck (B1)",
  lanes: [ { id: "m", name: "Motorist", rows: 2 }, { id: "f", name: "Friends /|contacts" }, { id: "k", name: "Informal|mechanic|(fundi)" }, { id: "t", name: "Tow|operator" } ],
  nodes: [
    { id: "S", lane: "m", col: 0, type: "start", label: "Car breaks|down" },
    { id: "A1", lane: "m", col: 1, type: "task", label: "Check the car,|guess the|problem" },
    { id: "G1", lane: "m", col: 2, type: "gate", label: "Knows a|mechanic?" },
    { id: "A2", lane: "m", row: 1, col: 3, type: "task", label: "Ask friends and|family for a|number" },
    { id: "F1", lane: "f", col: 3, type: "task", label: "Suggest a|mechanic they|once used" },
    { id: "A3", lane: "m", col: 4, type: "task", label: "Phone the|mechanic,|haggle price" },
    { id: "G2", lane: "k", col: 5, type: "gate", label: "Available and|price agreed?", labelPos: "below" },
    { id: "B1", lane: "k", col: 6, type: "bottleneck", label: "B1 BOTTLENECK|Travel across|town in traffic" },
    { id: "A5", lane: "m", col: 7, type: "task", label: "Explain the|location by|phone, repeatedly" },
    { id: "M3", lane: "k", col: 8, type: "task", label: "Diagnose; may|go to buy parts|(e.g. Katwe)" },
    { id: "G3", lane: "k", col: 9, type: "gate", label: "Fixable here?" },
    { id: "M5", lane: "k", col: 10, type: "task", label: "Repair the car" },
    { id: "X3", lane: "m", row: 1, col: 10, type: "exception", label: "Fault returns:|no record, no|one to claim from" },
    { id: "A9", lane: "m", col: 11, type: "task", label: "Pay cash / MoMo|up front,|no receipt" },
    { id: "E1", lane: "m", col: 12, type: "end", label: "Moving again,|no warranty" },
    { id: "T1", lane: "t", col: 10, type: "task", label: "Find a tow truck|by phone;|negotiate and tow" },
    { id: "E2", lane: "t", col: 11, type: "end", label: "Car left at|a garage" },
  ],
  edges: [
    { from: "S", to: "A1" }, { from: "A1", to: "G1" },
    { from: "G1", to: "A3", label: "Yes" },
    { from: "G1", to: "A2", out: "b", in: "l", label: "No" },
    { from: "A2", to: "F1" },
    { from: "F1", to: "A3", out: "r", in: "b" },
    { from: "A3", to: "G2", out: "r", in: "l" },
    { from: "G2", to: "A2", out: "t", in: "r", label: "No: try the next number", style: "exception" },
    { from: "G2", to: "B1", label: "Yes" },
    { from: "B1", to: "A5", out: "r", in: "b" },
    { from: "A5", to: "M3", out: "r", in: "t" },
    { from: "M3", to: "G3" },
    { from: "G3", to: "M5", label: "Yes" },
    { from: "G3", to: "T1", out: "b", in: "l", label: "No" },
    { from: "M5", to: "X3", out: "t", in: "b", label: "Exception", style: "exception" },
    { from: "M5", to: "A9", out: "r", in: "b" },
    { from: "A9", to: "E1" }, { from: "T1", to: "E2" },
  ],
};

const proposed = {
  cols: 15, keyType: "improved", keyLabel: "B1 removed (measured automatically)",
  lanes: [ { id: "c", name: "Customer", rows: 2 }, { id: "p", name: "ROAD-|RESCUE|platform", rows: 2 }, { id: "m", name: "Mock|mobile|money" }, { id: "h", name: "Mechanic /|driver" }, { id: "a", name: "Admin" } ],
  nodes: [
    { id: "S", lane: "c", col: 0, type: "start", label: "Car breaks|down" },
    { id: "C1", lane: "c", col: 1, type: "task", label: "Log in; pick need;|car remembered;|tap area on map" },
    { id: "P1", lane: "p", col: 2, type: "task", label: "Match services|and nearest|approved helpers" },
    { id: "C3", lane: "c", col: 3, type: "task", label: "Pick fixed-price|service + parts;|check out" },
    { id: "G1", lane: "p", col: 4, type: "gate", label: "Valid and|in stock?", labelPos: "left" },
    { id: "X1", lane: "p", row: 1, col: 4, type: "exception", label: "Plain error;|roll back order;|keep typed values" },
    { id: "P2", lane: "p", col: 5, type: "task", label: "Create order and|reserve stock in|one transaction" },
    { id: "M1", lane: "m", col: 6, type: "task", label: "Customer|approves mock|MTN / Airtel", w: 104 },
    { id: "P3", lane: "p", col: 7, type: "improved", label: "B1 REMOVED|Hold payment;|notify nearest" },
    { id: "G2", lane: "h", col: 8, type: "gate", label: "Job|accepted?", labelPos: "below" },
    { id: "XC", lane: "c", row: 1, col: 8, type: "exception", label: "No helper: cancel|before work starts,|full refund" },
    { id: "A0", lane: "a", col: 8, type: "task", label: "Approve helpers|first (mock|verification)" },
    { id: "H1", lane: "h", col: 9, type: "task", label: "Accept job:|first wins; only|approved helpers" },
    { id: "H2", lane: "h", col: 10, type: "task", label: "Update: on the|way, arrived,|done" },
    { id: "C5", lane: "c", col: 10, type: "task", label: "Track live on|the map" },
    { id: "G4", lane: "c", col: 11, type: "gate", label: "Fixed?" },
    { id: "P4", lane: "p", col: 11, type: "task", label: "Release payment;|record 15% / 5%|commission" },
    { id: "E1", lane: "p", col: 12, type: "end", label: "Paid, rated,|warranty|7 days" },
    { id: "C7", lane: "c", col: 12, type: "task", label: "Warranty claim|or dispute" },
    { id: "A1", lane: "a", col: 13, type: "task", label: "Resolve: revisit|or refund;|audit-logged" },
    { id: "E2", lane: "a", col: 14, type: "end", label: "Claim|closed" },
  ],
  edges: [
    { from: "S", to: "C1" },
    { from: "C1", to: "P1", out: "r", in: "l" },
    { from: "P1", to: "C3", out: "r", in: "l" },
    { from: "C3", to: "G1", out: "r", in: "t" },
    { from: "G1", to: "P2", label: "Yes" },
    { from: "G1", to: "X1", label: "No", style: "exception" },
    { from: "X1", to: "C3", out: "l", in: "b", style: "exception" },
    { from: "P2", to: "M1", out: "r", in: "t" },
    { from: "M1", to: "P3", out: "r", in: "b" },
    { from: "P3", to: "G2", out: "r", in: "l" },
    { from: "G2", to: "XC", out: "t", in: "b", label: "No: exception", style: "exception" },
    { from: "G2", to: "H1", label: "Yes" },
    { from: "A0", to: "H1", out: "r", in: "b", dashed: true },
    { from: "H1", to: "H2" },
    { from: "H2", to: "C5", out: "t", in: "b" },
    { from: "C5", to: "G4" },
    { from: "G4", to: "P4", out: "b", in: "t", label: "Yes: confirm + rate" },
    { from: "G4", to: "C7", label: "No" },
    { from: "P4", to: "E1" },
    { from: "C7", to: "A1", out: "r", in: "t" },
    { from: "A1", to: "E2" },
  ],
};

(async () => {
  const outDir = process.argv[2];
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });
  for (const [name, def] of [["process-current", current], ["process-proposed", proposed]]) {
    const { svg, width, height } = render(def);
    fs.writeFileSync(path.join(outDir, name + ".svg"), svg);
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2.5 });
    await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
    await page.locator("svg").screenshot({ path: path.join(outDir, name + ".png") });
    await page.close();
    console.log(name, width + "x" + height);
  }
  await browser.close();
})();

