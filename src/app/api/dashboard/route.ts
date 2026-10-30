import { NextResponse } from "next/server";
import { getStoreForSession, unauthorized } from "@/lib/context";
import { computeDashboard } from "@/lib/metrics";
import { loadEmailStats } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const store = await getStoreForSession();
  if (!store) return unauthorized();
  const days = Math.min(90, Math.max(7, Number(new URL(req.url).searchParams.get("days")) || 30));
  const email = store.mode === "live" ? await loadEmailStats(store.companyId, Object.keys(store.accounts)) : {};
  const payload = computeDashboard(store, days, email);
  // The resumable queue is internal.
  const { queue, ...sync } = payload.sync;
  return NextResponse.json({ ...payload, sync });
}
