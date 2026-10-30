import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/site/LegalPage";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Terms of Service · God View" };
export const dynamic = "force-dynamic";

export default function Terms() {
  const { name: n, legalEntity: co, supportEmail: email, legalJurisdiction: law } = brand;
  return (
    <LegalPage title="Terms of Service" path="/terms">
      <p>
        These Terms of Service ("<strong>Terms</strong>") govern your access to and use of {n} (the "<strong>Service</strong>") provided by {co} ("<strong>we</strong>", "<strong>us</strong>").
        By connecting your CRM, creating a login, or otherwise using the Service, you agree to these Terms. If you use the Service on behalf of a business, you agree on its behalf
        and confirm you have authority to do so; "<strong>you</strong>" then means that business.
      </p>

      <h2 id="service">1. The Service</h2>
      <p>
        {n} connects to your customer-relationship management platform ("<strong>CRM</strong>") at the workspace level and provides aggregated analytics across the client accounts in that workspace,
        including rankings, churn-risk indicators, alerts, and the ability to load CRM snapshots into accounts you select. Features may change over time.
      </p>

      <h2 id="account">2. Your login</h2>
      <ul>
        <li>You must provide an accurate email address and keep your password confidential. You are responsible for all activity under your login.</li>
        <li>Notify us promptly at <a href={`mailto:${email}`}>{email}</a> if you suspect unauthorized access.</li>
        <li>You must be at least 18 years old and able to form a binding contract.</li>
      </ul>

      <h2 id="crm">3. CRM connection and authority</h2>
      <ul>
        <li>You authorize us to access your CRM with the permissions you approve, and to act on your instructions, including loading snapshots into accounts you choose.</li>
        <li>You represent that you have all rights, permissions and consents (including from your own clients) needed to let us read data from, and make the changes you request to, each account.</li>
        <li>Your use of your CRM remains subject to your agreement with your CRM provider. We are not responsible for the CRM's availability, accuracy, changes to its interfaces, or its actions.</li>
      </ul>

      <h2 id="push">4. Snapshot pushes</h2>
      <p>
        Snapshot pushes change the target accounts in your CRM. <strong>You are solely responsible for choosing the snapshot, the target accounts and the override setting</strong>, and for reviewing
        the result. With override enabled, existing assets with the same names may be replaced, and we cannot reverse those changes. We recommend testing a snapshot on one account before pushing it widely.
      </p>

      <h2 id="data">5. Your data</h2>
      <ul>
        <li>You keep all rights to the data from your CRM and the data you upload ("<strong>Customer Data</strong>"). You grant us a limited license to use Customer Data only to provide and support the Service, as described in our <Link href="/privacy">Privacy Policy</Link>.</li>
        <li>You are responsible for the accuracy and legality of Customer Data, including ad spend you upload.</li>
        <li>When you uninstall the Service from your CRM workspace, Customer Data is deleted as described in the Privacy Policy.</li>
      </ul>

      <h2 id="use">6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>access accounts or data you are not authorized to access, or use the Service to violate anyone's rights or any law;</li>
        <li>probe, scan, or test the vulnerability of the Service, or bypass authentication, rate limits or other security measures;</li>
        <li>overload, disrupt, or reverse-engineer the Service, except where the law forbids this restriction;</li>
        <li>resell, sublicense, or provide the Service to third parties as a standalone product without our written permission; or</li>
        <li>use the Service to send spam or to push content that is unlawful, infringing, or harmful.</li>
      </ul>

      <h2 id="third-party">7. Third-party services</h2>
      <p>
        The Service works with third-party services you choose, such as your CRM, ad platforms whose exports you upload, and chat tools that receive alerts. Those services are governed by their own
        terms, and we are not responsible for them.
      </p>

      <h2 id="fees">8. Fees</h2>
      <p>
        If you subscribe to a paid plan, you agree to pay the fees shown at purchase. Fees are non-refundable except where required by law. We will give at least 30 days' notice before changing
        fees or introducing charges for features you already use.
      </p>

      <h2 id="ip">9. Our intellectual property</h2>
      <p>
        We and our licensors own the Service, including its software, design and documentation. We grant you a limited, non-exclusive, non-transferable right to use the Service under these Terms.
        If you send us feedback, we may use it without obligation to you.
      </p>

      <h2 id="availability">10. Availability and changes</h2>
      <p>
        We aim to keep the Service available but do not guarantee uninterrupted operation. Metrics depend on data from your CRM and may be delayed, incomplete, or affected by changes on the CRM's side.
        We may modify or discontinue features, and will give reasonable notice of changes that materially reduce functionality.
      </p>

      <h2 id="disclaimer">11. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE". TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
        PURPOSE, AND NON-INFRINGEMENT. Churn indicators, rankings and other analytics are informational and are not guarantees of any business outcome.
      </p>

      <h2 id="liability">12. Limitation of liability</h2>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA OR GOODWILL, ARISING FROM
        OR RELATED TO THE SERVICE, INCLUDING CHANGES MADE BY SNAPSHOT PUSHES YOU INITIATE. OUR TOTAL LIABILITY FOR ALL CLAIMS WILL NOT EXCEED THE GREATER OF THE AMOUNTS YOU PAID US IN THE 12 MONTHS BEFORE
        THE CLAIM OR US$100.
      </p>

      <h2 id="indemnity">13. Indemnity</h2>
      <p>
        You will defend and indemnify us against third-party claims arising from your Customer Data, your use of the Service in breach of these Terms, or your lack of authority to connect or modify
        the accounts in your CRM.
      </p>

      <h2 id="termination">14. Termination</h2>
      <p>
        You may stop using the Service at any time by uninstalling it from your CRM. We may suspend or terminate access if you breach these Terms or if required by law, with notice where practical.
        Sections that by their nature should survive termination (including 5, 9, 11, 12, 13 and 15) will survive.
      </p>

      <h2 id="law">15. Governing law</h2>
      <p>
        These Terms are governed by the laws of {law}, without regard to conflict-of-law rules. Disputes will be resolved in the courts located there, unless applicable consumer law gives you the right
        to bring proceedings where you live.
      </p>

      <h2 id="changes">16. Changes to these Terms</h2>
      <p>
        We may update these Terms. We will change the "Last updated" date and, for material changes, notify you at least 15 days in advance. Continuing to use the Service after changes take effect
        means you accept them.
      </p>

      <h2 id="contact">17. Contact</h2>
      <p>{co} · <a href={`mailto:${email}`}>{email}</a></p>
    </LegalPage>
  );
}
