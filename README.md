# MedIA Suite — Triage hospitalario con IA

PWA médica modular para clasificación de emergencias (triage) y gestión de medicamentos, con inteligencia artificial.

## Módulos

| Módulo | Descripción |
|--------|-------------|
| **TriageIA** | Clasificación de urgencias ESI/Manchester con asistente clínico IA |
| **MediApp** | Gestión de medicamentos: dosis, alertas, interacciones |
| **MCI** | Incidentes con múltiples víctimas — flujo START wizard + PDF |
| **Scores clínicos** | HEART Score, escalas de riesgo, exportación PDF |
| **Panel de pacientes** | Cola en tiempo real, override médico, historial clínico |

## Stack

- **HTML/CSS/JS** — SPA sin frameworks, optimizada para mobile y tablet
- **Firebase Auth** — Google OAuth + email/contraseña
- **Firebase Firestore** — base de datos en tiempo real
- **Firebase Cloud Functions** — proxy IA (DeepSeek API, clave server-side)
- **PWA** — instalable en Android, iOS y escritorio (manifest + Service Worker)

## Instalación local

```bash
# Instalar Firebase Tools
npm install -g firebase-tools
firebase login

# Configurar Cloud Functions
cd functions
npm install

# Configurar clave de IA (DeepSeek)
firebase functions:secrets:set DEEPSEEK_KEY

# Desplegar
firebase deploy
```

## Estructura

```
├── index.html          # App principal (triage + medi)
├── src/
│   ├── ai/             # Integración IA / proxy
│   ├── clinical/       # Scores clínicos, HEART, escalas
│   ├── config/         # Configuración Firebase
│   ├── firebase/       # Auth, Firestore helpers
│   ├── i18n/           # Internacionalización ES/EN
│   ├── triage/         # Lógica de clasificación ESI/Manchester
│   └── utils/          # Utilidades, PDF, helpers
├── functions/          # Firebase Cloud Functions (proxy IA)
├── manifest.json       # PWA manifest triage
├── medi-manifest.json  # PWA manifest MediApp
└── sw.js               # Service Worker
```

## Proyecto Firebase

`media-suite-6f432` — desplegado en Firebase Hosting
