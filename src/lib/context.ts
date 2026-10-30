import { NextResponse } from "next/server";
import { getSession } from "./session";
import { loadStore, saveStore } from "./store";
import { buildDemoStore } from "./demo";
import type { CompanyStore } from "./types";

export async function getStoreForSession(): Promise<CompanyStore | null> {
  const session = await getSession();
  if (!session) return null;
  let store = await loadStore(session.companyId);
  if (!store && session.kind === "demo") {
    store = buildDemoStore();
    await saveStore(store);
  }
  return store;
}

export const unauthorized = () => NextResponse.json({ error: "Not signed in" }, { status: 401 });

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}
