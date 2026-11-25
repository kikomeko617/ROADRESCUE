// Discover / search: the service catalogue, spare parts, helpers and garages near you.
import { all, one } from "./db.js";
import { needByKey } from "./constants.js";
import { approxPosition, areaCoords, distanceKm, etaMinutes } from "./geo.js";

export async function listServices({ q = "", category = "", categories = null } = {}) {
  const term = `%${String(q).trim().slice(0, 60)}%`;
  const cats = Array.isArray(categories) && categories.length ? categories : null;
  return all(
    `SELECT s.*,
            (SELECT COUNT(*) FROM provider_profiles pp JOIN users u ON u.id = pp.user_id
              WHERE pp.status = 'APPROVED' AND u.is_active = 1 AND u.role = s.provider_type) AS helpers_available
       FROM services s
      WHERE s.is_active = 1
        AND (? = '%%' OR s.name LIKE ? OR s.description LIKE ? OR s.category LIKE ?)
        AND (? = '' OR s.category = ?)
        ${cats ? `AND s.category IN (${cats.map(() => "?").join(", ")})` : ""}
      ORDER BY s.price ASC`,
    [term, term, term, term, category, category, ...(cats || [])]
  );
}

// The services that match step 1 of a request ("Tow my vehicle", "Get a driver"...).
export async function servicesForNeed(key) {
  const need = needByKey(key);
  if (!need) return [];
  const rows = await listServices({ categories: need.categories });
  return rows.filter((s) => s.provider_type === need.provider);
}

export async function listCategories() {
  const rows = await all("SELECT DISTINCT category FROM services WHERE is_active = 1 ORDER BY category");
  return rows.map((r) => r.category);
}

export async function getService(id) {
  return one("SELECT * FROM services WHERE id = ? AND is_active = 1", [id]);
}

export async function listParts({ includeInactive = false } = {}) {
  return all(`SELECT * FROM parts ${includeInactive ? "" : "WHERE is_active = 1"} ORDER BY name`);
}

// Approved mechanics and drivers with their rating, shown to customers for trust.
// Only public details: name, work area, skills and rating - never phone or email.
// If an area is given, each helper gets an approximate distance and arrival time.
export async function listProviders({ type = "", area = "", limit = 50 } = {}) {
  const rows = await all(
    `SELECT u.id, u.name, u.role, pp.area, pp.skills, pp.is_online, pp.avatar_style,
            ROUND(AVG(r.rating), 1) AS rating, COUNT(r.id) AS reviews,
            (SELECT COUNT(*) FROM orders o WHERE o.mechanic_id = u.id AND o.status = 'COMPLETED') AS jobs
       FROM users u
       JOIN provider_profiles pp ON pp.user_id = u.id AND pp.status = 'APPROVED'
       LEFT JOIN reviews r ON r.mechanic_id = u.id
      WHERE u.is_active = 1 AND (? = '' OR u.role = ?)
      GROUP BY u.id`,
    [type, type]
  );
  const from = area ? areaCoords(area) : null;
  const list = rows.map((r) => {
    const pos = approxPosition(r.area, r.id);
    const km = from ? distanceKm(from, pos) : null;
    return {
      ...r,
      id: Number(r.id),
      is_online: Number(r.is_online) === 1,
      reviews: Number(r.reviews),
      jobs: Number(r.jobs),
      rating: r.rating == null ? null : Number(r.rating),
      lat: pos[0],
      lng: pos[1],
      km,
      eta: km == null ? null : etaMinutes(km),
    };
  });
  list.sort((a, b) => (b.is_online - a.is_online) || (from ? a.km - b.km : 0) || ((b.rating || 0) - (a.rating || 0)) || (b.reviews - a.reviews));
  return list.slice(0, limit);
}

// Kept for older code: the best-rated mechanics.
export async function topMechanics(limit = 3) {
  const list = await listProviders({ type: "mechanic" });
  return list.sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.reviews - a.reviews).slice(0, limit);
}

export async function listGarages({ area = "", limit = 50 } = {}) {
  const rows = await all("SELECT * FROM garages WHERE is_active = 1 ORDER BY name");
  const from = area ? areaCoords(area) : null;
  const list = rows.map((g) => ({
    ...g,
    id: Number(g.id),
    lat: Number(g.lat),
    lng: Number(g.lng),
    rating: g.rating == null ? null : Number(g.rating),
    km: from ? distanceKm(from, [Number(g.lat), Number(g.lng)]) : null,
  }));
  if (from) list.sort((a, b) => a.km - b.km);
  return list.slice(0, limit);
}

export async function platformStats() {
  const r = await one(
    `SELECT (SELECT COUNT(*) FROM provider_profiles WHERE status = 'APPROVED') AS helpers,
            (SELECT COUNT(*) FROM garages WHERE is_active = 1) AS garages,
            (SELECT ROUND(AVG(rating), 1) FROM reviews) AS rating,
            (SELECT ROUND(AVG((julianday(accepted_at) - julianday(paid_at)) * 24 * 60)) FROM orders WHERE accepted_at IS NOT NULL AND paid_at IS NOT NULL) AS accept_min`
  );
  return { helpers: Number(r.helpers), garages: Number(r.garages), rating: r.rating == null ? null : Number(r.rating), acceptMin: r.accept_min == null ? null : Number(r.accept_min) };
}
