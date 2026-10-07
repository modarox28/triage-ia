// Pruebas de extremo a extremo: abren la app real en un navegador (modo demo)
// y la usan como lo haría una persona. Se ejecutan con `npm run test:e2e`
// y en GitHub Actions después de las pruebas unitarias.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp" };
let servidor, base, navegador, stubs = null;

// Modo sin internet (E2E_OFFLINE=1): los módulos de Firebase del CDN se reemplazan por
// módulos vacíos generados a partir de los import del código; el modo demo no los usa.
async function generarStubs() {
  const nombres = {};
  async function recorrer(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) await recorrer(ruta);
      else if (ruta.endsWith(".js")) {
        const src = await readFile(ruta, "utf8");
        for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*"(https:\/\/www\.gstatic\.com\/[^"]+)"/g)) {
          const archivo = m[2].split("/").pop();
          (nombres[archivo] ??= new Set());
          m[1].split(",").map(n => n.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach(n => nombres[archivo].add(n));
        }
      }
    }
  }
  await recorrer(join(RAIZ, "src"));
  return Object.fromEntries(Object.entries(nombres).map(([k, v]) =>
    [k, [...v].map(n => `export function ${n}(){return{setCustomParameters(){},catch(){}};}`).join("\n")]));
}

before(async () => {
  // Servidor estático mínimo para la carpeta del proyecto
  servidor = createServer(async (req, res) => {
    const ruta = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    try {
      const datos = await readFile(join(RAIZ, ruta === "/" ? "index.html" : ruta));
      res.writeHead(200, { "Content-Type": TIPOS[extname(ruta)] || "application/octet-stream" });
      res.end(datos);
    } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  base = `http://localhost:${servidor.address().port}`;
  // En CI se usa el Chromium que instala Playwright; en local se puede indicar otro con PW_CHROMIUM
  if (process.env.E2E_OFFLINE) stubs = await generarStubs();
  navegador = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
});
after(async () => { await navegador?.close(); servidor?.close(); });

async function abrirDemo({ ancho = 390, alto = 844, tema = "dark", guia = false } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, colorScheme: tema, serviceWorkers: "block" });
  const p = await ctx.newPage();
  const errores = [];
  p.on("pageerror", e => errores.push(e.message));
  if (stubs) await p.route(/^https?:\/\/(?!localhost)/, async r => {
    const u = r.request().url();
    if (u.includes("gstatic.com/firebasejs")) return r.fulfill({ body: stubs[u.split("/").pop()] || "", contentType: "text/javascript" });
    if (u.includes("jspdf")) return r.fulfill({ body: await readFile(join(RAIZ, "node_modules/jspdf/dist/jspdf.umd.min.js")), contentType: "text/javascript" });
    return r.abort();
  });
  if (!guia) await p.addInitScript(() => { try { localStorage.setItem("ms_guia_demo_v1", "1"); } catch {} });
  await p.goto(`${base}/index.html?demo=1`);
  await p.waitForSelector("#mainApp.on", { timeout: 20000 });
  await p.waitForFunction(() => document.querySelector("#welcomeOverlay")?.style.display === "none", null, { timeout: 15000 });
  return { ctx, p, errores };
}

test("la demo abre el inicio con críticos y cifras del día", async () => {
  const { ctx, p, errores } = await abrirDemo();
  await p.waitForSelector("#dashCritical .dash-crit-num");
  assert.equal(await p.textContent("#dashCritical .dash-crit-num"), "1");
  assert.match(await p.textContent("#dashHello"), /Hola/);
  assert.ok(await p.isVisible("#bnav"), "la barra inferior se ve en el celular");
  assert.deepEqual(errores.filter(e => !/^L is not defined|Chart|QRCode/.test(e)), []);
  await ctx.close();
});

test("la guía rápida aparece la primera vez y se puede recorrer", async () => {
  const { ctx, p } = await abrirDemo({ guia: true });
  await p.waitForSelector(".guia-globo", { timeout: 8000 });
  const titulos = [];
  for (let i = 0; i < 5; i++) { titulos.push(await p.textContent(".guia-globo h3")); await p.click(".guia-sig"); await p.waitForTimeout(450); }
  assert.deepEqual(titulos, ["Críticos en espera", "Nuevo triage", "Cola de espera", "Estadísticas del turno", "Ajustes"]);
  assert.equal(await p.$(".guia-capa"), null);
  await ctx.close();
});

test("la cola muestra los pacientes y el detalle del triage explica la IA", async () => {
  const { ctx, p } = await abrirDemo();
  await p.evaluate(() => navigateTo("cola"));
  await p.waitForSelector(".cola-card");
  assert.ok((await p.$$(".cola-card")).length >= 3);
  await p.evaluate(() => navigateTo("dash"));
  await p.click(".dash-row >> nth=0");
  await p.waitForSelector("text=Justificación IA");
  await ctx.close();
});

test("buscar paciente por nombre sin tildes y por documento", async () => {
  const { ctx, p } = await abrirDemo();
  await p.evaluate(() => navigateTo("hc"));
  await p.fill("#hcSearch", "rodri");
  await p.waitForFunction(() => /Rodríguez/.test(document.getElementById("hcList").textContent));
  await p.fill("#hcSearch", "4829");
  await p.waitForFunction(() => /Carlos/.test(document.getElementById("hcList").textContent));
  await p.fill("#hcSearch", "zzzz");
  await p.waitForFunction(() => /Sin resultados/.test(document.getElementById("hcList").textContent));
  await ctx.close();
});

test("la historia clínica muestra los triages del paciente y exporta el PDF", async () => {
  const { ctx, p, errores } = await abrirDemo();
  await p.evaluate(() => viewHC("demo-hc-0"));
  await p.waitForFunction(() => /Triages de este paciente · 2/.test(document.getElementById("hcTriages")?.textContent || ""));
  assert.match(await p.textContent("#hcTriages"), /ROJO · Dolor de pecho/);
  assert.match(await p.textContent("#hcTriages"), /atendido por Dr\. Andrés Pérez/);
  const [descarga] = await Promise.all([p.waitForEvent("download"), p.evaluate(() => _exportHCDetailPDF())]);
  const ruta = await descarga.path();
  const { readFile: leerArchivo } = await import("node:fs/promises");
  const pdf = await leerArchivo(ruta);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 5000);
  assert.deepEqual(errores.filter(e => !/^L is not defined|Chart|QRCode/.test(e)), []);
  await ctx.close();
});

test("ajustes: subpágina de apariencia, cambio de tema y volver", async () => {
  const { ctx, p } = await abrirDemo();
  await p.evaluate(() => navigateTo("config"));
  await p.click("text=Apariencia >> nth=0");
  await p.waitForSelector("#setp-apariencia:not([hidden])");
  await p.click("#setThemeSeg [data-theme-opt=light]");
  assert.ok(await p.evaluate(() => document.body.classList.contains("light")));
  await p.click("#setThemeSeg [data-theme-opt=dark]");
  assert.ok(!(await p.evaluate(() => document.body.classList.contains("light"))));
  await p.goBack();
  await p.waitForFunction(() => !document.getElementById("setp-main").hidden && document.getElementById("setp-apariencia").hidden);
  await ctx.close();
});

test("aviso cuando un paciente rojo supera su tiempo", async () => {
  const { ctx, p } = await abrirDemo();
  await p.waitForFunction(() => typeof _avDocs !== "undefined" && _avDocs.length > 0, null, { timeout: 8000 });
  await p.evaluate(() => { COLA_DEADLINE.ROJO = 1; _avRevisar(); });
  await p.waitForSelector("#avisoRojo.on");
  await p.click(".aviso-ver");
  assert.equal(await p.evaluate(() => _curTab), "cola");
  await ctx.close();
});

test("sin IA ni conexión el triage no se pierde: clasificación provisional y queda en la cola", async () => {
  const { ctx, p, errores } = await abrirDemo();
  await p.route(/workers\.dev/, r => r.abort());           // la IA no responde
  await p.evaluate(() => navigateTo("cola"));
  await p.waitForSelector(".cola-card");
  const antes = (await p.$$(".cola-card")).length;
  await p.evaluate(() => {
    navigateTo("triage");
    TD = { tipo: "adulto", motivo: "disnea", consc: "alerta", dolor: 4, sint: [], notas: "",
           vit: { ps: "118", fc: "124", sat: "86", tem: "37.2", fr: "28" } };
    rAnalyzing();
  });
  await p.waitForSelector(".ai-note.sin-ia", { timeout: 10000 });
  assert.match(await p.textContent(".rcard .rlbl"), /ROJO/);
  assert.match(await p.textContent("#trc"), /SpO₂ 86/);
  await p.evaluate(() => navigateTo("cola"));
  await p.waitForFunction(n => document.querySelectorAll(".cola-card").length > n, antes);
  // Sin conexión del todo: tampoco se bloquea la pantalla
  await ctx.setOffline(true);
  await p.evaluate(() => { navigateTo("triage"); TD = { tipo: "adulto", motivo: "otro", consc: "alerta", dolor: 1, sint: [], notas: "", vit: { ps: "120", fc: "78", sat: "98", tem: "36.6", fr: "15" } }; rAnalyzing(); });
  await p.waitForSelector(".ai-note.sin-ia");
  assert.match(await p.textContent(".ai-note.sin-ia"), /Sin conexión/);
  assert.match(await p.textContent(".rcard .rlbl"), /VERDE/);
  assert.deepEqual(errores.filter(e => !/^L is not defined|Chart|QRCode/.test(e)), []);
  await ctx.close();
});

test("en computador se usa la barra lateral y nada se desborda", async () => {
  const { ctx, p, errores } = await abrirDemo({ ancho: 1440, alto: 900 });
  assert.ok(await p.isVisible(".sidebar"));
  assert.ok(!(await p.isVisible("#bnav")));
  for (const tab of ["dash", "cola", "hc", "scores", "config"]) {
    await p.evaluate(t => navigateTo(t), tab);
    await p.waitForTimeout(300);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `sin desborde en ${tab}`);
  }
  assert.deepEqual(errores.filter(e => !/^L is not defined|Chart|QRCode/.test(e)), []);
  await ctx.close();
});
