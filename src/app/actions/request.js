"use server";
// The "Get help" steps: save the customer's car, then their area, then show matching services.
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { saveVehicle, saveArea } from "@/lib/profile";
import { needByKey } from "@/lib/constants";
import { attempt, field } from "./helpers";

function needParam(fd) {
  const need = needByKey(field(fd, "need"));
  return need ? need.key : null;
}

export async function saveVehicleAction(_prev, fd) {
  const user = await currentUser();
  const need = needParam(fd);
  const res = await attempt(() =>
    saveVehicle(user, { make: field(fd, "make"), body: field(fd, "body"), model: field(fd, "model") || "", colour: field(fd, "colour") || "" })
  );
  if (res.error) return res;
  redirect(need ? `/request?need=${need}&car=1` : "/request");
}

export async function saveAreaAction(_prev, fd) {
  const user = await currentUser();
  const need = needParam(fd);
  let area;
  const res = await attempt(async () => {
    area = await saveArea(user, { area: field(fd, "area") });
  });
  if (res.error) return res;
  redirect(need ? `/request?need=${need}&car=1&area=${encodeURIComponent(area)}` : "/request");
}
