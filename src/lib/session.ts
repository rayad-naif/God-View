import crypto from "crypto";
import { cookies } from "next/headers";
import { getUser } from "./users";

const COOKIE = "gv_session";
const SETUP_COOKIE = "gv_setup";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (16+ chars)");
    return "dev-only-insecure-session-secret";
  }
  return s;
}

const sign = (value: string) => crypto.createHmac("sha256", secret()).update(value).digest("base64url");

/** Signed, expiring token: base64url(JSON).hmac */
export function signToken(payload: Record<string, unknown>, ttlSeconds: number): string {
  const v = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlSeconds * 1000 })).toString("base64url");
  return `${v}.${sign(v)}`;
}

export function verifyToken<T = Record<string, unknown>>(raw: string | undefined): (T & { exp: number }) | null {
  if (!raw) return null;
  const [v, sig] = raw.split(".");
  if (!v || !sig) return null;
  const expected = sign(v);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(v, "base64url").toString());
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

const SESSION_TTL = 60 * 60 * 24 * 14;

export type Session = { kind: "user"; userId: string; email: string; companyId: string } | { kind: "demo"; companyId: "demo" };

export function userSessionToken(userId: string, sessionVersion: number) {
  return signToken({ k: "u", uid: userId, sv: sessionVersion }, SESSION_TTL);
}
export function demoSessionToken() {
  return signToken({ k: "demo" }, SESSION_TTL);
}

/** Resolves the signed-in user (or demo visitor). Password changes invalidate older sessions. */
export async function getSession(): Promise<Session | null> {
  const t = verifyToken<{ k: string; uid?: string; sv?: number }>(cookies().get(COOKIE)?.value);
  if (!t) return null;
  if (t.k === "demo") return { kind: "demo", companyId: "demo" };
  if (t.k !== "u" || !t.uid) return null;
  const user = await getUser(t.uid);
  if (!user || user.sessionVersion !== t.sv) return null;
  return { kind: "user", userId: user.id, email: user.email, companyId: user.companyId };
}

export const sessionCookie = {
  name: COOKIE,
  options: { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_TTL },
};

// ---- post-OAuth account setup ----

export type SetupTicket = { cid: string; mode: "create" | "reset"; name?: string };
export const setupCookie = {
  name: SETUP_COOKIE,
  options: { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 60 },
};
export function setupToken(t: SetupTicket) {
  return signToken({ ...t, k: "setup" }, 30 * 60);
}
export function getSetupTicket(): SetupTicket | null {
  const t = verifyToken<SetupTicket & { k: string }>(cookies().get(SETUP_COOKIE)?.value);
  return t && t.k === "setup" ? { cid: t.cid, mode: t.mode, name: t.name } : null;
}
