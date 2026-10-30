import Link from "next/link";
import { Eye } from "lucide-react";
import { brand } from "@/lib/brand";

/** Centered card layout for sign-in and setup pages. */
export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="flex items-center gap-2 font-semibold mb-8"><Eye className="w-5 h-5 text-brand" /> {brand.name}</Link>
      <div className="card w-full max-w-sm p-6 sm:p-8">
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-sm text-ink-2 text-center max-w-sm">{footer}</div>}
      <div className="mt-8 flex gap-4 text-xs text-ink-3">
        <Link href="/docs" className="hover:text-ink">Docs</Link>
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
      </div>
    </main>
  );
}
