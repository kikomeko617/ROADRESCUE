import { requirePageUser } from "@/lib/session";
import ProviderDashboard from "@/components/ProviderDashboard";

export const metadata = { title: "My jobs" };

export default async function MechanicPage({ searchParams }) {
  const user = await requirePageUser(["mechanic"]);
  return <ProviderDashboard user={user} kind="mechanic" sp={await searchParams} />;
}
