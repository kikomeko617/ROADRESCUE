"use server";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/session";
import { markAllRead } from "@/lib/notifications";
import { attempt, ok } from "./helpers";

export async function markReadAction() {
  const user = await currentUser();
  const res = await attempt(async () => {
    if (!user) throw new Error("not logged in");
    await markAllRead(user.id);
    return ok("All caught up.");
  });
  revalidatePath("/", "layout");
  return res;
}
