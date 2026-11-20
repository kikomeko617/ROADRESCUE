// Admin: dashboard numbers, mechanic approval (mock verification), stock and claims.
import { all, one, withTransaction } from "./db.js";
import { assertRole } from "./auth.js";
import { logAudit } from "./audit.js";
import { notify } from "./notifications.js";
import { AppError } from "./errors.js";
import { resolveClaimSchema, stockSchema } from "./validation.js";

export async function dashboardStats(user) {
  assertRole(user, ["admin"]);
  const [orders, money, speed, rating, claims, pending, lowStock, byStatus] = await Promise.all([
    one("SELECT COUNT(*) AS total, SUM(status = 'COMPLETED') AS completed, SUM(status IN ('SEARCHING','ACCEPTED','EN_ROUTE','IN_PROGRESS','AWAITING_CONFIRMATION')) AS active FROM orders"),
    one("SELECT COALESCE(SUM(total_amount), 0) AS gmv, COALESCE(SUM(commission_amount), 0) AS commission FROM orders WHERE status = 'COMPLETED'"),
    // Our key success measure: minutes from payment to a mechanic accepting.
    one("SELECT ROUND(AVG((julianday(accepted_at) - julianday(paid_at)) * 24 * 60), 1) AS avg_accept_min FROM orders WHERE accepted_at IS NOT NULL AND paid_at IS NOT NULL"),
    one("SELECT ROUND(AVG(rating), 2) AS avg, COUNT(*) AS n FROM reviews"),
    one("SELECT COUNT(*) AS open FROM claims WHERE status = 'OPEN'"),
    one("SELECT COUNT(*) AS n FROM provider_profiles WHERE status = 'PENDING'"),
    all("SELECT id, name, stock FROM parts WHERE is_active = 1 AND stock < 5 ORDER BY stock"),
    all("SELECT status, COUNT(*) AS n FROM orders GROUP BY status ORDER BY n DESC"),
  ]);
  return {
    totalOrders: Number(orders.total || 0),
    completed: Number(orders.completed || 0),
    active: Number(orders.active || 0),
    gmv: Number(money.gmv),
    commission: Number(money.commission),
    avgAcceptMin: speed.avg_accept_min,
    avgRating: rating.avg,
    reviews: Number(rating.n),
    openClaims: Number(claims.open),
    pendingMechanics: Number(pending.n),
    lowStock,
    byStatus,
  };
}

export async function listRecentOrders(user, limit = 15) {
  assertRole(user, ["admin"]);
  return all(
    `SELECT o.id, o.order_no, o.status, o.area, o.total_amount, o.created_at, s.name AS service_name,
            c.name AS customer_name, m.name AS mechanic_name
       FROM orders o JOIN services s ON s.id = o.service_id JOIN users c ON c.id = o.customer_id
       LEFT JOIN users m ON m.id = o.mechanic_id
      ORDER BY o.id DESC LIMIT ?`,
    [limit]
  );
}

// Every helper (mechanics and drivers), pending approvals first.
export async function listMechanics(user) {
  assertRole(user, ["admin"]);
  return all(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at, mp.area, mp.skills, mp.status, mp.approved_at, mp.avatar_style,
            (SELECT COUNT(*) FROM orders o WHERE o.mechanic_id = u.id AND o.status = 'COMPLETED') AS jobs_done,
            (SELECT ROUND(AVG(rating), 1) FROM reviews r WHERE r.mechanic_id = u.id) AS rating
       FROM users u JOIN provider_profiles mp ON mp.user_id = u.id
      ORDER BY (mp.status = 'PENDING') DESC, u.role, u.name`
  );
}

// Approve or suspend a mechanic or a driver (mock verification).
export async function setMechanicStatus(user, helperId, status) {
  assertRole(user, ["admin"]);
  if (!["APPROVED", "SUSPENDED"].includes(status)) throw new AppError("Invalid status.");
  await withTransaction(async (t) => {
    const helper = await t.one("SELECT role FROM users WHERE id = ?", [helperId]);
    const res = await t.run(
      "UPDATE provider_profiles SET status = ?, approved_by = ?, approved_at = CASE WHEN ? = 'APPROVED' THEN datetime('now') ELSE approved_at END WHERE user_id = ?",
      [status, user.id, status, helperId]
    );
    if (!helper || res.rowsAffected !== 1) throw new AppError("Mechanic or driver not found.");
    const home = helper.role === "driver" ? "/driver" : "/mechanic";
    await notify(helperId, status === "APPROVED" ? "Your account is approved. You can now accept jobs." : "Your account has been suspended. Contact support.", home, t);
    await logAudit({ actor: user, action: `${helper.role.toUpperCase()}_${status}`, entity: "user", entityId: helperId }, t);
  });
}
export const setProviderStatus = setMechanicStatus;

export async function setPartStock(user, partId, input) {
  assertRole(user, ["admin"]);
  const { stock } = stockSchema.parse(input);
  await withTransaction(async (t) => {
    const before = await t.one("SELECT name, stock FROM parts WHERE id = ?", [partId]);
    if (!before) throw new AppError("Part not found.");
    await t.run("UPDATE parts SET stock = ? WHERE id = ?", [stock, partId]);
    await logAudit({ actor: user, action: "STOCK_UPDATED", entity: "part", entityId: partId, details: `${before.name}: ${before.stock} -> ${stock}` }, t);
  });
}

export async function listClaims(user) {
  assertRole(user, ["admin"]);
  return all(
    `SELECT cl.*, o.order_no, o.status AS order_status, o.total_amount, c.name AS customer_name, m.name AS mechanic_name
       FROM claims cl JOIN orders o ON o.id = cl.order_id JOIN users c ON c.id = cl.customer_id
       LEFT JOIN users m ON m.id = o.mechanic_id
      ORDER BY (cl.status = 'OPEN') DESC, cl.id DESC`
  );
}

// Resolve a warranty claim or dispute.
//  DISPUTE:  REFUNDED -> customer gets money back;  REJECTED -> job counted as done, mechanic paid.
//  WARRANTY: REVISIT  -> mechanic sent back for free; REFUNDED -> customer refunded; REJECTED -> closed.
export async function resolveClaim(user, claimId, input) {
  assertRole(user, ["admin"]);
  const { decision, note } = resolveClaimSchema.parse(input);
  await withTransaction(async (t) => {
    const claim = await t.one("SELECT cl.*, o.status AS order_status, o.order_no, o.mechanic_id FROM claims cl JOIN orders o ON o.id = cl.order_id WHERE cl.id = ?", [claimId]);
    if (!claim) throw new AppError("Claim not found.");
    if (claim.status !== "OPEN") throw new AppError("This claim is already resolved.");
    if (claim.type === "DISPUTE" && decision === "REVISIT") throw new AppError("For a dispute choose Refund or Reject.");

    const res = await t.run("UPDATE claims SET status = ?, resolution_note = ?, resolved_by = ?, resolved_at = datetime('now') WHERE id = ? AND status = 'OPEN'", [decision, note, user.id, claimId]);
    if (res.rowsAffected !== 1) throw new AppError("This claim was just resolved by someone else.");

    const from = claim.order_status;
    let to = null;
    if (claim.type === "DISPUTE") to = decision === "REFUNDED" ? "REFUNDED" : "COMPLETED";
    if (claim.type === "WARRANTY" && decision === "REFUNDED") to = "REFUNDED";
    if (to && to !== from) {
      const upd = await t.run(`UPDATE orders SET status = ?${to === "COMPLETED" ? ", completed_at = datetime('now')" : ""} WHERE id = ? AND status = ?`, [to, claim.order_id, from]);
      if (upd.rowsAffected !== 1) throw new AppError("Order changed while resolving. Please refresh.");
      await t.run("INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?)", [claim.order_id, from, to, user.id, `Claim #${claimId}: ${note}`]);
      await t.run(`UPDATE payments SET status = ?, updated_at = datetime('now') WHERE order_id = ?`, [to === "REFUNDED" ? "REFUNDED" : "RELEASED", claim.order_id]);
    }
    const msg = { REVISIT: "A mechanic will come back to fix it at no labour cost.", REFUNDED: "You have been refunded.", REJECTED: "Your claim was reviewed and closed." }[decision];
    await notify(claim.customer_id, `Claim on ${claim.order_no}: ${msg}`, `/orders/${claim.order_id}`, t);
    if (decision === "REVISIT" && claim.mechanic_id) {
      const helper = await t.one("SELECT role FROM users WHERE id = ?", [claim.mechanic_id]);
      await notify(claim.mechanic_id, `Warranty revisit needed for ${claim.order_no}.`, helper?.role === "driver" ? "/driver" : "/mechanic", t);
    }
    await logAudit({ actor: user, action: `CLAIM_${decision}`, entity: "claim", entityId: claimId, details: note }, t);
  });
}

export async function listAudit(user, { action = "" } = {}) {
  assertRole(user, ["admin"]);
  return all(
    `SELECT a.*, u.name AS actor_name FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
      WHERE (? = '' OR a.action = ?) ORDER BY a.id DESC LIMIT 200`,
    [action, action]
  );
}

export async function listAuditActions(user) {
  assertRole(user, ["admin"]);
  return (await all("SELECT DISTINCT action FROM audit_log ORDER BY action")).map((r) => r.action);
}
