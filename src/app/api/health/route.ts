import { NextResponse } from "next/server";
import { ghlConfigured } from "@/lib/ghl/oauth";
import { isServerless, kv } from "@/lib/kv";
import { crmEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    oauthConfigured: ghlConfigured(),
    webhookVerification: true,
    tokenEncryption: process.env.TOKEN_ENCRYPTION_KEY ? "dedicated key" : "derived from SESSION_SECRET",
    autoSyncHours: Number(process.env.AUTO_SYNC_HOURS ?? 6),
    storage: kv().kind === "redis" ? "upstash-redis" : "files",
    serverless: isServerless(),
    cron: Boolean(process.env.CRON_SECRET),
  });
}
