import Link from "next/link";
import { Eye } from "lucide-react";
import { getSession } from "@/lib/session";
import { brand } from "@/lib/brand";
import { ThemeToggle } from "../Header";
import MobileMenu from "./MobileMenu";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/docs", label: "Docs" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export default async function SiteNav({ active }: { active?: string }) {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--plane)]/90 backdrop-blur">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6" aria-label="Main">
        <Link href="/" className="flex items-center gap-2 font-semibold shrink-0">
          <Eye className="w-5 h-5 text-brand" /> {brand.name}
        </Link>
        <div className="hidden md:flex items-center gap-5 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active === l.href ? "page" : undefined} className={active === l.href ? "font-semibold text-ink" : "text-ink-2 hover:text-ink"}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex-1" />
        <div className="hidden sm:flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <Link href="/dashboard" className="btn btn-primary">Open dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn">Sign in</Link>
              <a href="/api/auth/connect" className="btn btn-primary">Connect CRM</a>
            </>
          )}
        </div>
        <MobileMenu links={LINKS} signedIn={Boolean(session)} />
      </nav>
    </header>
  );
}
