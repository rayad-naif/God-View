import crypto from "crypto";
import { NextResponse } from "next/server";
import { runCronSyncs } from "@/lib/scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled sync. Vercel Cron calls this (see vercel.json) and sends `Authorization: Bearer $CRON_SECRET`
 * automatically; any other scheduler can do the same. Each call starts or continues due workspaces.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  if (got.length !== want.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const budget = Math.min(Number(new URL(req.url).searchParams.get("budgetMs")) || 50_000, 55_000);
  const { advanced, finished } = await runCronSyncs(budget);
  return NextResponse.json({ synced: advanced, finished });
}

export const GET = handle;
export const POST = handle;
