import { requirePageUser } from "@/lib/session";
import ProviderDashboard from "@/components/ProviderDashboard";

export const metadata = { title: "My trips" };

export default async function DriverPage({ searchParams }) {
  const user = await requirePageUser(["driver"]);
  return <ProviderDashboard user={user} kind="driver" sp={await searchParams} />;
}
