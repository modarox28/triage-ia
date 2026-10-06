// Proxy de IA para TriageIA / MediApp (Cloudflare Worker, plan gratuito).
//
// Seguridad:
//  1. Solo acepta peticiones desde el dominio de la app (cabecera Origin).
//  2. Verifica el token de Firebase del usuario (firma RS256 de Google, emisor,
//     audiencia y vencimiento) y lee su rol en Firestore con ese mismo token.
//     Las cuentas pendientes, rechazadas o eliminadas no pueden usar la IA.
//  3. Límite diario de consultas por usuario (y por IP en el modo demo),
//     guardado en Workers KV. Así nadie puede agotar el saldo de DeepSeek.
//
// Configuración en el panel de Cloudflare (Settings → Variables and Secrets / Bindings):
//  - Secreto DEEPSEEK_KEY: API key de DeepSeek.
//  - Binding de KV con nombre LIMITES: activa los límites diarios y el modo demo.
//    Sin él, la IA solo funciona con sesión iniciada y sin límites.

const PROJECT_ID = "media-suite-6f432";
const ORIGENES_PERMITIDOS = [
  "https://media-suite-6f432.web.app",
  "https://media-suite-6f432.firebaseapp.com",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
];
const MAX_TOKENS = 1000;
const MAX_CARACTERES = 20000;

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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Expose-Headers": "X-IA-Restantes",
    "Vary": "Origin",
  };
}
function responder(cuerpo, estado, origen, extra = {}) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json", ...cabecerasCors(origen), ...extra },
  });
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

// ── Worker ──────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origen = request.headers.get("Origin") || "";
    if (!ORIGENES_PERMITIDOS.includes(origen)) {
      return new Response("Origen no permitido", { status: 403 });
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cabecerasCors(origen) });
    }
    if (request.method !== "POST") {
      return responder({ error: "Método no permitido" }, 405, origen);
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
      cupo = await consumirCupo(env, "u:" + payload.sub, LIMITE_DIARIO[rol], !esPersonal);
    } else {
      // Sin sesión: solo el modo demo, con un cupo pequeño por IP (requiere KV)
      if (!env.LIMITES) {
        return responder({ error: "Inicia sesión para usar la IA.", code: "auth_required" }, 401, origen);
      }
      const ip = request.headers.get("CF-Connecting-IP") || "desconocida";
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
    const mensajes = Array.isArray(datos.messages) ? datos.messages : [];
    const largo = mensajes.reduce((n, m) => n + String(m?.content ?? "").length, 0);
    if (mensajes.length === 0 || largo > MAX_CARACTERES) {
      return responder({ error: "Mensaje vacío o demasiado largo" }, 400, origen);
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
      const texto = await r.text();
      const extra = cupo.restantes === null ? {} : { "X-IA-Restantes": String(cupo.restantes) };
      return new Response(texto, {
        status: r.status,
        headers: { "Content-Type": "application/json", ...cabecerasCors(origen), ...extra },
      });
    } catch (e) {
      return responder({ error: e.message }, 502, origen);
    }
  },
};
