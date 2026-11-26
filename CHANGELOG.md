# Changelog

## 1.1.1 - 25 November 2026
- Hosted on Vercel at https://roadrescue-lime.vercel.app with a Turso database (AWS us-east-1, next to Vercel's default region). Fixed the HTTP 500 after the first deployment (missing environment variables, defect D8).
- Repository tidied: files uploaded into numbered folders or the root were moved to their correct places; missing files added.
- New: BPMN-style current and proposed process models (`docs/PROCESS_MODELS.md`, `docs/diagrams/process-*.png/.svg`) with the measured bottleneck B1.
- Architecture, ERD and order-state images re-rendered from their 1.1 sources.
- `LINKS.txt` filled in; the actual commit history added to `docs/ROLE_MATRIX.md`.
- Tests re-run: 20 of 20 passed (`test-evidence/unit-test-output-2026-11-25.txt`).

## 1.1.0 - November 2026
- **New look:** navy blue theme with the same orange, yellow and teal accents; Apple-style motion (headline reveal, scroll-triggered fade-ins, words that light up as you scroll, a pinned "three ways we rescue you" story, page transitions). All motion stops when "reduce motion" is on.
- **Drivers** are a new, separate role with their own sign-up, approval, dashboard (`/driver`) and services (drive me home, move my car to a garage, airport run, driver for the day). Mechanics only see and accept mechanic jobs; drivers only driver jobs.
- **"Get help" steps** (`/request`), shown every time a customer logs in: 1) what do you need (mechanical problem, tow, driver, fuel, not sure), 2) what do you drive (make, type, model, colour - remembered for next time), 3) where are you (map, "use my location" or a list), 4) matching services with the nearest helpers and garages. Checkout is pre-filled.
- **Live map** (Leaflet + OpenStreetMap tiles, turned navy with a CSS filter) on the home page, in the request steps and on the tracking page. GPS stays in the browser; only the area name is saved.
- **People and garages near you:** illustrated avatars (no photos), ratings, availability, distance; 10 fictitious partner garages.
- Heavy vehicle towing service for trucks and minibuses.
- **Photos:** 43 photos (free stock photos plus two Kampala night shots by a friend of the team; cropped and compressed to WebP, about 1.4 MB in total): vehicle types and a badge photo for every make in "What do you drive?", photo cards in "What do you need?", service pictures, a pinned photo story and a "Real people" mosaic on the home page, a garages banner, and log in / sign up panels. Chevrolet and Porsche added to the make list. Credits in `docs/IMAGE_CREDITS.md`; named helpers still use illustrated avatars.
- Database: `mechanic_profiles` became `provider_profiles` (mechanics and drivers); new `customer_profiles` and `garages` tables; `services.provider_type`. An older local database is backed up and rebuilt automatically by `npm run dev`.
- Security headers: map tiles allowed from `tile.openstreetmap.org` only; geolocation allowed for our own pages only.
- 5 new test cases (TC16-TC20): 20 in total. Browser walkthrough now 27 steps; accessibility check covers 20 pages (0 violations). Test scripts accept `PW_CHANNEL=msedge` to use an installed browser.

## 1.0.0 - November 2026
- Full minimum e-commerce workflow: discover/search, select, cart/order, mock checkout/payment, fulfilment/status, after-sales.
- Customer, mechanic and admin roles with separate screens.
- Escrow-style mock payments, idempotent payment approval, stock control with rollback.
- Warranty claims, disputes, reviews, refunds.
- Audit log, in-app notifications, backup and restore scripts.
- 15 automated test cases, browser walkthrough, accessibility check.
