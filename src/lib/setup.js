// Creates the tables and loads FICTITIOUS demo data.
// Used by `npm run db:setup` and by the automated tests.
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { AREA_COORDS } from "./constants.js";

export async function applySchema(client) {
  const sql = fs.readFileSync(path.join(process.cwd(), "database", "schema.sql"), "utf8");
  await client.executeMultiple(sql);
}
export async function dropAll(client) {
  const tables = [
    "audit_log", "notifications", "claims", "reviews", "order_status_history", "payments",
    "order_items", "orders", "cart_items", "parts", "garages", "services", "customer_profiles",
    "provider_profiles", "mechanic_profiles", "users",
  ];
  await client.execute("PRAGMA foreign_keys = OFF");
  for (const t of tables) await client.execute(`DROP TABLE IF EXISTS ${t}`);
  await client.execute("PRAGMA foreign_keys = ON");
}

const M = "Mechanic@1234";
const D = "Driver@1234";
export const DEMO_ACCOUNTS = [
  { name: "RoadRescue Admin", email: "admin@roadrescue.test", password: "Admin@1234", role: "admin", phone: "0700000001" },
  { name: "Sarah Namuli", email: "sarah@roadrescue.test", password: "Customer@1234", role: "customer", phone: "0772000111" },
  { name: "Daniel Okello", email: "daniel@roadrescue.test", password: "Customer@1234", role: "customer", phone: "0752000222" },
  { name: "Joseph Ssali", email: "ssali@roadrescue.test", password: M, role: "mechanic", phone: "0782000333", area: "Ntinda", skills: "Battery, electrics, engine", status: "APPROVED", avatar: "cap" },
  { name: "Musa Kato", email: "musa@roadrescue.test", password: M, role: "mechanic", phone: "0702000444", area: "Kansanga", skills: "Tyres, brakes, towing", status: "APPROVED", avatar: "fade" },
  { name: "Peter Opio", email: "peter@roadrescue.test", password: M, role: "mechanic", phone: "0762000555", area: "Nakawa", skills: "General repairs", status: "PENDING", avatar: "crop" },
  { name: "Grace Nakato", email: "grace@roadrescue.test", password: M, role: "mechanic", phone: "0772000666", area: "Rubaga", skills: "Engine, overheating, diagnosis", status: "APPROVED", avatar: "wrap" },
  { name: "Ivan Mugerwa", email: "ivan@roadrescue.test", password: M, role: "mechanic", phone: "0702000777", area: "Kampala Central", skills: "Towing, recovery truck, heavy vehicles", status: "APPROVED", avatar: "crop" },
  { name: "Rashid Lubega", email: "rashid@roadrescue.test", password: M, role: "mechanic", phone: "0752000888", area: "Mukono", skills: "Brakes, suspension, tyres", status: "APPROVED", avatar: "bald", online: 0 },
  { name: "Brenda Atim", email: "brenda@roadrescue.test", password: D, role: "driver", phone: "0782000999", area: "Ntinda", skills: "Class B licence, 6 years, automatic and manual", status: "APPROVED", avatar: "puffs" },
  { name: "Allan Tumusiime", email: "allan@roadrescue.test", password: D, role: "driver", phone: "0762000123", area: "Kampala Central", skills: "Class B and C licence, 9 years, airport runs", status: "APPROVED", avatar: "fade" },
  { name: "Esther Nalwoga", email: "esther@roadrescue.test", password: D, role: "driver", phone: "0772000234", area: "Kansanga", skills: "Class B licence, 4 years, evening safe rides", status: "APPROVED", avatar: "locs" },
  { name: "Moses Okot", email: "moses@roadrescue.test", password: D, role: "driver", phone: "0702000345", area: "Nakawa", skills: "Class B licence, 3 years", status: "PENDING", avatar: "cap" },
];

// [name, category, description, price (UGX), minutes, who does it]
// Keep the order: the ids (1, 2, 3...) are used by the tests and the demo history below.
const SERVICES = [
  ["Jump-start", "Battery & electrics", "Your car won't start because the battery is flat. We bring jump leads or a booster pack and get you going.", 30000, 20, "mechanic"],
  ["Flat tyre change", "Tyres", "We swap your flat tyre for your spare, or repair a tubeless puncture on the spot.", 25000, 25, "mechanic"],
  ["Battery fitting", "Battery & electrics", "Old battery dead? We test it and fit a new one. Add a battery from the parts list.", 30000, 30, "mechanic"],
  ["Fuel delivery", "Fuel", "Ran out of fuel? We bring fuel to you. Add the fuel you need from the parts list.", 20000, 30, "mechanic"],
  ["Overheating check", "Engine", "Temperature light on or steam from the bonnet? We check coolant, hoses, fan and radiator.", 40000, 45, "mechanic"],
  ["Callout and diagnosis", "General", "Not sure what's wrong? A mechanic comes, finds the problem and tells you the fix and price.", 20000, 30, "mechanic"],
  ["Brake check and repair", "Brakes", "Squeaking, grinding or soft brakes. We inspect and replace pads if needed.", 50000, 60, "mechanic"],
  ["Keys locked inside", "General", "Locked your keys in the car? We open it safely without damage.", 35000, 30, "mechanic"],
  ["Towing in Kampala (first 10 km)", "Towing", "If it can't be fixed by the road, we tow your car to a garage of your choice.", 100000, 60, "mechanic"],
  ["Drive me home in my car", "Driver", "Too tired, unwell or had a drink? A vetted driver meets you and drives you home in your own car.", 40000, 45, "driver"],
  ["Move my car to a garage", "Driver", "Car still drives but you can't take it in yourself? A driver takes it to the garage you choose.", 35000, 40, "driver"],
  ["Airport run in your car (Entebbe)", "Driver", "A driver takes you to or from Entebbe Airport in your own car, then brings the car home safely.", 90000, 120, "driver"],
  ["Driver for the day (8 hours)", "Driver", "A professional driver for errands, meetings or a trip upcountry - in your car, at your pace.", 150000, 480, "driver"],
  ["Heavy vehicle towing (trucks and minibuses)", "Towing", "Lorries, pickups with loads and minibuses. A flatbed or heavy tow truck moves it to a garage or yard.", 250000, 90, "mechanic"],
];

const PARTS = [
  ["Car battery 45Ah (N50)", "Fits most saloon cars like Premio, Allion, Corolla", 280000, 8],
  ["Car battery 70Ah", "For bigger cars and SUVs", 380000, 5],
  ["Petrol, 5 litres", "Delivered in a sealed jerrycan", 26000, 40],
  ["Tubeless tyre repair plug", "Seals small punctures", 15000, 20],
  ["Coolant, 1 litre", "Ready-mixed engine coolant", 18000, 25],
  ["Brake pads (front pair)", "Standard pads for most saloon cars", 85000, 10],
  ["Fan belt", "Common sizes for Toyota models", 35000, 12],
  ["Radiator hose", "Upper hose, common sizes", 30000, 3],
];

// Fictitious partner garages. [name, area, landmark, lat offset, lng offset, specialties, hours, rating]
const GARAGES = [
  ["Ntinda Auto Clinic", "Ntinda", "Behind the Ntinda trading centre", 0.003, -0.004, "Engine, electrics, diagnostics", "Mon-Sat 8:00-19:00", 4.6],
  ["Kansanga Tyre & Brake Centre", "Kansanga", "Ggaba Road, near the roundabout", -0.002, 0.003, "Tyres, brakes, wheel alignment", "Mon-Sun 7:30-20:00", 4.4],
  ["Nakawa Motor Works", "Nakawa", "Off Jinja Road, near the market", 0.002, 0.004, "Engine overhaul, body work", "Mon-Sat 8:00-18:00", 4.2],
  ["City Centre Service Point", "Kampala Central", "Near the old taxi park", -0.003, 0.002, "Servicing, batteries, air conditioning", "Mon-Sat 7:00-21:00", 4.5],
  ["Rubaga Road Garage", "Rubaga", "Along Rubaga Road", 0.002, 0.003, "Suspension, gearbox", "Mon-Sat 8:00-18:00", 4.1],
  ["Kawempe Truck & Diesel", "Kawempe", "Bombo Road, after the fuel station", -0.003, -0.002, "Trucks, diesel engines, towing yard", "Mon-Sun 6:00-22:00", 4.3],
  ["Mukono Highway Motors", "Mukono", "Kampala-Jinja highway", 0.002, -0.003, "Servicing, tyres", "Mon-Sat 8:00-19:00", 4.0],
  ["Entebbe Road Auto Hub", "Entebbe Road", "Near the Zana junction", 0.003, 0.002, "Hybrid cars, electrics", "Mon-Sat 8:00-19:00", 4.7],
  ["Makindye Hill Garage", "Makindye", "Below Makindye hill", 0.002, -0.002, "General repairs, welding", "Mon-Sat 8:00-18:00", 4.2],
  ["Wakiso Junction Garage", "Wakiso", "Wakiso town junction", -0.002, 0.003, "Servicing, clutch and gearbox", "Mon-Sat 8:00-18:00", 3.9],
];

const sqlDate = (daysAgo) => new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 19).replace("T", " ");

export async function seed(client) {
  const ids = {};
  for (const a of DEMO_ACCOUNTS) {
    const hash = await bcrypt.hash(a.password, 10);
    const res = await client.execute({
      sql: "INSERT INTO users (name, email, phone, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', '-30 days'))",
      args: [a.name, a.email, a.phone, hash, a.role],
    });
    ids[a.email] = Number(res.lastInsertRowid);
    if (a.role === "mechanic" || a.role === "driver") {
      const approved = a.status === "APPROVED";
      await client.execute({
        sql: "INSERT INTO provider_profiles (user_id, area, skills, status, is_online, avatar_style, approved_by, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [ids[a.email], a.area, a.skills, a.status, a.online ?? 1, a.avatar || null, approved ? ids["admin@roadrescue.test"] : null, approved ? sqlDate(20) : null],
      });
    }
  }
  for (const s of SERVICES) {
    await client.execute({ sql: "INSERT INTO services (name, category, description, price, est_minutes, provider_type) VALUES (?, ?, ?, ?, ?, ?)", args: s });
  }
  for (const p of PARTS) {
    await client.execute({ sql: "INSERT INTO parts (name, description, price, stock) VALUES (?, ?, ?, ?)", args: p });
  }
  for (const [name, area, landmark, dLat, dLng, specialties, hours, rating] of GARAGES) {
    const [lat, lng] = AREA_COORDS[area];
    await client.execute({
      sql: "INSERT INTO garages (name, area, landmark, lat, lng, specialties, hours, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [name, area, landmark, lat + dLat, lng + dLng, specialties, hours, rating],
    });
  }

  // Daniel has asked for help before, so his car and area are remembered.
  await client.execute({
    sql: "INSERT INTO customer_profiles (user_id, vehicle_make, vehicle_model, vehicle_body, vehicle_colour, last_area) VALUES (?, 'Toyota', 'Premio', 'Saloon', 'Silver', 'Ntinda')",
    args: [ids["daniel@roadrescue.test"]],
  });

  // A few past jobs so the dashboards and ratings have something to show.
  const daniel = ids["daniel@roadrescue.test"];
  const by = (email) => ids[`${email}@roadrescue.test`];
  const history = [
    { no: "RR-H1001", svc: 1, mech: by("ssali"), area: "Ntinda", days: 12, acceptMin: 6, rating: 5, comment: "Came in 15 minutes and was very polite." },
    { no: "RR-H1002", svc: 2, mech: by("musa"), area: "Kansanga", days: 8, acceptMin: 9, rating: 4, comment: "Good job on the tyre. Price was clear." },
    { no: "RR-H1003", svc: 5, mech: by("ssali"), area: "Ntinda", days: 4, acceptMin: 4, rating: 5, comment: "Found the leaking hose fast." },
    { no: "RR-H1004", svc: 5, mech: by("grace"), area: "Rubaga", days: 10, acceptMin: 7, rating: 5, comment: "Explained the cooling problem clearly." },
    { no: "RR-H1005", svc: 9, mech: by("ivan"), area: "Kampala Central", days: 6, acceptMin: 11, rating: 4, comment: "Tow truck came fast and was careful with the car." },
    { no: "RR-H1006", svc: 10, mech: by("brenda"), area: "Ntinda", days: 5, acceptMin: 5, rating: 5, comment: "Calm, safe driver. Got me home after a long night." },
    { no: "RR-H1007", svc: 12, mech: by("allan"), area: "Kampala Central", days: 3, acceptMin: 8, rating: 5, comment: "On time for my flight and brought the car back spotless." },
    { no: "RR-H1008", svc: 10, mech: by("esther"), area: "Kansanga", days: 2, acceptMin: 6, rating: 4, comment: "Friendly and careful." },
    { no: "RR-H1009", svc: 7, mech: by("rashid"), area: "Mukono", days: 9, acceptMin: 10, rating: 4, comment: "Brakes feel new again." },
  ];
  for (const h of history) {
    const [svcName, , , price] = SERVICES[h.svc - 1];
    const commission = Math.round(price * 0.15);
    const created = `datetime('now', '-${h.days} days')`;
    const res = await client.execute({
      sql: `INSERT INTO orders (order_no, customer_id, mechanic_id, service_id, area, landmark, vehicle, problem_note, status,
              service_amount, parts_amount, total_amount, commission_amount, created_at, paid_at, accepted_at, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, 0, ?, ?, ${created}, ${created},
              datetime('now', '-${h.days} days', '+${h.acceptMin} minutes'), datetime('now', '-${h.days} days', '+70 minutes'))`,
      args: [h.no, daniel, h.mech, h.svc, h.area, "Near the main road", "Toyota Premio, silver", "", price, price, commission],
    });
    const orderId = Number(res.lastInsertRowid);
    await client.execute({ sql: "INSERT INTO order_items (order_id, kind, ref_id, name, unit_price, qty, line_total) VALUES (?, 'SERVICE', ?, ?, ?, 1, ?)", args: [orderId, h.svc, svcName, price, price] });
    await client.execute({ sql: "INSERT INTO payments (order_id, idempotency_key, method, payer_phone_masked, amount, status, provider_ref) VALUES (?, ?, 'MOCK_MOMO', '07X XXX X222', ?, 'RELEASED', ?)", args: [orderId, "pay-" + h.no, price, "SANDBOX-" + h.no] });
    await client.execute({ sql: "INSERT INTO reviews (order_id, customer_id, mechanic_id, rating, comment) VALUES (?, ?, ?, ?, ?)", args: [orderId, daniel, h.mech, h.rating, h.comment] });
    await client.execute({ sql: "INSERT INTO order_status_history (order_id, from_status, to_status, note, created_at) VALUES (?, NULL, 'COMPLETED', 'Seeded past job', datetime('now', '-' || ? || ' days'))", args: [orderId, h.days] });
  }

  // Live jobs waiting in Ntinda: one for a mechanic and one for a driver, so both dashboards have work.
  const live = [
    { no: "RR-L2001", svc: 6, landmark: "Opposite Capital Shoppers Ntinda", vehicle: "Honda Fit, blue", note: "Car shakes and the engine light is on", mins: 6 },
    { no: "RR-L2002", svc: 10, landmark: "Parking behind Ntinda Shopping Centre", vehicle: "Subaru Forester, black", note: "Too tired to drive home after a late shift", mins: 4 },
  ];
  for (const l of live) {
    const [svcName, , , price] = SERVICES[l.svc - 1];
    const commission = Math.round(price * 0.15);
    const res = await client.execute({
      sql: `INSERT INTO orders (order_no, customer_id, service_id, area, landmark, vehicle, problem_note, status,
              service_amount, parts_amount, total_amount, commission_amount, created_at, paid_at)
            VALUES (?, ?, ?, 'Ntinda', ?, ?, ?, 'SEARCHING', ?, 0, ?, ?, datetime('now', '-${l.mins} minutes'), datetime('now', '-${l.mins - 1} minutes'))`,
      args: [l.no, daniel, l.svc, l.landmark, l.vehicle, l.note, price, price, commission],
    });
    const id = Number(res.lastInsertRowid);
    await client.execute({ sql: "INSERT INTO order_items (order_id, kind, ref_id, name, unit_price, qty, line_total) VALUES (?, 'SERVICE', ?, ?, ?, 1, ?)", args: [id, l.svc, svcName, price, price] });
    await client.execute({ sql: "INSERT INTO payments (order_id, idempotency_key, method, payer_phone_masked, amount, status, provider_ref) VALUES (?, ?, 'MOCK_MOMO', '07X XXX X222', ?, 'HELD', ?)", args: [id, "pay-" + l.no, price, "SANDBOX-" + l.no] });
    await client.execute({ sql: "INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note) VALUES (?, 'PENDING_PAYMENT', 'SEARCHING', NULL, 'Mock payment approved')", args: [id] });
  }

  await client.execute({ sql: "INSERT INTO audit_log (actor_role, action, details) VALUES ('system', 'DB_SEEDED', 'Fictitious demo data loaded')" });
  return ids;
}
