import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await getSession())) redirect("/login");
  return <Dashboard />;
}
