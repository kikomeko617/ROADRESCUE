"use server";
import { redirect } from "next/navigation";
import { authenticate, registerUser } from "@/lib/auth";
import { startSession, endSession, currentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { homeForRole } from "@/lib/constants";
import { attempt, field, safeNext } from "./helpers";

export async function loginAction(_prev, fd) {
  let user;
  const res = await attempt(async () => {
    user = await authenticate({ email: field(fd, "email"), password: field(fd, "password") });
    await startSession(user);
  });
  if (res.error) return res;
  redirect(safeNext(field(fd, "next")) || homeForRole(user.role));
}

export async function registerAction(_prev, fd) {
  let user;
  const res = await attempt(async () => {
    user = await registerUser({
      name: field(fd, "name"),
      email: field(fd, "email"),
      phone: field(fd, "phone"),
      password: field(fd, "password"),
      role: field(fd, "role"),
      area: field(fd, "area"),
      skills: field(fd, "skills"),
    });
    await startSession(user);
  });
  if (res.error) return res;
  redirect(`${homeForRole(user.role)}?welcome=1`);
}

export async function logoutAction() {
  const user = await currentUser();
  if (user) await logAudit({ actor: user, action: "LOGOUT", entity: "user", entityId: user.email });
  await endSession();
  redirect("/");
}
