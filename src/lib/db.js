// Database connection (libSQL).
// Locally this is a SQLite file in ./data. When hosted, DATABASE_URL points to a
// free Turso database (libsql://...). The same SQL works in both places.
import { createClient } from "@libsql/client";

const DEFAULT_URL = "file:./data/roadrescue.db";

function makeClient() {
  const url = process.env.DATABASE_URL || DEFAULT_URL;
  return createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
}

// Re-use one connection (Next.js dev hot-reloads modules, so we keep it on globalThis).
const g = globalThis;

export async function db() {
  if (!g.__rrDb) {
    g.__rrDb = makeClient();
    g.__rrDbReady = g.__rrDb.execute("PRAGMA foreign_keys = ON").catch(() => {});
  }
  await g.__rrDbReady;
  return g.__rrDb;
}

// For tests: close and forget the current connection.
export function resetDbConnection() {
  if (g.__rrDb) g.__rrDb.close();
  g.__rrDb = undefined;
  g.__rrDbReady = undefined;
}

// A local SQLite file only allows one writer at a time, so inside one server process we
// queue database work one-after-another. (A hosted Turso database handles this itself.)
let queue = Promise.resolve();
function serial(fn) {
  const p = queue.then(fn, fn);
  queue = p.catch(() => {});
  return p;
}

// Small helpers so the rest of the code stays readable.
export async function all(sql, args = []) {
  const client = await db();
  const res = await serial(() => client.execute({ sql, args }));
  return res.rows.map((r) => ({ ...r }));
}

export async function one(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0] || null;
}

export async function run(sql, args = []) {
  const client = await db();
  const res = await serial(() => client.execute({ sql, args }));
  return { rowsAffected: res.rowsAffected, lastId: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : null };
}

// Run several statements as ONE all-or-nothing transaction.
// If anything throws, everything is rolled back (e.g. stock is not taken).
export async function withTransaction(fn) {
  const client = await db();
  return serial(() => runTransaction(client, fn));
}

async function runTransaction(client, fn) {
  const tx = await client.transaction("write");
  const t = {
    async all(sql, args = []) {
      const res = await tx.execute({ sql, args });
      return res.rows.map((r) => ({ ...r }));
    },
    async one(sql, args = []) {
      return (await t.all(sql, args))[0] || null;
    },
    async run(sql, args = []) {
      const res = await tx.execute({ sql, args });
      return { rowsAffected: res.rowsAffected, lastId: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : null };
    },
  };
  try {
    const result = await fn(t);
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  } finally {
    tx.close();
  }
}
