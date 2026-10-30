import { listCompanyIds, loadStore } from "./store";
import { beginSync, startSync, stepSync } from "./sync";

const intervalHours = () => Number(process.env.AUTO_SYNC_HOURS ?? 6);

/** A workspace is due when it's mid-run or its last run finished more than AUTO_SYNC_HOURS ago. */
function due(sync: { running: boolean; finishedAt?: string }, hours: number) {
  if (sync.running) return true;
  if (!sync.finishedAt) return true;
  return Date.now() - new Date(sync.finishedAt).getTime() > hours * 3600_000 - 60_000;
}

/**
 * Cron entry point (Vercel Cron / external schedulers). Starts or continues each due workspace's sync,
 * spending at most `budgetMs` in total. Runs that don't finish resume on the next call.
 */
export async function runCronSyncs(budgetMs: number): Promise<{ advanced: string[]; finished: string[] }> {
  const deadline = Date.now() + budgetMs;
  const advanced: string[] = [], finished: string[] = [];
  const hours = intervalHours() > 0 ? intervalHours() : 6;
  for (const id of await listCompanyIds()) {
    if (Date.now() > deadline - 2_000) break;
    const store = await loadStore(id);
    if (!store || store.mode !== "live" || !store.auth || !due(store.sync, hours)) continue;
    if (!store.sync.running) await beginSync(store);
    if (await stepSync(store, Math.max(1_000, deadline - Date.now() - 2_000))) finished.push(id);
    advanced.push(id);
  }
  return { advanced, finished };
}

/** Long-running hosts: sync every connected workspace, one at a time. */
export async function runScheduledSyncs(): Promise<string[]> {
  const started: string[] = [];
  for (const id of await listCompanyIds()) {
    const store = await loadStore(id);
    if (!store || store.mode !== "live" || !store.auth || store.sync.running) continue;
    started.push(id);
    try {
      await startSync(store);
    } catch (e) {
      console.error(`[scheduler] sync failed for ${id}`, e);
    }
  }
  return started;
}

const g = globalThis as unknown as { __gvScheduler?: NodeJS.Timeout };

/** In-process schedule for long-running Node hosts. Not used on serverless (use Vercel Cron). */
export function startScheduler() {
  const hours = intervalHours();
  if (!(hours > 0) || g.__gvScheduler || process.env.VERCEL || process.env.GV_DISABLE_SCHEDULER) return;
  let running = false;
  g.__gvScheduler = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const ids = await runScheduledSyncs();
      if (ids.length) console.log(`[scheduler] synced ${ids.length} workspace${ids.length === 1 ? "" : "s"}`);
    } finally {
      running = false;
    }
  }, hours * 3600_000);
  g.__gvScheduler.unref?.();
  console.log(`[scheduler] auto-sync every ${hours}h`);
}
