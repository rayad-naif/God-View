import { promises as fs } from "fs";
import path from "path";

/**
 * Minimal key-value store. Upstash Redis (REST) when configured, otherwise JSON files under DATA_DIR.
 * Upstash: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (Vercel's Upstash integration also sets
 * KV_REST_API_URL + KV_REST_API_TOKEN, which work too).
 */
export interface KV {
  readonly kind: "redis" | "file";
  get(key: string): Promise<string | null>;
  mget(keys: string[]): Promise<(string | null)[]>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  /** Sets only if absent. Returns true when this call set it. */
  setNX(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  del(...keys: string[]): Promise<void>;
  /** Atomic increment; the TTL applies when the key is created. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  hincrby(key: string, field: string, by: number): Promise<void>;
  hgetall(key: string): Promise<Record<string, number>>;
  /** Many HGETALLs in one round trip. */
  hgetallMany(keys: string[]): Promise<Record<string, number>[]>;
  sadd(key: string, member: string): Promise<void>;
  srem(key: string, member: string): Promise<void>;
  smembers(key: string): Promise<string[]>;
}

export function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

class RedisKV implements KV {
  readonly kind = "redis" as const;
  constructor(private url: string, private token: string) {}

  private async cmd<T = unknown>(...args: (string | number)[]): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(this.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(args.map(String)),
        cache: "no-store",
      });
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 200 * 2 ** attempt));
        continue;
      }
      const data = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
      if (!res.ok || data.error) throw new Error(`Redis ${args[0]} failed: ${data.error ?? res.status}`);
      return data.result as T;
    }
  }

  get(key: string) { return this.cmd<string | null>("GET", key); }
  async mget(keys: string[]) { return keys.length ? this.cmd<(string | null)[]>("MGET", ...keys) : []; }
  async set(key: string, value: string, ttl?: number) { await (ttl ? this.cmd("SET", key, value, "EX", ttl) : this.cmd("SET", key, value)); }
  async setNX(key: string, value: string, ttl: number) { return (await this.cmd<string | null>("SET", key, value, "NX", "EX", ttl)) === "OK"; }
  async del(...keys: string[]) { if (keys.length) await this.cmd("DEL", ...keys); }
  async incr(key: string, ttl: number) {
    const n = await this.cmd<number>("INCR", key);
    if (n === 1) await this.cmd("EXPIRE", key, ttl);
    return n;
  }
  async hincrby(key: string, field: string, by: number) { await this.cmd("HINCRBY", key, field, by); }
  async hgetall(key: string) {
    const flat = await this.cmd<string[]>("HGETALL", key);
    const out: Record<string, number> = {};
    for (let i = 0; i + 1 < (flat?.length ?? 0); i += 2) out[flat[i]] = Number(flat[i + 1]);
    return out;
  }
  async hgetallMany(keys: string[]) {
    if (!keys.length) return [];
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(keys.map((k) => ["HGETALL", k])),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Redis pipeline failed: ${res.status}`);
    const rows = (await res.json()) as { result?: string[]; error?: string }[];
    return rows.map((r) => {
      const out: Record<string, number> = {};
      const flat = r.result ?? [];
      for (let i = 0; i + 1 < flat.length; i += 2) out[flat[i]] = Number(flat[i + 1]);
      return out;
    });
  }
  async sadd(key: string, m: string) { await this.cmd("SADD", key, m); }
  async srem(key: string, m: string) { await this.cmd("SREM", key, m); }
  async smembers(key: string) { return (await this.cmd<string[]>("SMEMBERS", key)) ?? []; }
}

type Entry = { v: unknown; exp?: number };

/** Single-process file store (Docker / local). One JSON file per key. */
class FileKV implements KV {
  readonly kind = "file" as const;
  private dir = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "kv");
  private locks = new Map<string, Promise<unknown>>();

  private file(key: string) {
    return path.join(this.dir, Buffer.from(key).toString("base64url") + ".json");
  }
  private async read(key: string): Promise<Entry | null> {
    try {
      const e = JSON.parse(await fs.readFile(this.file(key), "utf8")) as Entry;
      if (e.exp && e.exp < Date.now()) return null;
      return e;
    } catch {
      return null;
    }
  }
  private async write(key: string, e: Entry) {
    await fs.mkdir(this.dir, { recursive: true });
    const f = this.file(key);
    const tmp = `${f}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(e), { mode: 0o600 });
    await fs.rename(tmp, f);
  }
  /** Serialises read-modify-write per key inside this process. */
  private locked<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    this.locks.set(key, next.catch(() => {}));
    return next;
  }

  async get(key: string) { const e = await this.read(key); return e ? (e.v as string) : null; }
  async mget(keys: string[]) { return Promise.all(keys.map((k) => this.get(k))); }
  async set(key: string, value: string, ttl?: number) { await this.locked(key, () => this.write(key, { v: value, exp: ttl ? Date.now() + ttl * 1000 : undefined })); }
  setNX(key: string, value: string, ttl: number) {
    return this.locked(key, async () => {
      if (await this.read(key)) return false;
      await this.write(key, { v: value, exp: Date.now() + ttl * 1000 });
      return true;
    });
  }
  async del(...keys: string[]) { await Promise.all(keys.map((k) => this.locked(k, () => fs.rm(this.file(k), { force: true })))); }
  incr(key: string, ttl: number) {
    return this.locked(key, async () => {
      const e = await this.read(key);
      const n = (Number(e?.v) || 0) + 1;
      await this.write(key, { v: String(n), exp: e?.exp ?? Date.now() + ttl * 1000 });
      return n;
    });
  }
  async hincrby(key: string, field: string, by: number) {
    await this.locked(key, async () => {
      const h = ((await this.read(key))?.v as Record<string, number>) ?? {};
      h[field] = (h[field] ?? 0) + by;
      await this.write(key, { v: h });
    });
  }
  async hgetall(key: string) { return ((await this.read(key))?.v as Record<string, number>) ?? {}; }
  hgetallMany(keys: string[]) { return Promise.all(keys.map((k) => this.hgetall(k))); }
  async sadd(key: string, m: string) {
    await this.locked(key, async () => {
      const s = new Set(((await this.read(key))?.v as string[]) ?? []);
      s.add(m);
      await this.write(key, { v: [...s] });
    });
  }
  async srem(key: string, m: string) {
    await this.locked(key, async () => {
      const s = new Set(((await this.read(key))?.v as string[]) ?? []);
      s.delete(m);
      await this.write(key, { v: [...s] });
    });
  }
  async smembers(key: string) { return ((await this.read(key))?.v as string[]) ?? []; }
}

const g = globalThis as unknown as { __gvKV?: KV };
export function kv(): KV {
  if (!g.__gvKV) {
    const r = redisConfig();
    if (!r && isServerless()) {
      // Serverless file systems are temporary: logins and tokens would silently disappear.
      throw new Error("Storage is not configured: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (Vercel → Storage → Upstash Redis).");
    }
    g.__gvKV = r ? new RedisKV(r.url, r.token) : new FileKV();
  }
  return g.__gvKV;
}

/** Vercel (and other serverless hosts) stop work after the response is sent. */
export const isServerless = () => Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.SERVERLESS === "true");
