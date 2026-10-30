import { promises as fs } from "fs";
import path from "path";
import type { Account, AuthTokens, CompanyStore, PushJob, Settings, SyncState } from "./types";
import { decrypt, encrypt } from "./crypto";
import { crmEnv } from "@/lib/env";
import { kv } from "./kv";

export const DEFAULT_SETTINGS: Settings = {
  churnThreshold: 3,
  churnDays: 3,
  adSpendCustomValueKey: crmEnv("AD_SPEND_CUSTOM_VALUE") || "ad_spend_daily",
  syncWindowDays: 60,
};

/*
 * A company is stored as separate keys so that concurrent writers (a sync step, a push, a settings
 * save, a token refresh) never overwrite each other's data:
 *   gv:companies                  set of company ids
 *   gv:co:<id>:meta               name, mode, settings, alert state
 *   gv:co:<id>:auth               OAuth tokens (encrypted)
 *   gv:co:<id>:tokens             per-account tokens (encrypted)
 *   gv:co:<id>:sync               sync progress + resumable queue
 *   gv:co:<id>:jobs               snapshot push jobs
 *   gv:co:<id>:accts              set of account ids
 *   gv:co:<id>:acct:<accountId>   one account's metrics
 *   gv:co:<id>:email:<accountId>  email event counters (hash, see email.ts)
 */
const K = {
  companies: "gv:companies",
  meta: (c: string) => `gv:co:${c}:meta`,
  auth: (c: string) => `gv:co:${c}:auth`,
  tokens: (c: string) => `gv:co:${c}:tokens`,
  sync: (c: string) => `gv:co:${c}:sync`,
  jobs: (c: string) => `gv:co:${c}:jobs`,
  accts: (c: string) => `gv:co:${c}:accts`,
  acct: (c: string, a: string) => `gv:co:${c}:acct:${a}`,
  email: (c: string, a: string) => `gv:co:${c}:email:${a}`,
};
export const storeKeys = K;

export type Part = "meta" | "auth" | "tokens" | "sync" | "jobs" | "accounts";
const ALL: Part[] = ["meta", "auth", "tokens", "sync", "jobs", "accounts"];

export function emptyStore(companyId: string, mode: "live" | "demo"): CompanyStore {
  return {
    companyId,
    mode,
    locationTokens: {},
    accounts: {},
    settings: { ...DEFAULT_SETTINGS },
    pushJobs: [],
    sync: { running: false, total: 0, done: 0, errors: 0 },
  };
}

const parse = <T,>(s: string | null): T | undefined => {
  if (!s) return undefined;
  try { return JSON.parse(s) as T; } catch { return undefined; }
};

export async function loadStore(companyId: string): Promise<CompanyStore | null> {
  const db = kv();
  const [meta, auth, tokens, sync, jobs] = await db.mget([K.meta(companyId), K.auth(companyId), K.tokens(companyId), K.sync(companyId), K.jobs(companyId)]);
  if (!meta) return migrateLegacyFile(companyId);
  const m = parse<{ companyName?: string; mode: "live" | "demo"; settings?: Partial<Settings>; alertedChurn?: string[]; alertedEmail?: string[]; uninstalledAt?: string }>(meta)!;
  const ids = await db.smembers(K.accts(companyId));
  const rows = await db.mget(ids.map((a) => K.acct(companyId, a)));
  const accounts: Record<string, Account> = {};
  rows.forEach((r) => { const a = parse<Account>(r); if (a) accounts[a.id] = a; });

  const a = parse<AuthTokens>(auth);
  if (a) { a.accessToken = decrypt(a.accessToken); a.refreshToken = decrypt(a.refreshToken); }
  const t = parse<Record<string, { token: string; expiresAt: number }>>(tokens) ?? {};
  for (const v of Object.values(t)) v.token = decrypt(v.token);

  return {
    companyId,
    companyName: m.companyName,
    mode: m.mode,
    settings: { ...DEFAULT_SETTINGS, ...m.settings },
    alertedChurn: m.alertedChurn,
    alertedEmail: m.alertedEmail,
    uninstalledAt: m.uninstalledAt,
    auth: a,
    locationTokens: t,
    sync: parse<SyncState>(sync) ?? { running: false, total: 0, done: 0, errors: 0 },
    pushJobs: parse<PushJob[]>(jobs) ?? [],
    accounts,
  };
}

/**
 * Persists the given parts (all by default). `accountIds` limits which account rows are written
 * when "accounts" is included.
 */
export async function saveStore(store: CompanyStore, parts: Part[] = ALL, accountIds?: string[]): Promise<void> {
  const db = kv();
  const c = store.companyId;
  const w: Promise<unknown>[] = [db.sadd(K.companies, c)];
  if (parts.includes("meta")) {
    w.push(db.set(K.meta(c), JSON.stringify({ companyName: store.companyName, mode: store.mode, settings: store.settings, alertedChurn: store.alertedChurn, alertedEmail: store.alertedEmail, uninstalledAt: store.uninstalledAt })));
  }
  if (parts.includes("auth")) {
    if (store.auth) w.push(db.set(K.auth(c), JSON.stringify({ ...store.auth, accessToken: encrypt(store.auth.accessToken), refreshToken: encrypt(store.auth.refreshToken) })));
    else w.push(db.del(K.auth(c)));
  }
  if (parts.includes("tokens")) {
    w.push(db.set(K.tokens(c), JSON.stringify(Object.fromEntries(Object.entries(store.locationTokens).map(([k, v]) => [k, { ...v, token: encrypt(v.token) }])))));
  }
  if (parts.includes("sync")) w.push(db.set(K.sync(c), JSON.stringify(store.sync)));
  if (parts.includes("jobs")) w.push(db.set(K.jobs(c), JSON.stringify(store.pushJobs.slice(0, 50))));
  if (parts.includes("accounts")) {
    for (const id of accountIds ?? Object.keys(store.accounts)) {
      const acc = store.accounts[id];
      if (!acc) continue;
      w.push(db.set(K.acct(c, id), JSON.stringify(acc)), db.sadd(K.accts(c), id));
    }
  }
  await Promise.all(w);
}

/** Fresh sync state (used after taking the sync lock, so a stale copy is never resumed). */
export async function loadSyncState(companyId: string): Promise<SyncState | undefined> {
  return parse<SyncState>(await kv().get(K.sync(companyId)));
}

export async function loadAccount(companyId: string, accountId: string): Promise<Account | undefined> {
  return parse<Account>(await kv().get(K.acct(companyId, accountId)));
}

export async function deleteAccount(companyId: string, accountId: string): Promise<void> {
  const db = kv();
  await Promise.all([db.del(K.acct(companyId, accountId), K.email(companyId, accountId)), db.srem(K.accts(companyId), accountId)]);
}

/** Company ids with saved data (for scheduled syncs). */
export async function listCompanyIds(): Promise<string[]> {
  return kv().smembers(K.companies);
}

export async function deleteStore(companyId: string): Promise<void> {
  const db = kv();
  const ids = await db.smembers(K.accts(companyId));
  await db.del(
    K.meta(companyId), K.auth(companyId), K.tokens(companyId), K.sync(companyId), K.jobs(companyId), K.accts(companyId),
    ...ids.flatMap((a) => [K.acct(companyId, a), K.email(companyId, a)]),
  );
  await db.srem(K.companies, companyId);
}

/** Imports a pre-Redis `data/company-<id>.json` file once (Docker installs upgrading in place). */
async function migrateLegacyFile(companyId: string): Promise<CompanyStore | null> {
  if (kv().kind !== "file") return null;
  const file = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), `company-${companyId.replace(/[^a-zA-Z0-9_-]/g, "")}.json`);
  try {
    const old = JSON.parse(await fs.readFile(file, "utf8")) as CompanyStore;
    if (old.auth) { old.auth.accessToken = decrypt(old.auth.accessToken); old.auth.refreshToken = decrypt(old.auth.refreshToken); }
    for (const v of Object.values(old.locationTokens ?? {})) v.token = decrypt(v.token);
    const store: CompanyStore = { ...emptyStore(companyId, old.mode), ...old, settings: { ...DEFAULT_SETTINGS, ...old.settings }, sync: { ...old.sync, running: false } };
    await saveStore(store);
    await fs.rename(file, `${file}.migrated`);
    return store;
  } catch {
    return null;
  }
}
