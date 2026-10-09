# Seguridad de MedIA Suite

Revisión contra la lista de 20 controles antes de lanzar una app. Cada punto indica qué se hizo, dónde está y cómo se comprueba automáticamente.

| # | Control | Estado | Cómo está resuelto | Se comprueba en |
|---|---------|:------:|--------------------|-----------------|
| 1 | Ocultar API keys | ✅ | La clave de DeepSeek solo existe como secreto del Cloudflare Worker; el navegador nunca la ve. La cuenta de servicio de Google (para restablecer PIN) también es un secreto del Worker. | `tests/worker.test.js` |
| 2 | Eliminar secretos de Git | ⚠️ | No hay secretos en el código actual. `gitleaks` revisa cada cambio en GitHub Actions y `.gitignore` bloquea `.env`, `*.pem`, `*.key` y cuentas de servicio. **Dos claves antiguas de DeepSeek quedaron en el historial de commits: deben estar revocadas** (ver "Acciones manuales"). | job `secretos` |
| 3 | Key pública para la base de datos | ✅ | La `apiKey` de Firebase es pública por diseño: solo identifica el proyecto. La protección está en las reglas de Firestore. Recomendado: restringirla por dominio (ver "Acciones manuales"). | — |
| 4 | Row-Level Security | ✅ | `firestore.rules`: cada rol ve solo lo suyo (el paciente solo su historia; las cuentas pendientes o eliminadas, nada). Toda colección no prevista queda cerrada. | `tests-rules/` (emulador) |
| 5 | Encriptar datos sensibles | ✅ | En tránsito: HTTPS/TLS obligatorio (HSTS). En reposo: Firestore cifra con AES-256. El PIN nunca se guarda (Firebase Auth guarda solo su hash). Al cerrar sesión se borra la copia local de la base de datos del dispositivo. | `src/app/01-auth.js` |
| 6 | Forzar la autenticación | ✅ | Ninguna lectura o escritura sin sesión. El Worker verifica la firma del token de Firebase en cada consulta. Se eliminó un acceso por QR que abría la app sin autenticar: ahora el QR solo lleva al formulario de ID + PIN. | `tests-rules/`, `tests/worker.test.js` |
| 7 | Restringir el acceso a registros | ✅ | Igual que el 4, además auditoría y errores solo los lee el administrador. | `tests-rules/` |
| 8 | Bloquear manipulación de campos | ✅ | Nadie cambia su rol, su documento ni el dueño de una historia. En un triage solo se pueden cambiar los campos de atención y de revisión; no se puede crear ya "atendido"; el registro de cambios solo puede crecer. | `tests-rules/` |
| 9 | Proteger la sesión | ✅ | Firebase Auth no usa cookies: guarda tokens de 1 hora que se renuevan solos. "Recordarme" desactivado = sesión solo en esa pestaña. Cierre automático por inactividad. El Worker rechaza tokens vencidos, alterados o de otro proyecto. | `tests/worker.test.js` |
| 10 | Hashear contraseñas | ✅ | Firebase Auth guarda las contraseñas con scrypt. Además, el registro del personal exige 10+ caracteres, letras y números, y que no contenga el correo, el nombre ni contraseñas comunes. | `tests/validacion.test.js` |
| 11 | Rate limiting | ✅ | Por día (KV): médico 150, admin 300, paciente 20, demo 15 por IP, 20 restablecimientos de PIN. Por minuto: personal 20, paciente 8, demo 5, restablecimientos 5. Firebase Auth bloquea por su cuenta los intentos repetidos de contraseña o PIN. | `tests/worker.test.js`, `tests/reset-pin.test.js` |
| 12 | Protección contra bots | ✅ | Cloudflare Turnstile para el modo demo (el único acceso sin cuenta), listo en el Worker y en la app; se activa con dos claves (ver "Acciones manuales"). Con sesión no hace falta: cada consulta lleva un token verificado. | `tests/worker.test.js` |
| 13 | Parametrizar queries | ✅ | No hay SQL. Firestore recibe los filtros como valores separados (`where(campo, "==", valor)`), así que no existe inyección de consultas. | — |
| 14 | Validar inputs | ✅ | En la app: nombres, teléfonos y textos se limpian y se recortan (`src/app/00-validacion.js`). En el servidor: las reglas exigen tipos y tamaños máximos (nombres 120, notas 5000, listas 60…). El Worker solo acepta mensajes de rol "user" con texto o una imagen JPEG/PNG pequeña. | `tests/validacion.test.js`, `tests-rules/`, `tests/worker.test.js` |
| 15 | Sanitizar contenido | ✅ | Todo texto de usuarios, pacientes o la IA se escapa con `_esc()` antes de mostrarse. Content-Security-Policy: solo se ejecutan scripts propios, de Firebase y de Turnstile; se bloquean conexiones a dominios no autorizados. CodeQL analiza el código en cada cambio. | `e2e/demo.e2e.js` (CSP), job CodeQL |
| 16 | Restringir archivos | ✅ | Solo fotos JPG, PNG o WebP de hasta 10 MB (no SVG, que puede llevar código). Se redibujan en un canvas y se reducen antes de usarse. La foto de perfil tiene un tamaño máximo en las reglas. | `tests/validacion.test.js`, `tests-rules/` |
| 17 | Devolver solo datos necesarios | ✅ | El Worker devuelve solo el texto de la IA (sin ids ni metadatos del proveedor) y errores genéricos sin detalles internos. Los códigos QR se generan en el dispositivo: ya no se envía el documento del paciente a un servicio externo. | `tests/worker.test.js` |
| 18 | Security headers | ✅ | `firebase.json`: Content-Security-Policy, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy y Cross-Origin-Opener-Policy. El Worker también envía las suyas. La landing tiene CSP por etiqueta `<meta>` (GitHub Pages no permite cabeceras). | `e2e/demo.e2e.js` |
| 19 | Forzar HTTPS | ✅ | Firebase Hosting, GitHub Pages y Cloudflare solo sirven HTTPS; HSTS indica al navegador que nunca use HTTP; `upgrade-insecure-requests` en la CSP. | — |
| 20 | Escanear dependencias | ✅ | `npm audit` falla el CI ante vulnerabilidades altas; Dependabot propone actualizaciones cada semana; las librerías del navegador se sirven desde `src/vendor` (no de CDNs) y una prueba verifica que sean idénticas a la versión revisada por npm. Se actualizó jsPDF 2.5.1 → 4.2.1 (tenía vulnerabilidades críticas). Cuando Dependabot propone actualizar una de esas librerías, su PR falla a propósito hasta copiar el archivo nuevo con `npm run vendor`. | job `test`, `tests/vendor.test.js` |

## Acciones manuales (no se pueden hacer desde el código)

1. **Revocar las claves antiguas de DeepSeek** (`sk-2bcc…` y `sk-b839…`) en platform.deepseek.com → API keys. Quedaron en commits antiguos de este repositorio público, así que hay que darlas por expuestas. Revocarlas es lo que realmente las inutiliza; borrar el historial no basta porque pudieron copiarse.
2. **Restringir la apiKey de Firebase por dominio**: Google Cloud Console → APIs y servicios → Credenciales → la clave "Browser key" → Restricciones de aplicaciones → Sitios web: `https://media-suite-6f432.web.app/*`, `https://media-suite-6f432.firebaseapp.com/*`, `http://localhost:5000/*`.
3. **Firebase Authentication → Configuración**: activar "Protección contra la enumeración de correos" y, en "Política de contraseñas", exigir 10 caracteres con letras y números.
4. **Activar Turnstile (anti-bots del modo demo)**: Cloudflare → Turnstile → Add widget con el dominio `media-suite-6f432.web.app`. Copia la *Site key* en `TURNSTILE_SITEKEY` de `src/app/00-estado.js` y agrega la *Secret key* como secreto `TURNSTILE_SECRET` del Worker.
5. **Actualizar el Worker**: pegar de nuevo `cloudflare-worker/worker.js` en Cloudflare (Edit code → Deploy).
6. **Publicar las reglas y la app**: `npx firebase-tools deploy --only hosting,firestore:rules`.

## Cómo reportar un problema de seguridad

Escribe a mdq2804@gmail.com con el asunto "Seguridad MedIA Suite". No abras un issue público con los detalles.
