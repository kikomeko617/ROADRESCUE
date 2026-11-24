// Backup: exports every table to a timestamped JSON file in ./backups
//   npm run db:backup
// Works for both the local SQLite file and a hosted Turso database.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const TABLES = [
  "users", "provider_profiles", "customer_profiles", "services", "garages", "parts", "cart_items", "orders", "order_items",
  "payments", "order_status_history", "reviews", "claims", "notifications", "audit_log",
];

const url = process.env.DATABASE_URL || "file:./data/roadrescue.db";
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });

try {
  const dump = { app: "roadrescue", created_at: new Date().toISOString(), tables: {} };
  for (const t of TABLES) {
    const r = await client.execute(`SELECT * FROM ${t}`);
    dump.tables[t] = r.rows.map((row) => ({ ...row }));
  }
  fs.mkdirSync("backups", { recursive: true });
  const file = path.join("backups", `roadrescue-${dump.created_at.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(dump, (k, v) => (typeof v === "bigint" ? Number(v) : v), 2));
  const counts = Object.entries(dump.tables).map(([t, rows]) => `${t}: ${rows.length}`).join(", ");
  console.log(`Backup saved to ${file}\n${counts}`);
} catch (err) {
  console.error("Backup failed:", err.message);
  process.exit(1);
} finally {
  client.close();
}
