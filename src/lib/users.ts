import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

export type User = {
  id: string;
  email: string;
  companyId: string;
  passwordHash: string;
  /** Bumped on password change to sign out other sessions. */
  sessionVersion: number;
  createdAt: string;
  lastLoginAt?: string;
};

const FILE = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "users.json");
const g = globalThis as unknown as { __gvUsers?: User[]; __gvUsersLock?: Promise<void> };

async function all(): Promise<User[]> {
  if (g.__gvUsers) return g.__gvUsers;
  try {
    g.__gvUsers = JSON.parse(await fs.readFile(FILE, "utf8")).users ?? [];
  } catch {
    g.__gvUsers = [];
  }
  return g.__gvUsers!;
}

async function persist(users: User[]) {
  g.__gvUsers = users;
  const prev = g.__gvUsersLock ?? Promise.resolve();
  const next = prev.then(async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify({ users }), { mode: 0o600 });
    await fs.rename(tmp, FILE);
  });
  g.__gvUsersLock = next.catch(() => {});
  return next;
}

export const normaliseEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;

export function passwordProblem(pw: string, email?: string): string | null {
  if (typeof pw !== "string" || pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 200) return "Use at most 200 characters.";
  if (email && pw.toLowerCase().includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4) return "Don’t include your email name in the password.";
  if (/^(.)\1+$/.test(pw) || /^(0123456789|1234567890|password\d*|qwertyuiop)$/i.test(pw)) return "That password is too easy to guess.";
  return null;
}

// scrypt (N=2^15, r=8, p=1) – memory-hard, built into Node.
const N = 32768, R = 8, P = 1, KEYLEN = 64;
const scrypt = (pw: string, salt: Buffer) =>
  new Promise<Buffer>((res, rej) => crypto.scrypt(pw.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 }, (e, k) => (e ? rej(e) : res(k))));

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${(await scrypt(pw, salt)).toString("base64url")}`;
}

const DUMMY = "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86);
export async function verifyPassword(pw: string, stored: string | undefined): Promise<boolean> {
  const [, , , , saltB64, hashB64] = (stored ?? DUMMY).split("$");
  const expected = Buffer.from(hashB64, "base64url");
  const got = await scrypt(pw, Buffer.from(saltB64, "base64url")); // always hash, so unknown emails take as long
  return Boolean(stored) && got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

export const getUser = async (id: string) => (await all()).find((u) => u.id === id);
export const findUserByEmail = async (email: string) => (await all()).find((u) => u.email === normaliseEmail(email));
export const findUserByCompany = async (companyId: string) => (await all()).find((u) => u.companyId === companyId);

export async function createUser(email: string, password: string, companyId: string): Promise<User> {
  const users = await all();
  const user: User = {
    id: crypto.randomUUID(),
    email: normaliseEmail(email),
    companyId,
    passwordHash: await hashPassword(password),
    sessionVersion: 1,
    createdAt: new Date().toISOString(),
  };
  await persist([...users, user]);
  return user;
}

export async function updateUser(id: string, patch: Partial<Pick<User, "email" | "lastLoginAt">> & { password?: string }): Promise<User | undefined> {
  const users = await all();
  const u = users.find((x) => x.id === id);
  if (!u) return undefined;
  if (patch.email) u.email = normaliseEmail(patch.email);
  if (patch.lastLoginAt) u.lastLoginAt = patch.lastLoginAt;
  if (patch.password) {
    u.passwordHash = await hashPassword(patch.password);
    u.sessionVersion++;
  }
  await persist(users);
  return u;
}

export async function deleteUsersForCompany(companyId: string) {
  await persist((await all()).filter((u) => u.companyId !== companyId));
}

// ---- brute-force protection ----
const attempts = new Map<string, number[]>();
/** Returns true when the key has exceeded `max` failures in the window. */
export function rateLimited(key: string, max = 8, windowMs = 15 * 60_000): boolean {
  const now = Date.now();
  const list = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  attempts.set(key, list);
  return list.length >= max;
}
export function recordFailure(key: string) {
  attempts.set(key, [...(attempts.get(key) ?? []), Date.now()]);
}
export function clearFailures(key: string) {
  attempts.delete(key);
}
