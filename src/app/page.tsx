import Link from "next/link";
import { Trophy, Siren, Rocket, Plug, KeyRound, LayoutDashboard, ShieldCheck, Bell, FileSpreadsheet, RefreshCw, Lock, ArrowRight, Check } from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Trophy,
    title: "Global leaderboard",
    body: "Every account ranked side by side by lowest cost per lead, highest appointment show rate, most revenue or most leads, with the change against the previous period on every number.",
    points: ["7, 14, 30 or 60-day windows", "Top performers marked with medals", "Search, filter, multi-select, CSV export"],
  },
  {
    icon: Siren,
    title: "Churn predictor",
    body: "An account turns red when its lead volume stays under your threshold for 3 straight days. Accounts heading that way are marked Watch, so you can step in before the client notices.",
    points: ["Workspace default + per-account thresholds", "14-day lead heatmap of every at-risk account", "Email health: bounces, spam complaints, opens", "Slack alerts the moment an account turns red"],
  },
  {
    icon: Rocket,
    title: "One-click snapshot push",
    body: "Found a campaign that's crushing it? Push its funnel and workflow snapshot to every underperforming account in one go, then watch each one load live.",
    points: ["Underperformers pre-selected for you", "Safe mode adds assets without overwriting", "Per-account progress and one-click retry"],
  },
];

const FAQ = [
  ["Which CRM does it work with?", "God View connects to CRMs that run multiple client accounts under one workspace and support OAuth app installs. Connect from the Home page, and the CRM's own sign-in screen asks you to approve access."],
  ["Do I need to install anything on each account?", "No. You connect once at the workspace level and God View reads every account you approve. New accounts are picked up automatically."],
  ["Can God View change my accounts?", "Only when you push a snapshot, and only to the accounts you select on the review screen. Everything else is read-only."],
  ["Where does ad spend come from?", "From the Facebook, Google and LinkedIn ad accounts connected to each account in your CRM. You can also upload a CSV, type a daily amount, or use a custom value. See the Docs for details."],
  ["What happens to my data if I disconnect?", "Uninstalling God View from your CRM deletes your tokens, metrics and login from our servers. Details are in the Privacy Policy."],
];

export default function Home({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <>
      <SiteNav active="/" />
      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 pt-16 pb-10 sm:pt-24">
          {searchParams.error && (
            <div role="alert" className="mb-6 rounded-lg px-4 py-3 text-sm" style={{ background: "var(--critical-wash)", color: "var(--critical-text)" }}>{searchParams.error}</div>
          )}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs font-medium text-ink-2">
              <span className="w-1.5 h-1.5 rounded-full bg-good" /> Multi-account analytics for your CRM
            </div>
            <h1 className="mt-5 text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
              Every account.<br />One screen.
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-ink-2 max-w-2xl leading-relaxed">
              Stop logging into dozens of dashboards. {brand.name} pulls pipeline, appointment and lead data from every account in your CRM, shows you who's winning and who's about to churn, and lets you roll out what works in one click.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/api/auth/connect" className="btn btn-primary !px-5 !py-3 !text-base"><Plug className="w-5 h-5" /> Connect your CRM</a>
              <a href="/api/auth/demo" className="btn !px-5 !py-3 !text-base">Try the live demo <ArrowRight className="w-4 h-4" /></a>
            </div>
            <p className="mt-3 text-sm text-ink-3">The demo uses 100 sample accounts. No sign-up needed.</p>
          </div>

          <div className="mt-14 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-2 shadow-2xl shadow-black/10">
            <img src="/screens/dashboard-light.png" alt="God View dashboard showing KPI tiles, daily lead and revenue charts, and the global leaderboard" className="only-light w-full rounded-xl" width={1440} height={900} />
            <img src="/screens/dashboard-dark.png" alt="" aria-hidden className="only-dark w-full rounded-xl" width={1440} height={900} />
          </div>
        </section>

        {/* Problem */}
        <section className="max-w-6xl mx-auto px-4 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Your CRM reports one account at a time. You run all of them.</h2>
            <p className="mt-4 text-ink-2 leading-relaxed">
              With 100 clients, a quick "how is everyone doing?" means 100 logins, 100 date pickers and a spreadsheet you'll never finish.
              Problems surface when a client emails to cancel, not when their lead flow first dips.
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              ["Before", "Logging into each account to check numbers", false],
              ["Before", "Finding churn when the cancellation arrives", false],
              ["Before", "Rebuilding winning funnels by hand", false],
              ["With " + brand.name, "Every account ranked on one screen", true],
              ["With " + brand.name, "A red flag after 3 slow days", true],
              ["With " + brand.name, "Winning snapshot pushed to many in one click", true],
            ].map(([tag, text, good], i) => (
              <li key={i} className="card p-4" style={good ? { borderColor: "rgba(12,163,12,.35)" } : undefined}>
                <div className={`text-[11px] font-semibold uppercase tracking-wide ${good ? "text-[var(--good-text)]" : "text-ink-3"}`}>{tag as string}</div>
                <div className="mt-1 font-medium">{text as string}</div>
              </li>
            ))}
          </ul>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 py-16" id="features">
          <h2 className="text-3xl font-semibold tracking-tight text-center">Three tools, one view</h2>
          <p className="mt-3 text-ink-2 text-center max-w-2xl mx-auto">Built for operators who manage many client accounts and need to know where to spend their attention today.</p>
          <div className="mt-10 grid lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, body, points }) => (
              <article key={title} className="card p-6 flex flex-col">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--surface-2)]"><Icon className="w-5 h-5 text-brand" /></div>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-ink-2 leading-relaxed">{body}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {points.map((p) => <li key={p} className="flex gap-2"><Check className="w-4 h-4 text-good shrink-0 mt-0.5" />{p}</li>)}
                </ul>
              </article>
            ))}
          </div>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              [Bell, "Churn alerts", "Slack, Google Chat, Discord, Zapier or Make."],
              [FileSpreadsheet, "Real ad spend", "Pulled from connected Facebook, Google and LinkedIn ad accounts, or imported by CSV."],
              [RefreshCw, "Always fresh", "Auto-sync every few hours, plus instant pickup of new accounts."],
              [Lock, "Secure by default", "Encrypted tokens, hashed passwords, signed webhooks."],
            ].map(([Icon, t, b]) => {
              const I = Icon as typeof Bell;
              return (
                <div key={t as string} className="card p-4">
                  <I className="w-4 h-4 text-brand" />
                  <div className="mt-2 font-semibold text-sm">{t as string}</div>
                  <div className="text-sm text-ink-2 mt-1">{b as string}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Up and running in two minutes</h2>
          <ol className="mt-8 grid md:grid-cols-3 gap-4">
            {[
              [Plug, "Connect your CRM", "Approve read access on your CRM's own secure sign-in screen. We never see your CRM password."],
              [KeyRound, "Create your login", "Right after connecting, choose the email and password you'll use to sign in to " + brand.name + "."],
              [LayoutDashboard, "See every account", "The first sync starts right away, so your leaderboard fills in within minutes."],
            ].map(([Icon, t, b], i) => {
              const I = Icon as typeof Plug;
              return (
                <li key={i} className="card p-6">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-brand text-white text-sm font-semibold flex items-center justify-center">{i + 1}</span>
                    <I className="w-5 h-5 text-ink-2" />
                  </div>
                  <h3 className="mt-4 font-semibold">{t as string}</h3>
                  <p className="mt-1.5 text-sm text-ink-2 leading-relaxed">{b as string}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Security */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="card p-8 grid md:grid-cols-[auto_1fr] gap-6 items-start">
            <ShieldCheck className="w-10 h-10 text-brand" />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Your clients' data, handled carefully</h2>
              <ul className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-ink-2">
                {[
                  "CRM access tokens encrypted at rest with AES-256-GCM",
                  "Passwords hashed with scrypt, and never stored or logged",
                  "Read-only access except for snapshot pushes you confirm",
                  "Uninstalling from your CRM deletes your data automatically",
                  "Webhooks from the CRM are signature-verified",
                  "Sign-in attempts are rate-limited",
                ].map((s) => <li key={s} className="flex gap-2"><Check className="w-4 h-4 text-good shrink-0 mt-0.5" />{s}</li>)}
              </ul>
              <Link href="/privacy" className="inline-block mt-4 text-sm text-brand underline underline-offset-2">Read the Privacy Policy</Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight text-center">Questions</h2>
          <div className="mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="cursor-pointer list-none flex items-center justify-between font-medium">
                  {q}<span className="text-ink-3 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="mt-2 text-sm text-ink-2 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-ink-2">More in the <Link href="/docs" className="text-brand underline underline-offset-2">documentation</Link>.</p>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4">
          <div className="rounded-2xl bg-brand text-white p-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">See all your accounts today</h2>
            <p className="mt-2 text-white/85">Connect your CRM, set your login, and your leaderboard fills in within minutes.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a href="/api/auth/connect" className="btn !bg-white !text-[#0b0b0b] !border-white !px-5 !py-2.5">Connect your CRM</a>
              <a href="/api/auth/demo" className="btn !bg-transparent !text-white !border-white/50 !px-5 !py-2.5 hover:!bg-white/10">Try the demo</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
