import { NextResponse } from "next/server";
import { getSession, sessionCookie, userSessionToken } from "@/lib/session";
import { findUserByEmail, getUser, normaliseEmail, passwordProblem, updateUser, validEmail, verifyPassword } from "@/lib/users";

/** Change email and/or password (requires the current password). Signs out other sessions on password change. */
export async function POST(req: Request) {
  const session = await getSession();
  if (session?.kind !== "user") return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const user = await getUser(session.userId);
  const body = await req.json().catch(() => ({}));
  if (!user || !(await verifyPassword(String(body.current ?? ""), user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect.", field: "current" }, { status: 401 });
  }
  const patch: { email?: string; password?: string } = {};
  if (body.email !== undefined && normaliseEmail(body.email) !== user.email) {
    const email = normaliseEmail(String(body.email));
    if (!validEmail(email)) return NextResponse.json({ error: "Enter a valid email address.", field: "email" }, { status: 400 });
    if (await findUserByEmail(email)) return NextResponse.json({ error: "That email is already in use.", field: "email" }, { status: 409 });
    patch.email = email;
  }
  if (body.password) {
    const problem = passwordProblem(String(body.password), patch.email ?? user.email);
    if (problem) return NextResponse.json({ error: problem, field: "password" }, { status: 400 });
    patch.password = String(body.password);
  }
  const updated = await updateUser(user.id, patch);
  const res = NextResponse.json({ ok: true, email: updated!.email });
  res.cookies.set(sessionCookie.name, userSessionToken(updated!.id, updated!.sessionVersion), sessionCookie.options);
  return res;
}
