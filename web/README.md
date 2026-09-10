# ATLAS Frontend Web

Dashboard web para **Inteligencia de Base Instalada** — Philips Hackathon.

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Router 6

---

## 🚀 Inicio Rápido

```bash
# Desde la raíz del repo
cd src/atlas/ui

# Instalar dependencias
npm install

# Servidor de desarrollo (HMR)
npm run dev
# → http://localhost:5173

# Proxy a backend Python (puerto 8000)
# Configurado en vite.config.ts
```

---

## 📁 Estructura

```
src/atlas/ui/
├── CONTRIBUTING.md       # Guía de contribución (lee esto primero)
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
└── src/
    ├── main.tsx              # Entry point
    ├── App.tsx               # Rutas + layout
    ├── index.css             # Tailwind + estilos globales
    ├── components/
    │   ├── common/           # Primitivas UI (Button, Input, Card, Modal...)
    │   ├── forms/            # Formularios de dominio (ObservationForm, SearchForm)
    │   └── layout/           # Header, Sidebar, MainLayout
    ├── pages/                # Páginas = rutas
    │   ├── DashboardPage.tsx
    │   ├── InstalledBasePage.tsx
    │   ├── QueriesPage.tsx
    │   ├── CapturePage.tsx
    │   ├── SettingsPage.tsx
    │   └── HelpPage.tsx
    ├── hooks/                # Lógica reutilizable
    │   ├── useQVAC.ts        # Wrapper SDK QVAC (inicialización, extracción, P2P)
    │   └── useObservations.ts
    ├── stores/               # Estado global (Zustand + persist)
    │   └── useAppStore.ts
    ├── services/             # I/O externo
    │   └── qvac.ts           # Cliente QVAC SDK (browser)
    ├── types/                # Contratos TS
    │   └── index.ts
    └── utils/