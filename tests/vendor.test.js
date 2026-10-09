// Las librerías del navegador se sirven desde src/vendor (no desde CDNs de terceros).
// Esta prueba exige que cada copia sea idéntica a la versión instalada con npm, que es la que
// revisan `npm audit` y Dependabot. Para actualizar una: npm i -D <paquete>@<versión> --save-exact && npm run vendor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COPIAS } from "../scripts/vendor.mjs";

const raiz = new URL("../", import.meta.url);
const leer = r => readFileSync(new URL(r, raiz));

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
