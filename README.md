# MedIA Suite — Triage hospitalario con IA

![Pruebas](https://github.com/modarox28/triage-ia/actions/workflows/tests.yml/badge.svg)

PWA médica para clasificación de urgencias (triage) y gestión de medicamentos, con asistente de inteligencia artificial.

**App:** https://media-suite-6f432.web.app
**Probar sin registro:** https://media-suite-6f432.web.app/?demo=1 (o el botón "Probar demo" en la pantalla de inicio)

El modo demo entra como administrador con pacientes, triages, cola y solicitudes de acceso ficticias. Funciona con una base de datos en memoria (`src/app/18-demo.js`): no toca Firestore, no gasta cuota y todo se reinicia al salir. La IA sí es real, con un cupo de 15 consultas al día por visitante.

## Módulos

| Módulo | Descripción |
|--------|-------------|
| **TriageIA** | Clasificación de urgencias ESI/Manchester con asistente clínico IA |
| **MediApp** | Gestión de medicamentos: dosis, alarmas, interacciones |
| **MCI** | Incidentes con múltiples víctimas: asistente START + PDF |
| **Scores clínicos** | HEART, qSOFA, NEWS2, CURB-65, Wells, Glasgow, ROSIER |
| **Cola de pacientes** | Cola en tiempo real, tablero kanban, override médico |
| **Historia clínica** | Antecedentes, alergias y medicación; exportación a PDF |

## Stack

- **HTML, CSS y JavaScript** sin frameworks ni paso de compilación
- **Firebase Auth**: Google, correo/contraseña y acceso de pacientes con ID + PIN
- **Cloud Firestore**: base de datos en tiempo real, protegida con reglas por rol
- **Firebase Hosting**: plan gratuito (Spark)
- **Cloudflare Worker + KV**: proxy hacia la API de DeepSeek que verifica la sesión y aplica límites diarios; la clave nunca llega al navegador
- **Pruebas**: `node:test` y GitHub Actions en cada push
- **PWA**: instalable en Android, iOS y escritorio (manifest + service worker)

## Arquitectura

```
Navegador (PWA) ──► Firebase Auth / Firestore      (datos y sesiones)
       │
       └──────────► Cloudflare Worker ──► DeepSeek  (IA; la API key vive en Cloudflare)
                     │  1. verifica el token de Firebase (firma de Google)
                     │  2. lee el rol en Firestore con ese token
                     └─ 3. cupo diario por usuario en Workers KV
```

## Estructura del proyecto

```
├── index.html                 # Solo el HTML de las pantallas; carga los CSS y JS de src/
├── src/
│   ├── app/                   # Lógica de la interfaz (scripts clásicos, se cargan en orden)
│   │   ├── firebase-init.js   #   Inicializa Firebase y expone helpers (módulo ES)
│   │   ├── 00-iconos.js       #   Íconos SVG de la app y reemplazo automático de emojis por íconos
│   │   ├── 00-estado.js       #   Estado global, auditoría, tema, toast
│   │   ├── 01-auth.js         #   Login de personal, roles, inactividad
│   │   ├── 02-voz-notas.js    #   Modo voz y validación de notas clínicas
│   │   ├── 03-navegacion.js   #   Navegación, gráfica, centros cercanos
│   │   ├── 04-dashboard-historial.js
│   │   ├── 05-perfil-qr.js
│   │   ├── 06-pacientes.js    #   Acceso de pacientes (ID + PIN) e historia en el triage
│   │   ├── 07-pwa.js
│   │   ├── 08-triage.js       #   Pasos del triage y resultado con IA
│   │   ├── 09-medicamentos.js
│   │   ├── 10-init.js         #   Arranque: alarmas y service worker
│   │   ├── 11-dolor-sintomas.js
│   │   ├── 12-historia-clinica.js
│   │   ├── 13-cola.js
│   │   ├── 14-herramientas.js #   Vitales por imagen, offline, prehospital, turno, dosis pediátrica
│   │   ├── 15-mci.js
│   │   ├── 16-glasgow-gestos.js
│   │   ├── 17-scores-tablero.js
│   │   ├── 18-demo.js         #   Modo demo: Firebase simulado en memoria con datos ficticios
│   │   ├── 00-busqueda.js     #   Búsqueda de pacientes: claves de búsqueda por nombre y documento
│   │   ├── 19-pdf.js          #   Utilidades de PDF: ajuste de línea, salto de página, pie con número de página
│   │   ├── 20-pin.js          #   Recuperación de PIN de pacientes (restablecer, aviso y cambio obligatorio)
│   │   ├── 21-estadisticas.js #   Estadísticas del inicio: gráfico, tabla con porcentajes y reporte PDF
│   │   └── 22-ajustes.js      #   Ajustes con navegación tipo iOS: subpáginas, saludo de idioma y selectores animados
│   ├── styles/                # CSS por área: base, auth, layout, components, screens, clinical, queue, ios
│   │                          #   y tema.css (estilo visual, Inicio y diseño para tablet/escritorio; se carga al final)
│   ├── clinical/              # Motor de scores clínicos, copiloto y línea de tiempo (módulos ES)
│   ├── ai/                    # Construcción del prompt para la IA
│   ├── triage/                # Definición de los pasos del triage
│   ├── firebase/              # Helpers de Firestore para triages
│   ├── i18n/                  # Traducciones (ES, EN, PT, FR, DE, JA)
│   ├── config/                # Constantes de la app
│   └── utils/                 # Validación de signos vitales
├── cloudflare-worker/
│   └── worker.js              # Proxy de IA (se pega en el panel de Cloudflare)
├── tests/                     # Pruebas: scores clínicos, signos vitales y seguridad del Worker
├── .github/workflows/         # Ejecuta las pruebas en GitHub en cada push
├── firestore.rules            # Reglas de seguridad de la base de datos
├── firebase.json              # Configuración de Hosting y Firestore
├── sw.js                      # Service worker (caché offline)
└── functions/                 # Proxy antiguo en Cloud Functions (requiere plan Blaze; no se usa)
```

### Cómo encontrar algo

1. Busca el texto o el `id` del elemento en `index.html`.
2. Busca la función de su `onclick` en `src/app/` (por ejemplo, `grep -rn "function loginPatientById" src/app`).
3. Los estilos están en `src/styles/`, agrupados por área.

### Reglas al editar `src/app/`

- Son **scripts clásicos**: todos comparten el ámbito global, por eso los `onclick` del HTML los encuentran.
- Se cargan **en orden numérico**. El código que se ejecuta al cargar (fuera de funciones) solo puede usar cosas definidas en ese archivo o en uno anterior. Dentro de funciones puedes usar cualquier cosa.
- Al cambiar un archivo, sube el `?v=` en su etiqueta de `index.html` y la versión `CACHE` de `sw.js`, para que los usuarios reciban la versión nueva.

## Roles y seguridad

| Rol | Cómo se obtiene | Qué puede ver |
|-----|-----------------|---------------|
| `paciente` | Se registra con su número de ID + PIN de 6 dígitos | Solo su propia historia clínica |
| `pendiente` | Todo registro nuevo de personal (correo o Google) | Nada: ve una pantalla de "cuenta en revisión" |
| `medico` | Un admin o admin de hospital aprueba la solicitud | Triages, historias y cola |
| `rechazado` | Un admin o admin de hospital rechaza la solicitud | Nada |
| `eliminado` | Un admin elimina la cuenta | Nada (se puede restaurar) |
| `admin_hosp` | Lo asigna un admin | Lo anterior + usuarios, aprobación de solicitudes y prehospital |
| `admin` | Lo asigna otro admin (el primero, desde la consola de Firebase) | Todo, incluida la auditoría |

- Nadie puede asignarse un rol a sí mismo; `firestore.rules` lo impide aunque se manipule el navegador.
- Las solicitudes de acceso aparecen arriba en **Gestión de usuarios** (panel de admin) con botones de Aprobar y Rechazar.
- El admin puede cambiar cualquier rol (incluido volver a `pendiente` para repetir pruebas) o eliminar una cuenta con 🗑. Una cuenta eliminada ve el aviso "Cuenta eliminada", pierde todo acceso y no puede volver a registrarse con el mismo correo; se restaura cambiando su rol en el selector. Para borrar también el correo de inicio de sesión, usa la consola de Firebase → Authentication. El admin no puede cambiar ni borrar su propia cuenta.
- Los nombres y correos se escapan antes de mostrarse en el panel, para que nadie pueda inyectar código con su nombre de usuario.
- Cada paciente tiene una cuenta interna `<ID>@pacientes.media-suite.app` cuya contraseña se deriva de su PIN; las reglas usan ese correo para limitar el acceso a su historia.
- Todo texto que viene de usuarios, pacientes o de la IA se escapa con `_esc()` antes de insertarse como HTML, y los botones de las listas usan índices en lugar de texto, para evitar inyección de código.
- La API key de DeepSeek solo existe como secreto en Cloudflare. El Worker:
  - acepta peticiones solo desde el dominio de la app;
  - verifica el token de Firebase de cada consulta (firma RS256 de Google, emisor, audiencia y vencimiento);
  - lee el rol del usuario en Firestore con su propio token: las cuentas pendientes, rechazadas o eliminadas no pueden usar la IA;
  - aplica un cupo diario: médico 150, admin 300, paciente 20 y modo demo 15 por IP;
  - limita el tamaño de cada consulta y de cada respuesta.

### Búsqueda de pacientes

En **Pacientes**, la caja de búsqueda encuentra historias por nombre o documento: sin importar tildes ni mayúsculas, por partes de palabra ("rodri" → Rodríguez) y en cualquier orden ("mendez carlos"). Si se escriben solo números, busca por documento (completo o parcial, con o sin puntos).

Como Firestore no busca texto parcial, cada historia guarda `searchKeys`: los prefijos de cada palabra del nombre y del documento (`src/app/00-busqueda.js`). Las historias nuevas los guardan solas; las creadas antes de esta función se preparan una vez desde **Ajustes → Acciones de administrador → Preparar búsqueda de pacientes antiguos**.

### Recuperación del PIN de pacientes

1. El paciente que olvidó su PIN toca **¿Olvidaste tu PIN?** y se le indica acercarse con su documento.
2. Un médico o admin abre su historia, confirma que verificó la identidad y toca **Restablecer PIN del paciente**.
3. El Worker (`/reset-pin`) verifica que quien lo pide es personal aprobado, genera un PIN temporal aleatorio, cambia la contraseña de la cuenta interna con la API de administración de Firebase Auth y marca el perfil con `mustChangePin`. Cada persona puede hacer hasta 20 restablecimientos al día.
4. El paciente entra con el PIN temporal y la app lo obliga a crear uno nuevo antes de continuar. Cada restablecimiento queda en la auditoría (`pin_reset`).

## Puesta en marcha

### Requisitos

- Node.js LTS
- Firebase CLI: `npm install -g firebase-tools` (o usa `npx firebase-tools` en cada comando)
- Cuenta gratuita de Cloudflare y una API key de DeepSeek

### Pruebas automáticas

```bash
npm install   # solo la primera vez (instala jsPDF para las pruebas de PDF)
npm test
```

Usa el runner de pruebas incluido en Node. Cubre:

- **Scores clínicos** contra sus criterios publicados: qSOFA (Sepsis-3), NEWS2 (RCP 2017), CURB-65, HEART, ROSIER (Nor et al. 2005), Wells TVP (Wells 1997), índice de shock y alertas de vitales.
- **Clasificadores de signos vitales** en sus valores límite.
- **PDF** de triage, historia clínica y tarjetas demo: con textos muy largos, nombres extensos y símbolos (≥, →, SpO₂, emojis), ningún texto se sale de la hoja y las secciones largas continúan en la página siguiente.
- **Seguridad del Worker**: tokens falsos, vencidos, alterados o de otro proyecto; cuentas sin acceso; cupos diarios; y que ninguna consulta rechazada llegue a DeepSeek.
- **Estadísticas**: conteos por período (hoy, 7 y 30 días), tendencia y que el reporte PDF no se salga de la hoja.
- **Búsqueda de pacientes**: tildes, mayúsculas, partes de palabra, orden de los términos y documentos con puntos o letras.
- **Restablecimiento de PIN**: solo el personal aprobado puede hacerlo, la firma de la cuenta de servicio es válida, se marca `mustChangePin` y se respeta el límite diario.

### Probar en local

```bash
npx firebase-tools login
npx firebase-tools use media-suite-6f432
npx firebase-tools serve --only hosting     # http://localhost:5000
```

### Desplegar

```bash
npx firebase-tools deploy --only hosting,firestore:rules
```

### Proxy de IA (Cloudflare Worker)

1. En dash.cloudflare.com: **Workers & Pages → Create → Create Worker**, nombre `triage-ia-proxy`.
2. **Edit code**: pega `cloudflare-worker/worker.js` y pulsa **Deploy**.
3. **Settings → Variables and Secrets**: agrega el secreto `DEEPSEEK_KEY`.
4. **Storage & Databases → KV → Create**: crea un namespace (por ejemplo `triage-ia-limites`). Luego, en el Worker, **Settings → Bindings → Add → KV namespace**, con nombre de variable `LIMITES`. Esto activa los cupos diarios y el modo demo; sin él, la IA solo funciona con sesión iniciada.
5. **Recuperación de PIN** (opcional): en la consola de Firebase → **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Copia todo el contenido del archivo JSON y agrégalo en el Worker como secreto `GOOGLE_SA`. Borra el archivo descargado después. Sin este secreto, el botón responde que la función no está configurada.
   - Más seguro: en Google Cloud → IAM, crea una cuenta de servicio solo con los roles *Firebase Authentication Admin* y *Cloud Datastore User*, y usa su clave en lugar de la de administrador.
6. Si cambias el dominio de la app, actualiza `ORIGENES_PERMITIDOS` en el Worker; para cambiar los cupos, edita `LIMITE_DIARIO`.
7. La URL del Worker está en la constante `PROXY` de `src/app/00-estado.js`.

### Primer administrador

En la consola de Firebase → Firestore → colección `users`, abre tu documento y cambia el campo `role` a `admin`. Desde ahí, asigna los demás roles en el panel de la app.

## Proyecto Firebase

`media-suite-6f432`, desplegado en Firebase Hosting (plan Spark).
