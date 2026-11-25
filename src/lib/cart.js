// The cart: one service + optional spare parts, saved in the database per customer.
import { all, one, run } from "./db.js";
import { assertRole } from "./auth.js";
import { AppError } from "./errors.js";
import { cartAddSchema } from "./validation.js";
import { COMMISSION } from "./constants.js";

export async function getCart(userId) {
  const rows = await all(
    `SELECT c.id, c.kind, c.ref_id, c.qty,
            COALESCE(s.name, p.name) AS name,
            COALESCE(s.price, p.price) AS unit_price,
            s.category AS category, p.stock AS stock,
            COALESCE(s.is_active, p.is_active) AS is_active
       FROM cart_items c
       LEFT JOIN services s ON c.kind = 'SERVICE' AND s.id = c.ref_id
       LEFT JOIN parts p    ON c.kind = 'PART'    AND p.id = c.ref_id
      WHERE c.user_id = ?
      ORDER BY c.kind DESC, c.id`,
    [userId]
  );
  const items = rows.map((r) => ({ ...r, unit_price: Number(r.unit_price), qty: Number(r.qty), line_total: Number(r.unit_price) * Number(r.qty) }));
  return { items, ...priceCart(items) };
}

// Pure function so it can be unit-tested: works out totals and our commission.
export function priceCart(items) {
  const service = items.filter((i) => i.kind === "SERVICE");
  const parts = items.filter((i) => i.kind === "PART");
  const serviceAmount = service.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const partsAmount = parts.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const commission = Math.round(serviceAmount * COMMISSION.SERVICE) + Math.round(partsAmount * COMMISSION.PART);
  return { serviceAmount, partsAmount, total: serviceAmount + partsAmount, commission, hasService: service.length === 1 };
}

export async function addToCart(user, input) {
  assertRole(user, ["customer"]);
  const { kind, refId, qty } = cartAddSchema.parse(input);
  if (kind === "SERVICE") {
    const s = await one("SELECT id FROM services WHERE id = ? AND is_active = 1", [refId]);
    if (!s) throw new AppError("That service is not available.");
    // Only one service per request: replace any service already in the cart.
    await run("DELETE FROM cart_items WHERE user_id = ? AND kind = 'SERVICE'", [user.id]);
    await run("INSERT INTO cart_items (user_id, kind, ref_id, qty) VALUES (?, 'SERVICE', ?, 1)", [user.id, refId]);
    return;
  }
  const p = await one("SELECT id, name, stock FROM parts WHERE id = ? AND is_active = 1", [refId]);
  if (!p) throw new AppError("That part is not available.");
  const existing = await one("SELECT qty FROM cart_items WHERE user_id = ? AND kind = 'PART' AND ref_id = ?", [user.id, refId]);
  const newQty = Math.min(10, (existing ? Number(existing.qty) : 0) + qty);
  if (newQty > Number(p.stock)) throw new AppError(`Sorry, only ${p.stock} left of ${p.name}.`);
  await run(
    `INSERT INTO cart_items (user_id, kind, ref_id, qty) VALUES (?, 'PART', ?, ?)
       ON CONFLICT(user_id, kind, ref_id) DO UPDATE SET qty = excluded.qty`,
    [user.id, refId, newQty]
  );
}

export async function updateCartQty(user, itemId, qty) {
  assertRole(user, ["customer"]);
  const q = Number(qty);
  if (!Number.isInteger(q) || q < 0 || q > 10) throw new AppError("Quantity must be between 0 and 10.");
  if (q === 0) return removeFromCart(user, itemId);
  const item = await one(
    "SELECT c.id, p.stock, p.name FROM cart_items c JOIN parts p ON p.id = c.ref_id WHERE c.id = ? AND c.user_id = ? AND c.kind = 'PART'",
    [itemId, user.id]
  );
  if (!item) throw new AppError("Item not found in your cart.");
  if (q > Number(item.stock)) throw new AppError(`Sorry, only ${item.stock} left of ${item.name}.`);
  await run("UPDATE cart_items SET qty = ? WHERE id = ? AND user_id = ?", [q, itemId, user.id]);
}

export async function removeFromCart(user, itemId) {
  assertRole(user, ["customer"]);
  // user_id in the WHERE clause stops anyone removing items from someone else's cart.
  await run("DELETE FROM cart_items WHERE id = ? AND user_id = ?", [itemId, user.id]);
}

export async function cartCount(userId) {
  const r = await one("SELECT COALESCE(SUM(qty), 0) AS n FROM cart_items WHERE user_id = ?", [userId]);
  return Number(r?.n || 0);
}
