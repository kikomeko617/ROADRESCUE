"use server";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/session";
import { setMechanicStatus, setPartStock, resolveClaim } from "@/lib/admin";
import { cancelOrder } from "@/lib/orders";
import { attempt, field, ok } from "./helpers";

export async function mechanicStatusAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(async () => {
    await setMechanicStatus(user, Number(field(fd, "mechanicId")), field(fd, "status"));
    return ok("Helper updated.");
  });
  revalidatePath("/", "layout");
  return res;
}

export async function stockAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(async () => {
    await setPartStock(user, Number(field(fd, "partId")), { stock: field(fd, "stock") });
    return ok("Stock saved.");
  });
  revalidatePath("/", "layout");
  return res;
}

export async function resolveClaimAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(async () => {
    await resolveClaim(user, Number(field(fd, "claimId")), { decision: field(fd, "decision"), note: field(fd, "note") });
    return ok("Claim resolved and the customer was notified.");
  });
  revalidatePath("/", "layout");
  return res;
}

export async function adminCancelAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(async () => {
    await cancelOrder(user, Number(field(fd, "orderId")), { reason: field(fd, "reason") || "Cancelled by admin" });
    return ok("Order cancelled and refunded.");
  });
  revalidatePath("/", "layout");
  return res;
}
