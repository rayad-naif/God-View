import type { AccountMetrics, AccountStatus, CompanyStore, DailyMetric, DashboardPayload, EmailDay, EmailSummary } from "./types";
import { emailHealth } from "./email";
import { lastDays } from "./dates";

const ZERO = (date: string): DailyMetric => ({ date, leads: 0, booked: 0, showed: 0, noShow: 0, revenue: 0, spend: 0 });

function sum(rows: DailyMetric[]) {
  return rows.reduce(
    (a, r) => ({ leads: a.leads + r.leads, booked: a.booked + r.booked, showed: a.showed + r.showed, noShow: a.noShow + r.noShow, revenue: a.revenue + r.revenue, spend: a.spend + r.spend }),
    { leads: 0, booked: 0, showed: 0, noShow: 0, revenue: 0, spend: 0 },
  );
}
const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

function summariseEmail(rows: EmailDay[]): EmailSummary {
  const t = rows.reduce<Required<EmailDay>>(
    (a, r) => ({
      sent: a.sent + (r.sent ?? 0), delivered: a.delivered + (r.delivered ?? 0), opened: a.opened + (r.opened ?? 0), clicked: a.clicked + (r.clicked ?? 0),
      bounced: a.bounced + (r.bounced ?? 0), complained: a.complained + (r.complained ?? 0), unsubscribed: a.unsubscribed + (r.unsubscribed ?? 0),
    }),
    { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, unsubscribed: 0 },
  );
  const opened = Math.min(t.opened, t.delivered);
  const { status, reasons } = emailHealth({ ...t, opened });
  return {
    ...t,
    opened,
    notOpened: Math.max(0, t.delivered - opened),
    openRate: t.delivered ? opened / t.delivered : null,
    bounceRate: t.delivered + t.bounced ? t.bounced / (t.delivered + t.bounced) : null,
    spamRate: t.delivered ? t.complained / t.delivered : null,
    status,
    reasons,
  };
}

/** `emailStats`: accountId -> date -> counts, from the KV store (demo accounts carry their own). */
export function computeDashboard(store: CompanyStore, days: number, emailStats: Record<string, Record<string, EmailDay>> = {}): DashboardPayload {
  const { settings } = store;
  const range = lastDays(days);
  const prevRange = lastDays(days, days);
  // Churn is judged on completed days only – today is still in progress.
  const churnWindow = lastDays(30, 1).reverse(); // yesterday first

  const daily = new Map(range.map((d) => [d, { date: d, leads: 0, revenue: 0, showed: 0, noShow: 0 }]));
  const accounts: AccountMetrics[] = Object.values(store.accounts).map((acc) => {
    const byDate = new Map(acc.daily.map((d) => [d.date, d]));
    const sources = new Set<NonNullable<AccountMetrics["spendSource"]>>();
    const withSpend = (d: DailyMetric) => {
      const imported = acc.importedSpend?.[d.date];
      if (imported != null) { sources.add("CSV import"); return { ...d, spend: imported }; }
      if (acc.dailySpendOverride != null) { sources.add("manual"); return { ...d, spend: acc.dailySpendOverride }; }
      if (d.spend) sources.add(acc.spendSource === "ads" ? "ad platforms" : "custom value");
      return d;
    };
    const series = range.map((d) => withSpend(byDate.get(d) ?? ZERO(d)));
    const prev = prevRange.map((d) => withSpend(byDate.get(d) ?? ZERO(d)));
    const cur = sum(series);
    const emailByDay = { ...acc.email, ...emailStats[acc.id] };
    const emailSeries = range.map((d) => {
      const e = emailByDay[d] ?? {};
      return { date: d, delivered: e.delivered ?? 0, opened: Math.min(e.opened ?? 0, e.delivered ?? 0), bounced: e.bounced ?? 0, complained: e.complained ?? 0 };
    });
    const email = summariseEmail(range.map((d) => emailByDay[d] ?? {}));
    const p = sum(prev);

    for (const s of series) {
      const agg = daily.get(s.date)!;
      agg.leads += s.leads; agg.revenue += s.revenue; agg.showed += s.showed; agg.noShow += s.noShow;
    }

    const threshold = acc.churnThresholdOverride ?? settings.churnThreshold;
    let lowStreak = 0;
    for (const d of churnWindow) {
      if ((byDate.get(d)?.leads ?? 0) < threshold) lowStreak++;
      else break;
    }
    const hasData = acc.daily.length > 0;
    const status: AccountStatus = acc.syncError && !hasData ? "error" : lowStreak >= settings.churnDays ? "churn" : lowStreak > 0 ? "watch" : "healthy";

    return {
      id: acc.id,
      name: acc.name,
      location: [acc.city, acc.state].filter(Boolean).join(", "),
      status,
      lowStreak,
      threshold,
      leads: cur.leads,
      spend: cur.spend,
      cpl: cur.spend > 0 ? ratio(cur.spend, cur.leads) : null,
      booked: cur.booked,
      showed: cur.showed,
      noShow: cur.noShow,
      showRate: ratio(cur.showed, cur.showed + cur.noShow),
      revenue: cur.revenue,
      leadsPrev: p.leads,
      revenuePrev: p.revenue,
      cplPrev: p.spend > 0 ? ratio(p.spend, p.leads) : null,
      showRatePrev: ratio(p.showed, p.showed + p.noShow),
      series,
      spendSource: (["CSV import", "manual", "ad platforms", "custom value"] as const).find((x) => sources.has(x)),
      email,
      emailSeries,
      syncError: acc.syncError,
      lastSyncedAt: acc.lastSyncedAt,
      dailySpendOverride: acc.dailySpendOverride,
      churnThresholdOverride: acc.churnThresholdOverride,
    };
  });

  const t = accounts.reduce(
    (a, m) => {
      a.leads += m.leads; a.revenue += m.revenue; a.showed += m.showed; a.noShow += m.noShow;
      a.leadsPrev += m.leadsPrev; a.revenuePrev += m.revenuePrev;
      if (m.spend > 0) { a.spend += m.spend; a.paidLeads += m.leads; }
      return a;
    },
    { leads: 0, revenue: 0, showed: 0, noShow: 0, leadsPrev: 0, revenuePrev: 0, spend: 0, paidLeads: 0 },
  );
  const prevAgg = Object.values(store.accounts).reduce(
    (a, acc) => {
      const byDate = new Map(acc.daily.map((d) => [d.date, d]));
      for (const d of prevRange) {
        const r = byDate.get(d);
        if (!r) continue;
        const spend = acc.importedSpend?.[d] ?? acc.dailySpendOverride ?? r.spend;
        a.showed += r.showed; a.noShow += r.noShow;
        if (spend > 0) { a.spend += spend; a.leads += r.leads; }
      }
      return a;
    },
    { showed: 0, noShow: 0, spend: 0, leads: 0 },
  );

  return {
    mode: store.mode,
    companyName: store.companyName ?? "Your workspace",
    days,
    dates: range,
    settings,
    sync: store.sync,
    accounts,
    totals: {
      accounts: accounts.length,
      leads: t.leads,
      spend: t.spend,
      cpl: ratio(t.spend, t.paidLeads),
      showRate: ratio(t.showed, t.showed + t.noShow),
      revenue: t.revenue,
      churn: accounts.filter((a) => a.status === "churn").length,
      watch: accounts.filter((a) => a.status === "watch").length,
      leadsPrev: t.leadsPrev,
      revenuePrev: t.revenuePrev,
      cplPrev: ratio(prevAgg.spend, prevAgg.leads),
      showRatePrev: ratio(prevAgg.showed, prevAgg.showed + prevAgg.noShow),
    },
    daily: [...daily.values()],
    email: {
      ...summariseEmail(accounts.map((a) => a.email)),
      accountsWithData: accounts.filter((a) => a.email.delivered + a.email.bounced > 0).length,
      critical: accounts.filter((a) => a.email.status === "critical").length,
      warning: accounts.filter((a) => a.email.status === "warning").length,
    },
  };
}
