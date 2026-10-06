// Pruebas de seguridad del Worker de IA (cloudflare-worker/worker.js).
// Firma tokens con una clave RSA de prueba y simula Google, Firestore, DeepSeek y KV.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import worker from "../cloudflare-worker/worker.js";

const enc = v => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
const RSA = { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" };
const ORIGIN = "https://media-suite-6f432.web.app";
const ROLES = { "uid-medico": "medico", "uid-pend": "pendiente", "uid-pac": "paciente", "uid-elim": "eliminado" };

let llave, otraLlave, llamadasDeepSeek = 0;

before(async () => {
  llave = await crypto.subtle.generateKey(RSA, true, ["sign", "verify"]);
  otraLlave = await crypto.subtle.generateKey(RSA, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", llave.publicKey);
  globalThis.fetch = async (url, opts = {}) => {
    url = String(url);
    if (url.includes("securetoken@system"))
      return new Response(JSON.stringify({ keys: [{ ...jwk, kid: "k1", alg: "RS256", use: "sig" }] }), { headers: { "Cache-Control": "max-age=3600" } });
    if (url.includes("firestore.googleapis.com")) {
      const rol = ROLES[decodeURIComponent(url.split("/users/")[1])];
      return rol ? new Response(JSON.stringify({ fields: { role: { stringValue: rol } } })) : new Response("{}", { status: 404 });
    }
    if (url.includes("api.deepseek.com")) { llamadasDeepSeek++; return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] })); }
    throw new Error("fetch inesperado: " + url);
  };
});

async function token(claims = {}, privada = llave.privateKey) {
  const ahora = Math.floor(Date.now() / 1000);
  const h = enc({ alg: "RS256", kid: "k1", typ: "JWT" });
  const p = enc({ iss: "https://securetoken.google.com/media-suite-6f432", aud: "media-suite-6f432", iat: ahora - 10, exp: ahora + 3600, sub: "uid-medico", ...claims });
  const firma = Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privada, new TextEncoder().encode(`${h}.${p}`))).toString("base64url");
  return `${h}.${p}.${firma}`;
}
class KV { m = new Map(); async get(k) { return this.m.get(k) ?? null; } async put(k, v) { this.m.set(k, v); } }

async function llamar({ auth, env, origin = ORIGIN, ip = "1.2.3.4", method = "POST" } = {}) {
  const headers = { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": ip };
  if (auth) headers.Authorization = "Bearer " + auth;
  const body = method === "POST" ? JSON.stringify({ max_tokens: 50, messages: [{ role: "user", content: "hola" }] }) : undefined;
  const r = await worker.fetch(new Request("https://w/", { method, headers, body }), env);
  let j = null; try { j = await r.clone().json(); } catch {}
  return { status: r.status, code: j?.code, restantes: r.headers.get("X-IA-Restantes"), corsHeaders: r.headers.get("Access-Control-Allow-Headers") };
}
const conKV = () => ({ DEEPSEEK_KEY: "x", LIMITES: new KV() });
const sinKV = { DEEPSEEK_KEY: "x" };

test("CORS permite la cabecera Authorization", async () => {
  assert.match((await llamar({ method: "OPTIONS", env: conKV() })).corsHeaders, /Authorization/);
});
test("rechaza otros dominios", async () => {
  assert.equal((await llamar({ origin: "https://evil.com", env: conKV() })).status, 403);
});
test("médico con token válido puede consultar", async () => {
  const r = await llamar({ auth: await token(), env: conKV() });
  assert.equal(r.status, 200);
  assert.equal(r.restantes, "149");
});
test("rechaza tokens falsos, vencidos o de otro proyecto", async () => {
  const env = conKV();
  const ahora = Math.floor(Date.now() / 1000);
  const casos = {
    "firmado con otra clave": await token({}, otraLlave.privateKey),
    "vencido": await token({ exp: ahora - 5 }),
    "otro proyecto": await token({ aud: "otro-proyecto" }),
    "emisor falso": await token({ iss: "https://evil.example" }),
    "mal formado": "abc.def",
  };
  const alterado = (await token()).split(".");
  alterado[1] = enc({ ...JSON.parse(Buffer.from(alterado[1], "base64url")), sub: "uid-admin" });
  casos["usuario alterado"] = alterado.join(".");
  for (const [nombre, t] of Object.entries(casos))
    assert.equal((await llamar({ auth: t, env })).code, "auth_invalid", nombre);
});
test("cuentas pendientes, eliminadas o sin perfil no usan la IA", async () => {
  const env = conKV();
  for (const sub of ["uid-pend", "uid-elim", "uid-desconocido"])
    assert.equal((await llamar({ auth: await token({ sub }), env })).code, "role_forbidden", sub);
});
test("paciente: máximo 20 consultas al día", async () => {
  const env = conKV(); let r;
  for (let i = 0; i < 20; i++) r = await llamar({ auth: await token({ sub: "uid-pac" }), env });
  assert.equal(r.status, 200);
  r = await llamar({ auth: await token({ sub: "uid-pac" }), env });
  assert.equal(r.status, 429);
  assert.equal(r.code, "quota_exceeded");
});
test("modo demo sin sesión: 15 consultas al día por IP", async () => {
  const env = conKV(); let r;
  for (let i = 0; i < 15; i++) r = await llamar({ env, ip: "9.9.9.9" });
  assert.equal(r.status, 200);
  assert.equal((await llamar({ env, ip: "9.9.9.9" })).status, 429);
  assert.equal((await llamar({ env, ip: "8.8.8.8" })).status, 200, "otra IP tiene su propio cupo");
});
test("sin KV configurado: exige sesión, sin límites", async () => {
  assert.equal((await llamar({ env: sinKV })).code, "auth_required");
  assert.equal((await llamar({ auth: await token(), env: sinKV })).status, 200);
});
test("si KV falla: el personal sigue, el modo demo se bloquea", async () => {
  const roto = { DEEPSEEK_KEY: "x", LIMITES: { get: async () => { throw new Error("cuota de KV agotada"); }, put: async () => {} } };
  assert.equal((await llamar({ auth: await token(), env: roto })).status, 200);
  assert.equal((await llamar({ env: roto, ip: "7.7.7.7" })).status, 429);
});
test("las consultas rechazadas nunca llegan a DeepSeek", async () => {
  const antes = llamadasDeepSeek;
  await llamar({ auth: await token({ sub: "uid-pend" }), env: conKV() });
  await llamar({ auth: "abc.def", env: conKV() });
  await llamar({ origin: "https://evil.com", env: conKV() });
  assert.equal(llamadasDeepSeek, antes);
});
