import { NextResponse } from "next/server";
import { crmEnv } from "@/lib/env";
import { freshEnough, verifyGhlWebhook } from "@/lib/ghl/webhook";
import { deleteAccount, deleteStore, loadStore, saveStore } from "@/lib/store";
import { beginSync, requestSync, syncSingleLocation } from "@/lib/sync";
import { deleteUsersForCompany } from "@/lib/users";
import { recordEmailEvent } from "@/lib/email";
import { isServerless, kv } from "@/lib/kv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * CRM app webhooks. Point the app's Webhook URL at https://<host>/api/webhooks/crm and subscribe to
 * INSTALL, UNINSTALL, LocationCreate and LCEmailStats.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const check = verifyGhlWebhook(raw, req.headers);
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 401 });

  let evt: any;
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  if (!freshEnough(evt)) return NextResponse.json({ error: "Stale delivery" }, { status: 401 });

  const appId = crmEnv("APP_ID");
  if (appId && evt.appId && !String(evt.appId).startsWith(appId)) return NextResponse.json({ ignored: "other app" });

  const companyId: string | undefined = evt.companyId;
  if (!companyId) return NextResponse.json({ ignored: "no companyId" });

  // Idempotency: the CRM retries deliveries.
  const eventId: string | undefined = evt.webhookId ?? (evt.type === "LCEmailStats" ? evt.webhookPayload?.id && `${evt.webhookPayload.id}:${evt.webhookPayload.event}` : evt.id);
  if (eventId && !(await kv().setNX(`gv:wh:${companyId}:${eventId}`, "1", 60 * 60 * 24 * 7))) {
    return NextResponse.json({ duplicate: true });
  }

  const store = await loadStore(companyId);
  if (!store) return NextResponse.json({ ignored: "unknown workspace" });

  const type = String(evt.type ?? "").toUpperCase();
  const locationId: string | undefined = evt.locationId;

  if (type === "LCEMAILSTATS") {
    const acc = locationId ? store.accounts[locationId] : undefined;
    if (!acc) return NextResponse.json({ ignored: "unknown account" });
    const metric = await recordEmailEvent(companyId, acc.id, acc.timezone, evt.webhookPayload ?? {});
    return NextResponse.json({ ok: true, counted: metric });
  }

  if (type === "UNINSTALL") {
    if (!locationId) {
      // Workspace-level uninstall: revoke everything and delete the workspace's data.
      await deleteStore(companyId);
      await deleteUsersForCompany(companyId);
      return NextResponse.json({ ok: true, action: "workspace data deleted" });
    }
    delete store.accounts[locationId];
    delete store.locationTokens[locationId];
    store.alertedChurn = store.alertedChurn?.filter((id) => id !== locationId);
    await deleteAccount(companyId, locationId);
    await saveStore(store, ["meta", "tokens"]);
    return NextResponse.json({ ok: true, action: "account removed" });
  }

  if (type === "INSTALL" || type === "LOCATIONCREATE") {
    const id: string | undefined = type === "LOCATIONCREATE" ? evt.id ?? locationId : locationId;
    if (id) {
      // A single account syncs in a few seconds, so do it inside the request (works on serverless too).
      const job = syncSingleLocation(store, id).catch((e) => console.error("[webhook] sync", e));
      if (isServerless()) await job;
      return NextResponse.json({ ok: true, action: "syncing account" });
    }
    if (isServerless()) await beginSync(store);
    else await requestSync(store);
    return NextResponse.json({ ok: true, action: "full sync" });
  }

  return NextResponse.json({ ignored: type || "unknown" });
}
