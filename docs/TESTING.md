# Testing

## Test plan

| Level | Tool | What it covers | How to run | Evidence |
|---|---|---|---|---|
| Automated unit / integration tests | Vitest, on a fresh temporary database each run | Business rules: auth, search, cart, orders, payments, stock, state machine, access control, drivers, saved car and area, map helpers | `npm test` | `test-evidence/unit-test-output.txt`, `test-evidence/test-results.xml` |
| End-to-end browser walkthrough | Playwright (Chromium or Edge) | The full workflow through the real screens for all four roles, including the "Get help" steps and the map, plus a mobile view | see below | `test-evidence/e2e-results.txt`, `test-evidence/screenshots/` |
| Accessibility check | axe-core (WCAG 2 A + AA rules) | Every page for each role | see below | `test-evidence/accessibility-axe-results.json` |
| Manual usability check | Team members on phone and laptop | Navigation, messages, readability, keyboard use | Checklist below | Screenshots |

The brief asks for at least 8 test cases: 5 positive, 2 validation/error and 1 access-control. We have **20**: 8 positive, 4 validation/error and 8 access-control/integrity.

## Test cases

All 20 passed on 19 Nov 2026 and again on 25 Nov 2026 (Vitest 3.2.6, Node 26; latest output in `test-evidence/unit-test-output-2026-11-25.txt`). Run `npm test` to repeat them.

| ID | Type | Test case | Input / steps | Expected result | Actual result | Evidence | Status |
|---|---|---|---|---|---|---|---|
| TC01 | Positive | Register and log in | Register Brian (customer), then log in with an upper-case email | Account created; password stored as a bcrypt hash; login works; session token verifies; tampered token rejected | As expected | unit-test-output.txt; screenshot 03 | ✅ Pass |
| TC02 | Positive | Discover / search | Search "tyre"; filter "Battery & electrics" | "Flat tyre change" found, only matching results; 2 battery services | As expected | screenshot 02 | ✅ Pass |
| TC03 | Positive | Cart → order | Jump-start + 1 × battery 45Ah, checkout | Total UGX 310,000; commission UGX 18,500 (15% + 5%); battery stock −1; cart emptied; status PENDING_PAYMENT | As expected | screenshots 05-07 | ✅ Pass |
| TC04 | Positive | Mock payment (idempotent) | Approve payment, then approve again | First: payment HELD, order SEARCHING. Second: "already paid", still only one payment row | As expected | screenshot 08 | ✅ Pass |
| TC05 | Positive | Fulfilment | Ssali accepts → on the way → arrived → done; Sarah confirms | Status COMPLETED, payment RELEASED, history has all 7 steps, audit log has each action | As expected | screenshots 09-11, 17 | ✅ Pass |
| TC06 | Positive | After-sales | 5-star review; a second review; warranty claim; admin "Revisit" | Review saved; second review refused; claim OPEN → REVISIT | As expected | screenshots 12, 15 | ✅ Pass |
| TC07 | Positive | Cancel and refund | Daniel orders 2 batteries, pays, cancels | Stock returns to the original count; payment REFUNDED | As expected | unit-test-output.txt | ✅ Pass |
| TC08 | Validation | Invalid mobile-money number | Checkout with phone `12345` | Rejected with "Enter a phone number like 0772123456…"; no order created | As expected | screenshot 06 | ✅ Pass |
| TC09 | Validation / integrity | Not enough stock | Daniel has 3 hoses in the cart; Sarah buys 2 first; Daniel checks out | Error "only 1 left"; no order; stock unchanged (rollback); cart kept | As expected | unit-test-output.txt | ✅ Pass |
| TC10 | Validation / security | Wrong password and lockout | Wrong password ×5, then the correct password | "Wrong email or password", then "Too many failed attempts" | As expected | screenshot 03; audit log | ✅ Pass |
| TC11 | **Access control** | Customer tries admin / mechanic | `canAccess('/admin','customer')`; customer calls `acceptJob`, `setMechanicStatus` | Blocked with AccessDeniedError; guests sent to login | As expected | e2e: "Mechanic cannot open admin pages" | ✅ Pass |
| TC12 | Access control | View someone else's order (IDOR) | Sarah opens Daniel's order | AccessDeniedError | As expected | unit-test-output.txt | ✅ Pass |
| TC13 | Integrity | Two mechanics, one job | Ssali and Musa accept the same job at the same time | Exactly one succeeds; job assigned to them | As expected | unit-test-output.txt | ✅ Pass |
| TC14 | Access control | Unapproved mechanic | Peter (PENDING) accepts a job; admin approves; Peter accepts | First refused; after approval it works | As expected | screenshot 14 | ✅ Pass |
| TC15 | Integrity | Skipping steps / wrong mechanic | Musa jumps ACCEPTED → done; Ssali updates Musa's job | Both refused | As expected | unit-test-output.txt | ✅ Pass |
| TC16 | Access control / integrity | Drivers and mechanics stay in their lane | Ssali (mechanic) tries the driver job; Brenda (driver) takes it and drives; Brenda tries a mechanic job | Ssali refused ("needs a driver") and can't even open it; Brenda's trip reaches AWAITING_CONFIRMATION; Brenda refused on the mechanic job | As expected | unit-test-output.txt; screenshot 23 | ✅ Pass |
| TC17 | Access control | Unapproved driver | Register Joan as a driver; register a driver with no area; Moses (PENDING) accepts a driver job; admin approves; Moses accepts | Joan is PENDING; no-area sign-up refused; Moses refused, then works after approval | As expected | unit-test-output.txt; screenshot 14 | ✅ Pass |
| TC18 | Validation / privacy | Saved car and area | Make "Tesla Cybertruck"; model `<script>`; valid Toyota Harrier SUV; area given as GPS numbers; area Ntinda; mechanic saving a car | Bad make, `<`/`>` and GPS text refused; car and area saved and shown as "Toyota Harrier, black (SUV)"; mechanic refused | As expected | unit-test-output.txt; screenshots 20, 21 | ✅ Pass |
| TC19 | Positive | "What do you need?" matching and "near you" sorting | Needs `driver`, `tow`, `nonsense`; drivers near Ntinda; garages near Kansanga | 4 driver services; both towing services; nothing for nonsense; only approved drivers, Brenda first; Kansanga garage first | As expected | unit-test-output.txt; screenshot 22 | ✅ Pass |
| TC20 | Access control / map | Map helpers and new pages | Same id twice; GPS points near Ntinda and Mukono; `/driver` for a mechanic; `/request` for a guest | Same position both times; nearest areas Ntinda and Mukono; both pages blocked; allowed for the right roles | As expected | unit-test-output.txt | ✅ Pass |

## End-to-end browser walkthrough (27 steps, all passed)

```bash
npm install --no-save playwright && npx playwright install chromium
npm run db:reset && npm run dev          # terminal 1
node scripts/e2e-walkthrough.mjs http://localhost:3000   # terminal 2
```

No Chromium download? Use a browser you already have: set `PW_CHANNEL=msedge` (or `chrome`) before running the script. The 19 Nov 2026 run used Microsoft Edge against a production build (`npm run build && npm start`).

Steps: home → search → protected-page redirect → wrong password → customer lands on "What do you need?" → picks a need and their car → chooses an area on the map page and sees matching services and the nearest mechanics → service → cart + part → checkout is pre-filled with the car and area; invalid phone → valid checkout → mock payment → mechanic accepts → mechanic updates ×3 → mechanic doesn't see the driver job → mechanic blocked from /admin → driver accepts the driver job and sets off → driver blocked from /mechanic → customer confirms → review + warranty → customer blocked from /mechanic → admin dashboard → approve mechanic → resolve claim → inventory → audit log → phone-size screen (no sideways scrolling). Results are in `test-evidence/e2e-results.txt` and the screenshots in `test-evidence/screenshots/` (19-23 are the new screens).

## Accessibility and usability checks

Automated: `node scripts/a11y-check.mjs http://localhost:3000` (after `npm install --no-save playwright axe-core`). Result: **0 WCAG 2 A/AA violations on all 20 pages tested** (including the four "Get help" steps and the driver dashboard).

Manual checklist:

| Check | Result |
|---|---|
| Same header navigation on every page, with links depending on role | ✅ |
| Every form field has a visible label; hints explain the expected format | ✅ |
| Errors appear in red boxes (`role="alert"`) next to the form, in plain language; typed values are kept | ✅ |
| Buttons show "Please wait…" while working, so nobody double-submits | ✅ |
| Success messages after every action | ✅ |
| Works on a 390 px phone screen without sideways scrolling | ✅ (e2e step 21) |
| Keyboard: "Skip to main content" link, visible orange focus ring, everything reachable with Tab | ✅ |
| Text contrast meets WCAG AA on the navy theme (dark text on orange buttons, light orange for links; words that "light up" on scroll never drop below large-text contrast) | ✅ (axe) |
| Animations stop when "reduce motion" is turned on, and nothing is hidden waiting for a scroll | ✅ |
| The map always has a non-map alternative (area dropdown, "closest to you" list); map pins can be reached with Tab and opened with Enter | ✅ |
| Touch targets at least 44 px high | ✅ |
| Live pages (tracking, mechanic jobs, admin) refresh themselves | ✅ |

## Defect summary

| # | Found during | Defect | Fix | Status |
|---|---|---|---|---|
| D1 | Unit tests | `SQLITE_BUSY: database is locked` when two transactions ran at once on the local file database | Queue database work within the server process (`serial()` in `src/lib/db.js`) | Fixed, TC13 passes |
| D2 | Browser walkthrough | After a validation error at checkout the form was cleared, so customers had to retype everything (React 19 resets forms after an action) | `ActionForm` submits through `startTransition` so typed values are kept | Fixed, e2e step 7 checks it |
| D3 | Unit tests | A test left items in a cart, which broke later tests | Test helper empties the cart before each new order | Fixed |
| D4 | Visual review | Prices wrapped onto two lines in tables; "How it works" cards cramped on phones | `white-space: nowrap` on money cells; one column on small screens | Fixed |
| D5 | Visual review (1.1) | Map showed "API KEY REQUIRED" - the CARTO dark tiles now need an account | Switched to OpenStreetMap tiles, made navy with a CSS filter | Fixed |
| D6 | Browser walkthrough (1.1) | On the "Where are you?" map, garage pins covered the area names, so an area couldn't be tapped | Area names are drawn above all other pins | Fixed, e2e step 7 |
| D7 | Visual review (1.1) | In card grids the first card sat higher than the rest (extra top margin on later cards) | No extra margin inside grids | Fixed |
| D8 | Deployment check (25 Nov) | The hosted home and services pages returned HTTP 500 after the first Vercel deployment | The database settings and session secret were missing on Vercel; added them and redeployed | Fixed |
