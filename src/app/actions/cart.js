"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addToCart, updateCartQty, removeFromCart } from "@/lib/cart";
import { currentUser } from "@/lib/session";
import { attempt, field, ok } from "./helpers";

export async function addToCartAction(_prev, fd) {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(field(fd, "back") || "/services")}`);
  const res = await attempt(async () => {
    await addToCart(user, { kind: field(fd, "kind"), refId: field(fd, "refId"), qty: field(fd, "qty") || "1" });
    return ok(field(fd, "kind") === "SERVICE" ? "Service added to your cart." : "Part added to your cart.");
  });
  revalidatePath("/", "layout");
  if (!res.error && field(fd, "goToCart") === "1") redirect("/cart");
  return res;
}

export async function updateQtyAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(() => updateCartQty(user, Number(field(fd, "itemId")), Number(field(fd, "qty"))));
  revalidatePath("/", "layout");
  return res;
}

export async function removeItemAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(() => removeFromCart(user, Number(field(fd, "itemId"))));
  revalidatePath("/", "layout");
  return res;
}
