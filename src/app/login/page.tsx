import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import AuthShell from "@/components/site/AuthShell";
import { LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Sign in · God View" };
export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  created: "Your login is ready. Sign in to open your dashboard.",
  reset: "Password updated. Sign in with your new password.",
  reconnected: "CRM reconnected. Sign in to continue.",
  signedout: "You’ve been signed out.",
};

export default async function LoginPage({ searchParams }: { searchParams: { email?: string; notice?: string; error?: string } }) {
  const s = await getSession();
  if (s?.kind === "user") redirect("/dashboard");
  return (
    <AuthShell
      title="Sign in"
      subtitle="Use the email and password you created after connecting your CRM."
      footer={
        <>
          New here? <a href="/api/auth/connect" className="text-brand hover:underline">Connect your CRM</a> to create your login.
          <br />Just looking? <a href="/api/auth/demo" className="text-brand hover:underline">Open the live demo</a>.
        </>
      }
    >
      <LoginForm initialEmail={searchParams.email} notice={searchParams.notice ? NOTICES[searchParams.notice] : undefined} error={searchParams.error} />
    </AuthShell>
  );
}
