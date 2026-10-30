import type { Account, CompanyStore, DailyMetric, SyncLocation } from "./types";
import { deleteAccount, loadAccount, loadSyncState, saveStore } from "./store";
import { isServerless, kv } from "./kv";
import { dayKey } from "./dates";
import { listLocations, fetchLeadDates, fetchWonRevenue, fetchAppointments, fetchAdSpend, fetchAdPlatformSpend, getCompanyName, getLocation, type GhlLocation } from "./ghl/resources";
import { sendChurnAlerts } from "./alerts";
import { buildDemoStore } from "./demo";

const running = new Map<string, Promise<void>>();

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

const lockKey = (companyId: string) => `gv:co:${companyId}:synclock`;
const LOCK_SECONDS = 120;

function syncWindow(store: CompanyStore) {
  const to = new Date();
  const from = new Date(to.getTime() - store.settings.syncWindowDays * 86400_000);
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

/**
 * Plans a sync run: lists the accounts and queues them. Cheap enough for any request; the actual
 * work happens in `stepSync`, which can be spread over many short (serverless) invocations.
 */
export async function beginSync(store: CompanyStore): Promise<void> {
  if (store.sync.running) return;
  const { from, to } = syncWindow(store);
  store.sync = { running: true, startedAt: new Date().toISOString(), total: 0, done: 0, errors: 0, message: "Listing accounts…", windowFrom: from.toISOString(), windowTo: to.toISOString() };
  try {
    let locations: SyncLocation[];
    if (store.mode === "demo") {
      locations = Object.values(buildDemoStore().accounts).map((a) => ({ id: a.id, name: a.name, city: a.city, state: a.state, timezone: a.timezone }));
    } else {
      if (!store.companyName) store.companyName = await getCompanyName(store);
      locations = await listLocations(store);
      // Drop accounts that no longer exist or no longer have the app.
      const keep = new Set(locations.map((l) => l.id));
      for (const id of Object.keys(store.accounts)) {
        if (!keep.has(id)) { delete store.accounts[id]; await deleteAccount(store.companyId, id); }
      }
    }
    store.sync.queue = locations;
    store.sync.total = locations.length;
    store.sync.message = undefined;
    if (!locations.length) finish(store);
  } catch (e: any) {
    store.sync.message = String(e?.message ?? e).slice(0, 300);
    store.sync.errors++;
    finish(store);
  }
  await saveStore(store, ["meta", "sync", "auth"]);
}

function finish(store: CompanyStore) {
  store.sync.running = false;
  store.sync.queue = undefined;
  store.sync.finishedAt = new Date().toISOString();
  if (store.sync.errors && !store.sync.message) {
    store.sync.message = `${store.sync.errors} account${store.sync.errors === 1 ? "" : "s"} failed to sync`;
  }
}

/**
 * Works through the queued accounts until `budgetMs` is used up, saving progress after every account.
 * Only one step per company runs at a time (lock in the KV store). Returns true when the run finished.
 */
export async function stepSync(store: CompanyStore, budgetMs: number): Promise<boolean> {
  if (!store.sync.running) return true;
  const db = kv();
  if (!(await db.setNX(lockKey(store.companyId), "1", LOCK_SECONDS))) return false;
  try {
    // Another invocation may have advanced the run since this request loaded the store.
    const fresh = await loadSyncState(store.companyId);
    if (fresh) store.sync = fresh;
    if (!store.sync.running) return true;
    const deadline = Date.now() + budgetMs;
    const from = new Date(store.sync.windowFrom ?? syncWindow(store).from);
    const to = new Date(store.sync.windowTo ?? syncWindow(store).to);
    const queue = store.sync.queue ?? [];
    const demo = store.mode === "demo" ? buildDemoStore() : null;

    const batch: SyncLocation[] = [];
    await pool(queue.slice(0, 200), demo ? 1 : 4, async (loc) => {
      if (Date.now() > deadline) return;
      batch.push(loc);
      let ok = true;
      if (demo) {
        await new Promise((r) => setTimeout(r, 12));
        const old = store.accounts[loc.id];
        store.accounts[loc.id] = { ...demo.accounts[loc.id], dailySpendOverride: old?.dailySpendOverride, churnThresholdOverride: old?.churnThresholdOverride, importedSpend: old?.importedSpend };
      } else {
        ok = await syncLocation(store, loc, from, to);
      }
      await keepUserOverrides(store, loc.id);
      if (!ok) store.sync.errors++;
      store.sync.done++;
      store.sync.queue = (store.sync.queue ?? []).filter((q) => q.id !== loc.id);
      await saveStore(store, ["sync", "tokens", "accounts"], [loc.id]);
    });

    if (!store.sync.queue?.length) {
      finish(store);
      await saveStore(store, ["sync", "tokens"]);
      await sendChurnAlerts(store).catch((e) => console.error("[alerts]", e));
      return true;
    }
    return false;
  } finally {
    await db.del(lockKey(store.companyId));
  }
}

/** Overrides and imported spend may have been edited while the account was syncing: keep the latest. */
async function keepUserOverrides(store: CompanyStore, id: string) {
  const latest = await loadAccount(store.companyId, id);
  const acc = store.accounts[id];
  if (!latest || !acc) return;
  acc.dailySpendOverride = latest.dailySpendOverride;
  acc.churnThresholdOverride = latest.churnThresholdOverride;
  acc.importedSpend = latest.importedSpend;
}

/** Long-running hosts: begin (if needed) and keep stepping until the run is complete, in the background. */
export function startSync(store: CompanyStore): Promise<void> {
  const existing = running.get(store.companyId);
  if (existing) return existing;
  const p = (async () => {
    await beginSync(store);
    for (let i = 0; i < 10_000 && store.sync.running; i++) {
      const done = await stepSync(store, 60_000);
      if (!done && store.sync.running) await new Promise((r) => setTimeout(r, 250));
    }
  })()
    .catch((e) => console.error("[sync]", e))
    .finally(() => running.delete(store.companyId));
  running.set(store.companyId, p);
  return p;
}

/**
 * Serverless hosts: start the run if needed and do as much as fits in `budgetMs` inside this request.
 * Callers (the dashboard's progress poll and the cron job) call this repeatedly until it finishes.
 */
export async function driveSync(store: CompanyStore, budgetMs: number): Promise<void> {
  if (!store.sync.running) await beginSync(store);
  if (store.sync.running) await stepSync(store, budgetMs);
}

/** Starts a run without blocking: background on long-running hosts, queued (driven by polls/cron) on serverless. */
export async function kickOffSync(store: CompanyStore): Promise<void> {
  if (isServerless()) await beginSync(store);
  else void startSync(store);
}

/** Use the right strategy for the host. */
export async function requestSync(store: CompanyStore, budgetMs = 40_000): Promise<void> {
  if (isServerless()) await driveSync(store, budgetMs);
  else void startSync(store);
}

/** Syncs one sub-account into the store. Returns false if it failed (error is kept on the account). */
async function syncLocation(store: CompanyStore, loc: GhlLocation, from: Date, to: Date): Promise<boolean> {
  const prev = store.accounts[loc.id];
  const account: Account = {
    id: loc.id,
    name: loc.name,
    city: loc.city,
    state: loc.state,
    timezone: loc.timezone,
    daily: prev?.daily ?? [],
    dailySpendOverride: prev?.dailySpendOverride,
    churnThresholdOverride: prev?.churnThresholdOverride,
    importedSpend: prev?.importedSpend,
  };
  let ok = true;
  try {
    const tz = loc.timezone || "UTC";
    const [leadDates, wins, appts, spend, adSpend] = await Promise.all([
      fetchLeadDates(store, loc.id, from, to),
      fetchWonRevenue(store, loc.id, from),
      fetchAppointments(store, loc.id, from, to),
      fetchAdSpend(store, loc.id, store.settings.adSpendCustomValueKey).catch(() => null),
      fetchAdPlatformSpend(store, loc.id, from, to).catch(() => null),
    ]);
    const byDay = new Map<string, DailyMetric>();
    // Step from the window start and always include "today" in the sub-account's timezone –
    // stepping from UTC midnight alone misses it for timezones west of UTC.
    for (const t of [...Array.from({ length: Math.ceil((to.getTime() - from.getTime()) / 86400_000) + 1 }, (_, i) => from.getTime() + i * 86400_000), to.getTime()]) {
      if (t > to.getTime()) continue;
      const k = dayKey(t, tz);
      if (!byDay.has(k)) byDay.set(k, { date: k, leads: 0, booked: 0, showed: 0, noShow: 0, revenue: 0, spend: 0 });
    }
    const get = (iso: string) => byDay.get(dayKey(iso, tz));
    for (const d of leadDates) { const m = get(d); if (m) m.leads++; }
    for (const w of wins) { const m = get(w.date); if (m) m.revenue += w.value; }
    for (const a of appts) {
      const m = get(a.startTime);
      if (!m || a.status === "cancelled" || a.status === "invalid") continue;
      m.booked++;
      if (a.status === "showed") m.showed++;
      else if (a.status === "noshow" || a.status === "no_show") m.noShow++;
    }
    // Spend: connected ad platforms first, then the custom value. (CSV imports and manual overrides
    // are applied on top of this when metrics are calculated.)
    account.spendSource = undefined;
    if (typeof spend === "number") for (const m of byDay.values()) m.spend = spend;
    else if (spend) for (const [k, v] of Object.entries(spend)) { const m = byDay.get(k); if (m) m.spend = v; }
    if (spend != null) account.spendSource = "custom value";
    if (adSpend && Object.keys(adSpend).length) {
      for (const m of byDay.values()) m.spend = adSpend[m.date] ?? 0;
      account.spendSource = "ads";
    }

    account.daily = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
    account.lastSyncedAt = new Date().toISOString();
    account.syncError = undefined;
  } catch (e: any) {
    account.syncError = e?.status === 401 || e?.status === 403
      ? "No access. Is God View installed on this account in your CRM?"
      : String(e?.message ?? e).slice(0, 240);
    ok = false;
  }
  store.accounts[loc.id] = account;
  return ok;
}

/** Syncs a single sub-account by id, e.g. right after the app is installed on it. */
export async function syncSingleLocation(store: CompanyStore, locationId: string): Promise<boolean> {
  if (store.mode !== "live") return false;
  const loc = await getLocation(store, locationId);
  const { from, to } = syncWindow(store);
  const ok = await syncLocation(store, loc, from, to);
  await keepUserOverrides(store, loc.id);
  await saveStore(store, ["tokens", "accounts"], [loc.id]);
  return ok;
}
