import { NextResponse } from "next/server";
import { demoSessionToken, sessionCookie } from "@/lib/session";

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set(sessionCookie.name, demoSessionToken(), sessionCookie.options);
  return res;
}
