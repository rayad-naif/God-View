import crypto from "crypto";
import type { CompanyStore, PushJob, PushTargetStatus } from "./types";
import { loadStore, saveStore } from "./store";
import { isServerless, kv } from "./kv";
import { pushSnapshot, snapshotPushStatus } from "./ghl/resources";
import { advanceDemoJob } from "./demo";

export async function createPushJob(
  store: CompanyStore,
  input: { snapshotId: string; snapshotName: string; sourceLocationId?: string; targetIds: string[]; override: boolean },
): Promise<PushJob> {
  const now = new Date().toISOString();
  const job: PushJob = {
    id: crypto.randomUUID(),
    createdAt: now,
    snapshotId: input.snapshotId,
    snapshotName: input.snapshotName,
    sourceLocationId: input.sourceLocationId,
    sourceName: input.sourceLocationId ? store.accounts[input.sourceLocationId]?.name : undefined,
    override: input.override,
    targets: input.targetIds.map((id) => ({ locationId: id, name: store.accounts[id]?.name ?? id, status: "queued", updatedAt: now })),
  };
  store.pushJobs.unshift(job);
  store.pushJobs = store.pushJobs.slice(0, 50);
  await saveStore(store, ["jobs"]);
  if (store.mode === "live") {
    // Serverless: send what fits in this request; the progress poll sends the rest.
    if (isServerless()) await processJobs(store, 20_000);
    else void (async () => { while (await processJobs(store, 60_000)) await new Promise((r) => setTimeout(r, 500)); })();
  }
  return job;
}

const jobsLock = (companyId: string) => `gv:co:${companyId}:jobslock`;

/**
 * Sends queued pushes and polls the status of ones the CRM is still loading, until `budgetMs` is used.
 * Runs under a per-workspace lock so concurrent polls never send the same push twice.
 * Returns true if queued targets remain.
 */
async function processJobs(store: CompanyStore, budgetMs: number): Promise<boolean> {
  const db = kv();
  if (!(await db.setNX(jobsLock(store.companyId), "1", 90))) return false;
  try {
    const fresh = await loadStore(store.companyId);
    if (fresh) store.pushJobs = fresh.pushJobs;
    const deadline = Date.now() + budgetMs;
    let changed = false;

    for (const job of store.pushJobs.slice(0, 10)) {
      if (store.mode === "demo") { advanceDemoJob(job); changed = true; continue; }
      // Pushes are heavy on the CRM's side: send 2 at a time.
      const queued = job.targets.filter((t) => t.status === "queued");
      await Promise.all([0, 1].map(async () => {
        for (let t = queued.shift(); t && Date.now() < deadline; t = queued.shift()) {
          t.status = "pushing";
          try {
            await pushSnapshot(store, t.locationId, job.snapshotId, job.override);
            t.status = "processing";
          } catch (e: any) {
            t.status = "failed";
            t.message = String(e?.message ?? e).slice(0, 240);
          }
          t.updatedAt = new Date().toISOString();
          changed = true;
          await saveStore(store, ["jobs", "auth"]);
        }
      }));
      for (const t of job.targets) {
        if (t.status !== "processing" || Date.now() > deadline) continue;
        // Give up polling after 30 minutes; the CRM usually finishes in a few.
        if (Date.now() - new Date(t.updatedAt).getTime() > 30 * 60_000) continue;
        try {
          const s = normalise(await snapshotPushStatus(store, job.snapshotId, t.locationId));
          if (s && s !== t.status) { t.status = s; t.updatedAt = new Date().toISOString(); changed = true; }
        } catch { /* transient; try again next poll */ }
      }
    }
    if (changed) await saveStore(store, ["jobs"]);
    return store.pushJobs.some((j) => j.targets.some((t) => t.status === "queued"));
  } finally {
    await db.del(jobsLock(store.companyId));
  }
}

function normalise(s: string | null): PushTargetStatus | null {
  if (!s) return null;
  if (/complete|success|done|finished/.test(s)) return "completed";
  if (/fail|error/.test(s)) return "failed";
  return "processing";
}

/** Advances jobs (sends queued pushes, refreshes statuses) and returns the latest list. */
export async function refreshJobs(store: CompanyStore): Promise<PushJob[]> {
  await processJobs(store, isServerless() ? 20_000 : 5_000);
  return store.pushJobs;
}
