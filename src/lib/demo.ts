import type { Account, CompanyStore, DailyMetric, EmailDay, PushJob, Snapshot } from "./types";
import { emptyStore } from "./store";
import { lastDays } from "./dates";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NICHES = [
  ["Roofing", 6500], ["Dental", 1800], ["Med Spa", 900], ["HVAC", 4200], ["Solar", 18000],
  ["Chiropractic", 1200], ["Law Firm", 7500], ["Real Estate", 9000], ["Fitness Studio", 600],
  ["Plumbing", 1500], ["Home Remodel", 22000], ["Auto Detailing", 350], ["Pest Control", 450],
  ["Landscaping", 2600], ["Physical Therapy", 1400], ["Insurance", 1100],
] as const;
const PREFIX = ["Summit", "Blue Ridge", "Apex", "Coastal", "Lone Star", "Evergreen", "Metro", "Pioneer", "Golden Gate", "Liberty", "Northstar", "Redwood", "Harbor", "Prairie", "Keystone", "Silverline", "Ironclad", "Bright Path", "Cascade", "Magnolia"];
const CITIES = [["Denver", "CO"], ["Austin", "TX"], ["Tampa", "FL"], ["Phoenix", "AZ"], ["Charlotte", "NC"], ["Nashville", "TN"], ["Boise", "ID"], ["Columbus", "OH"], ["San Diego", "CA"], ["Raleigh", "NC"], ["Atlanta", "GA"], ["Portland", "OR"], ["Salt Lake City", "UT"], ["Omaha", "NE"]];

type Archetype = "star" | "steady" | "churning" | "dipping" | "volatile" | "recovering";

export function buildDemoStore(): CompanyStore {
  const store = emptyStore("demo", "demo");
  store.companyName = "Northwind Growth (demo)";
  const days = lastDays(60);
  const r = rng(42);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];

  for (let i = 0; i < 100; i++) {
    const [niche, ticket] = NICHES[i % NICHES.length];
    const [city, st] = pick(CITIES);
    const name = `${PREFIX[(i * 7) % PREFIX.length]} ${niche}${i >= 40 ? ` ${city}` : ""}`;
    const roll = r();
    const archetype: Archetype =
      roll < 0.1 ? "star" : roll < 0.62 ? "steady" : roll < 0.74 ? "churning" : roll < 0.84 ? "dipping" : roll < 0.94 ? "volatile" : "recovering";
    const ar = rng(1000 + i);
    const baseLeads = archetype === "star" ? 14 + ar() * 18 : 5 + ar() * 14;
    const baseSpend = 60 + ar() * 340;
    const showBase = archetype === "star" ? 0.72 + ar() * 0.15 : archetype === "churning" ? 0.35 + ar() * 0.2 : 0.48 + ar() * 0.28;
    const closeRate = 0.15 + ar() * 0.25;
    const lowStart = 3 + Math.floor(ar() * 6); // churning accounts: last N days low

    const daily: DailyMetric[] = days.map((date, d) => {
      const fromEnd = days.length - 1 - d;
      const weekday = new Date(date + "T12:00:00Z").getUTCDay();
      const weekendDip = weekday === 0 || weekday === 6 ? 0.6 : 1;
      let mult = 1;
      if (archetype === "churning") mult = fromEnd < lowStart ? 0.05 + ar() * 0.15 : Math.max(0.35, 1 - (30 - Math.min(fromEnd, 30)) * 0.02);
      if (archetype === "dipping") mult = fromEnd >= 1 && fromEnd <= 2 ? 0.12 : 1;
      if (archetype === "volatile") mult = 0.4 + ar() * 1.3;
      if (archetype === "recovering") mult = fromEnd > 20 ? 0.3 : 0.6 + (20 - fromEnd) * 0.03;
      if (archetype === "star") mult = 1 + (60 - fromEnd) * 0.004;
      const leads = Math.max(0, Math.round(baseLeads * mult * weekendDip * (0.75 + ar() * 0.5)));
      const booked = Math.round(leads * (0.25 + ar() * 0.25));
      const showRate = Math.min(0.95, Math.max(0.1, showBase + (ar() - 0.5) * 0.2));
      const showed = Math.round(booked * showRate);
      const noShow = booked - showed;
      const won = Math.round(showed * closeRate * (0.6 + ar() * 0.8));
      const revenue = Math.round(won * ticket * (0.7 + ar() * 0.6));
      const spend = Math.round(baseSpend * (archetype === "churning" && fromEnd < lowStart ? 0.9 : 1) * (0.85 + ar() * 0.3) * 100) / 100;
      return { date, leads, booked, showed, noShow, revenue, spend };
    });

    // Email: most accounts are healthy; a few have list-quality or spam-folder problems.
    const er = rng(5000 + i);
    const eRoll = er();
    const profile = eRoll < 0.06 ? "spam" : eRoll < 0.13 ? "bounces" : eRoll < 0.2 ? "inbox-miss" : "healthy";
    const email: Record<string, EmailDay> = {};
    for (const d of daily) {
      const sent = Math.round(d.leads * (2 + er() * 3) + er() * 15);
      const bounceRate = profile === "bounces" ? 0.05 + er() * 0.06 : 0.004 + er() * 0.012;
      const bounced = Math.round(sent * bounceRate);
      const delivered = sent - bounced;
      const openRate = profile === "inbox-miss" ? 0.05 + er() * 0.07 : profile === "spam" ? 0.12 + er() * 0.1 : 0.22 + er() * 0.25;
      const opened = Math.round(delivered * openRate);
      const complained = profile === "spam" ? Math.round(delivered * (0.003 + er() * 0.006)) : er() < 0.008 ? 1 : 0;
      email[d.date] = {
        sent, delivered, opened, bounced, complained,
        clicked: Math.round(opened * (0.08 + er() * 0.12)),
        unsubscribed: Math.round(delivered * (0.001 + er() * 0.004)),
      };
    }

    const id = `demo-loc-${String(i + 1).padStart(3, "0")}`;
    store.accounts[id] = { id, name, city, state: st, timezone: "UTC", daily, email, spendSource: "ads", lastSyncedAt: new Date().toISOString() } satisfies Account;
  }
  store.sync = { running: false, total: 100, done: 100, errors: 0, finishedAt: new Date().toISOString() };
  return store;
}

export const DEMO_SNAPSHOTS: Snapshot[] = [
  { id: "snap-roof-storm", name: "Roofing – Storm Damage Funnel v3 (from Summit Roofing)", type: "own" },
  { id: "snap-dental-implant", name: "Dental – Implant Consult Workflow + Funnel", type: "own" },
  { id: "snap-medspa-botox", name: "Med Spa – $99 Botox Offer + 7-day Nurture", type: "own" },
  { id: "snap-hvac-tuneup", name: "HVAC – Tune-up Special + Missed Call Text Back", type: "own" },
  { id: "snap-solar-quiz", name: "Solar – Savings Quiz Funnel v2", type: "own" },
  { id: "snap-noshow", name: "Universal – Appointment No-Show Recovery Workflow", type: "own" },
  { id: "snap-reactivation", name: "Universal – 90-Day Database Reactivation", type: "own" },
  { id: "snap-reviews", name: "Universal – Review Request Automation", type: "imported" },
];

/** Advances simulated push targets based on elapsed time. */
export function advanceDemoJob(job: PushJob) {
  const elapsed = Date.now() - new Date(job.createdAt).getTime();
  job.targets.forEach((t, i) => {
    if (t.status === "completed" || t.status === "failed") return;
    const offset = i * 700;
    const prev = t.status;
    if (elapsed > offset + 7000) {
      const fail = (t.locationId.charCodeAt(t.locationId.length - 1) + job.snapshotId.length) % 17 === 0;
      t.status = fail ? "failed" : "completed";
      if (fail) t.message = "Account has a conflicting custom field. Retry with override enabled.";
    } else if (elapsed > offset + 2500) t.status = "processing";
    else if (elapsed > offset) t.status = "pushing";
    if (prev !== t.status) t.updatedAt = new Date().toISOString();
  });
}
