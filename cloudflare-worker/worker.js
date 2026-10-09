// Proxy de IA para TriageIA / MediApp (Cloudflare Worker, plan gratuito).
//
// Seguridad:
//  1. Solo acepta peticiones desde el dominio de la app (cabecera Origin).
//  2. Verifica el token de Firebase del usuario (firma RS256 de Google, emisor,
//     audiencia y vencimiento) y lee su rol en Firestore con ese mismo token.
//     Las cuentas pendientes, rechazadas o eliminadas no pueden usar la IA.
//  3. Límite diario de consultas por usuario (y por IP en el modo demo),
//     guardado en Workers KV. Así nadie puede agotar el saldo de DeepSeek.
//  4. Límite por minuto (ráfagas) por usuario o IP, en memoria del Worker.
//  5. Protección contra bots en el modo demo con Cloudflare Turnstile (opcional,
//     se activa al agregar el secreto TURNSTILE_SECRET).
//  6. Solo acepta mensajes de rol "user" con texto o una imagen JPEG/PNG pequeña,
//     y devuelve únicamente el texto de la respuesta (no los metadatos de DeepSeek).
//
// Rutas:
//  - POST /           → consulta de IA (DeepSeek).
//  - POST /reset-pin  → el personal de salud genera un PIN temporal para un paciente
//                       que olvidó el suyo (cambia la contraseña de su cuenta interna).
//
// Configuración en el panel de Cloudflare (Settings → Variables and Secrets / Bindings):
//  - Secreto DEEPSEEK_KEY: API key de DeepSeek.
//  - Secreto GOOGLE_SA: el archivo JSON completo de una cuenta de servicio de Firebase
//    (Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada).
//    Solo lo usa /reset-pin; sin él, esa ruta responde "no configurado".
//  - Binding de KV con nombre LIMITES: activa los límites diarios y el modo demo.
//    Sin él, la IA solo funciona con sesión iniciada y sin límites.
//  - Secreto TURNSTILE_SECRET (opcional): exige un desafío anti-bots de Turnstile a las
//    consultas del modo demo. La clave pública va en TURNSTILE_SITEKEY de src/app/00-estado.js.

const PROJECT_ID = "media-suite-6f432";
const ORIGENES_PERMITIDOS = [
  "https://media-suite-6f432.web.app",
  "https://media-suite-6f432.firebaseapp.com",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
];
const MAX_TOKENS = 1000;
const MAX_CARACTERES = 20000;
const MAX_CUERPO = 2_000_000;          // bytes de la petición (incluye una foto de signos vitales)
const MAX_IMAGEN = 1_500_000;          // caracteres base64 de la imagen (~1,1 MB)
const RAFAGA_POR_MINUTO = { personal: 20, paciente: 8, demo: 5 };

// Consultas de IA permitidas por día
const LIMITE_DIARIO = {
  admin: 300,
  admin_hosp: 300,
  medico: 150,
  paciente: 20,
  demo: 15,          // sin sesión (modo demo), por dirección IP
};
const ROLES_CON_IA = ["admin", "admin_hosp", "medico", "paciente"];

const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Utilidades ──────────────────────────────────────────────
function cabecerasCors(origen) {
  return {
    "Access-Control-Allow-Origin": origen,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Turnstile",
    "Access-Control-Expose-Headers": "X-IA-Restantes",
    "Vary": "Origin",
  };
}
// Cabeceras de seguridad en todas las respuestas
const SEGURIDAD = {
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};
function responder(cuerpo, estado, origen, extra = {}) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json", ...SEGURIDAD, ...cabecerasCors(origen), ...extra },
  });
}

// ── Límite por minuto (en memoria de cada instancia del Worker) ──
const rafagas = new Map();
function dentroDeRafaga(quien, limite) {
  const minuto = Math.floor(Date.now() / 60000);
  const clave = quien + ":" + minuto;
  const n = (rafagas.get(clave) || 0) + 1;
  rafagas.set(clave, n);
  if (rafagas.size > 5000) for (const k of rafagas.keys()) if (!k.endsWith(":" + minuto)) rafagas.delete(k);
  return n <= limite;
}

// ── Validación de los mensajes que se envían a la IA ──
// Solo mensajes de rol "user": texto, o texto + una imagen JPEG/PNG en base64 (signos vitales por foto).
function validarMensajes(mensajes) {
  if (!Array.isArray(mensajes) || mensajes.length === 0 || mensajes.length > 4) return null;
  let caracteres = 0;
  const limpios = [];
  for (const m of mensajes) {
    if (!m || m.role !== "user") return null;
    if (typeof m.content === "string") { caracteres += m.content.length; limpios.push({ role: "user", content: m.content }); continue; }
    if (!Array.isArray(m.content) || m.content.length > 3) return null;
    const partes = [];
    for (const p of m.content) {
      if (p?.type === "text" && typeof p.text === "string") { caracteres += p.text.length; partes.push({ type: "text", text: p.text }); }
      else if (p?.type === "image_url" && typeof p.image_url?.url === "string"
        && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(p.image_url.url) && p.image_url.url.length <= MAX_IMAGEN) {
        partes.push({ type: "image_url", image_url: { url: p.image_url.url } });
      } else return null;
    }
    limpios.push({ role: "user", content: partes });
  }
  return caracteres > 0 && caracteres <= MAX_CARACTERES ? limpios : null;
}

// ── Turnstile (anti-bots del modo demo) ──
async function verificarTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token || token.length > 2048) return false;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
    });
    return (await r.json()).success === true;
  } catch { return false; }
}

function b64urlBytes(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(s)));
}

// ── Verificación del token de Firebase ──────────────────────
let jwksCache = { keys: null, expira: 0 };
async function clavesGoogle(forzar = false) {
  if (!forzar && jwksCache.keys && Date.now() < jwksCache.expira) return jwksCache.keys;
  const r = await fetch(JWKS_URL);
  if (!r.ok) throw new Error("No se pudieron obtener las claves de Google");
  const maxAge = Number((r.headers.get("Cache-Control") || "").match(/max-age=(\d+)/)?.[1] || 3600);
  const { keys } = await r.json();
  jwksCache = { keys, expira: Date.now() + maxAge * 1000 };
  return keys;
}

async function verificarTokenFirebase(token, ahora = Math.floor(Date.now() / 1000)) {
  const partes = token.split(".");
  if (partes.length !== 3) throw new Error("Token mal formado");
  const [h, p, firma] = partes;
  const header = b64urlJson(h);
  const payload = b64urlJson(p);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Algoritmo no permitido");

  let jwk = (await clavesGoogle()).find(k => k.kid === header.kid);
  if (!jwk) jwk = (await clavesGoogle(true)).find(k => k.kid === header.kid); // Google rota las claves
  if (!jwk) throw new Error("Clave de firma desconocida");

  const clave = await crypto.subtle.importKey(
    "jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const valida = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", clave, b64urlBytes(firma), new TextEncoder().encode(`${h}.${p}`)
  );
  if (!valida) throw new Error("Firma inválida");

  if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) throw new Error("Emisor inválido");
  if (payload.aud !== PROJECT_ID) throw new Error("Audiencia inválida");
  if (typeof payload.exp !== "number" || payload.exp <= ahora) throw new Error("Token vencido");
  if (typeof payload.iat !== "number" || payload.iat > ahora + 300) throw new Error("Fecha de emisión inválida");
  if (!payload.sub) throw new Error("Token sin usuario");
  return payload;
}

// Rol del usuario, leído en Firestore con su propio token (las reglas le permiten leer su perfil)
const rolesCache = new Map(); // uid -> { rol, expira }
async function rolDeUsuario(uid, token) {
  const c = rolesCache.get(uid);
  if (c && Date.now() < c.expira) return c.rol;
  const r = await fetch(`${FIRESTORE}/users/${encodeURIComponent(uid)}`, {
    headers: { Authorization: "Bearer " + token },
  });
  let rol = null;
  if (r.ok) rol = (await r.json())?.fields?.role?.stringValue || null;
  else if (r.status !== 404) throw new Error("No se pudo leer el perfil (" + r.status + ")");
  rolesCache.set(uid, { rol, expira: Date.now() + 60_000 }); // un cambio de rol se aplica en máximo 1 minuto
  return rol;
}

// ── Límite diario en KV ─────────────────────────────────────
async function consumirCupo(env, quien, limite, fallarCerrado) {
  if (!env.LIMITES) return { ok: true, restantes: null };
  const dia = new Date().toISOString().slice(0, 10);
  const clave = `cupo:${dia}:${quien}`;
  try {
    const usados = Number(await env.LIMITES.get(clave)) || 0;
    if (usados >= limite) return { ok: false, restantes: 0 };
    await env.LIMITES.put(clave, String(usados + 1), { expirationTtl: 60 * 60 * 48 });
    return { ok: true, restantes: limite - usados - 1 };
  } catch (e) {
    // Si KV no responde (p. ej. se agotó su cuota diaria gratuita):
    // el personal aprobado sigue trabajando; el modo demo y los pacientes se bloquean.
    return { ok: !fallarCerrado, restantes: null };
  }
}

// ── Cuenta de servicio de Google (para /reset-pin) ─────────
const DOMINIO_PACIENTES = "pacientes.media-suite.app";
const ROLES_PERSONAL = ["medico", "admin", "admin_hosp"];
const LIMITE_RESETS_DIA = 20;          // por persona del personal

function b64url(bytes) {
  let bin = ""; for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
let saToken = { token: null, expira: 0 };
async function tokenCuentaServicio(env) {
  if (saToken.token && Date.now() < saToken.expira) return saToken.token;
  const sa = JSON.parse(env.GOOGLE_SA);
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), c => c.charCodeAt(0));
  const clave = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const ahora = Math.floor(Date.now() / 1000);
  const enc = o => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const sinFirma = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token", iat: ahora, exp: ahora + 3600,
  })}`;
  const firma = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", clave, new TextEncoder().encode(sinFirma));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + sinFirma + "." + b64url(firma),
  });
  if (!r.ok) throw new Error("No se pudo autenticar la cuenta de servicio (" + r.status + ")");
  const j = await r.json();
  saToken = { token: j.access_token, expira: Date.now() + Math.max(60, (j.expires_in || 3600) - 300) * 1000 };
  return saToken.token;
}
function normalizarId(v) { return String(v || "").trim().toLowerCase().replace(/[^0-9a-z-]/g, ""); }
function pinAleatorio() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, "0");
}

// Identifica al usuario a partir del token de Firebase. Devuelve {uid, rol} o una Response de error.
async function identificar(request, origen) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  let payload;
  try { payload = await verificarTokenFirebase(token); }
  catch (e) { return responder({ error: "Sesión inválida o vencida. Vuelve a iniciar sesión.", code: "auth_invalid" }, 401, origen); }
  try { return { uid: payload.sub, rol: await rolDeUsuario(payload.sub, token) }; }
  catch (e) { return responder({ error: "No se pudo verificar tu cuenta. Intenta de nuevo.", code: "role_unavailable" }, 503, origen); }
}

async function resetPin(request, env, origen) {
  const quien = await identificar(request, origen);
  if (!quien) return responder({ error: "Inicia sesión para continuar.", code: "auth_required" }, 401, origen);
  if (quien instanceof Response) return quien;
  if (!ROLES_PERSONAL.includes(quien.rol)) {
    return responder({ error: "Solo el personal de salud puede restablecer un PIN.", code: "role_forbidden" }, 403, origen);
  }
  if (!env.GOOGLE_SA) {
    return responder({ error: "El restablecimiento de PIN no está configurado en el servidor.", code: "reset_not_configured" }, 501, origen);
  }
  let datos; try { datos = await request.json(); } catch { datos = {}; }
  const id = normalizarId(datos.doc);
  if (!id || id.length > 30) return responder({ error: "Número de identificación inválido." }, 400, origen);
  if (!dentroDeRafaga("reset:" + quien.uid, Number(env.RAFAGA_POR_MINUTO) || 5)) return responder({ error: "Demasiados intentos seguidos. Espera un minuto.", code: "rate_limited" }, 429, origen, { "Retry-After": "60" });
  const cupo = await consumirCupo(env, "reset:" + quien.uid, LIMITE_RESETS_DIA, true);
  if (!cupo.ok) return responder({ error: "Alcanzaste el límite diario de restablecimientos.", code: "quota_exceeded" }, 429, origen);

  try {
    const at = await tokenCuentaServicio(env);
    const H = { "Authorization": "Bearer " + at, "Content-Type": "application/json" };
    const IT = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`;
    // 1) Buscar la cuenta interna del paciente
    const lk = await fetch(`${IT}:lookup`, { method: "POST", headers: H, body: JSON.stringify({ email: [`${id}@${DOMINIO_PACIENTES}`] }) });
    if (!lk.ok) throw new Error("lookup " + lk.status);
    const uid = (await lk.json()).users?.[0]?.localId;
    if (!uid) return responder({ error: "Este paciente aún no tiene cuenta. Debe registrarse con \"¿Primera vez?\" en la pantalla de acceso.", code: "patient_not_found" }, 404, origen);
    // 2) Nuevo PIN temporal (la contraseña se deriva del PIN, igual que en la app)
    const pin = pinAleatorio();
    const up = await fetch(`${IT}:update`, { method: "POST", headers: H, body: JSON.stringify({ localId: uid, password: "ms-pin-" + pin }) });
    if (!up.ok) throw new Error("update " + up.status);
    // 3) Marcar que debe cambiarlo al entrar (solo si el perfil existe)
    const campos = ["mustChangePin", "pinResetAt", "pinResetBy"].map(c => "updateMask.fieldPaths=" + c).join("&");
    await fetch(`${FIRESTORE}/users/${encodeURIComponent(uid)}?${campos}&currentDocument.exists=true`, {
      method: "PATCH", headers: H,
      body: JSON.stringify({ fields: {
        mustChangePin: { booleanValue: true },
        pinResetAt: { timestampValue: new Date().toISOString() },
        pinResetBy: { stringValue: quien.uid },
      } }),
    });
    return responder({ pin }, 200, origen);
  } catch (e) {
    return responder({ error: "No se pudo restablecer el PIN. Intenta de nuevo.", code: "reset_failed" }, 502, origen);
  }
}

// ── Worker ──────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origen = request.headers.get("Origin") || "";
    if (!ORIGENES_PERMITIDOS.includes(origen)) {
      return new Response("Origen no permitido", { status: 403, headers: SEGURIDAD });
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...SEGURIDAD, ...cabecerasCors(origen) } });
    }
    if (request.method !== "POST") {
      return responder({ error: "Método no permitido" }, 405, origen);
    }
    if (Number(request.headers.get("Content-Length") || 0) > MAX_CUERPO) {
      return responder({ error: "Petición demasiado grande" }, 413, origen);
    }
    if (new URL(request.url).pathname === "/reset-pin") {
      return resetPin(request, env, origen);
    }
    if (!env.DEEPSEEK_KEY) {
      return responder({ error: "API key no configurada" }, 500, origen);
    }

    // 1) Identificar a quien llama
    let cupo;
    const auth = request.headers.get("Authorization") || "";
    if (auth.startsWith("Bearer ")) {
      const token = auth.slice(7).trim();
      let payload;
      try {
        payload = await verificarTokenFirebase(token);
      } catch (e) {
        return responder({ error: "Sesión inválida o vencida. Vuelve a iniciar sesión.", code: "auth_invalid" }, 401, origen);
      }
      let rol;
      try {
        rol = await rolDeUsuario(payload.sub, token);
      } catch (e) {
        return responder({ error: "No se pudo verificar tu cuenta. Intenta de nuevo.", code: "role_unavailable" }, 503, origen);
      }
      if (!ROLES_CON_IA.includes(rol)) {
        return responder({ error: "Tu cuenta no tiene acceso a la IA.", code: "role_forbidden" }, 403, origen);
      }
      const esPersonal = rol !== "paciente";
      if (!dentroDeRafaga("u:" + payload.sub, Number(env.RAFAGA_POR_MINUTO) || RAFAGA_POR_MINUTO[esPersonal ? "personal" : "paciente"])) {
        return responder({ error: "Demasiadas consultas seguidas. Espera un minuto.", code: "rate_limited" }, 429, origen, { "Retry-After": "60" });
      }
      cupo = await consumirCupo(env, "u:" + payload.sub, LIMITE_DIARIO[rol], !esPersonal);
    } else {
      // Sin sesión: solo el modo demo, con un cupo pequeño por IP (requiere KV)
      if (!env.LIMITES) {
        return responder({ error: "Inicia sesión para usar la IA.", code: "auth_required" }, 401, origen);
      }
      const ip = request.headers.get("CF-Connecting-IP") || "desconocida";
      if (!dentroDeRafaga("ip:" + ip, Number(env.RAFAGA_POR_MINUTO) || RAFAGA_POR_MINUTO.demo)) {
        return responder({ error: "Demasiadas consultas seguidas. Espera un minuto.", code: "rate_limited" }, 429, origen, { "Retry-After": "60" });
      }
      if (!(await verificarTurnstile(env, request.headers.get("X-Turnstile"), ip))) {
        return responder({ error: "No pudimos verificar que no eres un robot. Recarga la página.", code: "bot_check_failed" }, 403, origen);
      }
      cupo = await consumirCupo(env, "ip:" + ip, LIMITE_DIARIO.demo, true);
    }
    if (!cupo.ok) {
      return responder({ error: "Alcanzaste el límite diario de consultas a la IA. Vuelve a intentarlo mañana.", code: "quota_exceeded" }, 429, origen);
    }

    // 2) Validar la petición
    let datos;
    try {
      datos = await request.json();
    } catch {
      return responder({ error: "JSON inválido" }, 400, origen);
    }
    const mensajes = validarMensajes(datos?.messages);
    if (!mensajes) {
      return responder({ error: "Mensaje vacío, demasiado largo o con un formato no permitido" }, 400, origen);
    }

    // 3) Llamar a DeepSeek
    try {
      const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + env.DEEPSEEK_KEY,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          max_tokens: Math.min(Number(datos.max_tokens) || 600, MAX_TOKENS),
          messages: mensajes,
        }),
      });
      const extra = cupo.restantes === null ? {} : { "X-IA-Restantes": String(cupo.restantes) };
      if (!r.ok) return responder({ error: "La IA no está disponible en este momento (" + r.status + ")." }, 502, origen, extra);
      // Solo el texto de la respuesta: sin ids, uso de tokens ni otros metadatos del proveedor
      const j = await r.json();
      const contenido = String(j?.choices?.[0]?.message?.content ?? "");
      return responder({ choices: [{ message: { content: contenido } }] }, 200, origen, extra);
    } catch (e) {
      return responder({ error: "No se pudo contactar a la IA. Intenta de nuevo." }, 502, origen);
    }
  },
};
