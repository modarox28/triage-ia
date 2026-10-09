// Las librerías del navegador se sirven desde src/vendor (no desde CDNs de terceros).
// Esta prueba exige que cada copia sea idéntica a la versión instalada con npm, que es la que
// revisan `npm audit` y Dependabot. Para actualizar una: npm i -D <paquete>@<versión> y copia el archivo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const raiz = new URL("../", import.meta.url);
const leer = r => readFileSync(new URL(r, raiz));
const COPIAS = {
  "src/vendor/jspdf.umd.min.js": "node_modules/jspdf/dist/jspdf.umd.min.js",
  "src/vendor/chart.umd.min.js": "node_modules/chart.js/dist/chart.umd.js",
  "src/vendor/qrcode.min.js": "node_modules/qrcodejs/qrcode.min.js",
  "src/vendor/jsQR.js": "node_modules/jsqr/dist/jsQR.js",
  "src/vendor/leaflet/leaflet.js": "node_modules/leaflet/dist/leaflet.js",
  "src/vendor/leaflet/leaflet.css": "node_modules/leaflet/dist/leaflet.css",
};

for (const [copia, original] of Object.entries(COPIAS)) {
  test(`${copia} es idéntica a la versión de npm`, () => {
    assert.ok(leer(copia).equals(leer(original)), `${copia} no coincide con ${original}: vuelve a copiarlo`);
  });
}

test("index.html no carga scripts ni estilos de CDNs de terceros (salvo Firebase y Google Fonts)", () => {
  const html = leer("index.html").toString();
  const externos = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="(https?:\/\/[^"]+)"/g)].map(m => m[1])
    .filter(u => !/^https:\/\/fonts\.googleapis\.com\//.test(u));
  assert.deepEqual(externos, []);
});
