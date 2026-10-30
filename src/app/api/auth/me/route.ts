import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ signedIn: false });
  return NextResponse.json({ signedIn: true, demo: s.kind === "demo", email: s.kind === "user" ? s.email : undefined });
}
