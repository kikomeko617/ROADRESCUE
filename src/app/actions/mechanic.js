"use server";
// Job actions for helpers. Used by both the mechanic and the driver dashboards.
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/session";
import { acceptJob, advanceJob } from "@/lib/orders";
import { attempt, field, ok } from "./helpers";

export async function acceptJobAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(async () => {
    await acceptJob(user, Number(field(fd, "orderId")));
    return ok("Job accepted. The customer has been told you're coming.");
  });
  revalidatePath("/", "layout");
  return res;
}

export async function advanceJobAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(async () => {
    await advanceJob(user, Number(field(fd, "orderId")), field(fd, "to"));
    return ok("Status updated.");
  });
  revalidatePath("/", "layout");
  return res;
}
