import type { EmailDay } from "./types";
import { kv } from "./kv";
import { storeKeys } from "./store";
import { dayKey } from "./dates";

export type EmailMetric = keyof EmailDay;

/**
 * Maps an LC Email event (Mailgun-style) to the counter it increments.
 * "failed" counts as a bounce only when permanent; temporary failures are retried by the sender.
 */
export function classifyEmailEvent(p: any): EmailMetric | null {
  const ev = String(p?.event ?? "").toLowerCase();
  switch (ev) {
    case "accepted":
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "opened":
    case "open":
      return "opened";
    case "clicked":
    case "click":
      return "clicked";
    case "complained":
    case "complaint":
    case "spam":
      return "complained";
    case "unsubscribed":
    case "unsubscribe":
      return "unsubscribed";
    case "bounced":
    case "bounce":
    case "hard_bounce":
      return "bounced";
    case "failed": {
      const severity = String(p?.severity ?? "").toLowerCase();
      const code = Number(p?.["delivery-status"]?.code);
      if (severity === "temporary") return null;
      if (severity === "permanent" || !Number.isFinite(code) || code >= 500) return "bounced";
      return null;
    }
    default:
      return null;
  }
}

/** Records one email event. Opens and clicks are counted once per message. Returns the metric counted. */
export async function recordEmailEvent(companyId: string, accountId: string, timezone: string | undefined, payload: any): Promise<EmailMetric | null> {
  const metric = classifyEmailEvent(payload);
  if (!metric) return null;
  const db = kv();
  const messageId = String(payload?.message?.headers?.["message-id"] ?? payload?.id ?? "");
  if ((metric === "opened" || metric === "clicked") && messageId) {
    const first = await db.setNX(`gv:em:${companyId}:${accountId}:${metric}:${messageId}`, "1", 60 * 60 * 24 * 120);
    if (!first) return null;
  }
  const ts = Number(payload?.timestamp);
  const when = Number.isFinite(ts) && ts > 0 ? (ts > 1e12 ? ts : ts * 1000) : Date.now();
  await db.hincrby(storeKeys.email(companyId, accountId), `${dayKey(when, timezone || "UTC")}:${metric}`, 1);
  return metric;
}

/** Email counters for many accounts: accountId -> date -> counts. */
export async function loadEmailStats(companyId: string, accountIds: string[]): Promise<Record<string, Record<string, EmailDay>>> {
  const db = kv();
  const hashes = await db.hgetallMany(accountIds.map((id) => storeKeys.email(companyId, id))).catch(() => accountIds.map(() => ({}) as Record<string, number>));
  const out: Record<string, Record<string, EmailDay>> = {};
  accountIds.forEach((id, i) => {
    const byDay: Record<string, EmailDay> = {};
    for (const [field, n] of Object.entries(hashes[i])) {
      const [date, metric] = field.split(":") as [string, EmailMetric];
      (byDay[date] ??= {})[metric] = Number(n) || 0;
    }
    if (Object.keys(byDay).length) out[id] = byDay;
  });
  return out;
}

export type EmailHealth = "good" | "warning" | "critical" | "none";

/**
 * Deliverability thresholds (mailbox-provider guidance): spam complaints above 0.3% risk blocking
 * (0.1% to watch), bounces above 5% are critical (2% to watch), and an open rate under 15% means
 * mail is likely landing in spam. Needs a minimum volume to avoid flagging tiny senders.
 */
export function emailHealth(e: { delivered: number; bounced: number; complained: number; opened: number; unsubscribed: number }): { status: EmailHealth; reasons: string[] } {
  const attempted = e.delivered + e.bounced;
  if (attempted < 20) return { status: "none", reasons: [] };
  const bounceRate = e.bounced / attempted;
  const spamRate = e.delivered ? e.complained / e.delivered : 0;
  const openRate = e.delivered ? e.opened / e.delivered : 0;
  const unsubRate = e.delivered ? e.unsubscribed / e.delivered : 0;
  const reasons: string[] = [];
  let status: EmailHealth = "good";
  const raise = (s: EmailHealth, why: string) => {
    reasons.push(why);
    if (s === "critical" || status === "good") status = s;
  };
  if (spamRate > 0.003) raise("critical", `spam complaints ${(spamRate * 100).toFixed(2)}%`);
  else if (spamRate > 0.001) raise("warning", `spam complaints ${(spamRate * 100).toFixed(2)}%`);
  if (bounceRate > 0.05) raise("critical", `bounce rate ${(bounceRate * 100).toFixed(1)}%`);
  else if (bounceRate > 0.02) raise("warning", `bounce rate ${(bounceRate * 100).toFixed(1)}%`);
  if (e.delivered >= 50 && openRate < 0.15) raise("warning", `open rate ${(openRate * 100).toFixed(0)}%`);
  if (unsubRate > 0.01) raise("warning", `unsubscribes ${(unsubRate * 100).toFixed(1)}%`);
  return { status, reasons };
}
