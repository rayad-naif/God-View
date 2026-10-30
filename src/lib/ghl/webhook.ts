import crypto from "crypto";
import { crmEnv } from "@/lib/env";

const pem = (k: string) => k.replace(/\\n/g, "\n").trim();

/**
 * The CRM's published RSA key for the `x-wh-signature` header (from its webhook authentication guide).
 * Override with CRM_WEBHOOK_PUBLIC_KEY if the CRM announces a rotation.
 */
const DEFAULT_RSA_KEY = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAokvo/r9tVgcfZ5DysOSC
Frm602qYV0MaAiNnX9O8KxMbiyRKWeL9JpCpVpt4XHIcBOK4u3cLSqJGOLaPuXw6
dO0t6Q/ZVdAV5Phz+ZtzPL16iCGeK9po6D6JHBpbi989mmzMryUnQJezlYJ3DVfB
csedpinheNnyYeFXolrJvcsjDtfAeRx5ByHQmTnSdFUzuAnC9/GepgLT9SM4nCpv
uxmZMxrJt5Rw+VUaQ9B8JSvbMPpez4peKaJPZHBbU3OdeCVx5klVXXZQGNHOs8gF
3kvoV5rTnXV0IknLBXlcKKAQLZcY/Q9rG6Ifi9c+5vqlvHPCUJFT5XUGG5RKgOKU
J062fRtN+rLYZUV+BjafxQauvC8wSWeYja63VSUruvmNj8xkx2zE/Juc+yjLjTXp
IocmaiFeAO6fUtNjDeFVkhf5LNb59vECyrHD2SQIrhgXpO4Q3dVNA5rw576PwTzN
h/AMfHKIjE4xQA1SZuYJmNnmVZLIZBlQAF9Ntd03rfadZ+yDiOXCCs9FkHibELhC
HULgCsnuDJHcrGNd5/Ddm5hxGQ0ASitgHeMZ0kcIOwKDOzOU53lDza6/Y09T7sYJ
PQe7z0cvj7aE4B+Ax1ZoZGPzpJlZtGXCsu9aTEGEnKzmsFqwcSsnw3JB31IGKAyk
T1hhTiaCeIY/OwwwNUY2yvcCAwEAAQ==
-----END PUBLIC KEY-----`;

/**
 * Verifies a CRM webhook signature over the raw body:
 *  - `x-ghl-signature`: Ed25519 (CRM_WEBHOOK_ED25519_PUBLIC_KEY)
 *  - `x-wh-signature`:  RSA-SHA256 (CRM_WEBHOOK_PUBLIC_KEY, defaulting to the published key)
 */
export function verifyGhlWebhook(rawBody: string, headers: Headers): { ok: boolean; reason?: string } {
  if (crmEnv("WEBHOOK_ALLOW_UNSIGNED") === "true" && process.env.NODE_ENV !== "production") return { ok: true };
  const body = Buffer.from(rawBody, "utf8");
  const edKey = crmEnv("WEBHOOK_ED25519_PUBLIC_KEY");
  const ed = headers.get("x-ghl-signature");
  if (ed && edKey) {
    try {
      if (crypto.verify(null, body, pem(edKey), Buffer.from(ed, "base64"))) return { ok: true };
    } catch { /* fall through */ }
  }
  const rsa = headers.get("x-wh-signature");
  if (rsa) {
    try {
      if (crypto.verify("sha256", body, pem(crmEnv("WEBHOOK_PUBLIC_KEY") || DEFAULT_RSA_KEY), Buffer.from(rsa, "base64"))) return { ok: true };
    } catch { /* fall through */ }
  }
  return { ok: false, reason: "Invalid or missing signature" };
}

/** Rejects deliveries whose signed timestamp is more than 5 minutes off (replay protection). */
export function freshEnough(evt: { timestamp?: unknown }): boolean {
  if (typeof evt.timestamp !== "string") return true; // older payloads carry no top-level timestamp
  const t = Date.parse(evt.timestamp);
  return !Number.isFinite(t) || Math.abs(Date.now() - t) <= 5 * 60_000;
}
