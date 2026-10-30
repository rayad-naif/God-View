// In-memory stand-in for the Upstash Redis REST API (the subset God View uses). Tests only.
import http from "node:http";

export function startMockRedis(port, token) {
  const strings = new Map(); // key -> { v, exp }
  const hashes = new Map();
  const sets = new Map();
  const alive = (k) => { const e = strings.get(k); if (e && e.exp && e.exp < Date.now()) { strings.delete(k); return undefined; } return e; };
  const run = (args) => {
    const [cmd, ...a] = args;
    switch (String(cmd).toUpperCase()) {
      case "GET": return alive(a[0])?.v ?? null;
      case "MGET": return a.map((k) => alive(k)?.v ?? null);
      case "SET": {
        const [k, v, ...opts] = a;
        const up = opts.map((o) => String(o).toUpperCase());
        if (up.includes("NX") && alive(k)) return null;
        const ex = up.indexOf("EX");
        strings.set(k, { v: String(v), exp: ex >= 0 ? Date.now() + Number(opts[ex + 1]) * 1000 : undefined });
        return "OK";
      }
      case "DEL": { let n = 0; for (const k of a) n += +strings.delete(k) + +hashes.delete(k) + +sets.delete(k); return n; }
      case "INCR": { const e = alive(a[0]); const n = (Number(e?.v) || 0) + 1; strings.set(a[0], { v: String(n), exp: e?.exp }); return n; }
      case "EXPIRE": { const e = alive(a[0]); if (e) e.exp = Date.now() + Number(a[1]) * 1000; return e ? 1 : 0; }
      case "HINCRBY": { const h = hashes.get(a[0]) ?? new Map(); h.set(a[1], (h.get(a[1]) ?? 0) + Number(a[2])); hashes.set(a[0], h); return h.get(a[1]); }
      case "HGETALL": return [...(hashes.get(a[0]) ?? new Map())].flatMap(([f, v]) => [f, String(v)]);
      case "SADD": { const s = sets.get(a[0]) ?? new Set(); s.add(a[1]); sets.set(a[0], s); return 1; }
      case "SREM": { sets.get(a[0])?.delete(a[1]); return 1; }
      case "SMEMBERS": return [...(sets.get(a[0]) ?? [])];
      default: throw new Error("unsupported " + cmd);
    }
  };
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const send = (o, s = 200) => { res.writeHead(s, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
      if (req.headers.authorization !== `Bearer ${token}`) return send({ error: "unauthorized" }, 401);
      try {
        const parsed = JSON.parse(body);
        if (req.url === "/pipeline") return send(parsed.map((c) => ({ result: run(c) })));
        send({ result: run(parsed) });
      } catch (e) { send({ error: String(e.message) }, 400); }
    });
  });
  /** Every stored value as { key: string }, for assertions. */
  const dump = () => {
    const out = {};
    for (const [k] of strings) { const e = alive(k); if (e) out[k] = e.v; }
    for (const [k, h] of hashes) out[k] = JSON.stringify(Object.fromEntries(h));
    for (const [k, s] of sets) out[k] = JSON.stringify([...s]);
    return out;
  };
  return new Promise((resolve) => server.listen(port, () => resolve({ server, dump })));
}
