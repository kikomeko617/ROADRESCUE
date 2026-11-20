// Creates the database tables and loads the fictitious demo data.
//   npm run db:setup      -> create tables and seed (only if the database is empty)
//   npm run db:reset      -> delete everything and start fresh
// `npm run dev` runs this automatically with --if-missing.
// If the database was made by an older version of ROADRESCUE (before drivers, garages and
// saved cars), a local file is copied to data/ as a backup and then rebuilt automatically.
// A hosted (Turso) database is never rebuilt automatically - you are told to run db:reset.
import "dotenv/config";
import fs from "node:fs";
import { createClient } from "@libsql/client";
import { applySchema, dropAll, seed, DEMO_ACCOUNTS } from "../src/lib/setup.js";

const url = process.env.DATABASE_URL || "file:./data/roadrescue.db";
const reset = process.argv.includes("--reset");
const ifMissing = process.argv.includes("--if-missing");
const isFile = url.startsWith("file:");

if (isFile) fs.mkdirSync("data", { recursive: true });

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });

async function hasData() {
  try {
    const r = await client.execute("SELECT COUNT(*) AS n FROM users");
    return Number(r.rows[0].n) > 0;
  } catch {
    return false;
  }
}

async function isOldVersion() {
  const r = await client.execute("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('provider_profiles', 'garages', 'customer_profiles')");
  return Number(r.rows[0].n) < 3;
}

try {
  if (reset) {
    await dropAll(client);
    console.log("Old tables removed.");
  } else if (await hasData()) {
    if (!(await isOldVersion())) {
      if (!ifMissing) console.log("Database already has data. Use `npm run db:reset` to start fresh.");
      process.exit(0);
    }
    if (!isFile) {
      console.error("This hosted database was made by an older version of ROADRESCUE. Run `npm run db:reset` to rebuild it.");
      process.exit(1);
    }
    const file = url.slice("file:".length);
    const copy = `data/roadrescue-before-1.1-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
    fs.copyFileSync(file, copy);
    console.log(`Older database found. A copy was saved to ${copy}. Rebuilding with the new demo data...`);
    await dropAll(client);
  }
  await applySchema(client);
  await seed(client);
  console.log(`\nROADRESCUE database ready (${url})\n`);
  console.log("Demo accounts (all fictitious):");
  for (const a of DEMO_ACCOUNTS) console.log(`  ${a.role.padEnd(9)} ${a.email.padEnd(26)} ${a.password}${a.status === "PENDING" ? "   (waiting for admin approval)" : ""}`);
  console.log("");
} catch (err) {
  console.error("Database setup failed:", err.message);
  process.exit(1);
} finally {
  client.close();
}
