import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import SettingsView from "@/components/SettingsView";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await getSession())) redirect("/login");
  return <SettingsView />;
}
