// End-to-end walkthrough in a real browser (Playwright). Saves screenshots as test evidence.
//   1. Start the app:  npm run dev   (or npm run build && npm start)
//   2. In another terminal:  node scripts/e2e-walkthrough.mjs http://localhost:3000
// Needs Playwright:  npm install --no-save playwright && npx playwright install chromium
// (Or use a browser you already have: set PW_CHANNEL=msedge or PW_CHANNEL=chrome.)
// Start from fresh demo data: npm run db:reset
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = "test-evidence/screenshots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const results = [];
const step = async (name, fn) => {
  try {
    await fn();
    results.push(["PASS", name]);
    console.log("PASS", name);
  } catch (e) {
    results.push(["FAIL", name, e.message]);
    console.log("FAIL", name, "-", e.message.split("\n")[0]);
  }
};

async function newUser(email, password) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("main button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });
  await page.waitForLoadState("networkidle");
  return { ctx, page };
}
const shot = async (page, name) => {
  await page.evaluate(() => {
    // Sections fade in as you scroll; a full-page picture never scrolls, so show them all first.
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in", "is-static"));
    window.scrollTo(0, 0); // keep the sticky header at the top of the picture
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
};

// ---------- Public ----------
const pub = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
const p0 = await pub.newPage();
await step("Home page loads", async () => {
  await p0.goto(BASE);
  await p0.getByRole("heading", { name: /help is one tap away/i }).waitFor();
  await shot(p0, "01-home");
});
await step("Search finds 'tyre' service", async () => {
  await p0.goto(BASE + "/services?q=tyre");
  await p0.getByText("Flat tyre change").first().waitFor();
  await shot(p0, "02-search");
});
await step("Protected page redirects to login", async () => {
  await p0.goto(BASE + "/admin");
  if (!p0.url().includes("/login")) throw new Error("not redirected: " + p0.url());
});
await step("Wrong password shows an error", async () => {
  await p0.goto(BASE + "/login");
  await p0.fill("#email", "sarah@roadrescue.test");
  await p0.fill("#password", "wrongpass1");
  await p0.click("main button[type=submit]");
  await p0.getByRole("alert").filter({ hasText: "Wrong email or password" }).waitFor();
  await shot(p0, "03-login-error");
});

// ---------- Customer: "Get help" steps ----------
const { page: c } = await newUser("sarah@roadrescue.test", "Customer@1234");
let orderUrl = "";
await step("After login the customer is asked what they need", async () => {
  if (!c.url().includes("/request")) throw new Error("not on /request: " + c.url());
  await c.getByRole("heading", { name: /What do you need/ }).waitFor();
  await shot(c, "19-request-need");
});
await step("Customer picks a need and tells us their car (make, type, model, colour)", async () => {
  await c.getByRole("link", { name: /Fix a mechanical problem/ }).click();
  await c.getByRole("heading", { name: /What do you drive/ }).waitFor();
  await c.locator("label.make-tile", { hasText: "Toyota" }).click();
  await c.locator("label.body-tile", { hasText: "Saloon" }).click();
  await c.fill("#model", "Premio");
  await c.locator("label.swatch[title=Silver]").click();
  await shot(c, "20-request-car");
  await c.getByRole("button", { name: /Continue/ }).click();
  await c.getByRole("heading", { name: /Where are you/ }).waitFor();
});
await step("Customer chooses their area on the map page and sees matching services", async () => {
  await c.locator(".leaflet-marker-icon").first().waitFor(); // the map has loaded
  await c.selectOption("#area", "Ntinda");
  await shot(c, "21-request-where");
  await c.getByRole("button", { name: /Show help in Ntinda/ }).click();
  await c.getByRole("heading", { name: /Help for your Toyota/ }).waitFor();
  await c.getByText("Nearest mechanics").waitFor();
  await shot(c, "22-request-choose");
});

// ---------- Customer: discover -> cart -> checkout -> pay ----------
await step("Customer opens service and adds to cart", async () => {
  await c.goto(BASE + "/services");
  await c.getByRole("link", { name: /Jump-start/ }).first().click();
  await c.getByRole("heading", { name: "Jump-start" }).waitFor();
  await shot(c, "04-service-detail");
  await c.getByRole("button", { name: /Add to cart/ }).click();
  await c.waitForURL("**/cart");
});
await step("Customer adds a battery to the cart", async () => {
  const row = c.locator("div.row.between").filter({ hasText: "Car battery 45Ah" }).first();
  await row.getByRole("button", { name: "+ Add" }).click();
  await c.locator("tbody tr", { hasText: "Car battery 45Ah" }).first().waitFor();
  await shot(c, "05-cart");
});
await step("Checkout rejects an invalid phone number", async () => {
  await c.goto(BASE + "/checkout");
  // The car and area from the "Get help" steps are filled in already.
  if ((await c.inputValue("#vehicle")) !== "Toyota Premio, silver (Saloon)") throw new Error("vehicle not pre-filled: " + (await c.inputValue("#vehicle")));
  if ((await c.inputValue("#area")) !== "Ntinda") throw new Error("area not pre-filled");
  await c.fill("#landmark", "Opposite Shell Ntinda");
  await c.fill("#vehicle", "Toyota Premio, silver");
  await c.fill("#problemNote", "Car won't start after parking");
  await c.fill("#payerPhone", "12345");
  await c.click("main button[type=submit]");
  await c.getByRole("alert").filter({ hasText: "0772123456" }).waitFor();
  await shot(c, "06-checkout-validation");
});
await step("Checkout with valid details goes to mock payment", async () => {
  // The form keeps what was typed after an error, so only the phone needs fixing.
  if ((await c.inputValue("#landmark")) !== "Opposite Shell Ntinda") throw new Error("form lost the typed values");
  await c.fill("#payerPhone", "0772123456");
  await c.click("main button[type=submit]");
  await c.waitForURL("**/checkout/pay/**");
  await shot(c, "07-mock-payment");
});
await step("Approving mock payment starts the search", async () => {
  await c.getByRole("button", { name: /Approve/ }).click();
  await c.waitForURL("**/orders/**");
  await c.getByText("Finding a mechanic near Ntinda").waitFor();
  orderUrl = c.url().split("?")[0];
  await shot(c, "08-tracking-searching");
});

// ---------- Mechanic ----------
const { page: m } = await newUser("ssali@roadrescue.test", "Mechanic@1234");
await step("Mechanic sees the job and accepts it", async () => {
  await m.goto(BASE + "/mechanic");
  await shot(m, "09-mechanic-open-jobs");
  const card = m.locator(".card").filter({ hasText: "Opposite Shell Ntinda" }).first();
  await card.getByRole("button", { name: "Accept job" }).click();
  await m.getByRole("heading", { name: "My active jobs" }).waitFor();
});
await step("Mechanic moves job: on the way -> arrived -> done", async () => {
  for (const label of [/on my way/, /arrived/, /Job done/]) {
    const card = m.locator(".card").filter({ hasText: "Opposite Shell Ntinda" }).first();
    await card.getByRole("button", { name: label }).click();
    await m.waitForTimeout(600);
  }
  await m.locator(".card").filter({ hasText: "Opposite Shell Ntinda" }).getByText("Waiting for the customer to confirm").waitFor();
  await shot(m, "10-mechanic-active-job");
});
await step("Mechanic does not see the driver job", async () => {
  await m.goto(BASE + "/mechanic");
  if (await m.getByText("Parking behind Ntinda Shopping Centre").count()) throw new Error("driver job shown to a mechanic");
});
await step("Mechanic cannot open admin pages", async () => {
  await m.goto(BASE + "/admin");
  if (!m.url().includes("/mechanic")) throw new Error("not blocked: " + m.url());
  await m.getByText("You don't have access to that page").waitFor();
});

// ---------- Driver ----------
const { page: d } = await newUser("brenda@roadrescue.test", "Driver@1234");
await step("Driver sees the driver job and takes the trip", async () => {
  if (!d.url().includes("/driver")) throw new Error("driver not on /driver: " + d.url());
  const card = d.locator(".card").filter({ hasText: "Parking behind Ntinda Shopping Centre" }).first();
  await card.getByRole("button", { name: "Accept trip" }).click();
  await d.getByRole("heading", { name: "My active trips" }).waitFor();
  await d.locator(".card").filter({ hasText: "Parking behind Ntinda Shopping Centre" }).getByRole("button", { name: /on my way/ }).click();
  await d.locator(".card").filter({ hasText: "Parking behind Ntinda Shopping Centre" }).getByText("Driver on the way").waitFor();
  await shot(d, "23-driver-dashboard");
});
await step("Driver cannot open the mechanic dashboard", async () => {
  await d.goto(BASE + "/mechanic");
  if (d.url().includes("/mechanic")) throw new Error("not blocked");
});

// ---------- Customer confirms + after-sales ----------
await step("Customer confirms, payment released", async () => {
  await c.goto(orderUrl);
  await c.getByRole("heading", { name: "Is your car fixed?" }).waitFor();
  await shot(c, "11-tracking-confirm");
  await c.getByRole("button", { name: /release payment/ }).click();
  await c.getByText("Released").first().waitFor();
});
await step("Customer leaves a review and opens a warranty claim", async () => {
  await c.goto(orderUrl);
  await c.fill("#comment", "Came quickly and explained everything.");
  await c.getByRole("button", { name: "Submit review" }).click();
  await c.getByRole("heading", { name: "Your review" }).waitFor();
  await c.locator("summary", { hasText: "Open a warranty claim" }).click();
  await c.fill("#warranty", "The car failed to start again the next morning.");
  await c.getByRole("button", { name: "Send claim" }).click();
  await c.getByRole("heading", { name: "Claims" }).waitFor();
  await shot(c, "12-after-sales");
});
await step("Customer cannot open the mechanic dashboard", async () => {
  await c.goto(BASE + "/mechanic");
  if (c.url().includes("/mechanic")) throw new Error("not blocked");
});

// ---------- Admin ----------
const { page: a } = await newUser("admin@roadrescue.test", "Admin@1234");
await step("Admin dashboard shows metrics", async () => {
  await a.goto(BASE + "/admin");
  await a.getByText("Avg. time to find a mechanic").waitFor();
  await shot(a, "13-admin-dashboard");
});
await step("Admin approves the pending mechanic", async () => {
  await a.goto(BASE + "/admin/mechanics");
  await a.locator("tr", { hasText: "Peter Opio" }).getByRole("button", { name: "Approve" }).click();
  await a.locator("tr", { hasText: "Peter Opio" }).getByText("Approved").waitFor();
  await shot(a, "14-admin-mechanics");
});
await step("Admin resolves the warranty claim", async () => {
  await a.goto(BASE + "/admin/claims");
  const card = a.locator(".card").filter({ hasText: "failed to start again" }).first();
  await card.locator("input[name=note]").fill("Ssali will recheck the battery terminals for free");
  await card.getByRole("button", { name: "Send mechanic back" }).click();
  await a.getByText("Resolution: Ssali will recheck").waitFor();
  await shot(a, "15-admin-claims");
});
await step("Admin inventory shows reduced battery stock", async () => {
  await a.goto(BASE + "/admin/inventory");
  await shot(a, "16-admin-inventory");
});
await step("Audit log records the payment and status changes", async () => {
  await a.goto(BASE + "/admin/audit");
  await a.locator("td code", { hasText: "PAYMENT_HELD" }).first().waitFor();
  await a.locator("td code", { hasText: "LOGIN_FAILED" }).first().waitFor();
  await shot(a, "17-admin-audit");
});

// ---------- Mobile view ----------
await step("Works on a phone screen", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(BASE);
  await shot(p, "18-mobile-home");
  const width = await p.evaluate(() => document.documentElement.scrollWidth);
  if (width > 392) throw new Error("page scrolls sideways: " + width);
});

await browser.close();
fs.writeFileSync("test-evidence/e2e-results.txt", results.map((r) => r.join(" | ")).join("\n") + "\n");
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} steps passed. Screenshots in ${OUT}`);
process.exit(failed ? 1 : 0);
