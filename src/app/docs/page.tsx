import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import DocsToc from "@/components/site/DocsToc";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Documentation · God View", description: "How to connect your CRM, read the leaderboard, use the churn predictor, push snapshots, and configure alerts and ad spend." };
export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "overview", title: "Overview" },
  { id: "getting-started", title: "Getting started" },
  { id: "signing-in", title: "Your login" },
  { id: "dashboard", title: "Dashboard tour" },
  { id: "leaderboard", title: "Global leaderboard" },
  { id: "metrics", title: "Metric definitions" },
  { id: "account-details", title: "Account details" },
  { id: "churn", title: "Churn predictor" },
  { id: "email-health", title: "Email health" },
  { id: "push", title: "Snapshot push" },
  { id: "ad-spend", title: "Ad spend & CPL" },
  { id: "alerts", title: "Churn alerts" },
  { id: "sync", title: "Data sync" },
  { id: "settings", title: "Settings reference" },
  { id: "security", title: "Security & data" },
  { id: "self-hosting", title: "Self-hosting" },
  { id: "troubleshooting", title: "Troubleshooting" },
  { id: "faq", title: "FAQ" },
  { id: "glossary", title: "Glossary" },
];

export default function Docs() {
  const n = brand.name;
  return (
    <>
      <SiteNav active="/docs" />
      <div className="max-w-6xl mx-auto px-4 py-10 lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-8"><DocsToc sections={SECTIONS} /></div>
        </aside>
        <details className="lg:hidden card px-4 py-3 mb-6">
          <summary className="cursor-pointer font-medium text-sm">Jump to section</summary>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
            {SECTIONS.map((s) => <li key={s.id}><a className="text-ink-2 hover:text-ink" href={`#${s.id}`}>{s.title}</a></li>)}
          </ul>
        </details>

        <article className="prose max-w-3xl min-w-0">
          <h1>{n} documentation</h1>
          <p className="!mt-3 text-lg">Everything you need to connect your CRM, read every number on the dashboard, and act on it.</p>

          {/* ---------------------------------------------------------------- */}
          <h2 id="overview">Overview</h2>
          <p>
            Most CRMs report on <strong>one account at a time</strong>. If you manage 20, 100 or 500 client accounts, answering "who's doing well and who's in trouble?" means opening every one.
            {" "}{n} connects once at the top (workspace) level of your CRM, reads pipeline, appointment and lead data from every account you approve, and puts it on one screen.
          </p>
          <p>It does three jobs:</p>
          <ul>
            <li><strong>Global leaderboard</strong>: ranks every account by lowest cost per lead (CPL), highest appointment show rate, most revenue or most leads.</li>
            <li><strong>Churn predictor</strong>: flags an account red when its lead volume stays below a threshold for several consecutive days (3 by default).</li>
            <li><strong>One-click snapshot push</strong>: loads a winning account's funnel/workflow snapshot into many underperforming accounts at once.</li>
          </ul>

          {/* ---------------------------------------------------------------- */}
          <h2 id="getting-started">Getting started</h2>
          <h3>What you need</h3>
          <ul>
            <li>Admin access to your CRM <strong>workspace</strong>, the top level that contains all your client accounts. A login that can only see one account is not enough.</li>
            <li>About two minutes.</li>
          </ul>
          <h3>Step 1: Connect your CRM</h3>
          <ol>
            <li>Click <strong>Connect CRM</strong> on the <Link href="/">Home</Link> page or the <Link href="/login">sign-in</Link> page.</li>
            <li>You're sent to your CRM's own secure sign-in and permission screen. Sign in there if asked. {n} never sees your CRM password.</li>
            <li>Choose your <strong>workspace</strong> (not an individual account) and approve the requested permissions (see <a href="#security">Security &amp; data</a> for exactly what they allow).</li>
            <li>You're sent back to {n} automatically.</li>
          </ol>
          <h3>Step 2: Create your login</h3>
          <p>
            Right after connecting, you'll see <strong>Create your login</strong>. Enter the email and password you want to use for {n}, confirm the password and click <strong>Create login</strong>.
            You have 30 minutes to complete this step. If it expires, just connect your CRM again.
          </p>
          <h3>Step 3: Sign in</h3>
          <p>
            You land on the sign-in page with your email filled in. Enter your password to open the dashboard. Your first data sync starts the moment you connect, so most
            workspaces are fully loaded within a few minutes. Large workspaces (hundreds of accounts) can take longer. The sync button in the header shows progress.
          </p>
          <div className="callout">
            <strong>Just exploring?</strong> The <a href="/api/auth/demo">live demo</a> loads 100 realistic sample accounts. Snapshot pushes in the demo are simulated, so nothing is sent anywhere.
          </div>

          {/* ---------------------------------------------------------------- */}
          <h2 id="signing-in">Your login</h2>
          <p>After the first connection you sign in with <strong>email and password</strong>; you don't need to reconnect your CRM each time.</p>
          <table>
            <thead><tr><th>Task</th><th>How</th></tr></thead>
            <tbody>
              <tr><td>Sign in</td><td><Link href="/login">/login</Link> with your email and password. Sessions last 14 days.</td></tr>
              <tr><td>Sign out</td><td>The exit icon at the top-right of the dashboard.</td></tr>
              <tr><td>Change email or password</td><td>Settings → <strong>Login &amp; security</strong>. Your current password is required. Changing the password signs out every other device.</td></tr>
              <tr><td>Forgot password</td><td>On the sign-in page click <strong>Forgot password?</strong>. You confirm ownership by approving access in your CRM again, then choose a new password.</td></tr>
              <tr><td>Reconnect the CRM</td><td>Settings → <strong>Reconnect CRM</strong>. Use this if access was revoked or you were asked to re-approve permissions. Your login stays the same.</td></tr>
            </tbody>
          </table>
          <p>Password rules: at least 10 characters, not easy to guess, and not containing your email name. After repeated failed attempts, sign-in is paused for 15 minutes.</p>

          {/* ---------------------------------------------------------------- */}
          <h2 id="dashboard">Dashboard tour</h2>
          <p>From top to bottom:</p>
          <ol>
            <li><strong>Header</strong>: workspace name, sync status and button, <strong>Pushes</strong> (snapshot push progress, with a badge while pushes are running), Settings, Docs, theme toggle and sign out.</li>
            <li><strong>Filter row</strong>: the date range (7, 14, 30 or 60 days), status filter (All / Churn risk / Watch / Healthy, with counts) and account search. Filters apply to everything below them.</li>
            <li><strong>KPI tiles</strong>: total won revenue, leads, blended CPL and show rate across all accounts, each with its change against the previous period of the same length. The red <strong>Churn risk</strong> tile filters the leaderboard to red accounts when clicked.</li>
            <li><strong>Trend charts</strong>: leads per day and revenue per day for the whole workspace. Hover for exact values.</li>
            <li><strong>Global leaderboard</strong>: see below.</li>
            <li><strong>Churn predictor</strong>: a heatmap of every account currently on Watch or Churn risk.</li>
          </ol>
          <p>Your chosen date range and ranking metric are remembered on this device.</p>

          {/* ---------------------------------------------------------------- */}
          <h2 id="leaderboard">Global leaderboard</h2>
          <p>Every account in one table, ranked by the metric you pick with the <strong>CPL / Show rate / Revenue / Leads</strong> switch or by clicking a column header.</p>
          <ul>
            <li><strong>Ranking direction</strong>: CPL ranks lowest first; show rate, revenue and leads rank highest first. The top three get medals.</li>
            <li><strong>Missing values sink</strong>: an account with no ad spend has no CPL, so it's placed below every account that has one (rank shows "–").</li>
            <li><strong>Change arrows</strong>: under each value, the change against the previous period of the same length. Green means better, red means worse. For CPL, <em>down</em> is green.</li>
            <li><strong>Row colors</strong>: red rows (with a red left edge) are at churn risk; amber rows are on watch.</li>
            <li><strong>Daily leads sparkline</strong>: the dashed line is that account's churn threshold. The end dot turns red when the latest day is under it.</li>
            <li><strong>Selecting rows</strong>: tick checkboxes (or the header box for all visible rows) to push a snapshot to just those accounts.</li>
            <li><strong>Export</strong>: the download icon saves the current, filtered ranking as CSV.</li>
            <li><strong>Paging</strong>: 25 rows show at first. Click <em>Show more</em> to load the rest.</li>
          </ul>

          {/* ---------------------------------------------------------------- */}
          <h2 id="metrics">Metric definitions</h2>
          <table>
            <thead><tr><th>Metric</th><th>Formula</th><th>Source in your CRM</th></tr></thead>
            <tbody>
              <tr><td>Leads</td><td>Contacts created in the period</td><td>Each contact's <em>date added</em>, counted in the account's own timezone</td></tr>
              <tr><td>Ad spend</td><td>Sum of daily spend</td><td>Connected ad platforms, CSV import, a manual daily amount, or a custom value (see <a href="#ad-spend">Ad spend</a>)</td></tr>
              <tr><td>CPL</td><td>Ad spend ÷ leads</td><td>Shown only when the account has spend</td></tr>
              <tr><td>Show rate</td><td>Showed ÷ (showed + no-show)</td><td>Appointment status across every calendar in the account. Cancelled and still-pending appointments are excluded.</td></tr>
              <tr><td>Revenue</td><td>Sum of won opportunity values</td><td>Opportunities marked <em>won</em>, dated by when they were marked won</td></tr>
              <tr><td>Blended CPL (tile)</td><td>Total spend ÷ leads from accounts with spend</td><td>Accounts without spend are left out so they don't drag CPL down artificially</td></tr>
              <tr><td>Change %</td><td>(this period − previous period) ÷ previous period</td><td>Shown as "—" when the previous period was zero</td></tr>
            </tbody>
          </table>
          <div className="callout warn">
            Today is still in progress, so today's numbers are included in totals but <strong>never</strong> count toward churn. Churn only looks at completed days.
          </div>

          {/* ---------------------------------------------------------------- */}
          <h2 id="account-details">Account details</h2>
          <p>Click any row (or an account name in the churn heatmap) to open its detail panel:</p>
          <ul>
            <li>Its status, its rank on the current metric and when it last synced.</li>
            <li>Leads, CPL, show rate and revenue tiles with period-over-period change.</li>
            <li><strong>Daily leads</strong>: bars under the threshold are red, and the dashed line marks the threshold.</li>
            <li><strong>Appointments</strong>: showed vs no-show, stacked per day.</li>
            <li><strong>Revenue won</strong> per day.</li>
            <li><strong>Overrides</strong>: a fixed <em>daily ad spend</em> (used when you have no other spend source) and a <em>churn threshold</em> just for this account. Leave a box empty to use the workspace default.</li>
            <li>Two actions: <strong>Push this account's snapshot to others</strong> (this account is the winner) and <strong>Push a winner into this account</strong> (this account needs help).</li>
          </ul>
          <p>Press <code>Esc</code> or click outside to close.</p>

          {/* ---------------------------------------------------------------- */}
          <h2 id="churn">Churn predictor</h2>
          <p>A drop in new leads is usually the earliest sign a client is about to cancel. {n} checks every account against a simple rule:</p>
          <div className="callout">
            An account is <strong>Churn risk (red)</strong> when it has had <strong>fewer than <em>threshold</em> leads per day</strong> for <strong><em>N</em> consecutive completed days</strong>. With 1 to <em>N</em>−1 low days in a row it's on <strong>Watch (amber)</strong>. Defaults: threshold 3 leads/day, <em>N</em> = 3.
          </div>
          <ul>
            <li><strong>Streak</strong>: the badge shows how many low days in a row ("Churn risk · 6d"). One good day resets the streak to zero.</li>
            <li><strong>Per-account thresholds</strong>: a high-volume account might need a threshold of 20, while a niche one is fine at 1. Set it in the account's detail panel.</li>
            <li><strong>Heatmap</strong>: the last 14 completed days for every flagged account. Darker blue means more leads, and a red outline marks a day under that account's threshold. Hover a cell for the exact count.</li>
            <li><strong>Alerts</strong>: connect Slack or another chat tool to hear about red accounts without opening the dashboard. See <a href="#alerts">Churn alerts</a>.</li>
          </ul>
          <h3>Choosing a threshold</h3>
          <p>Start with roughly a third of an account's normal daily lead volume. Too high and healthy accounts flicker amber on slow weekends; too low and real drops are caught late.</p>

          {/* ---------------------------------------------------------------- */}
          <h2 id="email-health">Email health</h2>
          <p>
            Bad deliverability quietly kills a client's results: emails land in spam, appointments aren't confirmed, and leads go cold. {n} watches every email your CRM sends
            and shows, per account:
          </p>
          <table>
            <thead><tr><th>Number</th><th>Meaning</th></tr></thead>
            <tbody>
              <tr><td>Delivered</td><td>Emails accepted by the recipient's mail server</td></tr>
              <tr><td>Open rate</td><td>Unique opens ÷ delivered (each email counts once however often it's opened)</td></tr>
              <tr><td>Not opened</td><td>Delivered − opened</td></tr>
              <tr><td>Bounce rate</td><td>Permanent failures ÷ (delivered + bounced). Temporary failures are retried by the sender and not counted.</td></tr>
              <tr><td>Spam rate</td><td>Spam complaints ÷ delivered</td></tr>
              <tr><td>Unsubscribes</td><td>Recipients who unsubscribed</td></tr>
            </tbody>
          </table>
          <h3>Health status</h3>
          <ul>
            <li><strong>Critical (red)</strong>: spam complaints over <strong>0.3%</strong> (the level where Gmail and Yahoo start blocking senders) or bounces over <strong>5%</strong>.</li>
            <li><strong>Watch (amber)</strong>: spam over 0.1%, bounces over 2%, open rate under 15% (often a sign of landing in spam), or unsubscribes over 1%.</li>
            <li><strong>Low volume</strong>: fewer than 20 emails in the period, so no verdict yet.</li>
          </ul>
          <p>
            The <strong>Email health</strong> section on the dashboard lists problem accounts first, and each account's detail panel shows its daily opened vs not-opened chart.
            Accounts that turn critical are included in your <a href="#alerts">alerts</a>.
          </p>
          <h3>Turning it on</h3>
          <ol>
            <li>Approve the <strong>email</strong> permission when you connect (reconnect from Settings if you connected before it existed).</li>
            <li>Make sure the CRM app sends the <strong>email stats</strong> webhook event to {n} (see <a href="#self-hosting">Self-hosting</a>). Events arrive as emails are sent, so numbers build up from that point on. Past emails are not backfilled.</li>
          </ol>
          <div className="callout warn">Your CRM only sends email events to apps installed on each account. If an account shows no email data, check that {n} is approved for that account.</div>

          <h2 id="push">Snapshot push</h2>
          <p>
            Your CRM packages funnels, workflows, forms, calendars and other assets into <strong>snapshots</strong>. {n} lets you load one snapshot into many accounts in a single action.
            That's how you roll a winning campaign out to the accounts that need it.
          </p>
          <h3>1. Prepare the snapshot in your CRM</h3>
          <p>
            {n} can list and push snapshots, but your CRM only lets you <em>create</em> them from inside the CRM. In your CRM's snapshot settings, create a snapshot from the winning account.
            To push <strong>only</strong> one funnel or workflow, build a snapshot that contains just those assets. Giving it a name that includes the winning account's name lets {n} suggest it automatically.
          </p>
          <h3>2. Start a push</h3>
          <ul>
            <li>Click <strong>Push</strong> on the winning account's leaderboard row, or open its details and choose <strong>Push this account's snapshot to others</strong>.</li>
            <li>Or select target rows first and click <strong>Push a snapshot to selected</strong>.</li>
            <li>Or, from a struggling account's details, choose <strong>Push a winner into this account</strong>.</li>
          </ul>
          <h3>3. The three steps</h3>
          <ol>
            <li><strong>Choose the snapshot</strong>. Snapshots whose name matches the winning account are marked <em>Matches winner</em> and pre-selected.</li>
            <li><strong>Choose targets</strong>. Every churn-risk account and the bottom 25% on your current ranking metric are pre-selected. Quick buttons add the churn, watch, bottom-25% or all visible accounts. The winning account itself is always excluded.</li>
            <li><strong>Review &amp; push</strong>. Check the summary, decide on <em>Override existing assets</em> (below), and click <strong>Push to N accounts</strong>.</li>
          </ol>
          <h3>Override mode</h3>
          <table>
            <thead><tr><th>Setting</th><th>What happens</th><th>When to use it</th></tr></thead>
            <tbody>
              <tr><td>Off (default)</td><td>New assets are added. Anything that already exists in the target account is left untouched.</td><td>Almost always</td></tr>
              <tr><td>On</td><td>Assets with the same name are <strong>replaced</strong> by the snapshot's version.</td><td>Updating a funnel the target already has from an older snapshot. This can't be undone from {n}.</td></tr>
            </tbody>
          </table>
          <h3>Tracking progress</h3>
          <p>
            The <strong>Pushes</strong> panel opens automatically and shows each target's status: <em>Queued → Sending → Loading in CRM → Done</em>, or <em>Failed</em> with the CRM's reason.
            Loading usually takes a few minutes per account in your CRM. When a push finishes with failures, <strong>Retry N failed</strong> re-sends just those accounts.
            The panel keeps your last 50 pushes.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 id="ad-spend">Ad spend &amp; CPL</h2>
          <p>{n} takes spend from up to four sources. For each account and day it uses the first one available:</p>
          <ol>
            <li><strong>CSV import</strong> (Settings → Import ad spend)</li>
            <li><strong>Manual daily amount</strong> (account details → Overrides)</li>
            <li><strong>Connected ad platforms</strong>: Facebook/Instagram, Google and LinkedIn ad accounts connected to the account in your CRM's ad manager. This is synced automatically and needs no setup beyond approving the ad reporting permission.</li>
            <li><strong>Custom value</strong> in the account in your CRM (synced automatically)</li>
          </ol>
          <p>The account's detail panel shows which source its spend came from.</p>
          <h3>CSV import</h3>
          <p>Export spend by day from Meta Ads Manager, Google Ads or your reporting tool, then shape it like this. <strong>Download template</strong> gives you a file with every account already listed.</p>
          <pre><code>{`account_id,name,date,spend
abc123,Summit Roofing,2026-10-28,142.50
,Blue Ridge Dental,10/28/2026,"$1,050.00"`}</code></pre>
          <ul>
            <li>Match accounts by <code>account_id</code> <em>or</em> exact <code>name</code> (not case-sensitive). Either column is enough.</li>
            <li>Dates: <code>YYYY-MM-DD</code>, <code>YYYY/MM/DD</code> or <code>MM/DD/YYYY</code>. Amounts may include <code>$</code> and commas.</li>
            <li>By default, rows are merged by day, so re-importing a day overwrites it. Tick <em>Replace all</em> to discard previous imports first.</li>
            <li>The result tells you how many rows were imported and lists rows that didn't match any account.</li>
          </ul>
          <h3>Custom value (automatic)</h3>
          <p>
            Create a custom value named <code>ad_spend_daily</code> (or the key you set in Settings) in each account and keep it updated with an automation tool such as Zapier, Make or n8n. It accepts either:
          </p>
          <pre><code>{`42.50                                  ← average daily spend
{"2026-10-28": 41.20, "2026-10-29": 55}   ← spend per day`}</code></pre>

          {/* ---------------------------------------------------------------- */}
          <h2 id="alerts">Churn alerts</h2>
          <ol>
            <li>Create an incoming webhook in your chat tool. In <strong>Slack</strong>: Apps → <em>Incoming Webhooks</em> → add to a channel → copy the URL.</li>
            <li>In {n}: Settings → <strong>Churn alerts</strong> → paste the URL → <strong>Save</strong> → <strong>Send test alert</strong>.</li>
          </ol>
          <p>After every sync, accounts that <em>newly</em> turned red are posted in a single message, for example:</p>
          <pre><code>{`🚨 2 accounts at churn risk (Northwind Growth)
• Blue Ridge Dental: under 3 leads/day for 3 days
• Summit Solar: under 5 leads/day for 4 days`}</code></pre>
          <ul>
            <li>Each account alerts <strong>once</strong> until it recovers, so you won't be spammed every sync.</li>
            <li>Accounts whose <a href="#email-health">email health</a> turns critical (spam complaints or bounces) are included in the same message.</li>
            <li>Tick <em>Also notify when a red account recovers</em> for an all-clear message.</li>
            <li>Accounts that were already red when you first set up alerts are included in the next alert.</li>
            <li>Works with Slack, Google Chat, Discord (add <code>/slack</code> to the end of the webhook URL), Zapier and Make. The URL must start with <code>https://</code>.</li>
          </ul>

          {/* ---------------------------------------------------------------- */}
          <h2 id="sync">Data sync</h2>
          <ul>
            <li><strong>Automatic</strong>: every account is re-synced every 6 hours by default. On Vercel this is done by Vercel Cron (see <a href="#self-hosting">Self-hosting</a>), and an open dashboard also keeps a running sync moving.</li>
            <li><strong>Manual</strong>: the sync button in the header starts a sync immediately and shows <em>Syncing 42/100</em> while it runs.</li>
            <li><strong>New accounts</strong>: when the CRM webhook is configured, accounts created in your CRM are synced within seconds.</li>
            <li><strong>History</strong>: each sync reads the last 60 days by default, enough for a 30-day view plus its comparison period. Change it in Settings (14–180 days).</li>
            <li><strong>Timezones</strong>: each account's days are counted in that account's own timezone, so "yesterday" means the same thing to you and your client.</li>
            <li><strong>Partial failures</strong>: if one account can't be read (most often because {n} wasn't approved for it), only that row shows a warning icon. Everything else still updates.</li>
            <li><strong>Rate limits</strong>: {n} reads a few accounts at a time and backs off automatically if your CRM asks it to slow down.</li>
          </ul>

          {/* ---------------------------------------------------------------- */}
          <h2 id="settings">Settings reference</h2>
          <table>
            <thead><tr><th>Setting</th><th>Default</th><th>What it does</th></tr></thead>
            <tbody>
              <tr><td>Lead threshold</td><td>3</td><td>A completed day with fewer leads than this is a "low day".</td></tr>
              <tr><td>Consecutive low days before red</td><td>3</td><td>Low days in a row before an account becomes Churn risk.</td></tr>
              <tr><td>Ad spend custom value key</td><td><code>ad_spend_daily</code></td><td>Name of the custom value that holds spend in each account.</td></tr>
              <tr><td>Sync window</td><td>60 days</td><td>How much history each sync reads (14–180).</td></tr>
              <tr><td>Churn alert webhook</td><td>None</td><td>Where churn alerts are posted (https only).</td></tr>
              <tr><td>Notify on recovery</td><td>Off</td><td>Also post when a red account recovers.</td></tr>
            </tbody>
          </table>

          {/* ---------------------------------------------------------------- */}
          <h2 id="security">Security &amp; data</h2>
          <h3>Permissions requested from your CRM</h3>
          <table>
            <thead><tr><th>Access</th><th>Why</th></tr></thead>
            <tbody>
              <tr><td>Read workspace and account list</td><td>Know which accounts to show and their names and timezones</td></tr>
              <tr><td>Read contacts</td><td>Count new leads per day. Contact details are <strong>not stored</strong>; only daily counts are kept.</td></tr>
              <tr><td>Read opportunities</td><td>Sum revenue from won deals</td></tr>
              <tr><td>Read calendars &amp; appointments</td><td>Calculate show rate</td></tr>
              <tr><td>Read custom values</td><td>Read the ad spend value</td></tr>
              <tr><td>Read snapshots</td><td>List snapshots and check push progress</td></tr>
              <tr><td>Read ad reporting</td><td>Daily spend from connected Facebook, Google and LinkedIn ad accounts</td></tr>
              <tr><td>Read email events</td><td>Count deliveries, opens, bounces, spam complaints and unsubscribes. Only daily counts are stored, never recipients or content.</td></tr>
              <tr><td>Update accounts</td><td><strong>Only</strong> to load a snapshot you push</td></tr>
              <tr><td>Issue account-level access</td><td>Read each account with its own short-lived access token</td></tr>
            </tbody>
          </table>
          <h3>How your data is protected</h3>
          <ul>
            <li>CRM access tokens are encrypted at rest (AES-256-GCM) and renewed automatically. They are never sent to your browser.</li>
            <li>Passwords are hashed with scrypt and are never stored or logged in readable form.</li>
            <li>Sessions are signed, httpOnly cookies. Changing your password signs out every other session.</li>
            <li>Sign-in is rate-limited to slow down password guessing.</li>
            <li>Webhooks from your CRM must carry a valid signature, and unsigned requests are rejected.</li>
            <li>Only <strong>aggregated daily numbers</strong> are stored (lead counts, appointment counts, revenue totals, spend, email event counts). Individual contacts, recipients, messages and appointment details are not.</li>
          </ul>
          <h3>Disconnecting &amp; deleting your data</h3>
          <p>
            Uninstall {n} from your CRM's app settings. When your CRM notifies us, your access tokens, synced metrics, settings, push history and login are deleted automatically.
            Uninstalling from a single account removes just that account. You can also email <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> to request deletion. See the <Link href="/privacy">Privacy Policy</Link>.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 id="self-hosting">Self-hosting</h2>
          <p>{n} is a Next.js app. It runs on <strong>Vercel</strong> (with Upstash Redis for storage) or on any long-running Node host such as Docker, Render, Fly.io or a VM.</p>
          <h3>1. Register an app in your CRM's developer portal</h3>
          <ul>
            <li>Distribution: <strong>workspace level</strong>, so one install covers all accounts.</li>
            <li>Redirect URL: <code>https://your-domain/api/auth/callback</code></li>
            <li>Webhook URL: <code>https://your-domain/api/webhooks/crm</code>. Subscribe to <code>INSTALL</code>, <code>UNINSTALL</code>, <code>LocationCreate</code> and <code>LCEmailStats</code>.</li>
            <li>Permissions (exact identifiers):
              <pre><code>locations.readonly locations.write locations/customValues.readonly oauth.readonly oauth.write companies.readonly contacts.readonly opportunities.readonly calendars.readonly calendars/events.readonly snapshots.readonly adPublishing.readonly lc-email.readonly</code></pre>
              If you tick extra permissions in the app, add them to <code>CRM_EXTRA_SCOPES</code> so the requested list matches.
            </li>
          </ul>
          <h3>2. Configure environment variables</h3>
          <table>
            <thead><tr><th>Variable</th><th>Required</th><th>Purpose</th></tr></thead>
            <tbody>
              <tr><td><code>CRM_CLIENT_ID</code>, <code>CRM_CLIENT_SECRET</code></td><td>Yes</td><td>OAuth credentials from your CRM app</td></tr>
              <tr><td><code>CRM_REDIRECT_URI</code></td><td>Yes</td><td>Must exactly match the redirect URL above</td></tr>
              <tr><td><code>CRM_APP_ID</code></td><td>Recommended</td><td>Limits sync to accounts with the app installed, and ignores other apps' webhooks</td></tr>
              <tr><td><code>SESSION_SECRET</code></td><td>Yes</td><td>64 random hex characters (<code>openssl rand -hex 32</code>); signs sessions</td></tr>
              <tr><td><code>TOKEN_ENCRYPTION_KEY</code></td><td>Yes</td><td>A different 64 random hex characters; encrypts CRM tokens at rest. Never change it after launch, or stored tokens can't be read.</td></tr>
              <tr><td><code>UPSTASH_REDIS_REST_URL</code>, <code>UPSTASH_REDIS_REST_TOKEN</code></td><td>Yes on Vercel</td><td>Storage. Vercel's Upstash integration sets <code>KV_REST_API_URL</code> / <code>KV_REST_API_TOKEN</code>, which also work. Without them, data is kept in files (Docker/VM only).</td></tr>
              <tr><td><code>CRON_SECRET</code></td><td>Yes on Vercel</td><td>Protects <code>/api/cron/sync</code>. Vercel Cron sends it automatically.</td></tr>
              <tr><td><code>APP_URL</code></td><td>Recommended</td><td>Public URL, used for links in alerts</td></tr>
              <tr><td><code>AUTO_SYNC_HOURS</code></td><td>No</td><td>How often each workspace re-syncs (default 6)</td></tr>
              <tr><td><code>CRM_EXTRA_SCOPES</code></td><td>No</td><td>Extra permission identifiers to request, space-separated</td></tr>
              <tr><td><code>CRM_WEBHOOK_PUBLIC_KEY</code>, <code>CRM_WEBHOOK_ED25519_PUBLIC_KEY</code></td><td>No</td><td>Only if your CRM rotates its webhook signing key. The current published key is built in.</td></tr>
              <tr><td><code>SUPPORT_EMAIL</code>, <code>LEGAL_ENTITY_NAME</code>, <code>LEGAL_JURISDICTION</code></td><td>Yes, before launch</td><td>Shown on the Privacy and Terms pages</td></tr>
            </tbody>
          </table>
          <h3>3a. Deploy on Vercel</h3>
          <ol>
            <li>Import the repository in Vercel.</li>
            <li>Storage → <strong>Upstash Redis</strong> → create a database and connect it to the project (this adds the Redis variables).</li>
            <li>Add the other variables above, then redeploy.</li>
            <li>The included <code>vercel.json</code> schedules <code>/api/cron/sync</code> once a day, the most Vercel's Hobby plan allows. On Pro, change the schedule to <code>*/15 * * * *</code>: each run continues any sync in progress and starts a new one when a workspace is due.</li>
          </ol>
          <p>Vercel stops functions after they respond, so syncs run in short resumable steps: the cron job and any open dashboard keep them moving until all accounts are done.</p>
          <h3>3b. Deploy with Docker</h3>
          <pre><code>{`docker compose up -d --build      # reads .env.local, data in a named volume
curl https://your-domain/api/health`}</code></pre>
          <p>Without Redis variables, data is stored in <code>/app/data</code>, so keep it on a persistent volume. A built-in timer handles scheduled syncs.</p>

          {/* ---------------------------------------------------------------- */}
          <h2 id="troubleshooting">Troubleshooting</h2>
          <table>
            <thead><tr><th>Symptom</th><th>Cause &amp; fix</th></tr></thead>
            <tbody>
              <tr><td>"Connect God View at the top (workspace) level…"</td><td>You approved access from inside a single account. Connect again and pick the workspace.</td></tr>
              <tr><td>An account shows ⚠ "No access. Is God View installed on this account?"</td><td>The app wasn't approved for that account. Approve it in your CRM's app settings, then sync.</td></tr>
              <tr><td>CPL shows "—"</td><td>No ad spend for that account. Import a CSV, set a daily amount, or set up the custom value.</td></tr>
              <tr><td>Show rate shows "—"</td><td>No appointments were marked showed or no-show in the period.</td></tr>
              <tr><td>Revenue looks low</td><td>Only opportunities marked <em>won</em> count, with no monetary value counted as $0. Check that deals are being closed as won in your CRM.</td></tr>
              <tr><td>Snapshot push "Failed"</td><td>The reason from your CRM is shown under the account. Common causes are conflicting asset names (retry with override) or the account being locked. Use <strong>Retry failed</strong>.</td></tr>
              <tr><td>"Setup link expired"</td><td>More than 30 minutes passed after connecting. Click <em>Connect CRM again</em>.</td></tr>
              <tr><td>"Too many attempts"</td><td>Sign-in is paused for 15 minutes after repeated failures. Use <em>Forgot password?</em> if needed.</td></tr>
              <tr><td>Numbers seem a day off</td><td>Days are counted in each account's timezone. Check the timezone set on the account in your CRM.</td></tr>
              <tr><td>Email health says "No email events yet"</td><td>The email permission wasn't approved, the CRM app isn't sending the email stats webhook, or no emails have been sent since. Reconnect from Settings and check the app's webhook events.</td></tr>
              <tr><td>CPL uses the wrong spend</td><td>The detail panel shows the spend source. CSV imports and manual amounts win over ad platforms, so clear them if you want ad-platform spend.</td></tr>
              <tr><td>Test alert fails</td><td>The webhook URL must start with <code>https://</code> and be active. Create a fresh webhook in your chat tool.</td></tr>
            </tbody>
          </table>

          {/* ---------------------------------------------------------------- */}
          <h2 id="faq">FAQ</h2>
          <h3>How many accounts can it handle?</h3>
          <p>Hundreds. Syncs read a few accounts at a time to respect your CRM's limits, so the first sync of a very large workspace can take a while. Later syncs keep running in the background.</p>
          <h3>Can my team use it?</h3>
          <p>Each workspace currently has one login. Share it with your team, or ask us about multi-user access.</p>
          <h3>Does it change anything in my CRM?</h3>
          <p>Only when you push a snapshot, and only to the accounts you confirm on the review screen.</p>
          <h3>Can I push a single funnel instead of a whole snapshot?</h3>
          <p>Yes. Create a snapshot that contains just that funnel (and its workflows) and push it with override off.</p>
          <h3>Why don't today's low numbers make an account red?</h3>
          <p>Today isn't finished. Churn is judged on completed days only, so a quiet morning never triggers a false alarm.</p>

          {/* ---------------------------------------------------------------- */}
          <h2 id="glossary">Glossary</h2>
          <table>
            <tbody>
              <tr><td><strong>CRM</strong></td><td>The customer-relationship platform where your client accounts live.</td></tr>
              <tr><td><strong>Workspace</strong></td><td>The top level of your CRM that contains all your accounts. {n} connects here.</td></tr>
              <tr><td><strong>Account</strong></td><td>One client inside your workspace, with its own contacts, pipeline and calendars.</td></tr>
              <tr><td><strong>Snapshot</strong></td><td>A package of funnels, workflows and other assets that can be loaded into an account.</td></tr>
              <tr><td><strong>CPL</strong></td><td>Cost per lead: ad spend ÷ leads.</td></tr>
              <tr><td><strong>Show rate</strong></td><td>Share of resolved appointments where the lead showed up.</td></tr>
              <tr><td><strong>Watch / Churn risk</strong></td><td>Amber / red status from consecutive low-lead days.</td></tr>
            </tbody>
          </table>

          <p className="!mt-12 text-sm">Still stuck? Email <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>.</p>
        </article>
      </div>
      <SiteFooter />
    </>
  );
}
