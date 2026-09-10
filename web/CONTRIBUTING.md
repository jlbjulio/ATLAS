# CONTRIBUTING.md — ATLAS Frontend Web

Guía de contribución para el frontend web (React + TypeScript + Vite) del proyecto ATLAS.

---

## 🌿 Estrategia de Ramas (Git Flow Simplificado)

```
main (producción, tags v*)
  ↑
  │ PR obligatorio
  ↓
develop (integración continua)
  ↑
  │ PR obligatorio
  ↓
feature/* (rama corta, 1-3 días)
  │  feature/capture-form
  │  feature/qvac-hooks
  │  feature/nl-queries
  │  feature/installed-base-ui
  │  ...
  └─ Cada feature nace de `develop` y vuelve a `develop` vía PR
```

**Reglas:**
- `main` solo recibe merges desde `develop` con tag de versión (`v0.1.0`, `v0.2.0`...)
- `develop` es la rama base para todo trabajo nuevo
- `feature/*` se borran tras merge a `develop`
- `hotfix/*` solo para parches críticos en `main` (nace de `main`, vuelve a `main` y `develop`)

---

## 📝 Convención de Commits (Conventional Commits)

```
<tipo>(<ámbito>): <mensaje corto en minúsculas>

[body opcional: qué y por qué, no cómo]

[footer opcional: BREAKING CHANGE, refs #issue]
```

**Tipos permitidos:**
| Tipo | Uso |
|------|-----|
| `feat` | Nueva funcionalidad visible al usuario |
| `fix` | Corrección de bug |
| `docs` | Cambios en documentación |
| `style` | Formato, punto y coma, imports (sin lógica) |
| `refactor` | Reestructuración sin cambio de comportamiento |
| `test` | Añadir/ modificar tests |
| `chore` | Build, deps, tooling, CI |
| `perf` | Mejora de rendimiento |

**Ámbitos recomendados (frontend):**
`ui`, `hooks`, `stores`, `services`, `components`, `pages`, `types`, `config`, `build`

**Ejemplos:**
```
feat(ui): add observation capture form with voice input
fix(hooks): handle QVAC initialization race condition
docs(readme): add vite dev server instructions
refactor(components): extract Button variant logic to CSS variables
test(services): add unit tests for extraction parser
chore(deps): upgrade react-router-dom to v6.26
```

**Regla de oro:** Un commit = un cambio lógico atómico. Si usas "y" en el mensaje, probablemente sean dos commits.

---

## 🏗️ Estructura de Componentes

```
src/
├── components/
│   ├── common/           # UI primitiva reutilizable
│   │   ├── Button.tsx
│   │   ├── Input.tsx / Textarea.tsx
│   │   ├── Select.tsx
│   │   ├── Card.tsx (Header, Title, Content, Footer)
│   │   ├── Badge.tsx / StatusBadge.tsx
│   │   ├── Modal.tsx / ConfirmDialog.tsx
│   │   └── index.ts
│   ├── forms/            # Formularios de dominio
│   │   ├── ObservationForm.tsx
│   │   ├── SearchForm.tsx
│   │   └── index.ts
│   └── layout/           # Layout de aplicación
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       ├── MainLayout.tsx
│       └── index.ts
├── pages/                # Páginas = rutas
│   ├── DashboardPage.tsx
│   ├── InstalledBasePage.tsx
│   ├── QueriesPage.tsx
│   ├── CapturePage.tsx
│   ├── SettingsPage.tsx
│   └── HelpPage.tsx
├── hooks/                # Lógica de negocio reutilizable
│   ├── useQVAC.ts
│   ├── useObservations.ts
│   └── index.ts
├── stores/               # Estado global (Zustand)
│   ├── useAppStore.ts
│   └── index.ts
├── services/             # APIs externas / SDKs
│   ├── qvac.ts
│   └── api.ts
├── types/                # Contratos TypeScript / Zod
│   └── index.ts
├── utils/                # Helpers puros
│   └── index.ts
└── App.tsx / main.tsx
```

### Principios de Componentes

1. **Common = primitivas sin lógica de negocio** (Button, Input, Card). Se usan en cualquier parte.
2. **Forms = lógica de dominio + UI** (ObservationForm sabe de QVAC, validación, extracción).
3. **Pages = orquestación** (usan hooks, stores, forms, layout). No exportan componentes reutilizables.
4. **Hooks = lógica pura reutilizable** (useQVAC, useObservations). Testables en aislamiento.
5. **Stores = estado global mínimo** (solo lo que comparten ≥2 páginas). Zustand + persist middleware.
6. **Services = I/O** (qvac.ts, api.ts). Aíslan side effects.

### Convenciones de Nombrado

| Qué | Convención | Ejemplo |
|-----|------------|---------|
| Componentes | PascalCase | `ObservationForm.tsx` |
| Hooks | camelCase + `use` | `useQVAC.ts` |
| Stores | camelCase + `use` + `Store` | `useAppStore.ts` |
| Tipos/Interfaces | PascalCase | `Observation`, `QVACExtractionResult` |
| Enums/Constantes | UPPER_SNAKE_CASE | `MODALITY_OPTIONS` |
| Props interface | `ComponentNameProps` | `ButtonProps` |
| Archivos de test | `*.test.tsx` | `ObservationForm.test.tsx` |

---

## 🎨 UI / Design System

- **Tailwind CSS** como única forma de estilos (no CSS modules, no styled-components).
- **Paleta:** `primary` (azul Philips), `surface` (grises neutros), semánticos `success`/`warning`/`danger`/`info`.
- **Componentes base** en `components/common/` — extender antes de crear nuevos.
- **Responsive:** mobile-first, breakpoints `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).
- **Accesibilidad:** labels en inputs, `aria-*` en modales/dropdowns, focus visible, contraste AA.

---

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Vite dev server (HMR) en puerto 5173

# Calidad
npm run lint         # ESLint (recomendado: 0 warnings)
npm run typecheck    # tsc --noEmit (strict mode)
npm run format       # Prettier + tailwind plugin

# Build
npm run build        # tsc + vite build → dist/
npm run preview      # Preview producción local

# CI (ejecutar antes de push)
npm run check        # lint + typecheck + format + tests
```

---

## ✅ Checklist Pre-PR

Antes de abrir PR a `develop`:

- [ ] `npm run check` pasa sin errores
- [ ] Commits siguen Conventional Commits
- [ ] Rama nace de `develop` actualizado (`git rebase develop`)
- [ ] No hay `console.log` / `debugger` en código
- [ ] Componentes nuevos tienen historia en Storybook (si aplica)
- [ ] Tests pasan (`npm run test` — cuando existan)
- [ ] PR tiene descripción clara: qué, por qué, cómo probar
- [ ] Asignado a code owner / reviewer del área

---

## 🧪 Testing (Cuando se añada)

- **Unit:** hooks, utils, services (Vitest)
- **Component:** forms, common UI (React Testing Library)
- **E2E:** flujos críticos capture → extract → save (Playwright)

---

## 📦 Dependencias

- **Producción:** React 18, React Router 6, Zustand, Zod, @qvac/sdk, lucide-react, date-fns
- **Dev:** Vite 5, TypeScript 5, Tailwind 3, ESLint 8, Prettier 3, Vitest
- **Política:** `npm install` solo en `package.json` del frontend (`src/atlas/ui/`). No tocar root `package.json` salvo tooling compartido.

---

## 🔐 Seguridad

- **Nunca** commitear secrets (API keys, tokens, claves P2P).
- Variables de entorno en `.env.local` (gitignored).
- Validación Zod en **todos** los inputs de usuario antes de enviar a backend/QVAC.
- Sanitizar HTML si se renderiza contenido de usuario (no hay `dangerouslySetInnerHTML` en este proyecto).

---

## 🚀 Despliegue

```bash
npm run build          # Genera dist/
# dist/ se sirve como static files (Nginx, Vercel, Netlify, S3+CloudFront)
# Variables de build: VITE_API_URL, VITE_QVAC_PROVIDER_KEY
```

---

## 📚 Referencias

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://github.com/pmndrs/zustand)
- [Zod](https://zod.dev/)
- [QVAC SDK Docs](https://docs.qvac.tether.io/js-ts-sdk)
- [React Router v6](https://reactrouter.com/en/main)

---

**Duda?** Abre issue o pregunta en PR. Mejor preguntar que asumir.