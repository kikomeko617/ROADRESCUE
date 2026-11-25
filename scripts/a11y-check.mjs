// Automated accessibility check (WCAG 2 A and AA rules, using axe-core) on every page.
//   npm install --no-save playwright axe-core && npx playwright install chromium
//   node scripts/a11y-check.mjs http://localhost:3000
import fs from "node:fs";
import { chromium } from "playwright";
const axe = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const B = process.argv[2] || "http://localhost:3000";
// Set PW_CHANNEL=msedge (or chrome) to use a browser you already have.
const br = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
async function ctxFor(email, pw) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 860 } });
  if (email) { const p = await ctx.newPage(); await p.goto(B + "/login"); await p.fill("#email", email); await p.fill("#password", pw); await p.click("main button[type=submit]"); await p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }); await p.waitForLoadState("networkidle"); await p.close(); }
  return ctx;
}
const plan = [
  [null, null, ["/", "/services", "/services/1", "/login", "/register", "/privacy"]],
  ["daniel@roadrescue.test", "Customer@1234", ["/request", "/request?need=tow", "/request?need=tow&car=1", "/request?need=tow&car=1&area=Ntinda", "/cart", "/orders", "/notifications"]],
  ["ssali@roadrescue.test", "Mechanic@1234", ["/mechanic"]],
  ["brenda@roadrescue.test", "Driver@1234", ["/driver"]],
  ["admin@roadrescue.test", "Admin@1234", ["/admin", "/admin/mechanics", "/admin/inventory", "/admin/claims", "/admin/audit"]],
];
const out = [];
for (const [e, pw, pages] of plan) {
  const ctx = await ctxFor(e, pw);
  for (const path of pages) {
    const p = await ctx.newPage(); await p.goto(B + path); await p.waitForTimeout(1500); await p.addScriptTag({ content: axe });
    const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, target: v.nodes[0].target.join(" ") })));
    out.push([path, r]); console.log(path, r.length ? JSON.stringify(r) : "0 violations"); await p.close();
  }
}
fs.writeFileSync("test-evidence/accessibility-axe-results.json", JSON.stringify(out, null, 2));
await br.close();
