import { NextResponse } from "next/server";
import { getSetupTicket, setupCookie } from "@/lib/session";
import { createUser, findUserByCompany, findUserByEmail, normaliseEmail, passwordProblem, updateUser, validEmail } from "@/lib/users";

/** Creates (or resets) the email + password login, using the ticket issued after CRM OAuth. */
export async function POST(req: Request) {
  const ticket = getSetupTicket();
  if (!ticket) return NextResponse.json({ error: "This setup link has expired. Connect your CRM again to continue." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const email = normaliseEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  if (!validEmail(email)) return NextResponse.json({ error: "Enter a valid email address.", field: "email" }, { status: 400 });
  const problem = passwordProblem(password, email);
  if (problem) return NextResponse.json({ error: problem, field: "password" }, { status: 400 });
  if (body.confirm !== undefined && body.confirm !== password) return NextResponse.json({ error: "Passwords don’t match.", field: "confirm" }, { status: 400 });

  const owner = await findUserByCompany(ticket.cid);
  const taken = await findUserByEmail(email);
  if (taken && taken.id !== owner?.id) return NextResponse.json({ error: "That email is already used by another workspace.", field: "email" }, { status: 409 });

  if (owner) await updateUser(owner.id, { email, password });
  else await createUser(email, password, ticket.cid);

  const res = NextResponse.json({ ok: true, next: `/login?notice=${owner ? "reset" : "created"}&email=${encodeURIComponent(email)}` });
  res.cookies.delete(setupCookie.name);
  return res;
}
