import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/site/LegalPage";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Privacy Policy · God View" };
export const dynamic = "force-dynamic";

export default function Privacy() {
  const { name: n, legalEntity: co, supportEmail: email } = brand;
  return (
    <LegalPage title="Privacy Policy" path="/privacy">
      <p>
        This Privacy Policy explains how {co} ("<strong>we</strong>", "<strong>us</strong>") collects, uses, shares and protects information when you use {n} (the "<strong>Service</strong>"),
        a dashboard that connects to your customer-relationship management platform ("<strong>CRM</strong>") and shows analytics across the client accounts in your CRM workspace.
      </p>

      <h2 id="roles">1. Our role</h2>
      <p>
        For your own login details we act as a <strong>controller</strong>. For data we read from your CRM about your clients' accounts we act as a <strong>processor</strong> (service provider)
        on your behalf. You remain responsible for having a lawful basis to share that data with us and for your obligations to your own clients.
      </p>

      <h2 id="collect">2. Information we collect</h2>
      <h3>2.1 Information you give us</h3>
      <ul>
        <li><strong>Login details</strong>: your email address and password. We store only a one-way scrypt hash of your password, never the password itself.</li>
        <li><strong>Settings you enter</strong>: churn thresholds, per-account overrides, an alert webhook URL, and ad spend you upload by CSV or type in.</li>
        <li><strong>Support messages</strong>: anything you send when you contact us.</li>
      </ul>
      <h3>2.2 Information we receive from your CRM</h3>
      <p>When you connect your CRM and approve access, we receive and store:</p>
      <ul>
        <li><strong>Access credentials</strong>: OAuth access and refresh tokens, encrypted at rest.</li>
        <li><strong>Workspace and account metadata</strong>: workspace name and identifier, and for each account its name, identifier, city, state and timezone.</li>
        <li><strong>Aggregated daily metrics</strong> per account: number of new contacts, appointment counts by status, total value of won opportunities, and ad spend from a custom value.</li>
        <li><strong>Snapshot metadata</strong>: snapshot names and identifiers, plus a history of pushes you start and their outcome.</li>
      </ul>
      <p>
        To calculate those totals we temporarily read contact creation dates, appointment statuses and opportunity values. <strong>We do not store individual contact records</strong> (names, emails, phone numbers),
        messages, notes or appointment details; only the daily counts and totals are kept.
      </p>
      <h3>2.3 Information collected automatically</h3>
      <ul>
        <li><strong>Cookies</strong>: a strictly necessary, signed session cookie that keeps you signed in, and short-lived security cookies during CRM connection and login setup. We do not use advertising or third-party analytics cookies.</li>
        <li><strong>Local storage</strong>: your theme and dashboard view preferences, stored only in your browser.</li>
        <li><strong>Server logs</strong>: IP address, request time and path, and errors, used for security (including rate-limiting sign-in attempts) and troubleshooting.</li>
      </ul>

      <h2 id="use">3. How we use information</h2>
      <ul>
        <li>To provide the Service: sync and display metrics, rank accounts, detect churn risk, and push snapshots you request.</li>
        <li>To authenticate you and keep your account secure.</li>
        <li>To send the alerts you configure to the destination you choose.</li>
        <li>To maintain, debug and improve the Service, and to respond to support requests.</li>
        <li>To comply with law and enforce our <Link href="/terms">Terms of Service</Link>.</li>
      </ul>
      <p>We do <strong>not</strong> sell personal information, use CRM data for advertising, or use CRM data to train machine-learning models.</p>

      <h2 id="legal-bases">4. Legal bases (EEA/UK users)</h2>
      <p>
        We process your login details to perform our contract with you, and server logs and security data for our legitimate interest in keeping the Service secure.
        CRM data is processed on your instructions as your processor. Where consent is required, we ask for it and you may withdraw it at any time.
      </p>

      <h2 id="sharing">5. How information is shared</h2>
      <ul>
        <li><strong>Your CRM</strong>: we send requests to your CRM to read data and, when you push a snapshot, to load it into the accounts you choose.</li>
        <li><strong>Destinations you configure</strong>: when you set an alert webhook (for example Slack), alert messages containing account names and lead statistics are sent there.</li>
        <li><strong>Infrastructure providers</strong>: hosting and storage providers that process data on our behalf under confidentiality and security obligations.</li>
        <li><strong>Legal and safety</strong>: when required by law, or to protect the rights, property or safety of users or the public.</li>
        <li><strong>Business transfers</strong>: in a merger, acquisition or asset sale, subject to this Policy.</li>
      </ul>

      <h2 id="retention">6. Retention and deletion</h2>
      <ul>
        <li>Synced metrics cover a rolling window you choose (60 days by default); older daily data is replaced on each sync.</li>
        <li>Snapshot push history keeps your most recent 50 pushes.</li>
        <li><strong>When you uninstall {n} from your CRM workspace</strong>, we automatically delete your access tokens, synced data, settings, push history and login. Uninstalling from a single account deletes that account's data.</li>
        <li>You can request deletion at any time by emailing <a href={`mailto:${email}`}>{email}</a>. We complete verified requests within 30 days.</li>
        <li>Server logs are kept for up to 30 days unless needed longer to investigate a security incident.</li>
      </ul>

      <h2 id="security">7. Security</h2>
      <p>
        We use encryption in transit (HTTPS), AES-256-GCM encryption of CRM tokens at rest, scrypt password hashing, signed httpOnly session cookies, rate-limited sign-in, and signature
        verification for webhooks from your CRM. No method of transmission or storage is completely secure, but we work to protect your information and will notify you of a breach affecting
        your data as required by law.
      </p>

      <h2 id="rights">8. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, delete, or export your personal information, to object to or restrict processing, and to complain to a data
        protection authority. California residents have the rights described in the CCPA/CPRA, including to know, delete and correct, and not to be discriminated against for exercising them. We do not
        "sell" or "share" personal information as those terms are defined there. To exercise any right, email <a href={`mailto:${email}`}>{email}</a>. If you are one of our customers' clients,
        please contact that customer, and we will help them respond.
      </p>

      <h2 id="transfers">9. International transfers</h2>
      <p>
        We may process information in countries other than yours. Where required, we rely on appropriate safeguards such as the European Commission's Standard Contractual Clauses.
      </p>

      <h2 id="children">10. Children</h2>
      <p>The Service is for businesses and is not directed to anyone under 16. We do not knowingly collect personal information from children.</p>

      <h2 id="changes">11. Changes to this Policy</h2>
      <p>We may update this Policy. We will change the "Last updated" date and, for material changes, notify you by email or in the Service before they take effect.</p>

      <h2 id="contact">12. Contact</h2>
      <p>{co} · <a href={`mailto:${email}`}>{email}</a></p>
    </LegalPage>
  );
}
