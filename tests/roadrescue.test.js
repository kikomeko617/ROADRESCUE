// ROADRESCUE automated test cases.
// IDs (TC01...) match the test case table in docs/TESTING.md.
import { describe, it, expect, beforeAll } from "vitest";
import { ZodError } from "zod";
import { freshDatabase, userByEmail, CHECKOUT } from "./helpers.js";
import { one, all, run } from "../src/lib/db.js";
import { registerUser, authenticate, assertRole, createSessionToken, verifySessionToken } from "../src/lib/auth.js";
import { listServices, servicesForNeed, listProviders, listGarages } from "../src/lib/catalog.js";
import { saveVehicle, saveArea, getCustomerProfile, vehicleText } from "../src/lib/profile.js";
import { nearestArea, approxPosition } from "../src/lib/geo.js";
import { addToCart, getCart } from "../src/lib/cart.js";
import {
  createOrderFromCart, approveMockPayment, acceptJob, advanceJob, confirmCompletion,
  submitReview, openWarrantyClaim, cancelOrder, getOrderDetail, withinWarranty,
} from "../src/lib/orders.js";
import { resolveClaim, setMechanicStatus } from "../src/lib/admin.js";
import { canAccess } from "../src/lib/constants.js";
import { AccessDeniedError, AppError } from "../src/lib/errors.js";

let sarah, daniel, ssali, musa, peter, admin, brenda, moses;
const JUMP_START = 1; // service id
const BATTERY = 1; // part id (stock 8)
const HOSE = 8; // part id (stock 3)
const DRIVE_HOME = 10; // service id, done by a driver

beforeAll(async () => {
  await freshDatabase();
  sarah = await userByEmail("sarah@roadrescue.test");
  daniel = await userByEmail("daniel@roadrescue.test");
  ssali = await userByEmail("ssali@roadrescue.test");
  musa = await userByEmail("musa@roadrescue.test");
  peter = await userByEmail("peter@roadrescue.test");
  admin = await userByEmail("admin@roadrescue.test");
  brenda = await userByEmail("brenda@roadrescue.test");
  moses = await userByEmail("moses@roadrescue.test");
});

async function placePaidOrder(customer, parts = [], serviceId = JUMP_START) {
  await run("DELETE FROM cart_items WHERE user_id = ?", [customer.id]); // start with an empty cart
  await addToCart(customer, { kind: "SERVICE", refId: serviceId, qty: 1 });
  for (const [id, qty] of parts) await addToCart(customer, { kind: "PART", refId: id, qty });
  const order = await createOrderFromCart(customer, CHECKOUT);
  await approveMockPayment(customer, order.id);
  return order;
}

describe("Positive cases", () => {
  it("TC01 - a new customer can register and log in; the password is stored hashed", async () => {
    const u = await registerUser({ name: "Brian Mugisha", email: "brian@roadrescue.test", phone: "0701234567", password: "Brian@2026", role: "customer" });
    expect(u.role).toBe("customer");
    const row = await one("SELECT password_hash FROM users WHERE id = ?", [u.id]);
    expect(row.password_hash).not.toContain("Brian@2026");
    expect(row.password_hash.startsWith("$2")).toBe(true); // bcrypt
    const logged = await authenticate({ email: "BRIAN@roadrescue.test", password: "Brian@2026" });
    expect(logged.id).toBe(u.id);
    const token = await createSessionToken(logged);
    expect((await verifySessionToken(token)).id).toBe(u.id);
    expect(await verifySessionToken(token + "x")).toBeNull(); // tampered token rejected
  });

  it("TC02 - discover/search: searching 'tyre' finds the tyre service", async () => {
    const results = await listServices({ q: "tyre" });
    expect(results.map((s) => s.name)).toContain("Flat tyre change");
    expect(results.every((s) => /tyre/i.test(s.name + s.description + s.category))).toBe(true);
    const battery = await listServices({ category: "Battery & electrics" });
    expect(battery.length).toBe(2);
  });

  it("TC03 - cart and order: totals and commission are correct and stock is reduced", async () => {
    await addToCart(sarah, { kind: "SERVICE", refId: JUMP_START, qty: 1 });
    await addToCart(sarah, { kind: "PART", refId: BATTERY, qty: 1 });
    const cart = await getCart(sarah.id);
    expect(cart.total).toBe(30000 + 280000);
    expect(cart.commission).toBe(4500 + 14000); // 15% labour + 5% parts
    const before = await one("SELECT stock FROM parts WHERE id = ?", [BATTERY]);
    const order = await createOrderFromCart(sarah, CHECKOUT);
    const after = await one("SELECT stock FROM parts WHERE id = ?", [BATTERY]);
    expect(Number(after.stock)).toBe(Number(before.stock) - 1);
    const saved = await one("SELECT status, total_amount, commission_amount FROM orders WHERE id = ?", [order.id]);
    expect(saved).toMatchObject({ status: "PENDING_PAYMENT", total_amount: 310000, commission_amount: 18500 });
    expect((await getCart(sarah.id)).items.length).toBe(0); // cart emptied
  });

  it("TC04 - mock payment: approving holds the money; approving again does NOT charge twice", async () => {
    const order = await one("SELECT id FROM orders WHERE customer_id = ? ORDER BY id DESC", [sarah.id]);
    const first = await approveMockPayment(sarah, order.id);
    expect(first.alreadyPaid).toBe(false);
    const second = await approveMockPayment(sarah, order.id);
    expect(second.alreadyPaid).toBe(true);
    const pays = await all("SELECT status FROM payments WHERE order_id = ?", [order.id]);
    expect(pays).toEqual([{ status: "HELD" }]);
    const o = await one("SELECT status, paid_at FROM orders WHERE id = ?", [order.id]);
    expect(o.status).toBe("SEARCHING");
    expect(o.paid_at).toBeTruthy();
  });

  it("TC05 - fulfilment: mechanic accepts and finishes; customer confirms; payment is released", async () => {
    const order = await one("SELECT id FROM orders WHERE customer_id = ? ORDER BY id DESC", [sarah.id]);
    await acceptJob(ssali, order.id);
    await advanceJob(ssali, order.id, "EN_ROUTE");
    await advanceJob(ssali, order.id, "IN_PROGRESS");
    await advanceJob(ssali, order.id, "AWAITING_CONFIRMATION");
    await confirmCompletion(sarah, order.id);
    const detail = await getOrderDetail(sarah, order.id);
    expect(detail.status).toBe("COMPLETED");
    expect(detail.payment.status).toBe("RELEASED");
    expect(detail.history.map((h) => h.to_status)).toEqual([
      "PENDING_PAYMENT", "SEARCHING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "AWAITING_CONFIRMATION", "COMPLETED",
    ]);
    const audit = await all("SELECT action FROM audit_log WHERE entity_id = ?", [detail.order_no]);
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(["ORDER_CREATED", "PAYMENT_HELD", "JOB_ACCEPTED", "ORDER_COMPLETED"]));
  });

  it("TC06 - after-sales: customer rates the mechanic and opens a warranty claim; admin sends a revisit", async () => {
    const order = await one("SELECT id FROM orders WHERE customer_id = ? AND status = 'COMPLETED' ORDER BY id DESC", [sarah.id]);
    await submitReview(sarah, order.id, { rating: 5, comment: "Fast and friendly" });
    await expect(submitReview(sarah, order.id, { rating: 4 })).rejects.toThrow("already reviewed");
    await openWarrantyClaim(sarah, order.id, { description: "Car failed to start again the next morning." });
    const claim = await one("SELECT id, status FROM claims WHERE order_id = ?", [order.id]);
    expect(claim.status).toBe("OPEN");
    await resolveClaim(admin, claim.id, { decision: "REVISIT", note: "Ssali will recheck the battery terminals" });
    expect((await one("SELECT status FROM claims WHERE id = ?", [claim.id])).status).toBe("REVISIT");
    expect(withinWarranty("2020-01-01 10:00:00")).toBe(false);
  });

  it("TC07 - cancelling a paid order refunds the payment and returns parts to stock", async () => {
    const before = Number((await one("SELECT stock FROM parts WHERE id = ?", [BATTERY])).stock);
    const order = await placePaidOrder(daniel, [[BATTERY, 2]]);
    expect(Number((await one("SELECT stock FROM parts WHERE id = ?", [BATTERY])).stock)).toBe(before - 2);
    await cancelOrder(daniel, order.id, { reason: "Car started by itself" });
    expect(Number((await one("SELECT stock FROM parts WHERE id = ?", [BATTERY])).stock)).toBe(before);
    expect((await one("SELECT status FROM payments WHERE order_id = ?", [order.id])).status).toBe("REFUNDED");
  });
});

describe("Validation / error cases", () => {
  it("TC08 - an invalid mobile-money number is rejected and no order is created", async () => {
    await addToCart(daniel, { kind: "SERVICE", refId: JUMP_START, qty: 1 });
    const count = Number((await one("SELECT COUNT(*) AS n FROM orders")).n);
    await expect(createOrderFromCart(daniel, { ...CHECKOUT, payerPhone: "12345" })).rejects.toBeInstanceOf(ZodError);
    await expect(createOrderFromCart(daniel, { ...CHECKOUT, payerPhone: "12345" })).rejects.toThrow("0772123456");
    expect(Number((await one("SELECT COUNT(*) AS n FROM orders")).n)).toBe(count);
  });

  it("TC09 - ordering more parts than are in stock fails and NOTHING changes (rollback)", async () => {
    // Hose has 3 in stock. Put 3 in the cart, then someone else buys 2 before checkout.
    await addToCart(daniel, { kind: "PART", refId: HOSE, qty: 3 });
    await placePaidOrder(sarah, [[HOSE, 2]]);
    const count = Number((await one("SELECT COUNT(*) AS n FROM orders")).n);
    await expect(createOrderFromCart(daniel, CHECKOUT)).rejects.toThrow("only 1 left");
    expect(Number((await one("SELECT stock FROM parts WHERE id = ?", [HOSE])).stock)).toBe(1);
    expect(Number((await one("SELECT COUNT(*) AS n FROM orders")).n)).toBe(count);
    expect((await getCart(daniel.id)).items.length).toBe(2); // cart kept so the customer can fix it
  });

  it("TC10 - wrong password is rejected, and 5 failures lock the account for 15 minutes", async () => {
    await expect(authenticate({ email: "daniel@roadrescue.test", password: "wrong-pass1" })).rejects.toThrow("Wrong email or password");
    for (let i = 0; i < 4; i++) await authenticate({ email: "daniel@roadrescue.test", password: "wrong-pass1" }).catch(() => {});
    await expect(authenticate({ email: "daniel@roadrescue.test", password: "Customer@1234" })).rejects.toThrow("Too many failed attempts");
  });
});

describe("Access control and integrity cases", () => {
  it("TC11 - a customer cannot open admin pages or do mechanic/admin actions", async () => {
    expect(canAccess("/admin", "customer")).toBe(false);
    expect(canAccess("/admin/audit", "mechanic")).toBe(false);
    expect(canAccess("/mechanic", "customer")).toBe(false);
    expect(canAccess("/orders", undefined)).toBe(false);
    expect(canAccess("/admin", "admin")).toBe(true);
    expect(canAccess("/services", undefined)).toBe(true);
    expect(() => assertRole(sarah, ["admin"])).toThrow(AccessDeniedError);
    const job = await one("SELECT id FROM orders WHERE status = 'SEARCHING' ORDER BY id LIMIT 1");
    await expect(acceptJob(sarah, job.id)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(setMechanicStatus(sarah, peter.id, "APPROVED")).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("TC12 - a customer cannot view another customer's order", async () => {
    const danielsOrder = await one("SELECT id FROM orders WHERE customer_id = ? ORDER BY id LIMIT 1", [daniel.id]);
    await expect(getOrderDetail(sarah, danielsOrder.id)).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("TC13 - two mechanics accept the same job: only the first one gets it", async () => {
    const job = await one("SELECT id FROM orders WHERE status = 'SEARCHING' AND mechanic_id IS NULL ORDER BY id LIMIT 1");
    const results = await Promise.allSettled([acceptJob(ssali, job.id), acceptJob(musa, job.id)]);
    expect(results.filter((r) => r.status === "fulfilled").length).toBe(1);
    expect(results.filter((r) => r.status === "rejected").length).toBe(1);
    const o = await one("SELECT mechanic_id FROM orders WHERE id = ?", [job.id]);
    expect([ssali.id, musa.id]).toContain(Number(o.mechanic_id));
  });

  it("TC14 - a mechanic waiting for approval cannot accept jobs; after admin approval they can", async () => {
    const order = await placePaidOrder(daniel);
    await expect(acceptJob(peter, order.id)).rejects.toThrow("approved by an admin");
    await setMechanicStatus(admin, peter.id, "APPROVED");
    await acceptJob(peter, order.id);
    expect(Number((await one("SELECT mechanic_id FROM orders WHERE id = ?", [order.id])).mechanic_id)).toBe(peter.id);
  });

  it("TC15 - a mechanic cannot skip steps (e.g. jump straight to 'done')", async () => {
    const order = await placePaidOrder(daniel);
    await acceptJob(musa, order.id);
    await expect(advanceJob(musa, order.id, "AWAITING_CONFIRMATION")).rejects.toBeInstanceOf(AppError);
    await expect(advanceJob(ssali, order.id, "EN_ROUTE")).rejects.toThrow("not your job");
  });
});

describe("Drivers, the request wizard and the map", () => {
  const driverJob = () => one("SELECT o.id FROM orders o JOIN services s ON s.id = o.service_id WHERE s.provider_type = 'driver' AND o.status = 'SEARCHING' ORDER BY o.id LIMIT 1");

  it("TC16 - a driver job can only be taken by a driver; the driver completes the trip", async () => {
    const job = await driverJob();
    await expect(acceptJob(ssali, job.id)).rejects.toThrow("needs a driver");
    await expect(getOrderDetail(ssali, job.id)).rejects.toBeInstanceOf(AccessDeniedError); // mechanics can't even open it
    await acceptJob(brenda, job.id);
    await advanceJob(brenda, job.id, "EN_ROUTE");
    await advanceJob(brenda, job.id, "IN_PROGRESS");
    await advanceJob(brenda, job.id, "AWAITING_CONFIRMATION");
    expect((await one("SELECT status, mechanic_id FROM orders WHERE id = ?", [job.id]))).toMatchObject({ status: "AWAITING_CONFIRMATION", mechanic_id: brenda.id });
    // ...and a driver can't take a mechanic job.
    const order = await placePaidOrder(sarah);
    await expect(acceptJob(brenda, order.id)).rejects.toThrow("needs a mechanic");
  });

  it("TC17 - a new driver starts as PENDING and can't take jobs until an admin approves them", async () => {
    const d = await registerUser({ name: "Joan Akello", email: "joan@roadrescue.test", phone: "0701112223", password: "Driver@2026", role: "driver", area: "Nakawa", skills: "Class B, 5 years" });
    expect((await one("SELECT status FROM provider_profiles WHERE user_id = ?", [d.id])).status).toBe("PENDING");
    await expect(registerUser({ name: "No Area", email: "noarea@roadrescue.test", phone: "0701112224", password: "Driver@2026", role: "driver" })).rejects.toThrow("choose the area");
    const job = await placePaidOrder(daniel, [], DRIVE_HOME);
    await expect(acceptJob(moses, job.id)).rejects.toThrow("approved by an admin");
    await setMechanicStatus(admin, moses.id, "APPROVED");
    await acceptJob(moses, job.id);
    expect(Number((await one("SELECT mechanic_id FROM orders WHERE id = ?", [job.id])).mechanic_id)).toBe(moses.id);
  });

  it("TC18 - the customer's car and area are validated and remembered (area only, no GPS)", async () => {
    await expect(saveVehicle(sarah, { make: "Tesla Cybertruck", body: "Truck" })).rejects.toBeInstanceOf(ZodError);
    await expect(saveVehicle(sarah, { make: "Toyota", body: "Saloon", model: "<script>" })).rejects.toThrow("cannot contain");
    await saveVehicle(sarah, { make: "Toyota", body: "SUV", model: "Harrier", colour: "Black" });
    await expect(saveArea(sarah, { area: "0.3540,32.6140" })).rejects.toBeInstanceOf(ZodError);
    await saveArea(sarah, { area: "Ntinda" });
    const p = await getCustomerProfile(sarah.id);
    expect(p).toMatchObject({ vehicle_make: "Toyota", vehicle_model: "Harrier", vehicle_body: "SUV", last_area: "Ntinda" });
    expect(vehicleText(p)).toBe("Toyota Harrier, black (SUV)");
    await expect(saveVehicle(ssali, { make: "Toyota", body: "SUV" })).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("TC19 - step 1 'need' picks the right services; helpers and garages are sorted by distance", async () => {
    const drive = await servicesForNeed("driver");
    expect(drive.length).toBe(4);
    expect(drive.every((s) => s.provider_type === "driver")).toBe(true);
    const tow = await servicesForNeed("tow");
    expect(tow.map((s) => s.name)).toEqual(expect.arrayContaining(["Towing in Kampala (first 10 km)", "Heavy vehicle towing (trucks and minibuses)"]));
    expect(await servicesForNeed("nonsense")).toEqual([]);
    const drivers = await listProviders({ type: "driver", area: "Ntinda" });
    expect(drivers.every((p) => p.role === "driver")).toBe(true);
    expect(drivers[0].name).toBe("Brenda Atim"); // online and closest to Ntinda
    expect(drivers.some((p) => p.name === "Joan Akello")).toBe(false); // pending drivers are hidden
    const garages = await listGarages({ area: "Kansanga" });
    expect(garages[0].area).toBe("Kansanga");
  });

  it("TC20 - map helpers: approximate positions are stable, and a GPS point maps to the nearest area", async () => {
    expect(approxPosition("Ntinda", 7)).toEqual(approxPosition("Ntinda", 7));
    expect(nearestArea([0.355, 32.612]).area).toBe("Ntinda");
    expect(nearestArea([0.36, 32.75]).area).toBe("Mukono");
    expect(canAccess("/driver", "mechanic")).toBe(false);
    expect(canAccess("/driver", "driver")).toBe(true);
    expect(canAccess("/request", undefined)).toBe(false);
    expect(canAccess("/request", "customer")).toBe(true);
  });
});
