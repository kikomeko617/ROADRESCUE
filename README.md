# ROADRESCUE

**Break down. Get moving. Get your car back.**

**Live prototype:** https://roadrescue-lime.vercel.app  •  **Demo accounts:** see below  •  **Group 6** (MGT3151, Advent 2026)

ROADRESCUE is an e-commerce prototype for **MGT3151 E-Business, E-Commerce and E-Governance** (Uganda Christian University, Option B: E-Commerce). A driver whose car breaks down can order a verified mechanic, a tow truck or a safe driver to wherever they are, at a fixed price they see first. They pay with a **mock** mobile-money payment that is held until they confirm the job is done.

> This is a bounded prototype. **All people, cars and payments are fictitious. Payments are simulated.** It never asks for or stores PINs, OTPs, card numbers or National ID numbers.

---

## What it does (the minimum e-commerce workflow)

| Required step | In ROADRESCUE | Where |
|---|---|---|
| Discover / search | "Get help" steps after login: what you need → your car → where you are (map) → matching services. Or search and filter every service | `/request`, `/services` |
| Select item | Service page with a fixed price, time estimate and suggested parts | `/services/[id]` |
| Cart / order | Cart with one service and optional spare parts (with live stock) | `/cart`, `/checkout` |
| Mock checkout / payment | Simulated MTN MoMo / Airtel Money prompt; money is **held** (escrow) | `/checkout/pay/[id]` |
| Fulfilment / status | Mechanic or driver accepts → on the way → working / driving → done; live tracking page with a map | `/mechanic`, `/driver`, `/orders/[id]` |
| After-sales | Confirm and release payment, rate the helper, 7-day warranty claim, dispute, refund | `/orders/[id]`, `/admin/claims` |

There are four roles, each with its own screens:

- **Customer**: "Get help" steps (need, car, area on a map), search, cart, checkout, pay, track, confirm, review, claim
- **Mechanic**: repair, towing and fuel jobs nearby; accept, update status, earnings and rating
- **Driver**: driving jobs (drive me home, airport run, driver for the day...); accept, update status, earnings and rating
- **Admin**: business dashboard, approve or suspend mechanics and drivers, inventory, claims and disputes, audit log

The home page has a live map of available mechanics, drivers and partner garages, and a "people near you" section with illustrated faces (no real photos are used or stored).

---

## Quick start (local)

You need **Node.js 20 or newer** ([download](https://nodejs.org)). Check with `node -v`.

```bash
# 1. Install packages (first time only)
npm install

# 2. Start the app (this also creates the database with demo data the first time)
npm run dev
```

Open **http://localhost:3000**. That's it. No database server and no `.env` file are needed for local use.

> **Upgrading from 1.0?** `npm run dev` notices the old database, saves a copy in `data/` and rebuilds it with the new demo data automatically. The map needs an internet connection; everything else works offline.

### Demo accounts (all fictitious)

| Role | Email | Password |
|---|---|---|
| Customer (new - goes through every step) | `sarah@roadrescue.test` | `Customer@1234` |
| Customer (car and area already saved) | `daniel@roadrescue.test` | `Customer@1234` |
| Mechanic (Ntinda, approved) | `ssali@roadrescue.test` | `Mechanic@1234` |
| Mechanic (Kansanga, approved) | `musa@roadrescue.test` | `Mechanic@1234` |
| Mechanic (waiting for approval) | `peter@roadrescue.test` | `Mechanic@1234` |
| Driver (Ntinda, approved) | `brenda@roadrescue.test` | `Driver@1234` |
| Driver (waiting for approval) | `moses@roadrescue.test` | `Driver@1234` |
| Admin | `admin@roadrescue.test` | `Admin@1234` |

More fictitious helpers (`grace`, `ivan`, `rashid`, `allan`, `esther` `@roadrescue.test`) fill the map; mechanics use `Mechanic@1234` and drivers `Driver@1234`.

**Tip for the demo:** open the customer in a normal window and the mechanic in a private/incognito window, side by side. When the mechanic updates the job, the customer's tracking page updates by itself within 5 seconds.

### Demo script (about 5 minutes)

1. **Home page:** scroll slowly - the headline, the words that light up, the pinned "three ways we rescue you" pictures, the live map (toggle mechanics / drivers / garages, press *Use my location*) and the faces near you.
2. **Customer (Sarah):** log in → *What do you need?* **Fix a mechanical problem** → *What do you drive?* Toyota, Saloon, Premio, silver → *Where are you?* tap **Ntinda** on the map → choose **Jump-start** → add a *Car battery 45Ah* → Checkout (car and area are filled in; any landmark, phone `0772123456`) → **Approve (simulate)**.
3. **Mechanic (Ssali):** *My jobs* → **Accept job** → *I'm on my way* (the customer now sees a map) → *I've arrived* → *Job done*.
4. **Customer:** the tracking page moves along by itself → **Yes, it's fixed - release payment** → leave a 5-star review → open a warranty claim.
5. **Driver (Brenda):** *My trips* → accept the waiting *Drive me home* trip. Log in as Daniel to show "Yes, still this car" (his car is remembered).
6. **Admin:** dashboard numbers → approve *Peter Opio* or *Moses Okot* → resolve the warranty claim → show the audit log and the reduced battery stock.
7. **Show the safety checks:** wrong password shows an error; phone `12345` is rejected at checkout; a mechanic trying `/admin` is sent back; a mechanic never sees driver jobs.

---

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app for development on http://localhost:3000 |
| `npm run build` then `npm start` | Production build and run |
| `npm test` | Run the 20 automated test cases |
| `npm run test:report` | Run tests and save `test-evidence/test-results.xml` |
| `npm run db:reset` | Delete all data and reload the demo data |
| `npm run db:backup` | Save a backup of every table to `backups/` |
| `npm run db:restore` | Restore the newest backup (or `npm run db:restore -- backups/<file>.json`) |
| `node scripts/e2e-walkthrough.mjs http://localhost:3000` | Browser walkthrough of the whole flow, with screenshots (needs Playwright, see `docs/TESTING.md`) |

---

## Hosting (free): Vercel + Turso

The local database is a SQLite file. Vercel can't keep files between requests, so for hosting we use a free **Turso** database (also SQLite). The code is the same; only two settings change.

1. **Create the database.** Sign up at [turso.tech](https://turso.tech) → *Create Database* (e.g. `roadrescue`, region closest to Uganda). Copy the **Database URL** (`libsql://...`) and create a **token**.
2. **Load the tables and demo data into it** from your computer: create a file called `.env` in the project folder:
   ```
   DATABASE_URL=libsql://roadrescue-yourname.turso.io
   DATABASE_AUTH_TOKEN=your-token-here
   ```
   then run `npm run db:setup`.
3. **Deploy.** Push the code to GitHub. On [vercel.com](https://vercel.com) → *Add New Project* → import the repo. Under **Environment Variables** add:
   - `DATABASE_URL` = your Turso URL
   - `DATABASE_AUTH_TOKEN` = your Turso token
   - `SESSION_SECRET` = a long random string (make one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
4. Click **Deploy**. Vercel gives you an `https://...vercel.app` link. Put it in `LINKS.txt`.

> Remove `DATABASE_URL` from your local `.env` afterwards if you want to go back to the local file database.

More detail is in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Project structure

```
roadrescue/
├── database/schema.sql        # all tables, constraints and indexes (data design)
├── scripts/                   # db setup / backup / restore, browser walkthrough
├── src/
│   ├── middleware.js          # first security gate: login + role check for protected pages
│   ├── lib/                   # business logic (no UI code)
│   │   ├── db.js              # database connection + transactions
│   │   ├── auth.js            # register, login, lockout, password hashing, tokens, roles
│   │   ├── session.js         # login cookie
│   │   ├── validation.js      # every input rule (zod)
│   │   ├── catalog.js         # services, parts, search, helpers and garages near you
│   │   ├── profile.js         # the customer's saved car and area
│   │   ├── geo.js             # map maths: distances, nearest area, approximate positions
│   │   ├── avatar.js          # illustrated faces (SVG, no photos)
│   │   ├── cart.js            # cart and pricing
│   │   ├── orders.js          # checkout, mock payment, fulfilment, after-sales
│   │   ├── admin.js           # dashboard, approvals, inventory, claims, audit
│   │   ├── audit.js           # audit log
│   │   ├── notifications.js   # in-app alerts
│   │   └── constants.js       # order state machine, roles, needs, car makes, areas, commission
│   ├── app/                   # pages (Next.js App Router) and server actions
│   │   └── request/           # the "Get help" steps
│   └── components/            # shared UI pieces (map, scroll effects, avatars, dashboards...)
├── tests/                     # automated test cases (Vitest)
├── test-evidence/             # test results and screenshots
└── docs/                      # architecture, data design, security, testing, roles
```

## Tech stack and versions

| Part | Choice | Version |
|---|---|---|
| Runtime | Node.js | 20+ (tested on 22) |
| Framework | Next.js (React) | 15.5.28 / React 19.2.9 |
| Database | libSQL / SQLite (local file or Turso) | @libsql/client 0.15.15 |
| Validation | zod | 3.25.76 |
| Passwords | bcryptjs | 3.0.2 |
| Sessions | jose (signed JWT in httpOnly cookie) | 6.0.13 |
| Map | Leaflet (bundled) + OpenStreetMap tiles | 1.9.4 |
| Fonts (bundled, no Google requests) | Inter + Space Grotesk via @fontsource-variable | 5.3.0 |
| Tests | Vitest (+ Playwright for the browser walkthrough) | 3.2.6 |

Exact versions are pinned in `package.json`, and `package-lock.json` locks every sub-dependency.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): system diagram, layers, trust boundaries, protocols
- [`docs/DATA_DESIGN.md`](docs/DATA_DESIGN.md): ERD, data dictionary, validation, retention, data minimisation
- [`docs/SECURITY.md`](docs/SECURITY.md): roles and least privilege, threat analysis, audit, backup and restore
- [`docs/TESTING.md`](docs/TESTING.md): test plan and test case table with results
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): hosting steps, assumptions and limitations
- [`docs/ROLE_MATRIX.md`](docs/ROLE_MATRIX.md): who owns which part, and how to commit
