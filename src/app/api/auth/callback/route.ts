import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode } from "@/lib/ghl/oauth";
import { emptyStore, loadStore, saveStore } from "@/lib/store";
import { getSession, setupCookie, setupToken } from "@/lib/session";
import { findUserByCompany } from "@/lib/users";
import { startSync } from "@/lib/sync";
import { getCompanyName } from "@/lib/ghl/resources";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = (p: string) => new URL(p, req.url);
  const fail = (msg: string) => NextResponse.redirect(to("/login?error=" + encodeURIComponent(msg)));
  const code = url.searchParams.get("code");
  if (!code) return fail(url.searchParams.get("error_description") ?? "The CRM didn’t return an authorization code. Please try again.");

  // Installs started from the CRM's marketplace arrive without our state; ones we started must match.
  const state = url.searchParams.get("state");
  const expected = cookies().get("gv_oauth_state")?.value;
  if (state && expected && state !== expected) return fail("Security check failed. Please start the connection again.");
  const intent = cookies().get("gv_oauth_intent")?.value;

  try {
    const t = await exchangeCode(code);
    if (!t.companyId) return fail("The CRM didn’t identify your workspace. Please try again.");
    if (t.userType && t.userType !== "Company") {
      return fail("Connect God View at the top (workspace) level of your CRM so it can read every account, not from inside a single account.");
    }

    const store = (await loadStore(t.companyId)) ?? emptyStore(t.companyId, "live");
    store.mode = "live";
    store.uninstalledAt = undefined;
    store.auth = {
      companyId: t.companyId,
      userId: t.userId,
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: Date.now() + t.expires_in * 1000,
      scope: t.scope,
    };
    store.locationTokens = {};
    if (!store.companyName) store.companyName = await getCompanyName(store);
    await saveStore(store);
    void startSync(store);

    const owner = await findUserByCompany(t.companyId);
    const session = await getSession();
    let res: NextResponse;
    if (!owner || intent === "reset") {
      // First connection (or password reset): verified CRM ownership → set email + password.
      res = NextResponse.redirect(to("/setup"));
      res.cookies.set(setupCookie.name, setupToken({ cid: t.companyId, mode: owner ? "reset" : "create", name: store.companyName }), setupCookie.options);
    } else if (session?.kind === "user" && session.companyId === t.companyId) {
      res = NextResponse.redirect(to("/settings?notice=reconnected"));
    } else {
      res = NextResponse.redirect(to(`/login?notice=reconnected&email=${encodeURIComponent(owner.email)}`));
    }
    res.cookies.delete("gv_oauth_state");
    res.cookies.delete("gv_oauth_intent");
    return res;
  } catch (e: any) {
    return fail(e?.message ?? "Couldn’t complete the CRM connection.");
  }
}
