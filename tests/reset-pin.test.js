// Pruebas de /reset-pin (restablecer el PIN de un paciente desde el Worker).
// Simula Google (JWKS y OAuth), Identity Toolkit, Firestore y KV.
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../cloudflare-worker/worker.js";

const enc = v => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
const RSA = { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" };
const ORIGIN = "https://media-suite-6f432.web.app";
const ROLES = { "uid-medico": "medico", "uid-admin": "admin", "uid-pac": "paciente", "uid-pend": "pendiente" };
const CUENTAS = { "123456789@pacientes.media-suite.app": "uid-pac-123" };

let llave, sa, saPublica, log;

before(async () => {
  llave = await crypto.subtle.generateKey(RSA, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", llave.publicKey);
  // Cuenta de servicio de prueba (formato del JSON que entrega Firebase)
  const par = await crypto.subtle.generateKey(RSA, true, ["sign", "verify"]);
  saPublica = par.publicKey;
  const pkcs8 = Buffer.from(await crypto.subtle.exportKey("pkcs8", par.privateKey)).toString("base64");
  sa = JSON.stringify({
    client_email: "worker@media-suite-6f432.iam.gserviceaccount.com",
    private_key: `-----BEGIN PRIVATE KEY-----\n${pkcs8.match(/.{1,64}/g).join("\n")}\n-----END PRIVATE KEY-----\n`,
  });

  globalThis.fetch = async (url, opts = {}) => {
    url = String(url);
    const body = opts.body ? (typeof opts.body === "string" ? opts.body : String(opts.body)) : "";
    log.push({ url, method: opts.method || "GET", body, auth: opts.headers?.Authorization || opts.headers?.authorization });
    if (url.includes("securetoken@system"))
      return new Response(JSON.stringify({ keys: [{ ...jwk, kid: "k1", alg: "RS256", use: "sig" }] }), { headers: { "Cache-Control": "max-age=3600" } });
    if (url.startsWith("https://oauth2.googleapis.com/token"))
      return new Response(JSON.stringify({ access_token: "at-prueba", expires_in: 3600 }));
    if (url.includes("accounts:lookup")) {
      const email = JSON.parse(body).email[0];
      return new Response(JSON.stringify(CUENTAS[email] ? { users: [{ localId: CUENTAS[email] }] } : {}));
    }
    if (url.includes("accounts:update")) return new Response(JSON.stringify({ localId: JSON.parse(body).localId }));
    if (url.includes("firestore.googleapis.com")) {
      if (opts.method === "PATCH") return new Response("{}");
      const rol = ROLES[decodeURIComponent(url.split("/users/")[1])];
      return rol ? new Response(JSON.stringify({ fields: { role: { stringValue: rol } } })) : new Response("{}", { status: 404 });
    }
    throw new Error("fetch inesperado: " + url);
  };
});
beforeEach(() => { log = []; });

async function token(sub) {
  const ahora = Math.floor(Date.now() / 1000);
  const h = enc({ alg: "RS256", kid: "k1", typ: "JWT" });
  const p = enc({ iss: "https://securetoken.google.com/media-suite-6f432", aud: "media-suite-6f432", iat: ahora - 10, exp: ahora + 3600, sub });
  const firma = Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", llave.privateKey, new TextEncoder().encode(`${h}.${p}`))).toString("base64url");
  return `${h}.${p}.${firma}`;
}
class KV { m = new Map(); async get(k) { return this.m.get(k) ?? null; } async put(k, v) { this.m.set(k, v); } }
const env = (extra = {}) => ({ DEEPSEEK_KEY: "x", LIMITES: new KV(), GOOGLE_SA: sa, ...extra });

async function reset({ sub, doc = "123456789", e = env() } = {}) {
  const headers = { Origin: ORIGIN, "Content-Type": "application/json" };
  if (sub) headers.Authorization = "Bearer " + await token(sub);
  const r = await worker.fetch(new Request("https://w/reset-pin", { method: "POST", headers, body: JSON.stringify({ doc }) }), e);
  return { status: r.status, ...(await r.json()) };
}

test("la aserción de la cuenta de servicio va firmada con su clave", async () => {
  // Primera prueba: el token OAuth aún no está en caché
  await reset({ sub: "uid-admin" });
  const all = log.filter(l => l.url.startsWith("https://oauth2.googleapis.com/token"));
  assert.equal(all.length, 1);
  const jwt = new URLSearchParams(all[0].body).get("assertion");
  const [h, p, s] = jwt.split(".");
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", saPublica, Buffer.from(s, "base64url"), new TextEncoder().encode(`${h}.${p}`));
  assert.ok(ok);
  const claims = JSON.parse(Buffer.from(p, "base64url"));
  assert.equal(claims.aud, "https://oauth2.googleapis.com/token");
});

test("un médico obtiene un PIN temporal de 6 dígitos", async () => {
  const r = await reset({ sub: "uid-medico", doc: "123.456.789" });
  assert.equal(r.status, 200);
  assert.match(r.pin, /^\d{6}$/);
  const up = log.find(l => l.url.includes("accounts:update"));
  assert.deepEqual(JSON.parse(up.body), { localId: "uid-pac-123", password: "ms-pin-" + r.pin });
  assert.equal(up.auth, "Bearer at-prueba");
  const patch = log.find(l => l.method === "PATCH");
  assert.match(patch.url, /users\/uid-pac-123\?/);
  assert.match(patch.url, /currentDocument\.exists=true/);
  assert.equal(JSON.parse(patch.body).fields.mustChangePin.booleanValue, true);
});

test("pacientes, pendientes y anónimos no pueden restablecer PINs", async () => {
  assert.equal((await reset({ sub: "uid-pac" })).status, 403);
  assert.equal((await reset({ sub: "uid-pend" })).status, 403);
  assert.equal((await reset({})).status, 401);
  assert.ok(!log.some(l => l.url.includes("accounts:update")));
});

test("paciente sin cuenta devuelve 404", async () => {
  const r = await reset({ sub: "uid-medico", doc: "999" });
  assert.equal(r.status, 404);
  assert.equal(r.code, "patient_not_found");
});

test("sin GOOGLE_SA responde 501", async () => {
  const r = await reset({ sub: "uid-medico", e: env({ GOOGLE_SA: undefined }) });
  assert.equal(r.status, 501);
  assert.equal(r.code, "reset_not_configured");
});

test("documento vacío o inválido devuelve 400", async () => {
  assert.equal((await reset({ sub: "uid-medico", doc: "" })).status, 400);
  assert.equal((await reset({ sub: "uid-medico", doc: "1".repeat(40) })).status, 400);
});

test("límite diario de restablecimientos por persona", async () => {
  const e = env();
  for (let i = 0; i < 20; i++) assert.equal((await reset({ sub: "uid-medico", e })).status, 200);
  const r = await reset({ sub: "uid-medico", e });
  assert.equal(r.status, 429);
  assert.equal(r.code, "quota_exceeded");
});
