"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Mail, CircleAlert, AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import type { AccountMetrics, DashboardPayload, EmailSummary } from "@/lib/types";
import { num, pct } from "@/lib/format";

export function EmailPill({ status, reasons }: { status: EmailSummary["status"]; reasons?: string[] }) {
  const title = reasons?.length ? reasons.join(", ") : undefined;
  if (status === "critical")
    return <span title={title} className="inline-flex items-center gap-1 rounded-full bg-critical px-2 py-0.5 text-[11px] font-semibold text-white whitespace-nowrap"><CircleAlert className="w-3 h-3" /> Critical</span>;
  if (status === "warning")
    return <span title={title} className="inline-flex items-center gap-1 rounded-full bg-warn px-2 py-0.5 text-[11px] font-semibold text-[#0b0b0b] whitespace-nowrap"><AlertTriangle className="w-3 h-3" /> Watch</span>;
  if (status === "good")
    return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--good-text)] whitespace-nowrap"><CheckCircle2 className="w-3 h-3" /> Healthy</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-3 whitespace-nowrap"><MinusCircle className="w-3 h-3" /> Low volume</span>;
}

const RANK = { critical: 0, warning: 1, good: 2, none: 3 } as const;

/** Rate cell: the rate in bold-ish ink with the raw count under it; red when past the critical line. */
function RateCell({ rate, count, bad, watch }: { rate: number | null; count: number; bad: number; watch: number }) {
  const tone = rate == null ? "" : rate > bad ? "text-[var(--critical-text)] font-semibold" : rate > watch ? "font-semibold" : "";
  return (
    <td className="px-3 py-2.5 text-right tnum whitespace-nowrap">
      <div className={tone}>{pct(rate, rate != null && rate < 0.01 && rate > 0 ? 2 : 1)}</div>
      <div className="text-xs text-ink-3">{num(count)}</div>
    </td>
  );
}

export default function EmailHealth({ data, onOpen }: { data: DashboardPayload; onOpen: (id: string) => void }) {
  const e = data.email;
  const withData = useMemo(() => data.accounts.filter((a) => a.email.delivered + a.email.bounced > 0), [data.accounts]);
  const problems = withData.filter((a) => a.email.status === "critical" || a.email.status === "warning");
  const [onlyProblems, setOnlyProblems] = useState(true);
  const [limit, setLimit] = useState(15);
  const rows = useMemo(() => {
    const list = onlyProblems && problems.length ? problems : withData;
    return [...list].sort((a, b) => RANK[a.email.status] - RANK[b.email.status] || (b.email.spamRate ?? 0) - (a.email.spamRate ?? 0) || (b.email.bounceRate ?? 0) - (a.email.bounceRate ?? 0));
  }, [onlyProblems, problems, withData]);

  return (
    <section className="card overflow-hidden" id="email-health">
      <div className="px-4 pt-4 pb-3 flex flex-wrap items-center gap-3 border-b border-[var(--border)]">
        <Mail className="w-5 h-5 text-brand" />
        <div className="flex-1 min-w-[200px]">
          <h2 className="font-semibold">Email health</h2>
          <div className="text-xs text-ink-3">Deliverability across all accounts · last {data.days} days · bounces, spam complaints and opens from your CRM&apos;s email events</div>
        </div>
        {withData.length > 0 && problems.length > 0 && (
          <div className="seg" role="group" aria-label="Email filter">
            <button aria-pressed={onlyProblems} onClick={() => setOnlyProblems(true)}>Problems <span className="text-ink-3 tnum">{problems.length}</span></button>
            <button aria-pressed={!onlyProblems} onClick={() => setOnlyProblems(false)}>All <span className="text-ink-3 tnum">{withData.length}</span></button>
          </div>
        )}
      </div>

      {withData.length === 0 ? (
        <div className="px-4 py-8 text-sm text-ink-2 text-center max-w-xl mx-auto">
          No email events yet. Subscribe your CRM app to the <b>email stats</b> webhook event and approve the email permission to see bounces, spam complaints and opens here.
          {" "}<Link href="/docs#email-health" className="text-brand underline">How to set it up</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[var(--border)] border-b border-[var(--border)]">
            {[
              ["Delivered", num(e.delivered), `${num(e.sent || e.delivered + e.bounced)} sent`],
              ["Open rate", pct(e.openRate), `${num(e.opened)} opened`],
              ["Not opened", num(e.notOpened), e.delivered ? `${pct(e.notOpened / e.delivered)} of delivered` : ""],
              ["Bounce rate", pct(e.bounceRate, 1), `${num(e.bounced)} bounced`],
              ["Spam rate", pct(e.spamRate, 2), `${num(e.complained)} complaints`],
              ["Unsubscribes", num(e.unsubscribed), `${e.critical} critical · ${e.warning} watch`],
            ].map(([l, v, sub]) => (
              <div key={l} className="bg-[var(--surface-1)] px-4 py-3">
                <div className="text-xs text-ink-2">{l}</div>
                <div className="text-lg font-semibold tnum">{v}</div>
                <div className="text-xs text-ink-3">{sub}</div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)]">
                <tr className="text-xs text-ink-2">
                  <th className="px-4 py-2 text-left font-medium">Account</th>
                  <th className="px-3 py-2 text-right font-medium">Delivered</th>
                  <th className="px-3 py-2 text-right font-medium">Opened</th>
                  <th className="px-3 py-2 text-right font-medium">Not opened</th>
                  <th className="px-3 py-2 text-right font-medium">Bounced</th>
                  <th className="px-3 py-2 text-right font-medium">Spam</th>
                  <th className="px-3 py-2 text-right font-medium">Unsubs</th>
                  <th className="px-3 py-2 text-left font-medium">Health</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((a: AccountMetrics) => (
                  <tr key={a.id} className="border-b border-[var(--border)] cursor-pointer hover:bg-[var(--surface-2)]" onClick={() => onOpen(a.id)}>
                    <td className="px-4 py-2.5 min-w-[200px]">
                      <div className="font-medium">{a.name}</div>
                      {a.email.reasons.length > 0 && <div className="text-xs text-ink-3">{a.email.reasons.join(" · ")}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right tnum">{num(a.email.delivered)}</td>
                    <RateCell rate={a.email.openRate} count={a.email.opened} bad={1} watch={1} />
                    <td className="px-3 py-2.5 text-right tnum">{num(a.email.notOpened)}</td>
                    <RateCell rate={a.email.bounceRate} count={a.email.bounced} bad={0.05} watch={0.02} />
                    <RateCell rate={a.email.spamRate} count={a.email.complained} bad={0.003} watch={0.001} />
                    <td className="px-3 py-2.5 text-right tnum">{num(a.email.unsubscribed)}</td>
                    <td className="px-3 py-2.5"><EmailPill status={a.email.status} reasons={a.email.reasons} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > limit && (
            <div className="p-3 text-center border-t border-[var(--border)]">
              <button className="btn" onClick={() => setLimit((l) => l + 50)}>Show more ({rows.length - limit} remaining)</button>
            </div>
          )}
          <div className="px-4 py-3 text-xs text-ink-3 border-t border-[var(--border)]">
            Critical: spam complaints over 0.3% or bounces over 5%. Watch: spam over 0.1%, bounces over 2%, open rate under 15%, or unsubscribes over 1%. Needs at least 20 sends.
          </div>
        </>
      )}
    </section>
  );
}
