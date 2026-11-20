# Role matrix and contribution plan

The exam gives **8 marks for individual defense**, and each person is questioned for 5-7 minutes on **their own part**. Each member owns the files below. Read your files until you can explain them without notes, make your own improvements, and commit them from **your own GitHub account**.

The team is split into a **back-end group** (server logic, database, security; members 1-5) and a **front-end group** (pages, components, styling, testing; members 6-10). Every file in the project has exactly one owner.

## Back end

| # | Member | Reg. No. | Role | Owns these files | Report sections to write | Be ready to explain |
|---|---|---|---|---|---|---|
| 1 | MASOLO MATTHEW JOEL | S24B13/099 | **Team lead**: architecture, core order engine, integration and deployment | `package.json`, `package-lock.json`, `next.config.mjs`, `jsconfig.json`, `.gitignore`, `.env.example`, `.nvmrc`, `README.md`, `CHANGELOG.md`, `LINKS.txt`, `public/logo.svg`, `src/app/layout.js`, `src/app/template.js`, `src/app/error.js`, `src/app/not-found.js`, `src/lib/orders.js`, `src/lib/constants.js`, `src/lib/profile.js`, `src/lib/geo.js`, `src/app/actions/request.js`, `src/app/actions/helpers.js`, `scripts/e2e-walkthrough.mjs`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/ROLE_MATRIX.md`, `docs/diagrams/architecture.*`, `docs/diagrams/order-states.*` | Executive summary, introduction, architecture, deployment, lessons learned | How the app is structured; the whole order life cycle in `orders.js`; the "Get help" request flow (saved car, area, matching); privacy of the map (`geo.js`); hosting on Vercel + Turso; security headers |
| 2 | SEWAKAMBO ELVIS | S24B13/028 | Authentication, sessions and input validation | `src/lib/auth.js`, `src/lib/session.js`, `src/lib/secret.js`, `src/middleware.js`, `src/app/actions/auth.js`, `src/lib/validation.js`, `src/lib/errors.js`, `docs/SECURITY.md` | Security: authentication and sessions | bcrypt hashing; JWT in an httpOnly cookie; lockout after 5 failed logins; how every form is validated (zod schemas); safe error messages |
| 3 | AHEEBWA ABRAHAM | S24B13/042 | Database and data design | `database/schema.sql`, `data/.gitkeep`, `src/lib/db.js`, `src/lib/setup.js`, `scripts/db-setup.mjs`, `scripts/db-backup.mjs`, `scripts/db-restore.mjs`, `docs/DATA_DESIGN.md`, `docs/diagrams/erd.*` | Database design, ERD, backup and restore | Tables and relationships; CHECK constraints; transactions; seed data; backup/restore |
| 4 | KIKOMEKO IBRAHIM | S24B13/064 | Catalogue, cart, checkout and payment logic | `src/lib/catalog.js`, `src/lib/cart.js`, `src/lib/format.js`, `src/app/actions/cart.js`, `src/app/actions/orders.js` | Business model and value proposition, revenue / commission | How search and filtering work; how totals and commission are calculated; one service per cart; `orders.js` sections 1-2 (checkout, escrow, idempotent mock payment) |
| 5 | NASSIMBWA HUSSINAH | S24B13/079 | Fulfilment, notifications and admin logic | `src/app/actions/mechanic.js`, `src/lib/notifications.js`, `src/app/actions/notifications.js`, `src/lib/admin.js`, `src/lib/audit.js`, `src/app/actions/admin.js` | User journey map, functional requirements | The order state machine and `orders.js` section 3 (why two helpers can't take one job); notifications; admin approvals; the audit log |

## Front end

| # | Member | Reg. No. | Role | Owns these files | Report sections to write | Be ready to explain |
|---|---|---|---|---|---|---|
| 6 | NABIMANYA BLESSING GASHA | S24B13/017 | Home page, discovery and service pages | `src/app/page.js`, `src/app/services/`, `src/components/Header.js`, `src/components/HomeMap.js`, `src/components/StorySection.js`, `src/components/ScrollEffects.js`, `src/components/Illustrations.js`, `src/components/Cards.js`, `src/components/NeedIcon.js`, `src/lib/images.js`, `public/images/`, `docs/IMAGE_CREDITS.md` | Stakeholder analysis, personas, prototype overview | The home page sections and map; search/filter UI; scroll animations and reduced motion; image licensing |
| 7 | ARINEITWE SONIA | S24B13/029 | "Get help" request wizard and live map | `src/app/request/`, `src/components/VehicleForm.js`, `src/components/AreaPicker.js`, `src/components/LiveMap.js`, `src/components/useMyLocation.js` | Current and proposed process (BPMN), transaction integrity | The 4 wizard steps (need, car, area, services); Leaflet map; why GPS never leaves the browser |
| 8 | AYAA GLADYS | S25B13/106 | Cart, checkout, order tracking and notifications pages | `src/app/cart/`, `src/app/checkout/`, `src/app/orders/`, `src/app/notifications/`, `src/components/Timeline.js`, `src/components/AutoRefresh.js` | Problem statement and evidence (survey), SWOT | The checkout and mock-payment screens; live tracking timeline; reviews, warranty claims and disputes from the customer's side |
| 9 | KIRABO CHRISTINA | S24B13/007 | Accounts, helper dashboards and admin pages | `src/app/login/`, `src/app/register/`, `src/app/privacy/`, `src/app/mechanic/`, `src/app/driver/`, `src/components/ProviderDashboard.js`, `src/components/Avatar.js`, `src/lib/avatar.js`, `src/app/admin/`, `src/components/AdminNav.js` | Security, privacy, ethics, threat analysis, feasibility | Login/register forms (customer, mechanic, driver); mechanic and driver dashboards; illustrated avatars; admin screens and role-based access |
| 10 | BATWEGA YVONNE | M23B13/065 | Design system, testing, QA and accessibility | `src/app/globals.css`, `src/components/ActionForm.js`, `src/components/SubmitButton.js`, `src/components/StatusBadge.js`, `tests/`, `vitest.config.js`, `scripts/a11y-check.mjs`, `test-evidence/`, `docs/TESTING.md` | Testing chapter, usability, non-functional requirements | The navy theme and responsive layout; each test case; how to run them; accessibility results |

Everyone: present your own part in the 12-minute presentation and add your own contribution statement to the report appendix.

## Commit order

Each member gets a zip with only their files, already in the right folders. Unzip it into the root of your clone. The app runs fully once all steps are merged.

| Step | Who | What |
|---|---|---|
| 1 | Matthew | Creates the GitHub repo, pushes the base (config, README, app shell), invites everyone as collaborators |
| 2 | Abraham | Database |
| 3 | Elvis | Auth, sessions, validation |
| 4 | Matthew | Core order engine and request flow (`orders.js`, `constants.js`, `profile.js`, `geo.js`, request actions) |
| 5 | Ibrahim | Catalogue, cart, checkout and payment logic |
| 6 | Hussinah | Fulfilment, notifications and admin logic |
| 7 | Yvonne | Theme (`globals.css`) and shared form components |
| 8 | Blessing | Home page, services pages, images |
| 9 | Sonia | Request wizard and map |
| 10 | Gladys | Cart, checkout, orders, notifications pages |
| 11 | Christina | Login/register, dashboards, admin pages |
| 12 | Yvonne | Tests and evidence; runs `npm test` and fixes anything broken |
| 13 | Matthew | End-to-end walkthrough; final check that `npm run build` passes; deploys |

Then everyone makes **at least one real improvement** to their own part in their own commit (for example a new test, a better error message, an extra field, or docs). These small genuine changes are what you'll be most confident defending.

```bash
git clone https://github.com/<team>/roadrescue.git
cd roadrescue
git checkout -b <your-name>/<area>         # e.g. sonia/request-wizard
# unzip your files into this folder
git add .
git status                                  # check only YOUR files are listed
git commit -m "Add request wizard and live map"
git push -u origin <your-name>/<area>
# open a Pull Request on GitHub; another member reviews and merges
```

Using pull requests gives you a review history, which is good evidence for "peer verification".

## Task log

Keep a simple issue list on GitHub (*Issues* tab): one issue per task, assigned to its owner, closed by their pull request. The exam asks for an issue/task log as contribution evidence.
