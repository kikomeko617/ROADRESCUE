// Audit logging: records important actions so the admin can see who did what and when.
import { run } from "./db.js";

export async function logAudit({ actor = null, action, entity = null, entityId = null, details = null }, tx = null) {
  const args = [actor?.id ?? null, actor?.role ?? "system", action, entity, entityId == null ? null : String(entityId), details];
  const sql = "INSERT INTO audit_log (actor_id, actor_role, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)";
  if (tx) return tx.run(sql, args);
  return run(sql, args);
}
