import crypto from "crypto";
import { NextResponse } from "next/server";
import { authorizeUrl, ghlConfigured } from "@/lib/ghl/oauth";

/** Starts the CRM OAuth flow. `?intent=reset` re-verifies CRM ownership to reset a forgotten password. */
export async function GET(req: Request) {
  if (!ghlConfigured()) {
    return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("CRM connection isn’t configured on this server yet. See Docs → Self-hosting."), req.url));
  }
  const intent = new URL(req.url).searchParams.get("intent") === "reset" ? "reset" : "connect";
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(state));
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };
  res.cookies.set("gv_oauth_state", state, opts);
  res.cookies.set("gv_oauth_intent", intent, opts);
  return res;
}
