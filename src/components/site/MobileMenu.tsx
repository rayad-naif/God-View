"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function MobileMenu({ links, signedIn }: { links: { href: string; label: string }[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button className="btn !p-2" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-14 border-b border-[var(--border)] bg-[var(--plane)] px-4 py-3 space-y-1 anim-fade">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 hover:bg-[var(--surface-2)]" onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          <div className="pt-2 flex gap-2">
            {signedIn ? (
              <Link href="/dashboard" className="btn btn-primary flex-1 justify-center">Open dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="btn flex-1 justify-center">Sign in</Link>
                <a href="/api/auth/connect" className="btn btn-primary flex-1 justify-center">Connect CRM</a>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
