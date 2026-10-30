import Link from "next/link";
import { Eye } from "lucide-react";
import { brand } from "@/lib/brand";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] mt-24">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-4 text-sm">
        <div className="sm:col-span-2">
          <div className="flex items-center gap-2 font-semibold"><Eye className="w-5 h-5 text-brand" /> {brand.name}</div>
          <p className="mt-2 text-ink-2 max-w-sm">One dashboard for every account in your CRM: rankings, churn warnings, and one-click rollout of what works.</p>
        </div>
        <div>
          <div className="font-semibold mb-2">Product</div>
          <ul className="space-y-1.5 text-ink-2">
            <li><Link className="hover:text-ink" href="/">Home</Link></li>
            <li><Link className="hover:text-ink" href="/docs">Documentation</Link></li>
            <li><a className="hover:text-ink" href="/api/auth/demo">Live demo</a></li>
            <li><Link className="hover:text-ink" href="/login">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">Legal</div>
          <ul className="space-y-1.5 text-ink-2">
            <li><Link className="hover:text-ink" href="/privacy">Privacy Policy</Link></li>
            <li><Link className="hover:text-ink" href="/terms">Terms of Service</Link></li>
            <li><a className="hover:text-ink" href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-ink-3">© {new Date().getFullYear()} {brand.legalEntity}. All rights reserved.</div>
      </div>
    </footer>
  );
}
