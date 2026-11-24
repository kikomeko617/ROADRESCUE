"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import {
  createOrderFromCart, approveMockPayment, declineMockPayment, confirmCompletion,
  reportProblem, cancelOrder, submitReview, openWarrantyClaim,
} from "@/lib/orders";
import { attempt, field, ok } from "./helpers";

const orderId = (fd) => Number(field(fd, "orderId"));

export async function checkoutAction(_prev, fd) {
  const user = await currentUser();
  let order;
  const res = await attempt(async () => {
    order = await createOrderFromCart(user, {
      area: field(fd, "area"),
      landmark: field(fd, "landmark"),
      vehicle: field(fd, "vehicle"),
      problemNote: field(fd, "problemNote") || "",
      method: field(fd, "method"),
      payerPhone: field(fd, "payerPhone"),
    });
  });
  if (res.error) return res;
  revalidatePath("/", "layout");
  redirect(`/checkout/pay/${order.id}`);
}

export async function approvePaymentAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(() => approveMockPayment(user, orderId(fd)));
  if (res.error) return res;
  revalidatePath("/", "layout");
  redirect(`/orders/${orderId(fd)}?paid=1`);
}

export async function declinePaymentAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(async () => {
    await declineMockPayment(user, orderId(fd));
    return { error: "Payment was declined on the phone (simulated). You can try again or cancel the order." };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function confirmAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(async () => {
    await confirmCompletion(user, orderId(fd));
    return ok("Thanks! The job is complete and your helper has been paid.");
  });
  revalidatePath("/", "layout");
  return res;
}

export async function reportProblemAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(async () => {
    await reportProblem(user, orderId(fd), { description: field(fd, "description") });
    return ok("Problem reported. Your money stays held while our team reviews it.");
  });
  revalidatePath("/", "layout");
  return res;
}

export async function cancelAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(async () => {
    await cancelOrder(user, orderId(fd), { reason: field(fd, "reason") || "" });
    return ok("Order cancelled. Any money held has been refunded.");
  });
  revalidatePath("/", "layout");
  return res;
}

export async function reviewAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(async () => {
    await submitReview(user, orderId(fd), { rating: field(fd, "rating"), comment: field(fd, "comment") || "" });
    return ok("Thanks for your review!");
  });
  revalidatePath("/", "layout");
  return res;
}

export async function warrantyAction(_prev, fd) {
  const user = await currentUser();
  const res = await attempt(async () => {
    await openWarrantyClaim(user, orderId(fd), { description: field(fd, "description") });
    return ok("Warranty claim sent. We'll get back to you soon.");
  });
  revalidatePath("/", "layout");
  return res;
}
