"use client";
import { useEffect, useRef, useState } from "react";
import { Save, ShieldCheck, Link2, Bell, Upload, Download, Trash2, Webhook, Send, Copy, KeyRound } from "lucide-react";
import { PasswordInput, StrengthMeter } from "./AuthForms";
import Header from "./Header";
import type { Settings } from "@/lib/types";

type Info = { settings: Settings; mode: "live" | "demo"; companyId: string; companyName?: string; connected: boolean; scope?: string; tokenExpiresAt?: number };
type ImportResult = { rows: number; imported: number; accounts: number; invalid: number; unmatched: string[] } | { error: string };
type Note = { kind: "ok" | "err"; text: string } | undefined;

export default function SettingsView() {
  const [info, setInfo] = useState<Info>();
  const [form, setForm] = useState<Settings>();
  const [note, setNote] = useState<Note>();
  const [alertNote, setAlertNote] = useState<Note>();
  const [importRes, setImportRes] = useState<ImportResult>();
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  const [reconnected, setReconnected] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    setReconnected(new URLSearchParams(window.location.search).get("notice") === "reconnected");
    fetch("/api/settings").then(async (r) => {
      if (r.status === 401) return void (window.location.href = "/login");
      const j = await r.json();
      setInfo(j);
      setForm(j.settings);
    });
  }, []);

  /** Saves settings; feedback goes to `show` (the page header by default, or a section's own note). */
  async function save(e?: React.FormEvent, show: (n: Note) => void = setNote): Promise<boolean> {
    e?.preventDefault();
    const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json();
    if (!r.ok) { show({ kind: "err", text: j.error ?? "Save failed" }); return false; }
    setForm(j.settings);
    show({ kind: "ok", text: "Saved ✓" });
    setTimeout(() => show(undefined), 2500);
    return true;
  }

  async function testAlert() {
    setAlertNote(undefined);
    if (!(await save(undefined, setAlertNote))) return;
    const r = await fetch("/api/alerts/test", { method: "POST" });
    const j = await r.json();
    setAlertNote(r.ok ? { kind: "ok", text: "Test alert sent. Check your channel." } : { kind: "err", text: j.error });
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    const csv = await f.text();
    const r = await fetch("/api/adspend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv, replace }) });
    setImportRes(await r.json());
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function clearImported() {
    if (!confirm("Remove all imported ad spend? Synced and manual spend are kept.")) return;
    await fetch("/api/adspend", { method: "DELETE" });
    setImportRes(undefined);
    setNote({ kind: "ok", text: "Imported spend cleared" });
  }

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => f && { ...f, [k]: v });
  const numField = (k: "churnThreshold" | "churnDays" | "syncWindowDays", label: string, help: string) => (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <span className="block text-xs text-ink-3 mb-1">{help}</span>
      <input className="input w-full max-w-xs" type="number" min={0} value={form?.[k] ?? ""} onChange={(e) => set(k, Number(e.target.value))} />
    </label>
  );
  const webhookUrl = `${origin}/api/webhooks/crm`;

  return (
    <>
      <Header page="settings" companyName={info?.companyName} mode={info?.mode} />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold flex-1">Settings</h1>
          {note && <span role="status" className={`text-sm ${note.kind === "ok" ? "text-[var(--good-text)]" : "text-[var(--critical-text)]"}`}>{note.text}</span>}
        </div>

        {reconnected && <div role="status" className="card px-4 py-3 text-sm text-[var(--good-text)]">✓ CRM reconnected. A fresh sync has started.</div>}

        <section className="card p-5">
          <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-brand" /> CRM connection</h2>
          {info?.mode === "demo" ? (
            <div className="mt-2 text-sm text-ink-2">
              You’re exploring demo data. <a className="text-brand underline" href="/api/auth/connect">Connect your CRM</a> to see your real accounts.
            </div>
          ) : info ? (
            <dl className="mt-3 grid grid-cols-[140px_1fr] gap-y-1.5 text-sm">
              <dt className="text-ink-3">Workspace</dt><dd>{info.companyName ?? "—"}</dd>
              <dt className="text-ink-3">Status</dt><dd>{info.connected ? <span className="text-[var(--good-text)]">Connected · access encrypted at rest</span> : "Not connected"}</dd>
              <dt className="text-ink-3">Access renewal</dt><dd>{info.tokenExpiresAt ? "Automatic" : "—"}</dd>
              <dt className="text-ink-3">Permissions</dt><dd className="text-ink-2">Read accounts, contacts, opportunities, calendars, appointments, snapshots, ad reporting and email delivery events. Write only to load snapshots you push.</dd>
            </dl>
          ) : null}
          <a href="/api/auth/connect" className="btn mt-4"><Link2 className="w-4 h-4" /> {info?.mode === "live" ? "Reconnect CRM" : "Connect CRM"}</a>
        </section>

        {info?.mode === "live" && <SecuritySection />}

        {form && (
          <form onSubmit={save} className="card p-5 space-y-5">
            <h2 className="font-semibold">Churn predictor & data</h2>
            {numField("churnThreshold", "Lead threshold (leads/day)", "A completed day with fewer leads than this counts as a low day. Override it for a single account from that account’s detail panel.")}
            {numField("churnDays", "Consecutive low days before red", "Accounts with fewer low days show as Watch (amber).")}
            <label className="block">
              <span className="text-sm font-medium">Ad spend custom value key</span>
              <span className="block text-xs text-ink-3 mb-1">Custom value on each account in your CRM that holds daily ad spend, as a number or JSON {"{\"YYYY-MM-DD\": spend}"}. CSV imports below take precedence.</span>
              <input className="input w-full max-w-xs" value={form.adSpendCustomValueKey} onChange={(e) => set("adSpendCustomValueKey", e.target.value)} />
            </label>
            {numField("syncWindowDays", "Sync window (days)", "How much history to pull on each sync (14–180). 60 covers the 30-day view plus its comparison period.")}
            <button className="btn btn-primary"><Save className="w-4 h-4" /> Save settings</button>
          </form>
        )}

        {form && (
          <section className="card p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-critical" /> Churn alerts</h2>
            <p className="text-sm text-ink-2">After each sync, post a message when an account turns red. Each account alerts once until it recovers. Works with Slack incoming webhooks, Google Chat, Discord (append <code>/slack</code>), Zapier and Make.</p>
            <label className="block">
              <span className="text-sm font-medium">Webhook URL</span>
              <input className="input w-full mt-1" type="url" placeholder="https://hooks.slack.com/services/…" value={form.alertWebhookUrl ?? ""} onChange={(e) => set("alertWebhookUrl", e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-[#2a78d6]" checked={Boolean(form.alertOnRecovery)} onChange={(e) => set("alertOnRecovery", e.target.checked)} />
              Also notify when a red account recovers
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn btn-primary" onClick={() => save(undefined, setAlertNote)}><Save className="w-4 h-4" /> Save</button>
              <button className="btn" onClick={testAlert} disabled={!form.alertWebhookUrl}><Send className="w-4 h-4" /> Send test alert</button>
              {alertNote && <span className={`text-sm ${alertNote.kind === "ok" ? "text-[var(--good-text)]" : "text-[var(--critical-text)]"}`}>{alertNote.text}</span>}
            </div>
          </section>
        )}

        <section className="card p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Upload className="w-4 h-4 text-brand" /> Import ad spend (CSV)</h2>
          <p className="text-sm text-ink-2">
            Your CRM doesn’t report ad spend, so upload spend exported from Meta or Google Ads. Columns: <code>account_id</code> or <code>name</code>, <code>date</code>, <code>spend</code>. Imported days override synced and manual spend.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a className="btn" href="/api/adspend"><Download className="w-4 h-4" /> Download template</a>
            <label className={`btn btn-primary cursor-pointer ${busy ? "opacity-50 pointer-events-none" : ""}`}>
              <Upload className="w-4 h-4" /> {busy ? "Importing…" : "Upload CSV"}
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <button className="btn" onClick={clearImported}><Trash2 className="w-4 h-4" /> Clear imported</button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-[#2a78d6]" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            Replace all previously imported spend (otherwise merge by day)
          </label>
          {importRes && ("error" in importRes ? (
            <div className="text-sm text-[var(--critical-text)]">{importRes.error}</div>
          ) : (
            <div className="text-sm rounded-lg bg-[var(--surface-2)] px-3 py-2">
              Imported <b>{importRes.imported}</b> of {importRes.rows} rows across <b>{importRes.accounts}</b> account{importRes.accounts === 1 ? "" : "s"}
              {importRes.invalid ? <> · {importRes.invalid} rows with a bad date or amount skipped</> : null}
              {importRes.unmatched.length ? <div className="text-xs text-ink-2 mt-1">No matching account: {importRes.unmatched.join(", ")}</div> : null}
            </div>
          ))}
        </section>

        <section className="card p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Webhook className="w-4 h-4 text-brand" /> CRM webhooks</h2>
          <p className="text-sm text-ink-2">
            In your CRM app settings, set the <b>Webhook URL</b> to the address below and subscribe to <code>INSTALL</code>, <code>UNINSTALL</code>, <code>LocationCreate</code> and <code>LCEmailStats</code>.
            New accounts then sync automatically, email health fills in as emails are sent, and uninstalling God View from your CRM deletes your tokens, data and login from this server.
          </p>
          <div className="flex gap-2">
            <input className="input flex-1 font-mono text-xs" readOnly value={webhookUrl} />
            <button className="btn" onClick={() => navigator.clipboard?.writeText(webhookUrl)} aria-label="Copy webhook URL"><Copy className="w-4 h-4" /></button>
          </div>
        </section>
      </main>
    </>
  );
}

function SecuritySection() {
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [note, setNote] = useState<Note>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => j.email && setEmail(j.email));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(undefined);
    const r = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, current, password: pw || undefined }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setNote({ kind: "err", text: j.error ?? "Update failed" });
    setEmail(j.email);
    setCurrent("");
    setPw("");
    setNote({ kind: "ok", text: pw ? "Saved. Other devices have been signed out." : "Saved ✓" });
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <h2 className="font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-brand" /> Login & security</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm font-medium">Login email
          <input className="input w-full mt-1 font-normal" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <div className="text-sm font-medium">New password <span className="text-ink-3 font-normal">(optional)</span>
          <div className="mt-1 font-normal"><PasswordInput id="new-pw" value={pw} onChange={setPw} autoComplete="new-password" required={false} /></div>
          <StrengthMeter pw={pw} />
        </div>
      </div>
      <div className="max-w-xs text-sm font-medium">Current password <span className="text-ink-3 font-normal">(required to save)</span>
        <div className="mt-1 font-normal"><PasswordInput id="cur-pw" value={current} onChange={setCurrent} autoComplete="current-password" /></div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={busy || !current}><Save className="w-4 h-4" /> Update login</button>
        {note && <span role="status" className={`text-sm ${note.kind === "ok" ? "text-[var(--good-text)]" : "text-[var(--critical-text)]"}`}>{note.text}</span>}
      </div>
      <p className="text-xs text-ink-3">Forgot your password? Sign out and choose “Forgot password?”. You’ll confirm ownership through your CRM and set a new one.</p>
    </form>
  );
}
