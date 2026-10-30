"use client";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function PasswordInput({ id, value, onChange, autoComplete, invalid, required = true }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean; required?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} className="input w-full !pr-10" type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required={required} aria-invalid={invalid || undefined} />
      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-ink" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

/** Rough strength meter: length + character variety. */
export function strength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let s = 0;
  if (pw.length >= 10) s++;
  if (pw.length >= 14) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length < 10) s = Math.min(s, 1);
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return { score: s as 0 | 1 | 2 | 3 | 4, label: labels[s] };
}

export function StrengthMeter({ pw }: { pw: string }) {
  if (!pw) return null;
  const { score, label } = strength(pw);
  const color = score <= 1 ? "#d03b3b" : score === 2 ? "#fab219" : "#0ca30c";
  return (
    <div className="mt-1.5 flex items-center gap-2" aria-live="polite">
      <div className="flex gap-1 flex-1">
        {[0, 1, 2, 3].map((i) => <span key={i} className="h-1 flex-1 rounded-full" style={{ background: i < score ? color : "var(--surface-2)" }} />)}
      </div>
      <span className="text-xs text-ink-2 w-16 text-right">{label}</span>
    </div>
  );
}

export function LoginForm({ initialEmail, notice, error: initialError }: { initialEmail?: string; notice?: string; error?: string }) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (r.ok) return void (window.location.href = "/dashboard");
    setError((await r.json().catch(() => ({}))).error ?? "Sign-in failed.");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {notice && <div role="status" className="rounded-lg px-3 py-2 text-sm bg-[var(--surface-2)]">{notice}</div>}
      {error && <div role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--critical-wash)", color: "var(--critical-text)" }}>{error}</div>}
      <div>
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input id="email" className="input w-full mt-1" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus={!initialEmail} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <a href="/api/auth/connect?intent=reset" className="text-xs text-brand hover:underline">Forgot password?</a>
        </div>
        <div className="mt-1"><PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" /></div>
      </div>
      <button className="btn btn-primary w-full justify-center !py-2.5" disabled={busy || !email || !password}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} Sign in
      </button>
    </form>
  );
}

export function SetupForm({ mode, workspace }: { mode: "create" | "reset"; workspace?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<{ text: string; field?: string }>();
  const [busy, setBusy] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch) return setError({ text: "Passwords don’t match.", field: "confirm" });
    setBusy(true);
    setError(undefined);
    const r = await fetch("/api/auth/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, confirm }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return void (window.location.href = j.next);
    setError({ text: j.error ?? "Couldn’t save your login.", field: j.field });
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {workspace && (
        <div className="rounded-lg px-3 py-2 text-sm bg-[var(--surface-2)]">
          <span className="text-[var(--good-text)] font-medium">✓ CRM connected</span>
          <span className="text-ink-2"> · {workspace}</span>
        </div>
      )}
      {error && <div role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--critical-wash)", color: "var(--critical-text)" }}>{error.text}</div>}
      <div>
        <label htmlFor="email" className="text-sm font-medium">{mode === "reset" ? "Login email" : "Work email"}</label>
        <input id="email" className="input w-full mt-1" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus aria-invalid={error?.field === "email" || undefined} />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium">{mode === "reset" ? "New password" : "Password"}</label>
        <div className="mt-1"><PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" invalid={error?.field === "password"} /></div>
        <StrengthMeter pw={password} />
        <p className="mt-1 text-xs text-ink-3">At least 10 characters. A short phrase is easiest to remember.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="text-sm font-medium">Confirm password</label>
        <div className="mt-1"><PasswordInput id="confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={mismatch || error?.field === "confirm"} /></div>
        {mismatch && <p className="mt-1 text-xs text-[var(--critical-text)]">Passwords don’t match.</p>}
      </div>
      <button className="btn btn-primary w-full justify-center !py-2.5" disabled={busy || !email || password.length < 10 || mismatch}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} {mode === "reset" ? "Save new password" : "Create login"}
      </button>
    </form>
  );
}
