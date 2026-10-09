// Copia las librerías del navegador desde node_modules a src/vendor.
// Úsalo después de actualizar una de ellas (por ejemplo, cuando Dependabot lo propone):
//   npm i -D chart.js@<versión> --save-exact && npm run vendor
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname } from "node:path";

export const COPIAS = {
  "src/vendor/jspdf.umd.min.js": "node_modules/jspdf/dist/jspdf.umd.min.js",
  "src/vendor/chart.umd.min.js": "node_modules/chart.js/dist/chart.umd.js",
  "src/vendor/qrcode.min.js": "node_modules/qrcodejs/qrcode.min.js",
  "src/vendor/jsQR.js": "node_modules/jsqr/dist/jsQR.js",
  "src/vendor/leaflet/leaflet.js": "node_modules/leaflet/dist/leaflet.js",
  "src/vendor/leaflet/leaflet.css": "node_modules/leaflet/dist/leaflet.css",
};

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [destino, origen] of Object.entries(COPIAS)) {
    mkdirSync(dirname(destino), { recursive: true });
    copyFileSync(origen, destino);
    console.log("✓", destino);
  }
  for (const img of readdirSync("node_modules/leaflet/dist/images")) copyFileSync(`node_modules/leaflet/dist/images/${img}`, `src/vendor/leaflet/images/${img}`);
  console.log("Listo. Sube el ?v= de los archivos cambiados en index.html y la versión CACHE de sw.js.");
}
