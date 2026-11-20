// In-app notifications ("Your mechanic is on the way").
import { all, one, run } from "./db.js";

export async function notify(userId, message, link = null, tx = null) {
  const sql = "INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)";
  if (tx) return tx.run(sql, [userId, message, link]);
  return run(sql, [userId, message, link]);
}

export async function listNotifications(userId) {
  return all("SELECT id, message, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50", [userId]);
}

export async function unreadCount(userId) {
  const r = await one("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0", [userId]);
  return Number(r?.n || 0);
}

export async function markAllRead(userId) {
  await run("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [userId]);
}
