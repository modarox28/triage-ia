// Pruebas de los PDF: con textos muy largos y símbolos especiales, ningún texto
// debe salirse de la hoja ni contener caracteres que la fuente no puede dibujar.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { jsPDF } from "jspdf";

const APP = new URL("../src/app/", import.meta.url);
const leer = f => fs.readFileSync(new URL(f, APP), "utf8");
// Extrae una función de nivel superior de un archivo de src/app
function funcion(archivo, nombre) {
  const src = leer(archivo);
  const ini = src.indexOf(`function ${nombre}(`);
  assert.ok(ini >= 0, `${nombre} existe en ${archivo}`);
  let i = src.indexOf("{", ini), d = 0;
  for (; i < src.length; i++) { if (src[i] === "{") d++; else if (src[i] === "}" && !--d) break; }
  return src.slice(ini, i + 1);
}
const SOPORTADO = /^[\n\x20-\x7e\xa0-\xff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]*$/;

// jsPDF que registra cada texto y verifica que quede dentro de la hoja (márgen mínimo 5 mm)
function crearEntorno(archivo, nombre, extra = {}) {
  const problemas = [];
  let guardado = null;
  function PDF(...args) {
    const pdf = new jsPDF(...args);
    const original = pdf.text.bind(pdf);
    pdf.text = (t, x, y, o) => {
      const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
      const pag = pdf.internal.getCurrentPageInfo().pageNumber;
      for (const l of Array.isArray(t) ? t : String(t).split("\n")) {
        const w = pdf.getTextWidth(l);
        const izq = o?.align === "right" ? x - w : o?.align === "center" ? x - w / 2 : x;
        if (izq < 4.99 || izq + w > W - 4.99 || y > H - 3 || y < 5) problemas.push(`p${pag} fuera de la hoja: "${l.slice(0, 40)}"`);
        if (!SOPORTADO.test(l)) problemas.push(`p${pag} carácter no soportado: "${l.slice(0, 40)}"`);
      }
      return original(t, x, y, o);
    };
    pdf.save = () => { guardado = pdf; };
    return pdf;
  }
  const ctx = { window: { jspdf: { jsPDF: PDF } }, toast() {}, localStorage: { getItem: () => null }, ...extra };
  vm.createContext(ctx);
  vm.runInContext(leer("19-pdf.js") + "\n" + funcion(archivo, nombre), ctx);
  return { ctx, problemas, guardado: () => guardado };
}

const LARGO = "Dolor torácico opresivo irradiado a mandíbula y brazo izquierdo, diaforesis y náuseas; SpO₂ 89% → requiere O₂ ≥ 94% ⚠️ ";
const nombreLargo = "María Fernanda de los Ángeles Rodríguez-Villalobos Echeverría y Santamaría del Castillo";

test("PDF de triage: textos largos y símbolos no se salen de la hoja", () => {
  const { ctx, problemas } = crearEntorno("08-triage.js", "_buildTriagePDF");
  const pdf = ctx._buildTriagePDF({
    clasificacion: "ROJO",
    tiempo_atencion: "Inmediato — atención médica en menos de 10 minutos; activar código infarto y trasladar a reanimación 🔴",
    tipo: "adulto_mayor", motivo: "dolor_pecho", dolor: 9,
    userName: "Dr(a). " + nombreLargo, pacienteNombre: nombreLargo,
    vit: { fc: 128, ps: 82, pd: 50, sat: 89, tem: 38.9, fr: 28, gcs: 13 },
    justificacion: LARGO.repeat(8) + "Palabrasinespacios".repeat(12),
    acciones: Array.from({ length: 15 }, (_, i) => `Acción ${i + 1}: ` + LARGO.repeat(1 + (i % 3)) + " ✓"),
    notas: LARGO.repeat(10),
  });
  assert.deepEqual(problemas, []);
  assert.ok(pdf.internal.getNumberOfPages() >= 2, "el contenido largo continúa en otra página");
});

test("PDF de historia clínica: secciones largas continúan en la página siguiente", () => {
  const { ctx, problemas } = crearEntorno("12-historia-clinica.js", "_buildHCPDF");
  const pdf = ctx._buildHCPDF({
    name: nombreLargo, doc: "1.045.789.123-45", age: 78, sex: "F",
    antecedentes: Array.from({ length: 15 }, (_, i) => `Antecedente ${i + 1}: ` + LARGO.slice(0, 30 + i * 9)),
    alergias: ["Penicilina (anafilaxia)", "Látex — reacción ≥ grado 2"],
    medicacion: Array.from({ length: 12 }, (_, i) => `Medicamento ${i + 1} 500 mg c/8h vía oral`),
    notes: LARGO.repeat(60),
  });
  assert.deepEqual(problemas, []);
  assert.ok(pdf.internal.getNumberOfPages() >= 3);
});

test("PDF de historia clínica con historial de triages: fechas, prioridad y justificación sin salirse", () => {
  const { ctx, problemas } = crearEntorno("12-historia-clinica.js", "_buildHCPDF", { _HC_MOT: { dolor_pecho: "Dolor de pecho" } });
  vm.runInContext(funcion("12-historia-clinica.js", "_hcFechaTri"), ctx);
  const ts = ms => ({ toMillis: () => ms });
  const triages = Array.from({ length: 30 }, (_, i) => ({
    createdAt: ts(Date.UTC(2026, 9, 6 - i, 15, 5)), clasificacion: ["ROJO", "AMARILLO", "VERDE"][i % 3],
    motivo: i % 2 ? "dolor_pecho" : "otro", atendido: i % 2 === 0, atendidoPor: "Dra. " + nombreLargo,
    sinIA: i === 4, justificacion: LARGO.repeat(3) + " SpO₂ ≥ 94% → O₂",
  }));
  const pdf = ctx._buildHCPDF({ name: "Carlos Rodríguez", doc: "482951", age: 45, sex: "M", antecedentes: ["HTA"] }, triages);
  assert.deepEqual(problemas, []);
  assert.ok(pdf.internal.getNumberOfPages() >= 2, "el historial largo continúa en otra página");
});

test("PDF de tarjetas demo: cada tarjeta crece con su contenido", () => {
  const paciente = { doc: "930427", name: nombreLargo, age: "78", sex: "F",
    antecedentes: Array.from({ length: 8 }, (_, i) => `Antecedente largo ${i} con detalles clínicos`),
    alergias: ["Metoclopramida", "AINES"], medicacion: Array.from({ length: 9 }, (_, i) => `Medicamento ${i} 250/25 mg c/6h`) };
  const { ctx, problemas, guardado } = crearEntorno("07-pwa.js", "downloadPatientsPDF", { DEMO_PATIENTS: Array(6).fill(paciente) });
  ctx.downloadPatientsPDF();
  assert.ok(guardado(), "se generó el PDF");
  assert.deepEqual(problemas, []);
});

test("_pdfSafe convierte o quita símbolos que la fuente del PDF no tiene", () => {
  const ctx = {}; vm.createContext(ctx); vm.runInContext(leer("19-pdf.js"), ctx);
  assert.equal(ctx._pdfSafe("SpO₂ ≥ 94% → O₂"), "SpO2 >= 94% -> O2");
  assert.equal(ctx._pdfSafe("Dolor 🔴 alto ✓"), "Dolor  alto OK");
  assert.equal(ctx._pdfSafe("Peñaloza — 38,5 °C"), "Peñaloza — 38,5 °C");
});
