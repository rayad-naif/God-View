import type { CompanyStore } from "./types";
import { computeDashboard } from "./metrics";
import { saveStore } from "./store";
import { loadEmailStats } from "./email";

export function validAlertUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === "https:") return true;
    // Local testing only.
    return process.env.ALLOW_LOCALHOST_ALERTS === "true" && u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname);
  } catch {
    return false;
  }
}

export async function postAlert(url: string, text: string): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // `text` works for Slack, Discord (via /slack suffix), Google Chat and most generic receivers.
    body: JSON.stringify({ text, content: text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Alert webhook returned ${res.status}`);
}

/** After a sync: alert once per account when it turns red, and optionally when it recovers. */
export async function sendChurnAlerts(store: CompanyStore): Promise<{ newlyRed: string[]; recovered: string[] }> {
  const url = store.settings.alertWebhookUrl;
  // Without a destination we don't record anything, so accounts already red get announced once alerts are set up.
  if (!url || !validAlertUrl(url)) return { newlyRed: [], recovered: [] };
  const emailStats = store.mode === "live" ? await loadEmailStats(store.companyId, Object.keys(store.accounts)) : {};
  const dash = computeDashboard(store, 7, emailStats);
  const emailBad = new Set(dash.accounts.filter((a) => a.email.status === "critical").map((a) => a.id));
  const emailAlready = new Set(store.alertedEmail ?? []);
  const newlyEmail = [...emailBad].filter((id) => !emailAlready.has(id));
  const red = new Set(dash.accounts.filter((a) => a.status === "churn").map((a) => a.id));
  const already = new Set(store.alertedChurn ?? []);
  const newlyRed = [...red].filter((id) => !already.has(id));
  const recovered = [...already].filter((id) => !red.has(id) && store.accounts[id]);

  if (newlyRed.length || newlyEmail.length || (store.settings.alertOnRecovery && recovered.length)) {
    const byId = new Map(dash.accounts.map((a) => [a.id, a]));
    const lines: string[] = [];
    if (newlyRed.length) {
      lines.push(`:rotating_light: *${newlyRed.length} account${newlyRed.length > 1 ? "s" : ""} at churn risk* (${store.companyName ?? "your workspace"})`);
      for (const id of newlyRed) {
        const a = byId.get(id)!;
        lines.push(`• *${a.name}*: under ${a.threshold} leads/day for ${a.lowStreak} days`);
      }
    }
    if (newlyEmail.length) {
      lines.push(`:email: *${newlyEmail.length} account${newlyEmail.length > 1 ? "s" : ""} with email deliverability problems* (last 7 days)`);
      for (const id of newlyEmail) {
        const a = byId.get(id)!;
        lines.push(`• *${a.name}*: ${a.email.reasons.join(", ")}`);
      }
    }
    if (store.settings.alertOnRecovery && recovered.length) {
      lines.push(`:white_check_mark: Recovered: ${recovered.map((id) => byId.get(id)?.name ?? id).join(", ")}`);
    }
    if (process.env.APP_URL) lines.push(`<${process.env.APP_URL}/dashboard|Open God View>`);
    try {
      await postAlert(url, lines.join("\n"));
    } catch (e) {
      console.error("[alerts]", e);
      return { newlyRed: [], recovered: [] }; // retry next sync
    }
  }
  store.alertedChurn = [...red];
  store.alertedEmail = [...emailBad];
  await saveStore(store, ["meta"]);
  return { newlyRed, recovered };
}
