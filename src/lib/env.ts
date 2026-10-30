/** Reads CRM_<NAME>, falling back to the legacy GHL_<NAME> variable. */
export function crmEnv(name: string): string | undefined {
  return process.env[`CRM_${name}`] || process.env[`GHL_${name}`] || undefined;
}
