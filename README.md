# MedIA Suite — Triage hospitalario con IA

PWA médica para clasificación de urgencias (triage) y gestión de medicamentos, con asistente de inteligencia artificial.

**Demo:** https://media-suite-6f432.web.app

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
- **Cloudflare Worker**: proxy hacia la API de DeepSeek; la clave nunca llega al navegador
- **PWA**: instalable en Android, iOS y escritorio (manifest + service worker)

## Arquitectura

```
Navegador (PWA) ──► Firebase Auth / Firestore      (datos y sesiones)
       │
       └──────────► Cloudflare Worker ──► DeepSeek  (IA; la API key vive en Cloudflare)
```

## Estructura del proyecto

```
├── index.html                 # Solo el HTML de las pantallas; carga los CSS y JS de src/
├── src/
│   ├── app/                   # Lógica de la interfaz (scripts clásicos, se cargan en orden)
│   │   ├── firebase-init.js   #   Inicializa Firebase y expone helpers (módulo ES)
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
│   │   └── 17-scores-tablero.js
│   ├── styles/                # CSS por área: base, auth, layout, components, screens, clinical, queue, ios
│   ├── clinical/              # Motor de scores clínicos, copiloto y línea de tiempo (módulos ES)
│   ├── ai/                    # Construcción del prompt para la IA
│   ├── triage/                # Definición de los pasos del triage
│   ├── firebase/              # Helpers de Firestore para triages
│   ├── i18n/                  # Traducciones (ES, EN, PT, FR, DE, JA)
│   ├── config/                # Constantes de la app
│   └── utils/                 # Validación de signos vitales
├── cloudflare-worker/
│   └── worker.js              # Proxy de IA (se pega en el panel de Cloudflare)
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
| `admin_hosp` | Lo asigna un admin | Lo anterior + usuarios, aprobación de solicitudes y prehospital |
| `admin` | Lo asigna otro admin (el primero, desde la consola de Firebase) | Todo, incluida la auditoría |

- Nadie puede asignarse un rol a sí mismo; `firestore.rules` lo impide aunque se manipule el navegador.
- Las solicitudes de acceso aparecen arriba en **Gestión de usuarios** (panel de admin) con botones de Aprobar y Rechazar.
- El admin puede cambiar cualquier rol (incluido volver a `pendiente`) o eliminar un perfil con 🗑. Eliminar borra el perfil y el rol, no el correo: si esa persona vuelve a entrar, queda como cuenta nueva pendiente. Para borrar también el correo, usa la consola de Firebase → Authentication. El admin no puede cambiar ni borrar su propia cuenta.
- Los nombres y correos se escapan antes de mostrarse en el panel, para que nadie pueda inyectar código con su nombre de usuario.
- Cada paciente tiene una cuenta interna `<ID>@pacientes.media-suite.app` cuya contraseña se deriva de su PIN; las reglas usan ese correo para limitar el acceso a su historia.
- La API key de DeepSeek solo existe como secreto en Cloudflare. El Worker acepta peticiones únicamente desde el dominio de la app y limita el tamaño de cada respuesta.

## Puesta en marcha

### Requisitos

- Node.js LTS
- Firebase CLI: `npm install -g firebase-tools` (o usa `npx firebase-tools` en cada comando)
- Cuenta gratuita de Cloudflare y una API key de DeepSeek

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
4. Si cambias el dominio de la app, actualiza `ORIGENES_PERMITIDOS` en el Worker.
5. La URL del Worker está en la constante `PROXY` de `src/app/00-estado.js`.

### Primer administrador

En la consola de Firebase → Firestore → colección `users`, abre tu documento y cambia el campo `role` a `admin`. Desde ahí, asigna los demás roles en el panel de la app.

## Proyecto Firebase

`media-suite-6f432`, desplegado en Firebase Hosting (plan Spark).
