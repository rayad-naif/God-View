import { ghlFetch } from "./client";
import { crmEnv } from "@/lib/env";

export const GHL_SCOPES = [
  "locations.readonly",
  "locations.write", // push snapshots to sub-accounts
  "locations/customValues.readonly", // ad spend
  "oauth.readonly",
  "oauth.write", // mint location tokens
  "companies.readonly",
  "contacts.readonly",
  "opportunities.readonly",
  "calendars.readonly",
  "calendars/events.readonly",
  "snapshots.readonly",
  "adPublishing.readonly", // ad spend from connected Facebook / Google / LinkedIn ad accounts
  "lc-email.readonly", // email delivery events (bounces, spam complaints, opens)
];

/**
 * Scopes requested at authorization. They must match the scopes ticked on the CRM app.
 * CRM_SCOPES replaces the list entirely; CRM_EXTRA_SCOPES appends (space- or comma-separated).
 */
export function requestedScopes(): string[] {
  const split = (v?: string) => (v ?? "").split(/[\s,]+/).filter(Boolean);
  const base = split(crmEnv("SCOPES"));
  return [...new Set([...(base.length ? base : GHL_SCOPES), ...split(crmEnv("EXTRA_SCOPES"))])];
}

export function ghlConfigured() {
  return Boolean(crmEnv("CLIENT_ID") && crmEnv("CLIENT_SECRET") && crmEnv("REDIRECT_URI"));
}

export function authorizeUrl(state: string) {
  const u = new URL("https://marketplace.gohighlevel.com/oauth/chooselocation");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", crmEnv("REDIRECT_URI")!);
  u.searchParams.set("client_id", crmEnv("CLIENT_ID")!);
  u.searchParams.set("scope", requestedScopes().join(" "));
  u.searchParams.set("state", state);
  return u.toString();
}

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  userType?: string;
  companyId?: string;
  locationId?: string;
  userId?: string;
};

export function exchangeCode(code: string) {
  return ghlFetch<TokenResponse>("/oauth/token", null, {
    form: {
      client_id: crmEnv("CLIENT_ID")!,
      client_secret: crmEnv("CLIENT_SECRET")!,
      grant_type: "authorization_code",
      code,
      user_type: "Company",
      redirect_uri: crmEnv("REDIRECT_URI")!,
    },
  });
}
