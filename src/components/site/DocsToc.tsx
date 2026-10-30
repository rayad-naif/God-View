"use client";
import { useEffect, useState } from "react";

/** Sidebar table of contents that highlights the section in view. */
export default function DocsToc({ sections }: { sections: { id: string; title: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    sections.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [sections]);
  return (
    <nav aria-label="Documentation sections" className="text-sm">
      <div className="font-semibold mb-2 text-ink">On this page</div>
      <ul className="space-y-0.5 border-l border-[var(--border)]">
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className={`block -ml-px border-l-2 pl-3 py-1 ${active === s.id ? "border-brand text-ink font-medium" : "border-transparent text-ink-2 hover:text-ink"}`}>{s.title}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
