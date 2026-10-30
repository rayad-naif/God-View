/** Public-facing identity. Override with env vars when you deploy. */
export const brand = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "God View",
  legalEntity: process.env.LEGAL_ENTITY_NAME || process.env.NEXT_PUBLIC_APP_NAME || "God View",
  supportEmail: process.env.SUPPORT_EMAIL || "support@example.com",
  legalJurisdiction: process.env.LEGAL_JURISDICTION || "the State of Delaware, United States",
  legalUpdated: "October 30, 2026",
};
