# ATLAS Frontend Web

Dashboard web para **Inteligencia de Base Instalada** — Philips Hackathon.

Para preparar una demostración completa, incluidos modelos locales, seed y guion de captura, sigue el [runbook de demo](../DEMO_RUNBOOK.md).

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Router 6

---

## Inicio Rapido

```bash
# Desde la raiz del repo
cd web

# Instalar dependencias
npm install

# Servidor de desarrollo (HMR)
npm run dev
# -> http://localhost:5173

# Build de produccion
npm run build
# -> dist/

# Preview del build
npm run preview
```

### Backend (requerido)

```bash
# Desde la raíz del repo
python3 -m venv .venv
.venv/bin/python -m pip install -e . pytest==8.3.2 ruff==0.12.11 httpx==0.28.1

# Iniciar backend
.venv/bin/python -m uvicorn web.server.main:app --reload --host 127.0.0.1 --port 8000
# -> http://localhost:8000/api/health
```

El frontend hace proxy de `/api` a `localhost:8000` via `vite.config.ts`.

---

## Estructura

```
web/
├── public/
│   └── atlas.svg           # Logo ATLAS
├── src/
│   ├── main.tsx            # Entry point
│   ├── App.tsx             # Rutas + layout
│   ├── index.css           # Tailwind + estilos globales
│   ├── components/
│   │   ├── common/         # Button, Input, Card, Modal, Badge
│   │   ├── forms/          # ObservationForm, SearchForm
│   │   └── layout/         # Header, Sidebar, MainLayout
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── CapturePage.tsx
│   │   ├── InstalledBasePage.tsx
│   │   ├── QueriesPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── HelpPage.tsx
│   ├── hooks/
│   │   ├── useQVAC.ts      # Init QVAC, transcribe, extract
│   │   └── useObservations.ts
│   ├── stores/
│   │   └── useAppStore.ts  # Zustand + localStorage persist
│   ├── services/
│   │   └── api.ts          # HTTP client to FastAPI backend
│   ├── lib/
│   │   └── mappers.ts      # API -> frontend type mapping
│   └── types/
│       └── index.ts        # TypeScript contracts
├── server/
│   └── main.py             # FastAPI backend
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## Paginas

| Ruta | Pagina | Descripcion |
|------|--------|-------------|
| `/` | Dashboard | Resumen de base instalada, metricas, alertas |
| `/capture` | Captura | Flujo Observar -> Revisar -> Confirmar con QVAC y dictado por voz |
| `/installed-base` | Base Instalada | Tabla/tarjetas de equipos por cliente |
| `/installed-base/:client` | Detalle Cliente | Deep link a un cliente especifico |
| `/queries` | Consultas NL | Conversacion con ATLAS sobre la base instalada |
| `/settings` | Configuracion | Tema, almacenamiento, P2P (roadmap) |
| `/help` | Ayuda | FAQ, recursos, contactos |

---

## Comandos

```bash
npm install          # Instalar dependencias
npm run dev          # Dev server en http://localhost:5173
npm run build        # Build de produccion
npm run preview      # Preview del build
npm run typecheck    # Verificacion de tipos
npm run lint         # ESLint
npm run check        # typecheck + lint + format
```

## Experiencia de uso

- El boton del microfono alterna entre `Iniciar grabacion` y `Detener grabacion`.
- Al detener, el stream del microfono se libera inmediatamente y la UI muestra el estado de transcripcion.
- Las preguntas de `/queries` se escriben en un composer multilinea y aparecen como turnos de usuario y ATLAS, no como una busqueda de texto simple.
- La inferencia y transcripcion usan el backend local y QVAC; no requieren servicios de inferencia externos.

---

## Seguridad

- Sin API keys ni tokens hardcoded.
- Sin envios a servicios externos (inferencia 100% local via QVAC).
- Una foto requiere autorización explícita antes de ejecutarse con VisionPsy local.
- Fotos con indicadores de pacientes, expedientes, gafetes o rostros bloquean la confirmación.
- `.env` excluido de git via `.gitignore`.
- Errores visibles en UI sin exponer datos sensibles.
