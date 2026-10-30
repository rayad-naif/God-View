import { NextResponse } from "next/server";
import { clientIp } from "@/lib/context";
import { sessionCookie, userSessionToken } from "@/lib/session";
import { clearFailures, findUserByEmail, normaliseEmail, rateLimited, recordFailure, updateUser, verifyPassword } from "@/lib/users";

/** Old links pointed here to start OAuth. */
export function GET(req: Request) {
  return NextResponse.redirect(new URL("/api/auth/connect", req.url));
}

/** Email + password sign-in. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = normaliseEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  const ipKey = `ip:${clientIp(req)}`, emailKey = `email:${email}`;
  if ((await rateLimited(ipKey, 30)) || (await rateLimited(emailKey))) {
    return NextResponse.json({ error: "Too many attempts. Wait 15 minutes and try again." }, { status: 429 });
  }
  const user = email ? await findUserByEmail(email) : undefined;
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) {
    await Promise.all([recordFailure(ipKey), recordFailure(emailKey)]);
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
  await clearFailures(emailKey);
  await updateUser(user.id, { lastLoginAt: new Date().toISOString() });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie.name, userSessionToken(user.id, user.sessionVersion), sessionCookie.options);
  return res;
}
