import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { kv } from "./kv";

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

const UK = {
  user: (id: string) => `gv:user:${id}`,
  byEmail: (email: string) => `gv:user-email:${email}`,
  byCompany: (cid: string) => `gv:user-co:${cid}`,
};

async function loadUser(id: string | null): Promise<User | undefined> {
  if (!id) return undefined;
  const raw = await kv().get(UK.user(id));
  return raw ? (JSON.parse(raw) as User) : undefined;
}
async function saveUser(u: User) {
  await kv().set(UK.user(u.id), JSON.stringify(u));
}

/** One-time import of the pre-Redis data/users.json file. */
let migrated = false;
async function migrateLegacyUsers() {
  if (migrated || kv().kind !== "file") return;
  migrated = true;
  const file = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "users.json");
  try {
    const users = (JSON.parse(await fs.readFile(file, "utf8")).users ?? []) as User[];
    for (const u of users) {
      await saveUser(u);
      await kv().set(UK.byEmail(u.email), u.id);
      await kv().set(UK.byCompany(u.companyId), u.id);
    }
    await fs.rename(file, `${file}.migrated`);
  } catch { /* nothing to migrate */ }
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

export async function getUser(id: string) {
  await migrateLegacyUsers();
  return loadUser(id);
}
export async function findUserByEmail(email: string) {
  await migrateLegacyUsers();
  return loadUser(await kv().get(UK.byEmail(normaliseEmail(email))));
}
export async function findUserByCompany(companyId: string) {
  await migrateLegacyUsers();
  return loadUser(await kv().get(UK.byCompany(companyId)));
}

export async function createUser(email: string, password: string, companyId: string): Promise<User> {
  const user: User = {
    id: crypto.randomUUID(),
    email: normaliseEmail(email),
    companyId,
    passwordHash: await hashPassword(password),
    sessionVersion: 1,
    createdAt: new Date().toISOString(),
  };
  // Claim the email atomically so two signups can't take the same address.
  if (!(await kv().setNX(UK.byEmail(user.email), user.id, 60 * 60 * 24 * 365 * 100))) throw new Error("That email is already in use.");
  await saveUser(user);
  await kv().set(UK.byCompany(companyId), user.id);
  return user;
}

export async function updateUser(id: string, patch: Partial<Pick<User, "email" | "lastLoginAt">> & { password?: string }): Promise<User | undefined> {
  const u = await loadUser(id);
  if (!u) return undefined;
  if (patch.email && normaliseEmail(patch.email) !== u.email) {
    const next = normaliseEmail(patch.email);
    if (!(await kv().setNX(UK.byEmail(next), u.id, 60 * 60 * 24 * 365 * 100))) throw new Error("That email is already in use.");
    await kv().del(UK.byEmail(u.email));
    u.email = next;
  }
  if (patch.lastLoginAt) u.lastLoginAt = patch.lastLoginAt;
  if (patch.password) {
    u.passwordHash = await hashPassword(patch.password);
    u.sessionVersion++;
  }
  await saveUser(u);
  return u;
}

export async function deleteUsersForCompany(companyId: string) {
  const u = await findUserByCompany(companyId);
  if (!u) return;
  await kv().del(UK.user(u.id), UK.byEmail(u.email), UK.byCompany(companyId));
}

// ---- brute-force protection (shared across serverless instances via the KV store) ----
const WINDOW = 15 * 60;
const rlKey = (key: string) => `gv:rl:${key}`;
/** True when the key has `max` or more recorded failures in the last 15 minutes. */
export async function rateLimited(key: string, max = 8): Promise<boolean> {
  return Number(await kv().get(rlKey(key))) >= max;
}
export async function recordFailure(key: string) {
  await kv().incr(rlKey(key), WINDOW);
}
export async function clearFailures(key: string) {
  await kv().del(rlKey(key));
}
