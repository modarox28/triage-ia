// Pruebas de las estadísticas del inicio y su reporte PDF (src/app/21-estadisticas.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { jsPDF } from "jspdf";

const leer = f => fs.readFileSync(new URL("../src/app/" + f, import.meta.url), "utf8");
const SOPORTADO = /^[\n\x20-\x7e\xa0-\xff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]*$/;

function entorno() {
  const problemas = [];
  function PDF(...a) {
    const pdf = new jsPDF(...a);
    const orig = pdf.text.bind(pdf);
    pdf.text = (t, x, y, o) => {
      const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
      for (const l of Array.isArray(t) ? t : String(t).split("\n")) {
        const w = pdf.getTextWidth(l);
        const izq = o?.align === "right" ? x - w : o?.align === "center" ? x - w / 2 : x;
        if (izq < 4.99 || izq + w > W - 4.99 || y > H - 3 || y < 5) problemas.push(`fuera de la hoja: "${l.slice(0, 40)}"`);
        if (!SOPORTADO.test(l)) problemas.push(`carácter no soportado: "${l.slice(0, 40)}"`);
      }
      return orig(t, x, y, o);
    };
    return pdf;
  }
  const ctx = { window: { jspdf: { jsPDF: PDF } } };
  vm.createContext(ctx);
  vm.runInContext(leer("19-pdf.js") + "\n" + leer("21-estadisticas.js")
    + ";this.f={_estResumen,_buildStatsPDF,_estPct};", ctx);
  return { ...ctx.f, problemas };
}

const AHORA = new Date(2026, 9, 6, 15, 30);           // 6 oct 2026, 3:30 p. m.
const hace = (dias, horas = 0) => ({ toMillis: () => AHORA.getTime() - dias * 864e5 - horas * 36e5 });
const T = (dias, clasificacion, extra = {}) => ({ createdAt: hace(dias), clasificacion, tipo: "adulto", motivo: "fiebre", ...extra });
const DOCS = [
  T(0, "ROJO", { motivo: "dolor_pecho", atendido: true }),
  T(0, "AMARILLO", { esMCI: true }),
  { ...T(0, "VERDE"), createdAt: hace(0, 15) },           // hoy a las 00:30
  T(1, "ROJO", { tipo: "nino", motivo: "raro_desconocido" }),
  T(3, "VERDE"),
  T(10, "AMARILLO"),
  T(40, "ROJO"),                                          // fuera de los 30 días
];

test("los períodos cuentan solo lo que les corresponde", () => {
  const { _estResumen } = entorno();
  assert.equal(_estResumen(DOCS, [], "day", AHORA).total, 3);
  assert.equal(_estResumen(DOCS, [], "week", AHORA).total, 5);
  assert.equal(_estResumen(DOCS, [], "month", AHORA).total, 6);
});

test("prioridad, MCI, atendidos y motivos desconocidos", () => {
  const { _estResumen } = entorno();
  const r = _estResumen(DOCS, [{ createdAt: hace(0) }, { createdAt: hace(20) }], "week", AHORA);
  assert.deepEqual([...r.prioridad], [2, 1, 2]);
  assert.equal(r.mci, 1);
  assert.equal(r.preh, 1);
  assert.equal(r.atendidos, 1);
  assert.deepEqual([...r.origen], [4, 1, 1]);
  assert.equal(r.motivo.reduce((a, b) => a + b, 0), r.total);   // "raro_desconocido" cuenta como "Otro"
});

test("tendencia por hora hoy y por día en 7 y 30 días", () => {
  const { _estResumen } = entorno();
  const hoy = _estResumen(DOCS, [], "day", AHORA);
  assert.equal(hoy.tendencia.length, 16);            // de 00h a 15h
  assert.equal(hoy.tendencia[0].n, 1);
  assert.equal(hoy.tendencia[15].n, 2);
  const sem = _estResumen(DOCS, [], "week", AHORA);
  assert.equal(sem.tendencia.length, 7);
  assert.equal(sem.tendencia.reduce((a, b) => a + b.n, 0), 5);
  assert.equal(_estResumen(DOCS, [], "month", AHORA).tendencia.length, 30);
});

test("PDF de estadísticas: nada se sale de la hoja, con datos y sin datos", () => {
  const { _estResumen, _buildStatsPDF, problemas } = entorno();
  const muchos = Array.from({ length: 250 }, (_, i) =>
    T(i % 30, ["ROJO", "AMARILLO", "VERDE"][i % 3], { tipo: ["adulto", "nino", "embarazada"][i % 3], motivo: ["trauma", "disnea"][i % 2] }));
  for (const p of ["day", "week", "month"]) {
    const pdf = _buildStatsPDF(_estResumen(muchos, [], p, AHORA), { quien: "Dra. María Fernanda de los Ángeles Rodríguez-Villalobos Echeverría", fecha: AHORA });
    assert.ok(pdf.internal.getNumberOfPages() >= 1);
  }
  _buildStatsPDF(_estResumen([], [], "day", AHORA), { fecha: AHORA });
  assert.deepEqual(problemas, []);
});
