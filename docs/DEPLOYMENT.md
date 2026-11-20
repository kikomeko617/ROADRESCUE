# Deployment approach and limitations

## Option 1: hosted (recommended for submission)

**Vercel** (free) runs the Next.js app over HTTPS. **Turso** (free) hosts the database.

1. **Turso:** sign up at https://turso.tech → *Create database* → copy the URL (`libsql://<name>-<org>.turso.io`) → *Create token*.
2. **Fill the database** from your computer. Put this in `.env`:
   ```
   DATABASE_URL=libsql://<name>-<org>.turso.io
   DATABASE_AUTH_TOKEN=<token>
   ```
   Run `npm run db:setup`. It prints the demo accounts when it's done.
3. **GitHub:** push the repository and give the examiner read access (repo → *Settings* → *Collaborators*), or make the repo public.
4. **Vercel:** https://vercel.com → *Add New → Project* → import the GitHub repo. The framework is detected as Next.js. Add these environment variables:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Turso URL |
   | `DATABASE_AUTH_TOKEN` | Turso token |
   | `SESSION_SECRET` | 64 random hex characters (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

5. Deploy. Open the `https://<project>.vercel.app` link and log in with a demo account.
6. Every `git push` to `main` redeploys automatically.

To reset the hosted demo data before presenting, run `npm run db:reset` with the Turso `.env` in place. Take a backup first with `npm run db:backup`.

## Option 2: local or offline (fallback)

```bash
npm install
npm run dev     # http://localhost:3000
```

This needs no internet after `npm install`. It's useful if the network fails during the demo; the exam allows an approved offline demonstration.

## Assumptions

- Node.js 20+ on the build machine; Vercel uses Node 20.
- Single region, low traffic (a pilot with tens of users).
- Emails and phone numbers are fictitious; no messages are actually sent.
- Payments are simulated inside the app, and no money moves.

## Limitations (be honest about these in the defense)

| Limitation | Why | What a real product would do |
|---|---|---|
| Payments are mock | Exam rule; no real credentials allowed | MTN MoMo / Airtel Money collections API with signed callbacks |
| Tracking is simulated (status, estimated minutes, and a map line from the helper's area to the customer's area) | Real GPS is sensitive and out of scope | Helper app shares location only during an active job |
| Map positions are approximate (area centres) | We don't store GPS | Live positions during a job only, deleted afterwards |
| Map tiles come from OpenStreetMap's free servers | Free, no account needed; fine for a low-traffic pilot | A paid tile provider (or self-hosted tiles) with an agreement for real traffic |
| Mechanic and driver verification is an admin approval click | No real ID data allowed | Document and driving-licence check with consent, background checks |
| Notifications are in-app only | No SMS gateway in scope | SMS via an SMS API for people with basic phones |
| No USSD / WhatsApp channel | Time-boxed MVP | USSD menu for requesting help without data |
| Driver services ("Drive me home", airport run...) use the same fixed-price flow as repairs | Time-boxed MVP | Pricing by distance and time; insurance cover for drivers |
| Local file database queues writes | SQLite allows one writer at a time | Turso / Postgres when hosted |
