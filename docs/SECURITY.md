# Security, privacy and continuity

## 1. Roles and least privilege

Every protected action calls `assertRole(user, [...])` on the server (`src/lib/auth.js`). The middleware is only a first gate. Pages also call `requirePageUser([...])`, and record-level checks make sure you can only touch your own data.

| Capability | Customer | Mechanic | Driver | Admin |
|---|:-:|:-:|:-:|:-:|
| Browse and search services, see helpers and garages on the map | ✅ | - | - | - |
| "Get help" steps, saved car and area | ✅ own | - | - | - |
| Cart, checkout, mock payment | ✅ own | - | - | - |
| View an order | ✅ own only | ✅ assigned, or open mechanic jobs | ✅ assigned, or open driver jobs | ✅ all |
| Accept / update a job | - | ✅ if APPROVED, mechanic jobs only | ✅ if APPROVED, driver jobs only | - |
| Confirm, review, claim, dispute | ✅ own only | - | - | - |
| Cancel an order | ✅ own, before work starts | - | - | ✅ |
| Approve / suspend mechanics and drivers | - | - | - | ✅ |
| Edit stock | - | - | - | ✅ |
| Resolve claims and disputes | - | - | - | ✅ |
| View audit log | - | - | - | ✅ |

Proven by tests **TC11, TC12, TC14, TC15, TC16, TC17, TC18, TC20** (see TESTING.md).

## 2. Authentication and sessions

- Passwords are hashed with **bcrypt** (cost 10) and never stored or logged in plain text.
- Login errors are generic ("Wrong email or password"), so attackers can't tell which emails exist.
- **Lockout:** 5 failed attempts in 15 minutes blocks that account's login (TC10).
- The session is a **signed JWT (HS256)** in an **httpOnly, SameSite=Lax** cookie that is **Secure** on HTTPS and expires after **8 hours**. JavaScript can't read it, which protects it from XSS theft.
- On every request the user is re-loaded from the database, so a deactivated account stops working immediately.
- `SESSION_SECRET` must be set in production, or the app refuses to start.
- Logout deletes the cookie and is audit-logged.

## 3. HTTPS and security headers

Vercel serves the site over HTTPS only. `next.config.mjs` adds:

| Header | Protects against |
|---|---|
| `Content-Security-Policy` (self-only scripts, `frame-ancestors 'none'`, `form-action 'self'`; images only from us, `data:` and the map tile server `tile.openstreetmap.org`) | XSS, clickjacking, form hijacking |
| `Strict-Transport-Security` | Downgrade to HTTP |
| `X-Frame-Options: DENY` | Clickjacking |
| `X-Content-Type-Options: nosniff` | MIME sniffing |
| `Referrer-Policy` | Leaking URLs |
| `Permissions-Policy` (no camera or microphone; geolocation only for our own pages, and the browser still asks the user) | Unneeded device access |
| `X-Powered-By` removed | Fingerprinting |

## 4. Input validation

- Every form is parsed with a **zod** schema on the server (`src/lib/validation.js`) before any database work. Browser-side `required`/`pattern` attributes are just for convenience.
- All SQL is **parameterised**, so user text is never joined into SQL.
- React escapes all output, and free text also rejects `<` and `>`.
- Redirect targets after login are checked so they can only point inside our site (no open redirects).
- Errors shown to users are friendly. Technical details are only logged on the server (`friendlyError`).

## 5. Threat analysis (STRIDE)

| # | Threat (STRIDE) | Example attack | Likelihood / impact | Controls | Evidence |
|---|---|---|---|---|---|
| T1 | **Spoofing**: password guessing | Bot tries many passwords on a customer account | High / High | bcrypt, 5-attempt lockout, generic errors, audit `LOGIN_FAILED` | TC10, audit log |
| T2 | **Spoofing**: session theft | Script steals the session cookie | Medium / High | httpOnly + Secure + SameSite cookie, CSP, 8 h expiry, signed token (tamper fails) | TC01 (tampered token rejected) |
| T3 | **Tampering**: SQL injection | Landmark set to `'; DROP TABLE orders;--` | Medium / Critical | Parameterised queries only; zod validation | Code review of `src/lib/*` |
| T4 | **Tampering**: double payment / replay | Customer double-clicks "Approve" or replays the request | Medium / High | Unique payment per order, idempotency key, conditional `UPDATE ... WHERE status IN ('PENDING','FAILED')` | TC04 |
| T5 | **Tampering**: race condition | Two mechanics accept the same job at once | Medium / Medium | Conditional update `WHERE status='SEARCHING' AND mechanic_id IS NULL`, transactions | TC13 |
| T6 | **Elevation of privilege** | Customer opens `/admin` or calls an admin action directly | Medium / Critical | Middleware + `requirePageUser` + `assertRole` in every service function | TC11, browser walkthrough |
| T7 | **Information disclosure**: IDOR | Customer changes `/orders/5` to `/orders/6` | High / High | Object-level checks in `getOrderDetail` and the `customer_id = ?` filters | TC12 |
| T8 | **Information disclosure**: data leak | Database copied or exposed | Low / High | Data minimisation (no PINs, IDs or full payment numbers), hashed passwords, DB token kept in environment variables | DATA_DESIGN.md |
| T9 | **Repudiation** | Mechanic claims they never marked a job done | Medium / Medium | `order_status_history` + `audit_log` with user and time | Admin → Audit log |
| T10 | **Denial of service** | Flooding the order form | Medium / Medium | Login lockout, input size limits, Vercel platform limits. Rate limiting per IP is future work | - |
| T11 | **Cross-site request forgery** | Another site submits a form as the user | Low / High | SameSite=Lax cookie; Next.js server actions only accept same-origin POSTs; CSP `form-action 'self'` | Headers |
| T12 | **Fraud**: fake mechanic or driver | Someone signs up as a mechanic or driver to steal cars | Medium / High | Helpers start as PENDING and can't accept jobs until admin approval; ratings; suspend; a mechanic can't take a driving job and a driver can't take a repair job | TC14, TC16, TC17 |
| T13 | **Information disclosure**: location | Someone learns where a customer or helper is | Medium / High | GPS never leaves the browser (only the area name is sent); helpers are shown near their area's centre, never at their real position; map tiles get no account data | TC18, TC20, privacy notice |

## 6. Audit logging

`audit_log` records: registration, login success, failure and lockout, logout, saved car, order created, payment held or failed, every job status change, completion, cancellation, review, claims, mechanic or driver approval or suspension, stock changes, and database seed or restore. Each row has the user, role, action, record and time. Admins can filter it at **Admin → Audit log**. Entries are kept for 12 months.

## 7. Backup and restore (continuity)

| What | How |
|---|---|
| Backup | `npm run db:backup` exports every table to `backups/roadrescue-<timestamp>.json`. Works for both the local file and Turso. |
| Restore | `npm run db:restore` (newest backup) or `npm run db:restore -- backups/<file>.json`. Rebuilds the schema, reloads all rows, writes a `DB_RESTORED` audit entry. |
| Schedule (production plan) | Daily backup, kept for 30 days, with one copy stored off-platform. Turso also offers point-in-time recovery. |
| Recovery targets | RPO 24 hours (at most a day of data lost); RTO 1 hour (back online within an hour). |
| Tested | Backup then restore was run during development, and all row counts matched. |
| If hosting is down | Run locally with `npm run dev` (offline mode) for the demo. |

## 8. Privacy and ethics controls

- **Only fictitious data and mock payments** are used. The site shows a banner saying so on every page, and the checkout says "never enter a real PIN".
- A plain-language **privacy notice** is at `/privacy`: what we collect, why, what we never collect, and retention.
- No tracking, analytics or third-party scripts. The map library (Leaflet) and the fonts are bundled with the site. The only outside requests are the map pictures from OpenStreetMap's tile servers, which see the viewer's internet address and the map area being viewed, but no account data. This is stated on `/privacy`. (OpenStreetMap's free tiles are meant for light use: a real product would switch to a paid tile provider.)
- Location is limited to area + landmark; there is no GPS tracking. "Use my location" only runs when pressed, and only the nearest area name is sent to the server.
- No photos of people: helpers have illustrated avatars.
- Any real interviews or surveys used for the report need informed consent (exam rule 9). The consent form goes in the report appendix.

## 9. Known limitations and future work

- Real payment provider integration with signed callbacks.
- Rate limiting per IP address, and two-factor login for admins.
- Automated retention clean-up job.
- Real mechanic verification (in a real product: checking documents with consent and a secure document store).
