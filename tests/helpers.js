// Gives every test file its own fresh, seeded database in a temp folder.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { applySchema, seed } from "../src/lib/setup.js";
import { resetDbConnection, one } from "../src/lib/db.js";

export async function freshDatabase() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "roadrescue-test-"));
  const url = "file:" + path.join(dir, "test.db");
  process.env.DATABASE_URL = url;
  resetDbConnection();
  const client = createClient({ url });
  await applySchema(client);
  const ids = await seed(client);
  client.close();
  return ids;
}

export async function userByEmail(email) {
  const u = await one("SELECT id, name, email, role FROM users WHERE email = ?", [email]);
  return { ...u, id: Number(u.id) };
}

export const CHECKOUT = {
  area: "Ntinda",
  landmark: "Opposite Shell Ntinda",
  vehicle: "Toyota Premio, silver",
  problemNote: "Car won't start",
  method: "MOCK_MOMO",
  payerPhone: "0772123456",
};
