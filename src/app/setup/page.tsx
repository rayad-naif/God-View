import Link from "next/link";
import type { Metadata } from "next";
import { getSetupTicket } from "@/lib/session";
import AuthShell from "@/components/site/AuthShell";
import { SetupForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Create your login · God View" };
export const dynamic = "force-dynamic";

export default function SetupPage() {
  const ticket = getSetupTicket();
  if (!ticket) {
    return (
      <AuthShell title="Setup link expired" subtitle="For your security, this step has to be finished within 30 minutes of connecting your CRM.">
        <a href="/api/auth/connect" className="btn btn-primary w-full justify-center !py-2.5">Connect CRM again</a>
        <p className="mt-4 text-sm text-ink-2 text-center">Already have a login? <Link href="/login" className="text-brand hover:underline">Sign in</Link></p>
      </AuthShell>
    );
  }
  return (
    <AuthShell
      title={ticket.mode === "reset" ? "Reset your password" : "Create your login"}
      subtitle={
        ticket.mode === "reset"
          ? "You’ve confirmed you own this CRM workspace. Choose a new password; you’ll sign in with it next."
          : "Step 2 of 2. Choose the email and password you’ll use to sign in. Your CRM password is never shared with us."
      }
      footer={<>By creating a login you agree to the <Link href="/terms" className="text-brand hover:underline">Terms</Link> and <Link href="/privacy" className="text-brand hover:underline">Privacy Policy</Link>.</>}
    >
      <SetupForm mode={ticket.mode} workspace={ticket.name} />
    </AuthShell>
  );
}
