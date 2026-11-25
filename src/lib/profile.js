// The customer's saved car and last area, used to make the next request faster.
import { one, run } from "./db.js";
import { assertRole } from "./auth.js";
import { logAudit } from "./audit.js";
import { vehicleSchema, areaSchema } from "./validation.js";

export async function getCustomerProfile(userId) {
  return one("SELECT * FROM customer_profiles WHERE user_id = ?", [userId]);
}

// Pure helper: "Toyota Premio, silver (Saloon)" for the order and the helper.
export function vehicleText(p) {
  if (!p?.vehicle_make) return "";
  const name = p.vehicle_make === "Other" ? p.vehicle_model || "Car" : `${p.vehicle_make} ${p.vehicle_model || ""}`.trim();
  const colour = p.vehicle_colour && p.vehicle_colour !== "Other" ? `, ${p.vehicle_colour.toLowerCase()}` : "";
  return `${name}${colour}${p.vehicle_body ? ` (${p.vehicle_body})` : ""}`.slice(0, 80);
}

export async function saveVehicle(user, input) {
  assertRole(user, ["customer"]);
  const v = vehicleSchema.parse(input);
  await run(
    `INSERT INTO customer_profiles (user_id, vehicle_make, vehicle_model, vehicle_body, vehicle_colour, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET vehicle_make = excluded.vehicle_make, vehicle_model = excluded.vehicle_model,
       vehicle_body = excluded.vehicle_body, vehicle_colour = excluded.vehicle_colour, updated_at = excluded.updated_at`,
    [user.id, v.make, v.model, v.body, v.colour]
  );
  await logAudit({ actor: user, action: "VEHICLE_SAVED", entity: "user", entityId: user.id, details: `${v.make} ${v.model}`.trim() });
  return v;
}

// Only the area NAME is stored, never GPS coordinates.
export async function saveArea(user, input) {
  assertRole(user, ["customer"]);
  const { area } = areaSchema.parse(input);
  await run(
    `INSERT INTO customer_profiles (user_id, last_area, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET last_area = excluded.last_area, updated_at = excluded.updated_at`,
    [user.id, area]
  );
  return area;
}
