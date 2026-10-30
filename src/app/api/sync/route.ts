import { NextResponse } from "next/server";
import { getStoreForSession, unauthorized } from "@/lib/context";
import { requestSync, stepSync } from "@/lib/sync";
import { isServerless } from "@/lib/kv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sync progress. On serverless hosts each poll also advances a running sync for up to ~25s
 * (one poll at a time does the work; the others just read progress).
 */
export async function GET() {
  const store = await getStoreForSession();
  if (!store) return unauthorized();
  if (isServerless() && store.sync.running) await stepSync(store, 25_000);
  const { queue, ...sync } = store.sync;
  return NextResponse.json(sync);
}

export async function POST() {
  const store = await getStoreForSession();
  if (!store) return unauthorized();
  await requestSync(store, 25_000);
  if (!isServerless()) await new Promise((r) => setTimeout(r, 50));
  const { queue, ...sync } = store.sync;
  return NextResponse.json(sync, { status: 202 });
}
