// End-to-end test of the live (OAuth) path against a mock HighLevel API.
// Usage: npm run build && npm test
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startMockGhl } from "./mock-ghl.mjs";

const MOCK = 4655, APP = 3155, BASE = `http://localhost:${APP}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "gv-test-"));
const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const CRON_SECRET = "test-cron-secret";

let failures = 0, passed = 0;
const check = (name, cond, extra = "") => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failures++; console.log(`  ✗ ${name} ${extra}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const mock = await startMockGhl(MOCK);
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(APP)], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    GHL_API_BASE: `http://localhost:${MOCK}`,
    GHL_CLIENT_ID: "app123-client",
    GHL_CLIENT_SECRET: "secret",
    GHL_REDIRECT_URI: `${BASE}/api/auth/callback`,
    CRM_APP_ID: "app123",
    SESSION_SECRET: "test-session-secret-0123456789abcdef",
    GHL_WEBHOOK_ED25519_PUBLIC_KEY: publicKey.export({ type: "spki", format: "pem" }),
    CRON_SECRET,
    DATA_DIR: dataDir,
    AUTO_SYNC_HOURS: "0",
    ALLOW_LOCALHOST_ALERTS: "true",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let appLog = "";
app.stdout.on("data", (d) => (appLog += d));
app.stderr.on("data", (d) => (appLog += d));

let cookie = "";
const req = async (p, opts = {}) => {
  const r = await fetch(BASE + p, { redirect: "manual", ...opts, headers: { cookie, ...(opts.headers ?? {}) } });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch {}
  return { status: r.status, headers: r.headers, json, text };
};
const post = (p, body) => req(p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
const waitSync = async () => { for (let i = 0; i < 50; i++) { const s = await req("/api/sync"); if (!s.json?.running) return s.json; await sleep(200); } };
const signedWebhook = (evt) => {
  const raw = JSON.stringify(evt);
  return req("/api/webhooks/crm", { method: "POST", headers: { "content-type": "application/json", "x-ghl-signature": crypto.sign(null, Buffer.from(raw), privateKey).toString("base64") }, body: raw });
};

try {
  for (let i = 0; i < 60; i++) { try { await fetch(BASE + "/api/health"); break; } catch { await sleep(250); } }

  console.log("Health & OAuth");
  const health = await req("/api/health");
  check("health reports OAuth + webhook verification configured", health.json?.oauthConfigured && health.json?.webhookVerification);
  const legacy = await req("/api/auth/login");
  check("old connect link forwards to /api/auth/connect", legacy.headers.get("location")?.endsWith("/api/auth/connect"));
  const login = await req("/api/auth/connect");
  const authUrl = new URL(login.headers.get("location"));
  check("connect redirects to the CRM consent screen", authUrl.host === "marketplace.gohighlevel.com" && authUrl.pathname === "/oauth/chooselocation");
  check("requests all 11 scopes", authUrl.searchParams.get("scope").split(" ").length === 11);
  const state = authUrl.searchParams.get("state");
  const stateCookie = login.headers.get("set-cookie").match(/gv_oauth_state=([^;]+)/)[1];
  cookie = `gv_oauth_state=${stateCookie}`;
  const bad = await req(`/api/auth/callback?code=abc&state=wrong`);
  check("callback rejects mismatched state", bad.headers.get("location")?.includes("error="));
  const cb = await req(`/api/auth/callback?code=abc&state=${state}`);
  check("first connection goes to login setup", cb.headers.get("location")?.endsWith("/setup"), cb.headers.get("location"));
  const setupCookie = cb.headers.get("set-cookie").match(/gv_setup=([^;]+)/)[1];
  check("no session is issued before setup", !/gv_session=[^;]/.test(cb.headers.get("set-cookie")));

  console.log("Login setup & sign-in");
  cookie = "";
  check("setup requires the post-connection ticket", (await post("/api/auth/setup", { email: "owner@acme.test", password: "correct horse battery" })).status === 401);
  cookie = `gv_setup=${setupCookie}`;
  check("setup page renders the form", (await req("/setup")).text.includes("Create your login"));
  check("rejects a short password", (await post("/api/auth/setup", { email: "owner@acme.test", password: "short" })).json?.field === "password");
  check("rejects a bad email", (await post("/api/auth/setup", { email: "nope", password: "correct horse battery" })).json?.field === "email");
  check("rejects mismatched confirmation", (await post("/api/auth/setup", { email: "owner@acme.test", password: "correct horse battery", confirm: "x" })).json?.field === "confirm");
  const setup = await post("/api/auth/setup", { email: "Owner@Acme.test", password: "correct horse battery", confirm: "correct horse battery" });
  check("setup creates the login and sends you to sign in", setup.status === 200 && setup.json.next.startsWith("/login?notice=created&email=owner%40acme.test"), setup.text);
  check("setup ticket is consumed", /gv_setup=;/.test(setup.headers.get("set-cookie") ?? ""));
  const users = JSON.parse(fs.readFileSync(path.join(dataDir, "users.json"), "utf8")).users;
  check("password stored only as scrypt hash", users[0].passwordHash.startsWith("scrypt$") && !JSON.stringify(users).includes("correct horse"));
  cookie = "";
  check("dashboard requires sign-in", (await req("/dashboard")).headers.get("location")?.includes("/login"));
  check("wrong password rejected", (await post("/api/auth/login", { email: "owner@acme.test", password: "wrong password!" })).status === 401);
  check("unknown email gives the same error", (await post("/api/auth/login", { email: "nobody@acme.test", password: "wrong password!" })).json?.error === "Email or password is incorrect.");
  const signIn = await post("/api/auth/login", { email: "OWNER@acme.test", password: "correct horse battery" });
  check("sign in with email + password", signIn.status === 200);
  cookie = `gv_session=${signIn.headers.get("set-cookie").match(/gv_session=([^;]+)/)[1]}`;
  check("signed-in user can open the dashboard", (await req("/dashboard")).status === 200);
  check("/api/auth/me returns the email", (await req("/api/auth/me")).json?.email === "owner@acme.test");
  console.log("Sync & metrics");
  const sync = await waitSync();
  check("sync finished with 1 failed sub-account (not installed)", sync?.done === 3 && sync?.errors === 1, JSON.stringify(sync));
  const dash = (await req("/api/dashboard?days=7")).json;
  const by = Object.fromEntries(dash.accounts.map((a) => [a.id, a]));
  check("company name pulled", dash.companyName === "Acme Marketing");
  check("Alpha healthy, 70 leads in 7d, CPL $5", by.L1.status === "healthy" && by.L1.leads === 70 && by.L1.cpl === 5, JSON.stringify(by.L1).slice(0, 200));
  check("Beta flagged churn (1 lead/day < 3)", by.L2.status === "churn");
  check("Gamma shows install error", by.L3.status === "error" && /installed/.test(by.L3.syncError));
  check("show rate = showed / (showed + no-show)", Math.abs(by.L1.showRate - 2 / 3) < 1e-9);
  check("revenue from won opportunities", by.L1.revenue === 5000);
  const tokenMints = mock.log.filter((l) => l === "POST /oauth/locationToken").length;
  check("one location-token exchange per sub-account", tokenMints === 3, `got ${tokenMints}`);

  console.log("Token encryption at rest");
  const file = fs.readFileSync(path.join(dataDir, "company-co1.json"), "utf8");
  check("no plaintext tokens on disk", !/agency-secret-token|refresh-secret-token|location-secret-/.test(file));
  check("tokens stored as enc:v1", file.includes("enc:v1:"));
  check("store file is owner-only (0600)", (fs.statSync(path.join(dataDir, "company-co1.json")).mode & 0o777) === 0o600);

  console.log("Churn alerts");
  check("rejects non-https alert URL", (await req("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ alertWebhookUrl: "http://example.com/x" }) })).status === 400);
  await req("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ alertWebhookUrl: `http://localhost:${MOCK}/alert`, alertOnRecovery: true }) });
  check("test alert delivered", (await post("/api/alerts/test")).status === 200 && mock.alerts.at(-1)?.text.includes("test alert"));
  const before = mock.alerts.length;
  await post("/api/sync"); await waitSync(); await sleep(300);
  check("churn alert names Beta Dental", mock.alerts.length === before + 1 && mock.alerts.at(-1).text.includes("Beta Dental"), JSON.stringify(mock.alerts.at(-1)));
  await post("/api/sync"); await waitSync(); await sleep(300);
  check("no duplicate alert on next sync", mock.alerts.length === before + 1);

  console.log("Ad spend CSV import");
  const today = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const csv = `name,date,spend\n"Alpha Roofing",${today},"$1,000.00"\nUnknown Co,${today},10\nAlpha Roofing,not-a-date,5\n`;
  const imp = (await post("/api/adspend", { csv })).json;
  check("import counts rows / unmatched / invalid", imp.imported === 1 && imp.unmatched[0] === "Unknown Co" && imp.invalid === 1, JSON.stringify(imp));
  const alpha = (await req("/api/dashboard?days=7")).json.accounts.find((a) => a.id === "L1");
  check("imported day overrides synced spend", alpha.spend === 6 * 50 + 1000, `spend=${alpha.spend}`);
  check("template CSV uses account_id and lists accounts", (await req("/api/adspend")).text.startsWith("account_id,name,date,spend") && (await req("/api/adspend")).text.includes("Beta Dental"));

  console.log("Snapshot push & retry");
  const snaps = (await req("/api/snapshots")).json.snapshots;
  check("lists snapshots", snaps?.[0]?.id === "s1");
  const job = (await post("/api/snapshots/push", { snapshotId: "s1", snapshotName: "Winner", sourceLocationId: "L2", targetIds: ["L1", "L2"], override: false })).json.job;
  check("source excluded from targets", job.targets.length === 1 && job.targets[0].locationId === "L1");
  await sleep(500);
  let jobs = (await req("/api/snapshots/jobs")).json.jobs;
  check("first push fails with GHL message", jobs[0].targets[0].status === "failed" && /conflict/i.test(jobs[0].targets[0].message));
  const retry = await post(`/api/snapshots/jobs/${job.id}/retry`);
  check("retry creates a new job", retry.status === 201);
  await sleep(500);
  jobs = (await req("/api/snapshots/jobs")).json.jobs;
  check("retry completes after status poll", jobs[0].targets[0].status === "completed", JSON.stringify(jobs[0].targets));

  console.log("Cron");
  check("cron rejects missing secret", (await req("/api/cron/sync")).status === 401);
  const cron = await req("/api/cron/sync", { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  check("cron syncs connected agencies", cron.json?.synced?.includes("co1"), cron.text);

  console.log("Password change, reconnect & reset");
  const oldCookie = cookie;
  check("password change needs the current password", (await post("/api/auth/password", { current: "nope", password: "another long passphrase" })).status === 401);
  const ch = await post("/api/auth/password", { current: "correct horse battery", password: "another long passphrase" });
  check("password changed", ch.status === 200);
  const newCookie = `gv_session=${ch.headers.get("set-cookie").match(/gv_session=([^;]+)/)[1]}`;
  cookie = oldCookie;
  check("old sessions are signed out", (await req("/api/dashboard")).status === 401);
  cookie = newCookie;
  check("current session keeps working", (await req("/api/dashboard")).status === 200);
  const reconnect = await req(`/api/auth/callback?code=abc`);
  check("reconnecting while signed in returns to settings", reconnect.headers.get("location")?.endsWith("/settings?notice=reconnected"), reconnect.headers.get("location"));
  cookie = "gv_oauth_intent=reset";
  const reset = await req(`/api/auth/callback?code=abc`);
  check("forgot password → CRM re-auth → setup in reset mode", reset.headers.get("location")?.endsWith("/setup"));
  cookie = `gv_setup=${reset.headers.get("set-cookie").match(/gv_setup=([^;]+)/)[1]}`;
  check("reset page says reset", (await req("/setup")).text.includes("Reset your password"));
  const r2 = await post("/api/auth/setup", { email: "owner@acme.test", password: "reset passphrase 2026" });
  check("reset keeps the same login", r2.json?.next?.startsWith("/login?notice=reset") && JSON.parse(fs.readFileSync(path.join(dataDir, "users.json"), "utf8")).users.length === 1);
  cookie = newCookie;
  check("reset signs out existing sessions", (await req("/api/dashboard")).status === 401);
  const relog = await post("/api/auth/login", { email: "owner@acme.test", password: "reset passphrase 2026" });
  cookie = `gv_session=${relog.headers.get("set-cookie").match(/gv_session=([^;]+)/)[1]}`;

  console.log("Webhooks");
  check("unsigned webhook rejected", (await req("/api/webhooks/ghl", { method: "POST", body: JSON.stringify({ type: "UNINSTALL", companyId: "co1" }) })).status === 401);
  const forged = JSON.stringify({ type: "UNINSTALL", companyId: "co1" });
  check("bad signature rejected", (await req("/api/webhooks/ghl", { method: "POST", headers: { "x-ghl-signature": Buffer.from("nope").toString("base64") }, body: forged })).status === 401);
  const created = await signedWebhook({ type: "LocationCreate", id: "L4", companyId: "co1", webhookId: "w1", appId: "app123" });
  check("LocationCreate accepted", created.json?.action === "syncing account", created.text);
  await sleep(800);
  check("new sub-account synced", (await req("/api/dashboard?days=7")).json.accounts.some((a) => a.id === "L4" && a.leads > 0));
  check("duplicate delivery ignored", (await signedWebhook({ type: "LocationCreate", id: "L4", companyId: "co1", webhookId: "w1" })).json?.duplicate === true);
  await signedWebhook({ type: "UNINSTALL", companyId: "co1", locationId: "L4", webhookId: "w2" });
  check("location uninstall removes sub-account", !(await req("/api/dashboard?days=7")).json.accounts.some((a) => a.id === "L4"));
  cookie = "";
  for (let i = 0; i < 8; i++) await post("/api/auth/login", { email: "owner@acme.test", password: "bad guess " + i });
  check("sign-in is rate-limited after repeated failures", (await post("/api/auth/login", { email: "owner@acme.test", password: "reset passphrase 2026" })).status === 429);
  cookie = `gv_session=${relog.headers.get("set-cookie").match(/gv_session=([^;]+)/)[1]}`;
  const un = await signedWebhook({ type: "UNINSTALL", companyId: "co1", webhookId: "w3" });
  check("workspace uninstall deletes data and login", un.json?.action === "workspace data deleted" && !fs.existsSync(path.join(dataDir, "company-co1.json")) && JSON.parse(fs.readFileSync(path.join(dataDir, "users.json"), "utf8")).users.length === 0);
  check("session no longer valid after uninstall", (await req("/api/dashboard")).status === 401);
} catch (e) {
  failures++;
  console.error(e);
  console.error(appLog.slice(-3000));
} finally {
  app.kill();
  mock.server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
