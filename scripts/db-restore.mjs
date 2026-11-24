// Restore: rebuilds the database from a backup JSON file.
//   npm run db:restore                      -> uses the newest file in ./backups
//   npm run db:restore -- backups/file.json -> uses a specific file
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { applySchema, dropAll } from "../src/lib/setup.js";

const ORDER = [
  "users", "provider_profiles", "customer_profiles", "services", "garages", "parts", "cart_items", "orders", "order_items",
  "payments", "order_status_history", "reviews", "claims", "notifications", "audit_log",
];

let file = process.argv[2];
if (!file) {
  const files = fs.existsSync("backups") ? fs.readdirSync("backups").filter((f) => f.endsWith(".json")).sort() : [];
  if (!files.length) {
    console.error("No backups found. Run `npm run db:backup` first.");
    process.exit(1);
  }
  file = path.join("backups", files[files.length - 1]);
}

const dump = JSON.parse(fs.readFileSync(file, "utf8"));
if (dump.app !== "roadrescue") {
  console.error("That file is not a ROADRESCUE backup.");
  process.exit(1);
}

const url = process.env.DATABASE_URL || "file:./data/roadrescue.db";
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });

try {
  await dropAll(client);
  await applySchema(client);
  await client.execute("PRAGMA foreign_keys = OFF");
  for (const t of ORDER) {
    // Backups from version 1.0 called the helper table "mechanic_profiles".
    const rows = dump.tables[t] || (t === "provider_profiles" ? dump.tables.mechanic_profiles : null) || [];
    for (const row of rows) {
      const cols = Object.keys(row);
      await client.execute({
        sql: `INSERT INTO ${t} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
        args: cols.map((c) => row[c]),
      });
    }
  }
  await client.execute("PRAGMA foreign_keys = ON");
  await client.execute({ sql: "INSERT INTO audit_log (actor_role, action, details) VALUES ('system', 'DB_RESTORED', ?)", args: [`Restored from ${path.basename(file)}`] });
  console.log(`Database restored from ${file}`);
} catch (err) {
  console.error("Restore failed:", err.message);
  process.exit(1);
} finally {
  client.close();
}
