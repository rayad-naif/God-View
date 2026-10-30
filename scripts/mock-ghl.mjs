// A small stand-in for the HighLevel API, used by `npm test`. Not for production.
import http from "node:http";

export function startMockGhl(port) {
  const log = [];
  const alerts = [];
  const pushAttempts = {};
  const day = 86400000;
  const iso = (d) => new Date(Date.now() - d * day).toISOString();
  const locations = {
    L1: { id: "L1", name: "Alpha Roofing", city: "Austin", state: "TX", timezone: "America/Chicago" },
    L2: { id: "L2", name: "Beta Dental", timezone: "America/New_York" },
    L3: { id: "L3", name: "Gamma (not installed)" },
    L4: { id: "L4", name: "Delta HVAC (created later)", timezone: "UTC" },
  };
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const u = new URL(req.url, "http://x");
      log.push(`${req.method} ${u.pathname}`);
      const j = (o, s = 200) => { res.writeHead(s, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
      if (u.pathname === "/alert") { alerts.push(JSON.parse(body)); return j({ ok: true }); }
      if (!req.headers.version) return j({ message: "missing Version header" }, 400);
      if (u.pathname === "/oauth/token") {
        const f = new URLSearchParams(body);
        if (f.get("user_type") !== "Company") return j({ error: "bad user_type" }, 400);
        return j({ access_token: "agency-secret-token", refresh_token: "refresh-secret-token", expires_in: 86399, companyId: "co1", userType: "Company", scope: "locations.readonly" });
      }
      if (u.pathname === "/oauth/locationToken") {
        const loc = new URLSearchParams(body).get("locationId");
        return loc === "L3" ? j({ message: "App not installed" }, 403) : j({ access_token: "location-secret-" + loc, expires_in: 86399 });
      }
      if (u.pathname === "/companies/co1") return j({ company: { name: "Acme Marketing" } });
      if (u.pathname === "/locations/search") return j({ locations: [locations.L1, locations.L2, locations.L3] });
      const single = u.pathname.match(/^\/locations\/(L\d)$/);
      if (single && req.method === "GET") return j({ location: locations[single[1]] });
      if (single && req.method === "PUT") {
        const b = JSON.parse(body);
        pushAttempts[single[1]] = (pushAttempts[single[1]] ?? 0) + 1;
        if (!b.snapshot?.id || !b.companyId) return j({ message: "snapshot.id and companyId required" }, 422);
        // Alpha's first push fails so the retry path is exercised.
        if (single[1] === "L1" && pushAttempts.L1 === 1) return j({ message: "Snapshot load conflict" }, 422);
        return j({ location: { id: single[1] } });
      }
      if (u.pathname === "/contacts/search") {
        const b = JSON.parse(body);
        const perDay = b.locationId === "L2" ? 1 : 10;
        const all = Array.from({ length: 20 }, (_, d) => Array.from({ length: perDay }, () => ({ dateAdded: iso(d + 0.1) }))).flat();
        return j({ contacts: all.slice((b.page - 1) * b.pageLimit, b.page * b.pageLimit), total: all.length });
      }
      if (u.pathname === "/opportunities/search") return j({ opportunities: [{ monetaryValue: 5000, status: "won", lastStatusChangeAt: iso(2) }], meta: {} });
      if (u.pathname === "/calendars/") return j({ calendars: [{ id: "c1" }] });
      if (u.pathname === "/calendars/events") return j({ events: [{ startTime: iso(1), appointmentStatus: "showed" }, { startTime: iso(2), appointmentStatus: "noshow" }, { startTime: iso(3), appointmentStatus: "showed" }] });
      // Ad reporting: Alpha has Facebook ($30/day) + Google ($15/day); others have no ad accounts.
      if (u.pathname.startsWith("/ad-publishing/")) {
        const loc = u.searchParams.get("locationId");
        if (loc !== "L1") return j({ message: "Integration not found" }, 404);
        const days = [];
        for (let d = new Date(u.searchParams.get("startDate")); d <= new Date(u.searchParams.get("endDate")); d = new Date(d.getTime() + day)) days.push(d.toISOString().slice(0, 10));
        if (u.pathname === "/ad-publishing/facebook/reporting") return j({ success: true, data: { summary: { spend: "999" }, rows: days.map((d) => ({ date_start: d, date_stop: d, spend: "30.00" })) } });
        if (u.pathname === "/ad-publishing/google/reporting") return j({ results: days.map((d) => ({ segments: { date: d }, metrics: { cost_micros: "15000000" } })) });
        return j({ message: "not connected" }, 404);
      }
      if (u.pathname.endsWith("/customValues")) return j({ customValues: [{ name: "Ad Spend Daily", fieldKey: "{{ custom_values.ad_spend_daily }}", value: "50" }] });
      if (u.pathname === "/snapshots/") return j({ snapshots: [{ id: "s1", name: "Alpha Roofing winner funnel", type: "own" }] });
      if (u.pathname.startsWith("/snapshots/snapshot-status/")) return j({ data: [{ status: "completed", dateAdded: iso(0) }] });
      j({ message: "not mocked " + u.pathname }, 404);
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve({ server, log, alerts, pushAttempts })));
}
