// Orders, mock payments, fulfilment and after-sales.
// Every change that touches more than one table runs inside a transaction, and every
// status change is checked against the state machine in constants.js.
import crypto from "node:crypto";
import { all, one, withTransaction } from "./db.js";
import { assertRole } from "./auth.js";
import { logAudit } from "./audit.js";
import { notify } from "./notifications.js";
import { AppError, AccessDeniedError } from "./errors.js";
import { checkoutSchema, reviewSchema, claimSchema, cancelSchema, maskPhone } from "./validation.js";
import { canTransition, COMMISSION, STATUS, STATUS_LABEL, WARRANTY_DAYS, PROVIDER_ROLES } from "./constants.js";
import { approxPosition, areaCoords, distanceKm, etaMinutes } from "./geo.js";

// The dashboard link for a helper's notifications: /mechanic or /driver.
async function helperHome(t, userId) {
  const u = await t.one("SELECT role FROM users WHERE id = ?", [userId]);
  return u?.role === "driver" ? "/driver" : "/mechanic";
}

function newOrderNo() {
  return "RR-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

async function addHistory(t, orderId, from, to, user, note = null) {
  await t.run("INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?)", [
    orderId, from, to, user?.id ?? null, note,
  ]);
}

// Move an order from one status to another. The WHERE status = ? part means two people
// can never both make the same change (e.g. two mechanics accepting one job).
async function transition(t, order, to, user, role, extraSet = "", extraArgs = [], note = null) {
  if (!canTransition(order.status, to, role)) {
    throw new AppError(`This order can't go from "${STATUS_LABEL[order.status]}" to "${STATUS_LABEL[to]}".`, "CONFLICT");
  }
  const res = await t.run(`UPDATE orders SET status = ?${extraSet} WHERE id = ? AND status = ?`, [to, ...extraArgs, order.id, order.status]);
  if (res.rowsAffected !== 1) throw new AppError("Someone else just updated this order. Please refresh.", "CONFLICT");
  await addHistory(t, order.id, order.status, to, user, note);
}

// ---------- 1. Cart -> order (checkout) ----------
export async function createOrderFromCart(user, input) {
  assertRole(user, ["customer"]);
  const data = checkoutSchema.parse(input);

  const order = await withTransaction(async (t) => {
    const cart = await t.all(
      `SELECT c.kind, c.ref_id, c.qty, COALESCE(s.name, p.name) AS name, COALESCE(s.price, p.price) AS price,
              COALESCE(s.is_active, p.is_active) AS active
         FROM cart_items c
         LEFT JOIN services s ON c.kind = 'SERVICE' AND s.id = c.ref_id
         LEFT JOIN parts p ON c.kind = 'PART' AND p.id = c.ref_id
        WHERE c.user_id = ?`,
      [user.id]
    );
    const services = cart.filter((c) => c.kind === "SERVICE");
    if (services.length !== 1) throw new AppError("Add one service to your cart before checking out.");
    if (cart.some((c) => !c.active)) throw new AppError("Something in your cart is no longer available. Please remove it.");

    // Inventory: take the stock now. If there isn't enough, the whole order is rolled back.
    for (const p of cart.filter((c) => c.kind === "PART")) {
      const res = await t.run("UPDATE parts SET stock = stock - ? WHERE id = ? AND stock >= ?", [p.qty, p.ref_id, p.qty]);
      if (res.rowsAffected !== 1) {
        const left = await t.one("SELECT stock FROM parts WHERE id = ?", [p.ref_id]);
        throw new AppError(`Sorry, only ${left?.stock ?? 0} left of ${p.name}. Please change the quantity.`, "OUT_OF_STOCK");
      }
    }

    const serviceAmount = Number(services[0].price);
    const partsAmount = cart.filter((c) => c.kind === "PART").reduce((s, p) => s + Number(p.price) * Number(p.qty), 0);
    const total = serviceAmount + partsAmount;
    const commission = Math.round(serviceAmount * COMMISSION.SERVICE) + Math.round(partsAmount * COMMISSION.PART);
    const orderNo = newOrderNo();

    const ins = await t.run(
      `INSERT INTO orders (order_no, customer_id, service_id, area, landmark, vehicle, problem_note, status,
                           service_amount, parts_amount, total_amount, commission_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_PAYMENT', ?, ?, ?, ?)`,
      [orderNo, user.id, services[0].ref_id, data.area, data.landmark, data.vehicle, data.problemNote, serviceAmount, partsAmount, total, commission]
    );
    const orderId = ins.lastId;
    for (const c of cart) {
      await t.run("INSERT INTO order_items (order_id, kind, ref_id, name, unit_price, qty, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)", [
        orderId, c.kind, c.ref_id, c.name, Number(c.price), Number(c.qty), Number(c.price) * Number(c.qty),
      ]);
    }
    // Mock payment record. Only a masked phone number is stored - never a PIN.
    await t.run("INSERT INTO payments (order_id, idempotency_key, method, payer_phone_masked, amount, status) VALUES (?, ?, ?, ?, ?, 'PENDING')", [
      orderId, `order-${orderId}`, data.method, maskPhone(data.payerPhone), total,
    ]);
    await addHistory(t, orderId, null, STATUS.PENDING_PAYMENT, user, "Order placed");
    await t.run("DELETE FROM cart_items WHERE user_id = ?", [user.id]);
    await logAudit({ actor: user, action: "ORDER_CREATED", entity: "order", entityId: orderNo, details: `total=${total}` }, t);
    return { id: orderId, order_no: orderNo, total };
  });
  return order;
}

// ---------- 2. Mock mobile-money payment ----------
// Simulates the customer approving the prompt on their phone. Calling it twice never
// charges twice: the payment only moves from PENDING/FAILED to HELD once.
export async function approveMockPayment(user, orderId) {
  assertRole(user, ["customer"]);
  return withTransaction(async (t) => {
    const order = await t.one("SELECT * FROM orders WHERE id = ? AND customer_id = ?", [orderId, user.id]);
    if (!order) throw new AccessDeniedError("Order not found.");
    const pay = await t.one("SELECT * FROM payments WHERE order_id = ?", [orderId]);
    if (pay.status === "HELD" || pay.status === "RELEASED") return { alreadyPaid: true };
    if (order.status !== STATUS.PENDING_PAYMENT) throw new AppError("This order can no longer be paid.", "CONFLICT");

    const ref = "SANDBOX-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const res = await t.run(
      "UPDATE payments SET status = 'HELD', provider_ref = ?, updated_at = datetime('now') WHERE order_id = ? AND status IN ('PENDING', 'FAILED')",
      [ref, orderId]
    );
    if (res.rowsAffected !== 1) return { alreadyPaid: true };
    await transition(t, order, STATUS.SEARCHING, user, "system", ", paid_at = datetime('now')", [], "Mock payment approved - money held until job is confirmed");

    // Tell approved helpers of the right kind (mechanic or driver) in that area there's a new job.
    const { provider_type: kind } = await t.one("SELECT provider_type FROM services WHERE id = ?", [order.service_id]);
    const helpers = await t.all(
      "SELECT pp.user_id FROM provider_profiles pp JOIN users u ON u.id = pp.user_id WHERE pp.status = 'APPROVED' AND pp.area = ? AND u.role = ?",
      [order.area, kind]
    );
    for (const h of helpers) await notify(h.user_id, `New job in ${order.area}: ${order.order_no}`, `/${kind}`, t);
    await notify(user.id, `Payment received for ${order.order_no}. We're finding you a ${kind}.`, `/orders/${orderId}`, t);
    await logAudit({ actor: user, action: "PAYMENT_HELD", entity: "order", entityId: order.order_no, details: `ref=${ref} amount=${pay.amount}` }, t);
    return { alreadyPaid: false, ref };
  });
}

export async function declineMockPayment(user, orderId) {
  assertRole(user, ["customer"]);
  return withTransaction(async (t) => {
    const order = await t.one("SELECT * FROM orders WHERE id = ? AND customer_id = ?", [orderId, user.id]);
    if (!order) throw new AccessDeniedError("Order not found.");
    if (order.status !== STATUS.PENDING_PAYMENT) throw new AppError("This order can no longer be paid.", "CONFLICT");
    await t.run("UPDATE payments SET status = 'FAILED', updated_at = datetime('now') WHERE order_id = ? AND status = 'PENDING'", [orderId]);
    await logAudit({ actor: user, action: "PAYMENT_FAILED", entity: "order", entityId: order.order_no, details: "Customer declined mock prompt" }, t);
  });
}

// ---------- 3. Fulfilment (helper side: mechanics and drivers) ----------
// A helper can only take jobs of their own kind: mechanics take mechanic jobs, drivers take driver jobs.
export async function acceptJob(user, orderId) {
  assertRole(user, PROVIDER_ROLES);
  const profile = await one("SELECT status FROM provider_profiles WHERE user_id = ?", [user.id]);
  if (profile?.status !== "APPROVED") throw new AccessDeniedError("Your account must be approved by an admin before you can take jobs.");
  return withTransaction(async (t) => {
    const order = await t.one("SELECT o.*, s.provider_type FROM orders o JOIN services s ON s.id = o.service_id WHERE o.id = ?", [orderId]);
    if (!order) throw new AppError("Job not found.", "NOT_FOUND");
    if (order.provider_type !== user.role) throw new AccessDeniedError(`This job needs a ${order.provider_type}, not a ${user.role}.`);
    if (order.status !== STATUS.SEARCHING || order.mechanic_id) throw new AppError(`Sorry, another ${user.role} already took this job.`, "CONFLICT");
    await transition(t, order, STATUS.ACCEPTED, user, user.role, ", mechanic_id = ?, accepted_at = datetime('now')", [user.id], `Accepted by ${user.name}`);
    await notify(order.customer_id, `${user.name} accepted your job ${order.order_no}.`, `/orders/${orderId}`, t);
    await logAudit({ actor: user, action: "JOB_ACCEPTED", entity: "order", entityId: order.order_no }, t);
  });
}

const HELPER_STEPS = {
  mechanic: {
    EN_ROUTE: "is on the way",
    IN_PROGRESS: "has arrived and started work",
    AWAITING_CONFIRMATION: "has finished. Please confirm the job is done",
  },
  driver: {
    EN_ROUTE: "is on the way",
    IN_PROGRESS: "has picked you up and is driving",
    AWAITING_CONFIRMATION: "has arrived. Please confirm the trip is done",
  },
};

export async function advanceJob(user, orderId, to) {
  assertRole(user, PROVIDER_ROLES);
  const steps = HELPER_STEPS[user.role];
  if (!steps[to]) throw new AppError("Unknown step.");
  return withTransaction(async (t) => {
    const order = await t.one("SELECT * FROM orders WHERE id = ?", [orderId]);
    if (!order || Number(order.mechanic_id) !== user.id) throw new AccessDeniedError("This is not your job.");
    await transition(t, order, to, user, user.role);
    await notify(order.customer_id, `Your ${user.role} ${steps[to]} (${order.order_no}).`, `/orders/${orderId}`, t);
    await logAudit({ actor: user, action: `JOB_${to}`, entity: "order", entityId: order.order_no }, t);
  });
}

// ---------- 4. Completion, cancellation and after-sales (customer side) ----------
export async function confirmCompletion(user, orderId) {
  assertRole(user, ["customer"]);
  return withTransaction(async (t) => {
    const order = await t.one("SELECT * FROM orders WHERE id = ? AND customer_id = ?", [orderId, user.id]);
    if (!order) throw new AccessDeniedError("Order not found.");
    await transition(t, order, STATUS.COMPLETED, user, "customer", ", completed_at = datetime('now')", [], "Customer confirmed the job is done");
    // Escrow: only now is the money released to the mechanic.
    await t.run("UPDATE payments SET status = 'RELEASED', updated_at = datetime('now') WHERE order_id = ? AND status = 'HELD'", [orderId]);
    if (order.mechanic_id) await notify(order.mechanic_id, `${order.order_no} confirmed. Payment released.`, await helperHome(t, order.mechanic_id), t);
    await logAudit({ actor: user, action: "ORDER_COMPLETED", entity: "order", entityId: order.order_no }, t);
  });
}

export async function reportProblem(user, orderId, input) {
  assertRole(user, ["customer"]);
  const { description } = claimSchema.parse(input);
  return withTransaction(async (t) => {
    const order = await t.one("SELECT * FROM orders WHERE id = ? AND customer_id = ?", [orderId, user.id]);
    if (!order) throw new AccessDeniedError("Order not found.");
    await transition(t, order, STATUS.DISPUTED, user, "customer", "", [], "Customer reported a problem");
    await t.run("INSERT INTO claims (order_id, customer_id, type, description) VALUES (?, ?, 'DISPUTE', ?)", [orderId, user.id, description]);
    const admins = await t.all("SELECT id FROM users WHERE role = 'admin' AND is_active = 1");
    for (const a of admins) await notify(a.id, `Dispute opened on ${order.order_no}`, "/admin/claims", t);
    await logAudit({ actor: user, action: "DISPUTE_OPENED", entity: "order", entityId: order.order_no }, t);
  });
}

export async function cancelOrder(user, orderId, input = {}) {
  assertRole(user, ["customer", "admin"]);
  const { reason } = cancelSchema.parse(input);
  return withTransaction(async (t) => {
    const order = await t.one("SELECT * FROM orders WHERE id = ?", [orderId]);
    if (!order || (user.role === "customer" && Number(order.customer_id) !== user.id)) throw new AccessDeniedError("Order not found.");
    await transition(t, order, STATUS.CANCELLED, user, user.role, ", cancelled_at = datetime('now'), cancel_reason = ?", [reason || "Cancelled by " + user.role], reason || null);
    // Put reserved parts back into stock.
    const parts = await t.all("SELECT ref_id, qty FROM order_items WHERE order_id = ? AND kind = 'PART'", [orderId]);
    for (const p of parts) await t.run("UPDATE parts SET stock = stock + ? WHERE id = ?", [p.qty, p.ref_id]);
    // Refund if money was held; otherwise just close the payment.
    await t.run(
      "UPDATE payments SET status = CASE status WHEN 'HELD' THEN 'REFUNDED' ELSE 'FAILED' END, updated_at = datetime('now') WHERE order_id = ? AND status IN ('HELD', 'PENDING', 'FAILED')",
      [orderId]
    );
    if (order.mechanic_id) await notify(order.mechanic_id, `${order.order_no} was cancelled by the customer.`, await helperHome(t, order.mechanic_id), t);
    await logAudit({ actor: user, action: "ORDER_CANCELLED", entity: "order", entityId: order.order_no, details: reason || null }, t);
  });
}

export async function submitReview(user, orderId, input) {
  assertRole(user, ["customer"]);
  const { rating, comment } = reviewSchema.parse(input);
  const order = await one("SELECT * FROM orders WHERE id = ? AND customer_id = ?", [orderId, user.id]);
  if (!order) throw new AccessDeniedError("Order not found.");
  if (order.status !== STATUS.COMPLETED || !order.mechanic_id) throw new AppError("You can only review a completed job.");
  const existing = await one("SELECT id FROM reviews WHERE order_id = ?", [orderId]);
  if (existing) throw new AppError("You already reviewed this job.");
  await withTransaction(async (t) => {
    await t.run("INSERT INTO reviews (order_id, customer_id, mechanic_id, rating, comment) VALUES (?, ?, ?, ?, ?)", [orderId, user.id, order.mechanic_id, rating, comment]);
    await notify(order.mechanic_id, `You got a ${rating}-star review on ${order.order_no}.`, await helperHome(t, order.mechanic_id), t);
    await logAudit({ actor: user, action: "REVIEW_SUBMITTED", entity: "order", entityId: order.order_no, details: `rating=${rating}` }, t);
  });
}

// Pure helper: is this completed order still inside the warranty window?
export function withinWarranty(completedAt, now = new Date()) {
  if (!completedAt) return false;
  const done = new Date(String(completedAt).replace(" ", "T") + "Z");
  return now.getTime() - done.getTime() <= WARRANTY_DAYS * 24 * 60 * 60 * 1000;
}

export async function openWarrantyClaim(user, orderId, input) {
  assertRole(user, ["customer"]);
  const { description } = claimSchema.parse(input);
  const order = await one("SELECT * FROM orders WHERE id = ? AND customer_id = ?", [orderId, user.id]);
  if (!order) throw new AccessDeniedError("Order not found.");
  if (order.status !== STATUS.COMPLETED) throw new AppError("Warranty claims are only for completed jobs.");
  if (!withinWarranty(order.completed_at)) throw new AppError(`The ${WARRANTY_DAYS}-day warranty for this job has ended.`);
  const open = await one("SELECT id FROM claims WHERE order_id = ? AND status = 'OPEN'", [orderId]);
  if (open) throw new AppError("You already have an open claim for this job.");
  await withTransaction(async (t) => {
    await t.run("INSERT INTO claims (order_id, customer_id, type, description) VALUES (?, ?, 'WARRANTY', ?)", [orderId, user.id, description]);
    const admins = await t.all("SELECT id FROM users WHERE role = 'admin' AND is_active = 1");
    for (const a of admins) await notify(a.id, `Warranty claim on ${order.order_no}`, "/admin/claims", t);
    await logAudit({ actor: user, action: "WARRANTY_CLAIM_OPENED", entity: "order", entityId: order.order_no }, t);
  });
}

// ---------- 5. Reading orders (with access control) ----------
export async function listCustomerOrders(user) {
  assertRole(user, ["customer"]);
  return all(
    `SELECT o.*, s.name AS service_name, s.provider_type, u.name AS mechanic_name
       FROM orders o JOIN services s ON s.id = o.service_id
       LEFT JOIN users u ON u.id = o.mechanic_id
      WHERE o.customer_id = ? ORDER BY o.id DESC`,
    [user.id]
  );
}

export async function getOrderDetail(user, orderId) {
  const order = await one(
    `SELECT o.*, s.name AS service_name, s.est_minutes, s.provider_type, c.name AS customer_name, c.phone AS customer_phone,
            m.name AS mechanic_name, m.phone AS mechanic_phone, mp.area AS mechanic_area, mp.avatar_style AS mechanic_avatar
       FROM orders o
       JOIN services s ON s.id = o.service_id
       JOIN users c ON c.id = o.customer_id
       LEFT JOIN users m ON m.id = o.mechanic_id
       LEFT JOIN provider_profiles mp ON mp.user_id = o.mechanic_id
      WHERE o.id = ?`,
    [orderId]
  );
  if (!order) return null;
  // Object-level access control: you only see orders that are yours.
  // Helpers see jobs assigned to them, or open jobs of their own kind.
  const allowed =
    user.role === "admin" ||
    (user.role === "customer" && Number(order.customer_id) === user.id) ||
    (PROVIDER_ROLES.includes(user.role) &&
      (Number(order.mechanic_id) === user.id || (order.status === STATUS.SEARCHING && !order.mechanic_id && order.provider_type === user.role)));
  if (!allowed) throw new AccessDeniedError("You can't view this order.");

  const [items, payment, history, review, claims] = await Promise.all([
    all("SELECT * FROM order_items WHERE order_id = ? ORDER BY kind DESC, id", [orderId]),
    one("SELECT method, payer_phone_masked, amount, status, provider_ref, updated_at FROM payments WHERE order_id = ?", [orderId]),
    all(
      `SELECT h.*, u.name AS changed_by_name FROM order_status_history h LEFT JOIN users u ON u.id = h.changed_by
        WHERE h.order_id = ? ORDER BY h.id`,
      [orderId]
    ),
    one("SELECT rating, comment, created_at FROM reviews WHERE order_id = ?", [orderId]),
    all("SELECT id, type, description, status, resolution_note, created_at FROM claims WHERE order_id = ? ORDER BY id DESC", [orderId]),
  ]);
  // Simulated arrival time from the helper's work area (real GPS tracking is out of scope).
  // The map shows approximate area positions only.
  let eta = null;
  let helperPos = null;
  if (order.mechanic_area) {
    helperPos = approxPosition(order.mechanic_area, order.mechanic_id);
    eta = etaMinutes(distanceKm(helperPos, areaCoords(order.area)));
  }
  return {
    ...order, items, payment, history, review, claims, etaMinutes: eta, helperPos, customerPos: areaCoords(order.area),
    canClaimWarranty: order.status === STATUS.COMPLETED && withinWarranty(order.completed_at),
  };
}

// Open jobs of the helper's own kind, jobs in their own area first.
export async function listOpenJobs(user) {
  assertRole(user, PROVIDER_ROLES);
  const me = await one("SELECT area, status FROM provider_profiles WHERE user_id = ?", [user.id]);
  const jobs = await all(
    `SELECT o.id, o.order_no, o.area, o.landmark, o.vehicle, o.problem_note, o.total_amount, o.commission_amount,
            o.paid_at, s.name AS service_name, s.est_minutes,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id AND oi.kind = 'PART') AS part_lines
       FROM orders o JOIN services s ON s.id = o.service_id
      WHERE o.status = 'SEARCHING' AND o.mechanic_id IS NULL AND s.provider_type = ?
      ORDER BY (o.area = ?) DESC, o.paid_at ASC`,
    [user.role, me?.area || ""]
  );
  return { profile: me, jobs };
}

export async function listMechanicJobs(user) {
  assertRole(user, PROVIDER_ROLES);
  const jobs = await all(
    `SELECT o.*, s.name AS service_name, c.name AS customer_name
       FROM orders o JOIN services s ON s.id = o.service_id JOIN users c ON c.id = o.customer_id
      WHERE o.mechanic_id = ? ORDER BY o.id DESC LIMIT 30`,
    [user.id]
  );
  const stats = await one(
    `SELECT COUNT(*) AS done, COALESCE(SUM(total_amount - commission_amount), 0) AS earned
       FROM orders WHERE mechanic_id = ? AND status = 'COMPLETED'`,
    [user.id]
  );
  const rating = await one("SELECT ROUND(AVG(rating), 1) AS avg, COUNT(*) AS n FROM reviews WHERE mechanic_id = ?", [user.id]);
  return { jobs, stats: { done: Number(stats.done), earned: Number(stats.earned), rating: rating.avg, reviews: Number(rating.n) } };
}
