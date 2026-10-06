// Proxy de IA para TriageIA / MediApp (Cloudflare Worker, plan gratuito).
// La API key de DeepSeek NO va en el código: se guarda en Cloudflare como
// secreto con el nombre DEEPSEEK_KEY (Settings → Variables and Secrets).

const ORIGENES_PERMITIDOS = [
  "https://media-suite-6f432.web.app",
  "https://media-suite-6f432.firebaseapp.com",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
];
const MAX_TOKENS = 1000;
const MAX_CARACTERES = 20000;

function cabecerasCors(origen) {
  return {
    "Access-Control-Allow-Origin": origen,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function responder(cuerpo, estado, origen) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json", ...cabecerasCors(origen) },
  });
}

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
      return new Response(texto, {
        status: r.status,
        headers: { "Content-Type": "application/json", ...cabecerasCors(origen) },
      });
    } catch (e) {
      return responder({ error: e.message }, 502, origen);
    }
  },
};
